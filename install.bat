@echo off
echo 🚀 Qwen Pilot — Auto Installer
echo ================================

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo 📦 Node.js not found. Installing via winget...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    echo Please restart this script after installation.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do echo ✅ Node.js %%i found
)

where qwen >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo 📦 Installing Qwen CLI...
    pip install dashscope qwen-cli 2>nul || echo ⚠️ Qwen CLI not found via pip. Install manually.
) else (
    echo ✅ Qwen CLI found
)

echo 📦 Installing dependencies...
call npm install

echo 🔨 Building...
call npm run build

echo 🔗 Linking 'qp' command...
call npm link

echo ⚙️ Running setup...
node dist\cli\index.js setup

echo.
echo 🏥 Running doctor...
node dist\cli\index.js doctor

echo.
echo ✅ Installation complete!
echo   qp harness / qp team 3 / qp ask "question" / qp --help
pause
