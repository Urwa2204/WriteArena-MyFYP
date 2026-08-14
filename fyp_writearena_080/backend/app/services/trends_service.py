"""Live topic generation by scraping trending headlines per niche.

Pulls the latest trending headlines from Google News RSS (one query per niche)
and turns them into writing prompts. Results are cached in-memory for a few
hours so we don't hammer the feed. Everything is best-effort: if a scrape fails
(no network, rate-limited, blocked), callers fall back to existing DB topics so
the app never breaks.

Why Google News RSS and not pytrends / Google Trends scraping?
Google blocks datacenter IPs for Trends, so pytrends works locally but fails
once deployed. Google News RSS is a public feed that works from cloud hosts,
is per-niche, and needs no API key.
"""
import re
import time
import logging
import random
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime

from app.db.models import Topic

logger = logging.getLogger("writearena.trends")

_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) WriteArena/1.0"
_TTL = 3 * 60 * 60          # re-scrape a niche at most every 3 hours
_cache: dict = {}           # niche -> (fetched_at, [prompts])

# What to search on Google News for each niche.
NICHE_QUERIES = {
    "technology":    "technology OR artificial intelligence OR gadgets",
    "society":       "society OR culture OR social issues",
    "literature":    "books OR literature OR authors OR writing",
    "science":       "science OR research OR space OR discovery",
    "politics":      "politics OR government OR elections OR policy",
    "business":      "business OR economy OR startups OR markets",
    "sports":        "sports OR football OR cricket OR athletics",
    "health":        "health OR medicine OR wellbeing OR fitness",
    "entertainment": "entertainment OR movies OR music OR celebrities",
    "arts":          "art OR design OR painting OR creativity",
}

# Rewrite templates — these give the writer a specific angle rather than just
# echoing the headline. `{lede}` is a paraphrased, lower-cased clause built
# from the headline (see _heuristic_rewrite), never the verbatim headline text.
_REWRITE_TEMPLATES = [
    "Take a clear position on how {lede}, and defend it with specifics.",
    "Write about who is most affected by {lede} — make it concrete, not abstract.",
    "Explain what it means that {lede}, using an example from your own life or city.",
    "Make the strongest case you can against the popular take on {lede}.",
    "Imagine explaining, years from now, that {lede} — what would surprise people most?",
    "Argue the overlooked angle in the coverage of {lede}.",
]


def _clean(title: str) -> str:
    # Google News titles end with " - Source Name"; drop that suffix.
    return title.rsplit(" - ", 1)[0].strip()


# Headline categories that should never become a competitive writing prompt,
# regardless of how specific or well-formed the headline is: death/violence,
# disasters with casualties, sexual violence and abuse, self-harm/suicide,
# and harm to children. This is a pattern-level keyword gate, not a
# guarantee — it's meant to catch the common, obvious cases cheaply and
# without needing a model call, on top of (not instead of) the specificity
# filter below. A headline can be perfectly well-formed and specific and
# still get rejected here.
_SENSITIVE_PATTERNS = re.compile(
    r"\b("
    r"kill(?:ed|s|ing)?|murder(?:ed|s)?|massacre|shooting|gunman|stabb(?:ed|ing)"
    r"|bombing|explosion|terroris[tm]|attack(?:ed|s)?|hostage|kidnapp(?:ed|ing)"
    r"|genocide|war\s?crime|airstrike|casualties|death\s?toll|dead\s+(?:bod(?:y|ies)|after|in)"
    r"|suicide|self[\s-]?harm"
    r"|rape[d]?|sexual(?:ly)?\s+assault|molest(?:ed|ation)?|abuse[d]?"
    r"|torture[d]?|mutilat(?:ed|ion)|decapitat(?:ed|ion)"
    r"|child\s+(?:abuse|trafficking|exploitation)"
    r"|mass\s+shooting|wildfire\s+deaths|earthquake\s+kills|plane\s+crash\s+kills"
    r")\b",
    re.IGNORECASE,
)


def _is_sensitive(headline: str) -> bool:
    return bool(_SENSITIVE_PATTERNS.search(headline))


def _has_specific_content(headline: str) -> bool:
    """Reject headlines too short/generic to make a good, non-vague prompt —
    require real length plus at least one proper noun or number to anchor it
    to something concrete rather than a bare abstraction."""
    words = re.findall(r"[A-Za-z']+", headline)
    if len(words) < 6:
        return False
    # A capitalized word anywhere *after* position 0 is a reliable proper-noun
    # signal (headlines always capitalize the first word regardless). But don't
    # let a proper noun that only happens to lead the headline (e.g. "Netflix
    # renews...") get penalized for that — a longer headline is specific enough
    # on its own even without a second internal capital.
    has_mid_proper_noun = any(w[0].isupper() for w in words[1:])
    has_number = bool(re.search(r"\d", headline))
    is_long_enough = len(words) >= 8
    return has_mid_proper_noun or has_number or is_long_enough


def _lede_clause(headline: str) -> str:
    """Paraphrase a headline into a lower-case clause suitable for embedding
    mid-sentence — strips quotes/trailing punctuation and de-capitalizes the
    leading word (unless it looks like an acronym or proper noun), so the
    result reads as prose rather than a quoted headline."""
    core = re.sub(r'["\u2018\u2019\u201c\u201d]', "", headline).strip().rstrip(". ")
    if not core:
        return core
    first_word = re.match(r"[A-Za-z']+", core)
    if first_word and not (first_word.group().isupper() and len(first_word.group()) > 1):
        core = core[0].lower() + core[1:]
    return core


