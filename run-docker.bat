@echo off
title Construir y Correr WebEducativa con Docker
echo ===================================================
echo   CONSTRUYENDO CONTENEDOR DOCKER (NGINX)
echo ===================================================
echo Verificando si Docker esta instalado y en ejecucion...
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker no esta instalado o no se encuentra en el PATH.
    echo Asegurate de tener Docker Desktop instalado y abierto.
    echo Puedes ejecutar 'start-server.bat' para correrlo directamente sin Docker.
    pause
    exit /b 1
)

echo Deteniendo y removiendo contenedor previo si existe...
docker stop web_educativa_app >nul 2>&1
docker rm web_educativa_app >nul 2>&1

echo Construyendo la imagen Docker...
docker build -t web_educativa_app:latest .

echo Iniciando el contenedor en el puerto 8080...
docker run -d --name web_educativa_app -p 8080:80 web_educativa_app:latest

echo ===================================================
echo   APLICACION LISTA EN DOCKER!
echo   Accede desde tu navegador a: http://localhost:8080
echo ===================================================
start http://localhost:8080
pause
