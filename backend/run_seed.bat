@echo off
chcp 936 >nul
set "PYTHON=I:\AI 学习之路\claude code test\door-system\backend\venv\Scripts\python.exe"
set "BASEDIR=I:\AI 学习之路\claude code test\door-system\backend"
set "MANAGE=%BASEDIR%\manage.py"

echo ============================================
echo   Step 1: Run migrations
echo ============================================
cd /d "%BASEDIR%"
"%PYTHON%" "%MANAGE%" migrate --settings=config.settings.dev
if %errorlevel% neq 0 (
    echo [ERROR] Migration failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Step 2: Seed test data
echo ============================================
"%PYTHON%" "%BASEDIR%\seed_data.py" --settings=config.settings.dev
if %errorlevel% neq 0 (
    echo [ERROR] Seed failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Step 3: Verify data
echo ============================================
"%PYTHON%" "%BASEDIR%\verify_data.py" --settings=config.settings.dev
if %errorlevel% neq 0 (
    echo [ERROR] Verify failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo   ALL DONE!
echo ============================================
