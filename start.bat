@echo off
setlocal

echo.
echo  ============================================
echo   Home Agents - Local Development Server
echo  ============================================
echo.

:: Navigate to the webapp directory
cd /d "%~dp0webapp"

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed or not in your PATH.
    echo.
    echo  Please install Node.js from https://nodejs.org/
    echo  Then run this file again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  Node.js version: %NODE_VER%

:: Install dependencies if node_modules is missing
if not exist "node_modules\" (
    echo.
    echo  [INFO] node_modules not found. Installing dependencies...
    echo  This only happens on the first run and may take a minute.
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo  [ERROR] npm install failed. Check your internet connection and try again.
        pause
        exit /b 1
    )
    echo.
    echo  Dependencies installed successfully.
)

:: Start the development server
echo.
echo  Starting development server...
echo.
echo  Once ready, open your browser to:
echo.
echo     http://localhost:5173/home-agents/
echo.
echo  Press Ctrl+C to stop the server.
echo.

call npm run dev

pause
