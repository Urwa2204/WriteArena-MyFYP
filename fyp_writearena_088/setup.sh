#!/bin/bash
set -e
echo "WriteArena Setup"

command -v python3 >/dev/null 2>&1 || { echo "Python3 required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js required"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "PostgreSQL required"; exit 1; }

echo "[1/5] Creating database..."
createdb writearena 2>/dev/null || echo "Database exists, continuing..."

echo "[2/5] Setting up .env..."
[ ! -f backend/.env ] && cp backend/.env.example backend/.env

echo "[3/5] Installing Python dependencies..."
cd backend
pip3 install torch --index-url https://download.pytorch.org/whl/cpu
pip3 install -r requirements.txt
python3 -m spacy download en_core_web_sm
cd ..

echo "[4/5] Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo "Setup complete. Run ./start.sh"
