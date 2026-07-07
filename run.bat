@echo off
REM Nirdesh - one-command demo launcher (Windows).
REM Starts the FastAPI backend and the Vite frontend in separate windows.
setlocal
set ROOT=%~dp0

echo ==> Preparing backend
cd /d "%ROOT%backend"
if not exist ".venv" (
  python -m venv .venv
)
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt

echo ==> Seeding clean demo database
python seed_cache.py
python seed_db.py

echo ==> Starting backend on :8000
start "Nirdesh Backend" cmd /k "cd /d %ROOT%backend && call .venv\Scripts\activate.bat && uvicorn app.main:app --port 8000"

echo ==> Preparing frontend
cd /d "%ROOT%frontend"
if not exist "node_modules" (
  call npm install
)

echo ==> Starting frontend on :5173
start "Nirdesh Frontend" cmd /k "cd /d %ROOT%frontend && npm run dev -- --host 127.0.0.1 --port 5173"

echo.
echo   Nirdesh is starting in two new windows:
echo     Frontend  ^-^>  http://127.0.0.1:5173
echo     Backend   ^-^>  http://localhost:8000  (docs at /docs)
echo.
endlocal
