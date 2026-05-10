@echo off
echo Publishing Home Agents...
echo.
set /p COMMIT_MSG=Commit message: 
if "%COMMIT_MSG%"=="" (
    echo Commit message cannot be empty.
    pause
    exit /b 1
)

echo.
echo Syncing to GitHub...
git add .
git commit -m "%COMMIT_MSG%"
if %ERRORLEVEL% neq 0 goto :fail
git push
if %ERRORLEVEL% neq 0 goto :fail

echo.
echo Deploying webapp...
cd webapp
call npm run deploy
if %ERRORLEVEL% neq 0 (
    cd ..
    goto :fail
)
cd ..

echo.
echo Published successfully! Live at https://gengire.github.io/home-agents/
pause
exit /b 0

:fail
echo.
echo Something failed -- check the errors above.
pause
exit /b 1
