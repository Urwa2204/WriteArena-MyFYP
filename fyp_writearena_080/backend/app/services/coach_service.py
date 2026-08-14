"""AI writing coach — returns ONE concrete improvement for a piece of writing.

Priority:
  1. Online: an OpenAI-compatible chat API (if COACH_API_KEY is set).
  2. Offline: a local Ollama model (if reachable at OLLAMA_HOST).
  3. Fallback: a rule-based heuristic (always works, no setup).

So the coach responds whether the site is online (external API) or offline (Ollama),
and never hard-fails.
"""
import json
import urllib.request
import re
import logging

from app.core.config import settings

logger = logging.getLogger("writearena.coach")

_SYSTEM = ("You are a concise writing coach. Read the passage and reply with exactly "
           "ONE specific, actionable improvement in 1-2 sentences. No preamble, no lists.")


def _post_json(url, payload, headers, timeout=25):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def _online(text):
    if not settings.COACH_API_KEY:
        return None
    try:
        out = _post_json(
            settings.COACH_API_BASE.rstrip("/") + "/chat/completions",
            {"model": settings.COACH_MODEL, "temperature": 0.4, "max_tokens": 120,
             "messages": [{"role": "system", "content": _SYSTEM},
                          {"role": "user", "content": text[:4000]}]},
            {"Authorization": "Bearer " + settings.COACH_API_KEY})
        return out["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning("coach online API failed: %s", e, exc_info=True)
        return None


def _ollama(text):
    try:
        out = _post_json(
            settings.OLLAMA_HOST.rstrip("/") + "/api/generate",
            {"model": settings.OLLAMA_MODEL, "stream": False,
             "prompt": _SYSTEM + "\n\nPassage:\n" + text[:4000] + "\n\nOne improvement:"},
            {}, timeout=40)
        return (out.get("response") or "").strip()
    except Exception as e:
        logger.info("coach: ollama unavailable, falling back: %s", e)
        return None


def _heuristic(text):
    words = text.split()
    wc = len(words)
    sents = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    avg = wc / max(1, len(sents))
    uniq = len(set(w.lower() for w in words)) / max(1, wc)
    if wc < 60:
        return "Develop your idea further — add a concrete example or a second supporting point so the piece feels complete."
    if avg > 26:
        return "Several sentences run long. Try splitting your longest sentence into two for sharper rhythm and clarity."
    if uniq < 0.45:
        return "You repeat a few words often. Swap some repeats for stronger synonyms to lift the vocabulary."
    if not re.search(r"[\"'\u2018\u2019\u201c\u201d]", text) and wc > 120:
        return "Consider adding a vivid detail or a short quote to ground an abstract point and pull the reader in."
    return "Strengthen your opening line — lead with your most striking image or claim so the reader is hooked immediately."


def suggest(text: str) -> dict:
    text = (text or "").strip()
    if len(text.split()) < 5:
        return {"suggestion": "Write a little more first — a few sentences — then I can give you a useful tip.", "source": "none"}
    tip = _online(text)
    if tip:
        return {"suggestion": tip, "source": "online"}
    tip = _ollama(text)
    if tip:
        return {"suggestion": tip, "source": "offline"}
    return {"suggestion": _heuristic(text), "source": "heuristic"}
