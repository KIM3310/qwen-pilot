@echo off
setlocal EnableDelayedExpansion
title Qwen Pilot - Auto Installer (Windows)
color 0F
chcp 65001 >nul 2>nul

cls
echo.
echo   ========================================
echo   =                                      =
echo   =   Qwen Pilot -- Auto Installer       =
echo   =   (Windows)                           =
echo   =                                      =
echo   =   Do not close this window!           =
echo   =                                      =
echo   ========================================
echo.

:: ── Timer start ──────────────────────────────────────────
for /f "tokens=1-4 delims=:.," %%a in ("%TIME%") do (
    set /a "START_S=(((%%a*60)+1%%b %% 100)*60)+1%%c %% 100"
)

:: ── Detect OS / Arch ─────────────────────────────────────
for /f "tokens=2 delims==" %%i in ('wmic os get Caption /value 2^>nul ^| find "Caption"') do set "OS_NAME=%%i"
set "ARCH=%PROCESSOR_ARCHITECTURE%"
echo   Detected: %OS_NAME% (%ARCH%)
echo.

set REQUIRED_NODE_MAJOR=20

:: ═══════════════════════════════════════════════════════════
:: STEP 1 — Node.js (>= 20)
:: ═══════════════════════════════════════════════════════════
echo   [1/7] Checking Node.js (^>= %REQUIRED_NODE_MAJOR%)...
echo   ---------------------------------

where node >nul 2>nul
if !ERRORLEVEL! neq 0 (
    echo   Node.js not found. Installing...
    call :InstallNode
    if !ERRORLEVEL! neq 0 (
        echo.
        echo   [FAIL] Could not install Node.js automatically.
        echo          Please install from https://nodejs.org/ and re-run.
        echo.
        pause
        exit /b 1
    )
    call :RefreshPath
    :: Persist Node.js in system PATH
    for /f "tokens=*" %%a in ('where node 2^>nul') do set "NODE_DIR=%%~dpa"
    if defined NODE_DIR (
        setx PATH "%PATH%;!NODE_DIR!" /M 2>nul || setx PATH "%PATH%;!NODE_DIR!"
    )
    echo   [OK] Node.js installed
) else (
    :: Check version
    for /f "tokens=1 delims=." %%v in ('node --version 2^>nul') do set "NODE_VER_RAW=%%v"
    set "NODE_MAJOR=!NODE_VER_RAW:v=!"
    if !NODE_MAJOR! LSS %REQUIRED_NODE_MAJOR% (
        echo   [WARN] Node.js v!NODE_MAJOR! found but ^>= %REQUIRED_NODE_MAJOR% required. Upgrading...
        call :InstallNode
        if !ERRORLEVEL! neq 0 (
            echo   [FAIL] Could not upgrade Node.js. Please install from https://nodejs.org/
            pause
            exit /b 1
        )
        call :RefreshPath
        echo   [OK] Node.js upgraded
    ) else (
        for /f "tokens=*" %%i in ('node --version') do echo   [OK] Node.js %%i already installed
    )
)

:: ═══════════════════════════════════════════════════════════
:: STEP 2 — Python / pip check
:: ═══════════════════════════════════════════════════════════
:: STEP 2 — Qwen Code CLI (npm)
:: ═══════════════════════════════════════════════════════════
echo.
echo   [3/7] Checking Qwen Code CLI...
echo   ---------------------------------

where qwen >nul 2>nul || where qwen-code >nul 2>nul
if !ERRORLEVEL! equ 0 (
    echo   [OK] Qwen Code CLI already installed
) else (
    echo   Installing Qwen Code CLI...
    call npm install -g @qwen-code/qwen-code
    where qwen >nul 2>nul || where qwen-code >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        echo   [OK] Qwen Code CLI installed
    ) else (
        echo   [WARN] Could not install Qwen Code CLI. Try manually: npm install -g @qwen-code/qwen-code
    )
)

:: ═══════════════════════════════════════════════════════════
:: STEP 4 — npm install
:: ═══════════════════════════════════════════════════════════
echo.
echo   [4/7] Installing dependencies...
echo   ---------------------------------
call npm install --no-fund --no-audit
if !ERRORLEVEL! neq 0 (
    echo   [FAIL] npm install failed.
    pause
    exit /b 1
)
echo   [OK] Done

