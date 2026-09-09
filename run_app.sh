#!/usr/bin/env bash
# QuantumRoute - Cross-Platform Linux/macOS Launcher

echo "========================================================"
echo " QuantumRoute: Quantum-Inspired Traffic Optimization"
echo " Smart India Hackathon Prototype"
echo "========================================================"
echo ""

# Find python command
if command -v python3 &>/dev/null; then
    PY_CMD="python3"
elif command -v python &>/dev/null; then
    PY_CMD="python"
else
    echo "[ERROR] Python 3 not found. Please install Python 3.10+."
    exit 1
fi

echo "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ..."
$PY_CMD -m uvicorn backend.api:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

echo "[2/2] Starting React Vite Frontend on http://127.0.0.1:5173 ..."
cd frontend || exit 1
npm run dev -- --host 127.0.0.1 --port 5173 &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================================"
echo " QuantumRoute is live!"
echo " Backend:  http://127.0.0.1:8000"
echo " Frontend: http://127.0.0.1:5173"
echo " Press CTRL+C to terminate both servers."
echo "========================================================"

trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
