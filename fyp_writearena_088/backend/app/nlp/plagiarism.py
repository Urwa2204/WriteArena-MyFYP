import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from sqlalchemy.orm import Session
from app.db.models import Submission

_FLAG_THRESHOLD = 0.55   # similarity above this flags the other submission


def _normalise(text: str) -> str:
    """Lowercase, collapse whitespace, strip punctuation — so trivial edits
    (spacing, capitalisation, punctuation) don't hide an otherwise identical
    copy."""
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", (text or "").lower())).strip()


def _shingles(text: str, n: int = 4) -> set:
    words = _normalise(text).split()
    if len(words) < n:
        return {" ".join(words)} if words else set()
    return {" ".join(words[i:i + n]) for i in range(len(words) - n + 1)}


def _jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def check_plagiarism(text: str, current_submission_id: str, db: Session) -> tuple:
    """Returns (score 0-1, list of similar submission ids). 0=original,
    1=plagiarised. Combines TF-IDF cosine (thematic overlap) with word-shingle
    Jaccard + a direct normalised-equality check, so an exact or lightly-edited
    copy of an existing submission is caught reliably rather than slipping
    through on TF-IDF alone."""
    previous = db.query(Submission).filter(
        Submission.submission_id != current_submission_id,
        Submission.content != None,
        Submission.content != "",
    ).order_by(Submission.submitted_at.desc()).limit(500).all()

    if not previous:
        return 0.0, []

    norm_target = _normalise(text)
    target_shingles = _shingles(text)

    # --- Direct / near-exact pass (robust, doesn't depend on TF-IDF vocab) ---
    per_prev_sim = []
    for p in previous:
        norm_p = _normalise(p.content)
        if norm_target and norm_target == norm_p:
            sim = 1.0
        else:
            sim = _jaccard(target_shingles, _shingles(p.content))
        per_prev_sim.append(sim)

    # --- TF-IDF cosine pass (catches paraphrase-level overlap) ---
    try:
        corpus = [p.content for p in previous] + [text]
        vectorizer = TfidfVectorizer(stop_words="english", max_features=10000)
        tfidf = vectorizer.fit_transform(corpus)
        cos = cosine_similarity(tfidf[-1], tfidf[:-1])[0]
    except Exception:
        cos = np.zeros(len(previous))

    # Per-submission similarity = the stronger of the two signals.
    combined = [max(per_prev_sim[i], float(cos[i])) for i in range(len(previous))]

    if not combined:
        return 0.0, []

    max_sim = max(combined)
    flagged_ids = [previous[i].submission_id for i, s in enumerate(combined) if s > _FLAG_THRESHOLD]
    return round(min(1.0, max_sim), 3), flagged_ids
