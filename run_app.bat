@echo off
title QuantumRoute - Launcher
echo ========================================================
echo  QuantumRoute: Quantum-Inspired Traffic Optimization
echo  Smart India Hackathon Prototype
echo ========================================================
echo.

echo [1/3] Checking Python installation...
py --version >nul 2>&1
if %errorlevel% neq 0 (
    python --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python not found. Please install Python 3.10+ and add it to PATH.
        pause
        exit /b 1
    )
    set PY_CMD=python
) else (
    set PY_CMD=py
)

echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "QuantumRoute Backend" cmd /k "%PY_CMD% -m uvicorn backend.api:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Starting React Vite Frontend on http://127.0.0.1:5173 ...
cd frontend
start "QuantumRoute Frontend" cmd /k "npm run dev -- --host 127.0.0.1 --port 5173"
cd ..

echo.
echo ========================================================
echo  QuantumRoute is running!
echo  Backend:  http://127.0.0.1:8000
echo  Frontend: http://127.0.0.1:5173
echo ========================================================
echo.
pause
