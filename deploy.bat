@echo off
echo Deploying Home Agents webapp...
cd webapp
call npm run deploy
if %ERRORLEVEL% neq 0 (
    echo.
    echo Deploy failed -- check the error above
    pause
    exit /b 1
)
cd ..
echo.
echo Deploy complete! Live at https://gengire.github.io/home-agents/
pause
