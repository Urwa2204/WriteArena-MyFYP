import textstat
import re
from app.nlp.english import english_word_ratio

_VOWELS = set("aeiou")


def validity_factor(text: str):
    """Return (factor 0..1, real_word_ratio). Low for gibberish / keyboard-mash
    / heavily repeated text, so the scorer can cap those submissions. Uses a
    real English word list (see app/nlp/english.py) rather than only a
    letter-shape heuristic, so "asdkjh qwerty" is caught even when it happens
    to have vowels."""
    words = re.findall(r"[a-zA-Z']+", text.lower())
    wc = len(words)
    if wc == 0:
        return 0.1, 0.0
    ratio, _real, _total = english_word_ratio(text)
    unique_ratio = len(set(words)) / wc
    if ratio < 0.5:
        factor = 0.18
    elif ratio < 0.7:
        factor = 0.45
    elif ratio < 0.85:
        factor = 0.8
    else:
        factor = 1.0
    if unique_ratio < 0.3:            # extremely repetitive ("word word word …")
        factor = min(factor, 0.4)
    return round(factor, 3), round(ratio, 3)


def _load_spacy():
    try:
        import spacy
        return spacy.load("en_core_web_sm")
    except Exception:
        return None

_nlp = None

def analyze_quality(text: str) -> dict:
    global _nlp
    if _nlp is None:
        _nlp = _load_spacy()

    words = text.split()
    word_count = len(words)
    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    sentence_count = max(1, len(sentences))

    if word_count < 10:
        return {"score": 0.3, "details": {}}

    readability = 0.5
    try:
        fk = textstat.flesch_reading_ease(text)
        readability = min(1.0, max(0.0, fk / 100.0))
    except Exception:
        pass

    unique_words = len(set(w.lower() for w in words))
    ttr = unique_words / word_count

    avg_sent_len = word_count / sentence_count
    sent_variety = 0.7
    if 10 <= avg_sent_len <= 25:
        sent_variety = 1.0
    elif avg_sent_len < 5 or avg_sent_len > 40:
        sent_variety = 0.4

    structure = 0.5
    if _nlp:
        try:
            doc = _nlp(text[:5000])
            noun_count = sum(1 for t in doc if t.pos_ == "NOUN")
            verb_count = sum(1 for t in doc if t.pos_ == "VERB")
            if noun_count > 0 and verb_count > 0:
                structure = min(1.0, (noun_count + verb_count) / len(doc) * 2)
        except Exception:
            pass

    length_bonus = min(1.0, word_count / 200)
    quality = (readability * 0.30 + ttr * 0.25 + sent_variety * 0.20 +
               structure * 0.15 + length_bonus * 0.10)

    return {
        "score": round(quality, 3),
        "details": {
            "word_count": word_count,
            "readability": round(readability, 3),
            "vocabulary_richness": round(ttr, 3),
            "sentence_variety": round(sent_variety, 3),
        }
    }
