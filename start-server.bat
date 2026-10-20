@echo off
title Sistema Institucional - Servidor Web Local
echo Iniciando servidor web institucional...
powershell -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
pause
