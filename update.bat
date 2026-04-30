@echo off
echo ==============================================
echo       PhotoBooth Auto-Updater to GitHub
echo ==============================================
echo.

set /p commitMsg="Enter your commit message (or press Enter for default): "
if "%commitMsg%"=="" set commitMsg="Update PhotoBooth project files"

echo.
echo [1/3] Staging files...
git add .

echo [2/3] Committing changes...
git commit -m "%commitMsg%"

echo [3/3] Pushing to GitHub...
git push origin main

echo.
echo ==============================================
echo  ✅ Project successfully updated on GitHub!
echo ==============================================
pause
