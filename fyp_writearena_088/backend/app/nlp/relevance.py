"""Topic relevance for WriteArena.

A submission should actually address the prompt it was written for. This
module scores how well the text relates to the topic title using keyword
overlap plus TF-IDF cosine similarity, entirely offline. It returns a 0..1
relevance score; the scorer applies a gentle penalty when a real topic was
set and the writing wanders far from it.

Generic / practice topics (e.g. "Solo practice", "Write about anything you
choose.") are treated as "no specific topic", so free-writing is never
penalised for irrelevance.
"""
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

_STOP = {
    "the", "a", "an", "of", "to", "in", "on", "and", "or", "is", "are", "was",
    "were", "be", "been", "for", "with", "as", "at", "by", "it", "its", "this",
    "that", "these", "those", "do", "does", "how", "what", "why", "should",
    "will", "would", "can", "could", "about", "your", "you", "our", "we",
}

_GENERIC = {
    "", "solo practice", "solo", "practice", "free writing",
    "write about anything you choose.", "write about anything you choose",
    "write about anything", "anything you choose",
}


def _keywords(title: str) -> list[str]:
    toks = re.findall(r"[A-Za-z']+", (title or "").lower())
    return [t for t in toks if t not in _STOP and len(t) > 2]


def topic_relevance(text: str, topic_title: str) -> float | None:
    """0..1 relevance, or None when no specific topic was set."""
    if not topic_title or topic_title.strip().lower() in _GENERIC:
        return None
    if not text or not text.strip():
        return 0.0

    keys = _keywords(topic_title)
    body = text.lower()

    # 1) direct keyword coverage — how many of the topic's content words
    #    actually appear (as substrings, so plurals/inflections count).
    coverage = 0.0
    if keys:
        hit = sum(1 for k in keys if k in body)
        coverage = hit / len(keys)

    # 2) TF-IDF cosine between the topic and the writing.
    cosine = 0.0
    try:
        vec = TfidfVectorizer(stop_words="english")
        m = vec.fit_transform([topic_title, text])
        cosine = float(cosine_similarity(m[0], m[1])[0][0])
    except Exception:
        cosine = 0.0

    # Coverage is the stronger signal for short prompts; cosine catches
    # thematic overlap even when exact words differ.
    score = 0.6 * coverage + 0.4 * min(1.0, cosine * 2.5)
    return round(max(0.0, min(1.0, score)), 3)
