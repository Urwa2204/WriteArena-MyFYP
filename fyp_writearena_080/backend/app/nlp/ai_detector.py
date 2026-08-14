import os
import logging

logger = logging.getLogger("writearena.nlp")

_pipeline = None
_use_fallback = False

def _load_model():
    global _pipeline, _use_fallback
    if _pipeline is not None:
        return
    try:
        from transformers import pipeline
        model_name = os.environ.get("HF_MODEL", "Hello-SimpleAI/chatgpt-detector-roberta")
        _pipeline = pipeline("text-classification", model=model_name,
                             truncation=True, max_length=512)
        logger.info("AI detector loaded: %s", model_name)
    except Exception as e:
        logger.warning("AI detector model failed to load (%s), using heuristic fallback", e, exc_info=True)
        _use_fallback = True

def detect_ai(text: str) -> float:
    """Returns probability (0-1) that text was AI-generated."""
    _load_model()
    if _use_fallback:
        return _heuristic_detect(text)
    try:
        result = _pipeline(text[:512])[0]
        label = result["label"].upper()
        score = result["score"]
        if "AI" in label or "FAKE" in label or label == "LABEL_1":
            return float(score)
        else:
            return float(1.0 - score)
    except Exception:
        return _heuristic_detect(text)

def _heuristic_detect(text: str) -> float:
    """Simple heuristic when model unavailable."""
    words = text.split()
    if len(words) < 10:
        return 0.5
    avg_word_len = sum(len(w) for w in words) / len(words)
    sentences = text.split(".")
    avg_sent_len = len(words) / max(1, len(sentences))
    score = 0.0
    if avg_word_len > 6:
        score += 0.2
    if avg_sent_len > 25:
        score += 0.2
    ai_phrases = ["furthermore", "moreover", "in conclusion", "it is worth noting",
                  "it is important to", "delve into", "at its core", "in the realm of"]
    for phrase in ai_phrases:
        if phrase in text.lower():
            score += 0.1
    return min(0.95, score)
