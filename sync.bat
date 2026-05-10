@echo off
echo Syncing to GitHub...
git add .
echo.
set /p COMMIT_MSG=Commit message: 
if "%COMMIT_MSG%"=="" (
    echo Commit message cannot be empty.
    pause
    exit /b 1
)
git commit -m "%COMMIT_MSG%"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Sync failed -- check the error above
    pause
    exit /b 1
)
git push
if %ERRORLEVEL% neq 0 (
    echo.
    echo Sync failed -- check the error above
    pause
    exit /b 1
)
echo.
echo Synced to GitHub!
pause
