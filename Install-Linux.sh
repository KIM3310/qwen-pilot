#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

clear
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║                                          ║"
echo "  ║   🚀 Qwen Pilot — Auto Installer         ║"
echo "  ║                                          ║"
echo "  ║   이 창을 닫지 마세요!                     ║"
echo "  ║   Do not close this window!              ║"
echo "  ║                                          ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

step() { echo ""; echo "  ▸ $1"; echo "  ─────────────────────────────"; }

step "1/6  Checking Node.js..."
if command -v node &>/dev/null; then
  echo "  ✅ Node.js $(node --version) already installed"
else
  echo "  📦 Installing Node.js..."
  if command -v apt-get &>/dev/null; then
    echo "  Detected apt (Debian/Ubuntu)"
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif command -v dnf &>/dev/null; then
    echo "  Detected dnf (Fedora/RHEL)"
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
    sudo dnf install -y nodejs
  elif command -v pacman &>/dev/null; then
    echo "  Detected pacman (Arch)"
    sudo pacman -Sy --noconfirm nodejs npm
  elif command -v zypper &>/dev/null; then
    echo "  Detected zypper (openSUSE)"
    sudo zypper install -y nodejs22
  else
    echo "  ❌ Could not detect package manager."
    echo "     Please install Node.js >= 20 manually: https://nodejs.org/"
    exit 1
  fi
  echo "  ✅ Node.js installed"
fi

step "2/6  Checking Qwen CLI..."
if command -v qwen &>/dev/null; then
  echo "  ✅ Qwen CLI already installed"
else
  echo "  📦 Installing Qwen CLI (via pip)..."
  if command -v pip3 &>/dev/null; then
    pip3 install dashscope 2>/dev/null || true
  elif command -v pip &>/dev/null; then
    pip install dashscope 2>/dev/null || true
  fi
  echo "  ℹ️  Qwen CLI setup — see https://dashscope.console.aliyun.com/"
fi

step "3/6  Installing dependencies..."
npm install --no-fund --no-audit
echo "  ✅ Done"

step "4/6  Building..."
npm run build
echo "  ✅ Done"

step "5/6  Registering 'qp' command..."
npm link 2>/dev/null || sudo npm link
echo "  ✅ Done"

step "6/6  Running setup..."
node dist/cli/index.js setup
echo "  ✅ Done"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   ✅ Installation Complete!               ║"
echo "  ║                                          ║"
echo "  ║   qp harness    (start session)          ║"
echo "  ║   qp ask \"q\"    (quick query)            ║"
echo "  ║   qp team 3     (multi-agent)            ║"
echo "  ║   qp --help     (all commands)           ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Press any key to close..."
read -n 1 -s
