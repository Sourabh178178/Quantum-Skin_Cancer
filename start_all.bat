@echo off
title MedQube Quantum Skin Cancer Platform
echo ========================================================
echo Starting MedQube Quantum Skin Cancer Platform
echo ========================================================
echo.
echo [1/2] Starting Python QEMNet Backend on http://127.0.0.1:8000 ...
start "QEMNet Python Backend (Port 8000)" cmd /k "python run_backend.py"

echo.
echo [2/2] Starting Next.js Web App on http://localhost:3000 ...
npm run dev
