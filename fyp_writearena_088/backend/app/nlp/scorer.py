from sqlalchemy.orm import Session
from app.db.models import AnalysisResult, Submission
from app.nlp.plagiarism import check_plagiarism
from app.nlp.ai_detector import detect_ai
from app.nlp.quality import analyze_quality, validity_factor
from app.nlp.relevance import topic_relevance
from app.nlp.feedback import generate_feedback
import uuid

def compute_score(text: str, submission_id: str, db: Session) -> AnalysisResult:
    plag_score, flagged_ids = check_plagiarism(text, submission_id, db)
    ai_score = detect_ai(text)
    quality_data = analyze_quality(text)
    quality_score = quality_data["score"]

    # Topic relevance — looked up from the submission's stored topic_title.
    # None for free-writing / generic practice prompts (no penalty then).
    sub = db.query(Submission).filter(Submission.submission_id == submission_id).first()
    topic_title = sub.topic_title if sub else ""
    relevance = topic_relevance(text, topic_title)

    # Composite: originality 40%, human-written 30%, quality 30%
    final = ((1 - plag_score) * 0.40 + (1 - ai_score) * 0.30 + quality_score * 0.30) * 100

    # ---- validity / coherence gate (stops short or gibberish text scoring high) ----
    word_count = len(text.split())
    v_factor, real_ratio = validity_factor(text)
    final *= v_factor                       # scale gibberish way down
    if real_ratio < 0.5:                    # mostly not real English → hard cap
        final = min(final, 25.0)
    if word_count < 40:                     # short text can't earn a high grade
        final = min(final, 45 + word_count * 0.35)

    # ---- topic relevance factor (only when a real topic was set) ----
    if relevance is not None:
        # Full credit at/above 0.5 relevance; scales down to a 0.6 multiplier
        # for writing that ignores the prompt entirely.
        rel_factor = 0.6 + 0.4 * min(1.0, relevance / 0.5)
        final *= rel_factor

    final = round(min(100.0, max(0.0, final)), 2)

    if final >= 95:   grade = "A+"
    elif final >= 85: grade = "A"
    elif final >= 75: grade = "B+"
    elif final >= 65: grade = "B"
    else:             grade = "C"

    details = quality_data.get("details", {})
    if relevance is not None:
        details = {**details, "relevance": relevance}
    feedback = generate_feedback(plag_score, ai_score, quality_score, details)

    result = AnalysisResult(
        result_id=str(uuid.uuid4()),
        submission_id=submission_id,
        plagiarism_score=round(plag_score, 3),
        ai_score=round(ai_score, 3),
        quality_score=round(quality_score, 3),
        relevance_score=(round(relevance, 3) if relevance is not None else None),
        final_score=final,
        grade=grade,
        ai_feedback=feedback,
        flagged_phrases=flagged_ids or None,  # submission_ids this one was compared similar to
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result
