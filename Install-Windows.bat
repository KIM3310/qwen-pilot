@echo off
setlocal EnableDelayedExpansion
title Qwen Pilot - Auto Installer
color 0F

cls
echo.
echo   ╔══════════════════════════════════════════╗
echo   ║                                          ║
echo   ║   Qwen Pilot -- Auto Installer           ║
echo   ║                                          ║
echo   ║   Do not close this window!              ║
echo   ║                                          ║
echo   ╚══════════════════════════════════════════╝
echo.

echo   [1/6] Checking Node.js...
echo   ---------------------------------
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo   Installing Node.js via winget...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if !ERRORLEVEL! neq 0 (
        echo.
        echo   ERROR: Could not install Node.js automatically.
        echo   Please install from https://nodejs.org/ and re-run.
        echo.
        pause
        exit /b 1
    )
    echo   Refreshing PATH...
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
    echo   Node.js installed
) else (
    for /f "tokens=*" %%i in ('node --version') do echo   Node.js %%i already installed
)

echo.
echo   [2/6] Checking Qwen CLI...
echo   ---------------------------------
where qwen >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo   Installing Qwen CLI via pip...
    where pip3 >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        pip3 install dashscope 2>nul
    ) else (
        where pip >nul 2>nul
        if !ERRORLEVEL! equ 0 (
            pip install dashscope 2>nul
        )
    )
    echo   Qwen CLI setup -- see https://dashscope.console.aliyun.com/
) else (
    echo   Qwen CLI already installed
)

echo.
echo   [3/6] Installing dependencies...
echo   ---------------------------------
call npm install --no-fund --no-audit
if %ERRORLEVEL% neq 0 (
    echo   ERROR: npm install failed.
    pause
    exit /b 1
)
echo   Done

echo.
echo   [4/6] Building...
echo   ---------------------------------
call npm run build
if %ERRORLEVEL% neq 0 (
    echo   ERROR: Build failed.
    pause
    exit /b 1
)
echo   Done

echo.
echo   [5/6] Registering 'qp' command...
echo   ---------------------------------
call npm link
echo   Done

echo.
echo   [6/6] Running setup...
echo   ---------------------------------
node dist\cli\index.js setup
echo   Done

echo.
echo   ╔══════════════════════════════════════════╗
echo   ║   Installation Complete!                 ║
echo   ║                                          ║
echo   ║   qp harness    (start session)          ║
echo   ║   qp ask "q"    (quick query)            ║
echo   ║   qp team 3     (multi-agent)            ║
echo   ║   qp --help     (all commands)           ║
echo   ╚══════════════════════════════════════════╝
echo.
echo   Press any key to close...
pause >nul
