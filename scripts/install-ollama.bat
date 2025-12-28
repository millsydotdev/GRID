@echo off
setlocal
echo [GRID] Installing Ollama (Windows)...
powershell -ExecutionPolicy Bypass -File "%~dp0install-ollama.ps1"
endlocal

