@echo off
setlocal

set "PORT=8011"
set "FOUND=0"

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
  set "FOUND=1"
  echo Stopping PID %%P on port %PORT%...
  taskkill /PID %%P /F >nul 2>nul
)

if "%FOUND%"=="0" (
  echo No process is listening on port %PORT%.
) else (
  echo Done. Server on port %PORT% has been stopped.
)