:: ═══════════════════════════════════════════════════════════
:: STEP 5 — Build
:: ═══════════════════════════════════════════════════════════
echo.
echo   [5/7] Building...
echo   ---------------------------------
call npm run build
if !ERRORLEVEL! neq 0 (
    echo   [FAIL] Build failed.
    pause
    exit /b 1
)
echo   [OK] Done

:: ═══════════════════════════════════════════════════════════
:: STEP 6 — npm link (admin detection)
:: ═══════════════════════════════════════════════════════════
echo.
echo   [6/7] Registering 'qp' command...
echo   ---------------------------------

:: Try without admin first
call npm link 2>nul
if !ERRORLEVEL! neq 0 (
    echo   [WARN] npm link failed. Trying with elevated permissions...
    net session >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        :: Already admin
        call npm link
    ) else (
        echo   [WARN] Not running as Administrator.
        echo          Please re-run this script as Administrator, or run manually:
        echo          npm link
    )
)
:: Persist npm global prefix in PATH
for /f "tokens=*" %%a in ('npm config get prefix 2^>nul') do set "NPM_PREFIX=%%a"
if defined NPM_PREFIX (
    echo !PATH! | find /i "!NPM_PREFIX!" >nul 2>nul
    if !ERRORLEVEL! neq 0 (
        setx PATH "%PATH%;!NPM_PREFIX!" /M 2>nul || setx PATH "%PATH%;!NPM_PREFIX!"
        set "PATH=!PATH!;!NPM_PREFIX!"
    )
)
echo   [OK] Done

:: ═══════════════════════════════════════════════════════════
:: STEP 7 — Setup + Doctor
:: ═══════════════════════════════════════════════════════════
echo.
echo   [7/7] Running setup ^& doctor...
echo   ---------------------------------
node dist\cli\index.js setup
if !ERRORLEVEL! neq 0 (
    echo   [FAIL] Setup failed.
    pause
    exit /b 1
)
echo   [OK] Setup complete

where qp >nul 2>nul
if !ERRORLEVEL! equ 0 (
    echo   Running qp doctor...
    call qp doctor
    if !ERRORLEVEL! neq 0 (
        echo   [WARN] qp doctor reported issues (see above)
    )
) else (
    echo   [WARN] 'qp' command not found in PATH -- try opening a new terminal
)

:: ── Timer end ────────────────────────────────────────────
for /f "tokens=1-4 delims=:.," %%a in ("%TIME%") do (
    set /a "END_S=(((%%a*60)+1%%b %% 100)*60)+1%%c %% 100"
)
set /a "ELAPSED=END_S - START_S"
if !ELAPSED! LSS 0 set /a "ELAPSED=ELAPSED + 86400"
set /a "MINS=ELAPSED / 60"
set /a "SECS=ELAPSED %% 60"

echo.
echo   ========================================
echo   =   Installation Complete!             =
echo   =                                      =
echo   =   qp harness    (start session)      =
echo   =   qp ask "q"    (quick query)        =
echo   =   qp team 3     (multi-agent)        =
echo   =   qp --help     (all commands)       =
echo   ========================================
echo.
echo   Total time: !MINS!m !SECS!s
echo.
echo   Press any key to close...
pause >nul
exit /b 0

:: ═══════════════════════════════════════════════════════════
:: SUBROUTINES
:: ═══════════════════════════════════════════════════════════

:InstallNode
:: Try winget first
where winget >nul 2>nul
if !ERRORLEVEL! equ 0 (
    echo   Trying winget...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if !ERRORLEVEL! equ 0 exit /b 0
)
:: Try chocolatey
where choco >nul 2>nul
if !ERRORLEVEL! equ 0 (
    echo   Trying choco...
    choco install nodejs-lts -y
    if !ERRORLEVEL! equ 0 exit /b 0
)
:: Try scoop
where scoop >nul 2>nul
if !ERRORLEVEL! equ 0 (
    echo   Trying scoop...
    scoop install nodejs-lts
    if !ERRORLEVEL! equ 0 exit /b 0
)
echo   [WARN] No package manager (winget/choco/scoop) could install Node.js.
exit /b 1

:RefreshPath
:: Refresh PATH from registry so newly installed tools are found
echo   Refreshing PATH...
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%B"
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USR_PATH=%%B"
set "PATH=!SYS_PATH!;!USR_PATH!"
:: Also add common Node.js install locations
set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs;!PATH!"
exit /b 0