def _heuristic_rewrite(headline: str) -> str:
    """Rule-based paraphrase — always available, no network/LLM dependency.
    Picks a template deterministically per headline so re-scrapes are stable."""
    lede = _lede_clause(headline)
    template = _REWRITE_TEMPLATES[abs(hash(lede)) % len(_REWRITE_TEMPLATES)]
    return template.format(lede=lede)


def _llm_rewrite(headline: str):
    """Best-effort LLM paraphrase, reusing the same online/offline tiers as the
    writing coach. Returns None (falls back to the heuristic) if neither an
    online API key nor a local Ollama model is configured/reachable, or if the
    model just echoes the headline back."""
    try:
        from app.services import coach_service
    except Exception:
        return None
    instruction = (
        "Rewrite the following news headline into an original, specific "
        "creative-writing-competition prompt, in one sentence. Do not quote the "
        "headline or repeat its exact wording. Do not start with 'Write about'. "
        "Give the writer a concrete angle to argue or explore.\n\n"
        f"Headline: {headline}"
    )
    tip = coach_service._online(instruction) or coach_service._ollama(instruction)
    if not tip:
        return None
    tip = tip.strip().strip('"')
    # Guard against the model just echoing the headline back near-verbatim.
    core_words = set(re.findall(r"[a-z']{4,}", headline.lower()))
    tip_words = set(re.findall(r"[a-z']{4,}", tip.lower()))
    overlap = len(core_words & tip_words) / max(1, len(core_words))
    if overlap > 0.7 or headline.lower()[:25] in tip.lower():
        return None
    return tip


def _rewrite_headline_to_prompt(headline: str):
    """Turn one scraped headline into an original writing prompt, or return
    None to skip it entirely — either because it's too vague/short to anchor
    a good prompt to, or (checked first, and non-negotiable) because it's the
    kind of headline that should never become a competitive writing prompt at
    all, no matter how well-formed or specific it is."""
    if _is_sensitive(headline):
        return None
    if not _has_specific_content(headline):
        return None
    return _llm_rewrite(headline) or _heuristic_rewrite(headline)


def _fetch_headlines(query: str, limit: int = 12):
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": query, "hl": "en-US", "gl": "US", "ceid": "US:en"}
    )
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    with urllib.request.urlopen(req, timeout=8) as resp:
        raw = resp.read()
    root = ET.fromstring(raw)
    out = []
    for item in root.iter("item"):
        t = item.findtext("title")
        if t:
            c = _clean(t)
            if 12 <= len(c) <= 160:
                out.append(c)
        if len(out) >= limit:
            break
    return out


def get_trending_prompts(niche: str, limit: int = 8):
    """Freshly-scraped writing prompts for a niche (cached for a few hours)."""
    now = time.time()
    hit = _cache.get(niche)
    if hit and now - hit[0] < _TTL:
        return hit[1][:limit]
    try:
        headlines = _fetch_headlines(NICHE_QUERIES.get(niche, niche))
        prompts = []
        for h in headlines:
            rewritten = _rewrite_headline_to_prompt(h)
            if rewritten and rewritten not in prompts:
                prompts.append(rewritten)
        if prompts:
            _cache[niche] = (now, prompts)
            return prompts[:limit]
    except Exception as exc:  # pragma: no cover - network dependent
        logger.warning("scrape failed for %r: %s", niche, exc, exc_info=True)
    return hit[1][:limit] if hit else []


def sync_niche(db, niche: str) -> int:
    """Scrape a niche and insert any new prompts as approved Topics. Returns count added."""
    prompts = get_trending_prompts(niche, limit=8)
    added = 0
    for p in prompts:
        if not db.query(Topic).filter(Topic.title == p).first():
            db.add(Topic(title=p, niche=niche, approved=True, created_at=datetime.utcnow()))
            added += 1
    if added:
        db.commit()
    return added


def sync_all(db) -> int:
    """Refresh trending topics for every niche. Best-effort per niche."""
    total = 0
    for niche in NICHE_QUERIES:
        try:
            total += sync_niche(db, niche)
        except Exception as exc:  # pragma: no cover
            logger.warning("sync failed for %r: %s", niche, exc, exc_info=True)
    return total


def upsert_and_pick(db, niche: str, prompts=None):
    """Insert freshly-scraped prompts as approved Topics and return one to use for
    a room session — preferring the newest (i.e. trending) topics. Falls back to any
    existing topic for the niche if scraping produced nothing (keeps rooms working
    even when the feed is blocked)."""
    if prompts is None:
        prompts = get_trending_prompts(niche, limit=8)
    added = 0
    for p in prompts:
        if not db.query(Topic).filter(Topic.title == p).first():
            db.add(Topic(title=p, niche=niche, approved=True, created_at=datetime.utcnow()))
            added += 1
    if added:
        db.commit()
    topics = (db.query(Topic)
              .filter(Topic.niche == niche, Topic.approved == True)
              .order_by(Topic.created_at.desc())
              .limit(12).all())
    return random.choice(topics) if topics else None


def pick_daily_topic(db):
    """Create today's trending daily-challenge topic from a live headline.
    Tries every niche (in random order) so one blocked feed doesn't stop it;
    returns None only if every niche fails to scrape."""
    niches = list(NICHE_QUERIES.keys())
    random.shuffle(niches)
    for niche in niches:
        prompts = get_trending_prompts(niche, limit=8)
        if prompts:
            topic = Topic(title=random.choice(prompts), niche=niche, is_daily=True,
                          challenge_date=datetime.utcnow(), approved=True, created_at=datetime.utcnow())
            db.add(topic)
            db.commit()
            db.refresh(topic)
            return topic
    return None
