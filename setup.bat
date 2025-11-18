@echo off
echo.
echo ========================================
echo   News Radar - Setup Script
echo ========================================
echo.

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo    Node.js found!

echo.
echo [2/4] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo    Dependencies installed!

echo.
echo [3/4] Building TypeScript...
call npm run build
if errorlevel 1 (
    echo WARNING: Build failed, but you can use tsx for development
)

echo.
echo [4/4] Testing CLI...
call npm run scan -- --hours 1 --max-results 3
if errorlevel 1 (
    echo WARNING: Test scan had issues
) else (
    echo    CLI is working!
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo You can now run:
echo   npm run scan                    # Default 24h scan
echo   npm run scan -- --hours 12      # Custom time window
echo   npm run scan -- --keywords AI   # Filter by keywords
echo.
echo For full documentation, see README.md
echo.
pause
