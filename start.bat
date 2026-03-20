@echo off
echo Starting LifeFlow Scheduler...
echo.

echo Starting Backend Server (port 5001)...
start "LifeFlow Backend" cmd /k "cd /d "%~dp0server" && node index.js"

timeout /t 2 /nobreak >nul

echo Starting Frontend (port 5173)...
start "LifeFlow Frontend" cmd /k "cd /d "%~dp0client" && npx vite --port 5173"

echo.
echo =========================================
echo  LifeFlow Scheduler is starting up!
echo =========================================
echo  Backend API:  http://localhost:5001
echo  Frontend App: http://localhost:5173
echo =========================================
echo.
timeout /t 3 /nobreak >nul
start http://localhost:5173
