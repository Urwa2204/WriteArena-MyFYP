"""Real-word detection for WriteArena.

Gibberish and keyboard-mash ("asdkjh lkjsdf") should not score like genuine
prose, and the word count should reflect actual English words. This module
loads a real English word list once (nltk's corpus, or the system
/usr/share/dict/words, whichever is present) and exposes cheap membership
checks. When neither list is available it falls back to a spelling-shape
heuristic so the platform still degrades gracefully offline.
"""
import re
import string

_WORDS: set | None = None
_VOWELS = set("aeiou")

# Very common words / contractions that must always pass even if a given
# word list is missing them.
_ALWAYS = {
    "a", "i", "an", "the", "to", "of", "in", "on", "at", "is", "it", "and",
    "or", "but", "if", "we", "he", "she", "they", "you", "me", "my", "as",
    "so", "no", "up", "do", "go", "us", "am", "be", "im", "id", "ok",
    "dont", "cant", "wont", "its", "thats", "ive", "youre", "hes", "shes",
}


def _load_words() -> set:
    global _WORDS
    if _WORDS is not None:
        return _WORDS
    words: set[str] = set()
    # 1) nltk corpus (listed in requirements.txt)
    try:
        from nltk.corpus import words as nltk_words  # type: ignore
        try:
            words.update(w.lower() for w in nltk_words.words())
        except LookupError:
            import nltk  # type: ignore
            nltk.download("words", quiet=True)
            words.update(w.lower() for w in nltk_words.words())
    except Exception:
        pass
    # 2) system dictionary
    if not words:
        for path in ("/usr/share/dict/words", "/usr/share/dict/american-english"):
            try:
                with open(path, encoding="utf-8", errors="ignore") as fh:
                    words.update(line.strip().lower() for line in fh if line.strip())
                break
            except Exception:
                continue
    words |= _ALWAYS
    _WORDS = words
    return _WORDS


def _looks_like_word(w: str) -> bool:
    """Spelling-shape fallback used when no dictionary is loaded (or a real
    word simply isn't in the list — proper nouns, inflections, slang)."""
    if not w:
        return False
    if w in _ALWAYS:
        return True
    if len(w) <= 2:
        return w in _ALWAYS
    if not any(c in _VOWELS for c in w):
        return False
    # no run of 5+ consonants
    run = 0
    for c in w:
        if c in _VOWELS:
            run = 0
        else:
            run += 1
            if run >= 5:
                return False
    vr = sum(1 for c in w if c in _VOWELS) / len(w)
    return 0.12 <= vr <= 0.85


def _normalise(token: str) -> str:
    return token.lower().strip(string.punctuation + "“”‘’")


def is_english_word(token: str) -> bool:
    w = _normalise(token)
    if not w or not any(c.isalpha() for c in w):
        return False
    words = _load_words()
    if words:
        if w in words:
            return True
        # tolerate simple inflections the base list may lack
        for suff in ("s", "es", "ed", "ing", "'s", "d", "n't", "ly"):
            if w.endswith(suff) and w[: -len(suff)] in words:
                return True
        # If we have a dictionary but the word isn't in it, only accept it if
        # it still has a plausible word shape (covers names / new coinages),
        # while rejecting outright keyboard mash.
        return _looks_like_word(w)
    return _looks_like_word(w)


def english_word_ratio(text: str) -> tuple[float, int, int]:
    """Return (ratio, real_count, total_tokens) over alphabetic tokens."""
    tokens = re.findall(r"[A-Za-z']+", text or "")
    total = len(tokens)
    if total == 0:
        return 0.0, 0, 0
    real = sum(1 for t in tokens if is_english_word(t))
    return real / total, real, total
