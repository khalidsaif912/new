@echo off
setlocal

set "PORT=8011"
set "DOCS_DIR=%~dp0docs"

if not exist "%DOCS_DIR%" (
  echo [ERROR] docs folder not found: "%DOCS_DIR%"
  exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python is not installed or not in PATH.
  exit /b 1
)

echo Serving docs from: "%DOCS_DIR%"
echo Open: http://127.0.0.1:%PORT%
echo Press Ctrl+C to stop.
echo.

cd /d "%DOCS_DIR%"
python -m http.server %PORT% --bind 127.0.0.1
