# WriteArena — single-container image for Hugging Face Spaces (Docker SDK).
# Stage 1 builds the React frontend; stage 2 runs the FastAPI backend and
# serves that build, so the whole app is ONE URL on port 7860 (frontend,
# REST API and the WebSocket lobby all share one origin — no CORS, no
# cross-origin WebSocket setup).
#
# The heavy ML models (the AI-detector transformer, the spaCy pipeline and
# the nltk word list) are DOWNLOADED AT BUILD TIME and baked into the image,
# so a cold start never re-fetches ~500 MB and the first scoring request is
# fast. At runtime only /tmp is writable on a Space, so the caches live in a
# baked, read-only image path and transformers is put in OFFLINE mode to load
# straight from that cache without trying to phone home or write lock files.

# ---- Stage 1: build the React frontend ----
FROM node:20-slim AS frontend
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Python backend that also serves the built frontend ----
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_MODEL=Hello-SimpleAI/chatgpt-detector-roberta \
    HF_HOME=/app/model_cache \
    HF_HUB_CACHE=/app/model_cache/hub \
    TRANSFORMERS_CACHE=/app/model_cache \
    NLTK_DATA=/app/nltk_data

WORKDIR /app

# build tools for a few Python wheels (spaCy/blis, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install -r requirements.txt

# --- Bake the models into the image (network is available during build) ---
# spaCy English pipeline (used by the quality check)
RUN python -m spacy download en_core_web_sm
# nltk word list (used by the gibberish / real-word check)
RUN python -c "import nltk; nltk.download('words', download_dir='/app/nltk_data')"
# AI-detector transformer — cached now so cold starts don't re-download it
RUN python -c "from transformers import pipeline; import os; \
pipeline('text-classification', model=os.environ['HF_MODEL'], truncation=True, max_length=512); \
print('AI detector baked into image')"
# make the baked caches world-readable/writable for the runtime user
RUN chmod -R 777 /app/model_cache /app/nltk_data

# At RUNTIME, load models from the baked cache only (no network, no lock writes)
ENV HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1

COPY backend/ ./
# built frontend -> ./static (FastAPI serves it; see main.py)
COPY --from=frontend /fe/dist ./static

# Hugging Face Spaces routes traffic to the port declared in README (app_port: 7860).
EXPOSE 7860
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}
