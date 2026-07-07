#!/usr/bin/env bash
# Nirdesh — one-command demo launcher (macOS / Linux / Git-Bash).
# Starts the FastAPI backend and the Vite frontend, seeds a clean DB first.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "==> Preparing backend"
cd backend
if [ ! -d ".venv" ]; then
  python -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate
pip install -q -r requirements.txt

echo "==> Seeding clean demo database"
python seed_cache.py
python seed_db.py

echo "==> Starting backend on :8000"
uvicorn app.main:app --port 8000 --log-level warning &
BACKEND_PID=$!
cd "$ROOT"

echo "==> Preparing frontend"
cd frontend
[ -d node_modules ] || npm install

echo "==> Starting frontend on :5173"
npm run dev -- --host 127.0.0.1 --port 5173 &
FRONTEND_PID=$!
cd "$ROOT"

trap 'echo; echo "==> Shutting down"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' INT TERM

echo
echo "  Nirdesh is running:"
echo "    Frontend  ->  http://127.0.0.1:5173"
echo "    Backend   ->  http://localhost:8000  (docs at /docs)"
echo
echo "  Press Ctrl+C to stop."
wait
