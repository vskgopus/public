@echo off
rem Start NCERT Exam Prep (Windows). Run install.bat once first.
cd /d "%~dp0"
if not exist ".venv\Scripts\pythonw.exe" (
  echo Run install.bat first.
  pause
  exit /b 1
)
start "" ".venv\Scripts\pythonw.exe" launcher.py
