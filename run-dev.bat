@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "REPO_DIR=%~dp0"
set "VENV=%REPO_DIR%.venv\Scripts"

echo ==========================================
echo  B3 BMF Derivatives - Dev Mode
echo ==========================================
echo.
echo Starting backend on port 8060...
echo Starting frontend on port 3000...
echo.
echo Open http://localhost:3000 in your browser
echo Press Ctrl+C to stop
echo.

start "B3-Backend" cmd /c "cd /d %REPO_DIR% && "%VENV%\python.exe" -m uvicorn backend.src.app:app --host 127.0.0.1 --port 8060 --reload"

cd /d "%REPO_DIR%frontend"
call npm run dev
