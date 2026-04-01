#Requires -Version 5.1
<#
.SYNOPSIS
    Qwen Pilot - Auto Installer for Windows PowerShell
.DESCRIPTION
    Installs Node.js (if missing), Qwen CLI, project dependencies,
    and sets up the qp command globally.
#>

$ErrorActionPreference = "Stop"

Write-Host "🚀 Qwen Pilot — Auto Installer" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# 1. Check/Install Node.js
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "📦 Node.js not found. Installing..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        Write-Host "✅ Node.js installed. You may need to restart your terminal." -ForegroundColor Green
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install nodejs-lts -y
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        Write-Host "✅ Node.js installed via Chocolatey." -ForegroundColor Green
    } else {
        Write-Host "❌ Cannot auto-install Node.js. Please install from https://nodejs.org/" -ForegroundColor Red
        Write-Host "   After installing, re-run this script." -ForegroundColor Red
        exit 1
    }
}

# Verify Node.js is available
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not available in PATH. Please restart your terminal and re-run." -ForegroundColor Red
    exit 1
}

# 2. Check/Install Qwen CLI
if (Get-Command qwen -ErrorAction SilentlyContinue) {
    Write-Host "✅ Qwen CLI found" -ForegroundColor Green
} else {
    Write-Host "📦 Installing Qwen CLI..." -ForegroundColor Yellow
    if (Get-Command pip3 -ErrorAction SilentlyContinue) {
        pip3 install dashscope qwen-cli 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Qwen CLI package not found via pip. You may need to install it manually." -ForegroundColor Yellow
        }
    } elseif (Get-Command pip -ErrorAction SilentlyContinue) {
        pip install dashscope qwen-cli 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Qwen CLI package not found via pip." -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  Qwen CLI not found. Install it manually from https://dashscope.console.aliyun.com/" -ForegroundColor Yellow
    }
}

# 3. Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed." -ForegroundColor Red
    exit 1
}

# 4. Build
Write-Host "🔨 Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed." -ForegroundColor Red
    exit 1
}

# 5. Link globally
Write-Host "🔗 Linking 'qp' command..." -ForegroundColor Cyan
npm link
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  npm link failed. You may need to run as Administrator." -ForegroundColor Yellow
}

# 6. Setup
Write-Host "⚙️ Running setup..." -ForegroundColor Cyan
node dist/cli/index.js setup

# 7. Doctor
Write-Host ""
Write-Host "🏥 Running doctor..." -ForegroundColor Cyan
node dist/cli/index.js doctor

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Usage:" -ForegroundColor White
Write-Host "  qp harness          # Launch enhanced Qwen session" -ForegroundColor Gray
Write-Host "  qp team 3           # Launch 3-agent team" -ForegroundColor Gray
Write-Host '  qp ask "question"   # Single query' -ForegroundColor Gray
Write-Host "  qp --help           # See all commands" -ForegroundColor Gray
