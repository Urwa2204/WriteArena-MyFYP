@echo off
echo Starting WriteArena...
echo.
echo Starting backend on http://localhost:8000
echo Starting frontend on http://localhost:3000
echo.
echo Press Ctrl+C in each window to stop.
echo.

start "WriteArena Backend" cmd /k "cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul
start "WriteArena Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting. Visit http://localhost:3000
pause
