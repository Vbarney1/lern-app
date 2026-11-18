@echo off
rem Startet die Lern-App lokal unter http://localhost:8080/
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1" %*
pause
