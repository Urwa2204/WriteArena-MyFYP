"""Lightweight, offline abusive-language detection for WriteArena.

Used to (a) auto-flag submissions/comments that contain slurs or abusive
language into the admin moderation queue, and (b) mask abusive words in live
lobby chat. This is a deliberately small, transparent keyword+leetspeak
matcher — not a full ML classifier — so it runs instantly with no model
download and is easy for a reviewer to audit and extend.
"""
import re

# Base list of abusive / hateful terms (kept intentionally short here; extend
# in one place). Matching is case-insensitive, tolerant of simple leetspeak
# and repeated letters, and only triggers on whole words.
_BASE_TERMS = [
    "fuck", "shit", "bitch", "bastard", "asshole", "dickhead", "cunt",
    "slut", "whore", "retard", "faggot", "nigger", "nigga", "spic", "chink",
    "kike", "wetback", "tranny", "motherfucker", "cocksucker", "twat",
]

_LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s"})


def _normalise(text: str) -> str:
    return (text or "").lower().translate(_LEET)


def _build_pattern(terms) -> re.Pattern:
    parts = []
    for t in terms:
        # allow repeated letters (e.g. "shiiit") and non-letter separators
        core = r"[\W_]*".join(re.escape(c) + "+" for c in t)
        parts.append(core)
    return re.compile(r"\b(" + "|".join(parts) + r")\b", re.IGNORECASE)


_PATTERN = _build_pattern(_BASE_TERMS)


def contains_abuse(text: str) -> bool:
    return bool(_PATTERN.search(_normalise(text)))


def find_abuse(text: str) -> list[str]:
    return _PATTERN.findall(_normalise(text))


def mask_abuse(text: str) -> str:
    """Replace abusive words with asterisks (keeping first letter) for display
    in live chat, so a lobby stays usable without silently dropping messages.
    Matching runs on a normalised copy (leetspeak-folded); because that fold
    is a 1:1 character map it preserves length, so the matched spans line up
    with the original string and we mask the real characters in place."""
    if not text:
        return text
    norm = _normalise(text)
    chars = list(text)
    for m in _PATTERN.finditer(norm):
        start, end = m.start(), m.end()
        for i in range(start + 1, end):
            if chars[i].strip():
                chars[i] = "*"
    return "".join(chars)
