@echo off
echo ============================================================
echo  WriteArena Setup Script (Windows)
echo ============================================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Install Python 3.10+ from python.org
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install Node.js 18+ from nodejs.org
    pause
    exit /b 1
)

:: Check PostgreSQL
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: psql not found. See README.md for PostgreSQL install instructions.
    pause
    exit /b 1
)

echo [1/5] Creating PostgreSQL database...
psql -U postgres -c "CREATE DATABASE writearena;" 2>nul
if %errorlevel% neq 0 (
    echo Database may already exist - continuing...
)

echo [2/5] Setting up .env file...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo Created backend\.env from example. Edit it to set your secret key.
)

echo [3/5] Installing backend dependencies (CPU PyTorch first)...
cd backend
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: pip install failed. Check Python/pip installation.
    pause
    exit /b 1
)

echo [4/5] Downloading SpaCy model...
python -m spacy download en_core_web_sm

echo [5/5] Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)

cd ..
echo.
echo ============================================================
echo  Setup complete! Run start.bat to start WriteArena.
echo ============================================================
pause
