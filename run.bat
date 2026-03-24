@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "REPO_DIR=%~dp0"
set "VENV=%REPO_DIR%.venv\Scripts"

echo ==========================================
echo  B3 BMF Derivatives Monitor
echo ==========================================

:: Load .env if exists
if exist "%REPO_DIR%.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%REPO_DIR%.env") do (
        set "%%A=%%B"
    )
)

:: Defaults
if not defined HOST set HOST=127.0.0.1
if not defined PORT set PORT=8060

echo Starting server on %HOST%:%PORT%...
echo Open http://%HOST%:%PORT% in your browser
echo Press Ctrl+C to stop
echo.

"%VENV%\python.exe" -m uvicorn src.app:app --host %HOST% --port %PORT% --reload
