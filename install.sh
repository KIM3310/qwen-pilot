#!/usr/bin/env bash
set -e

echo "🚀 Qwen Pilot — Auto Installer"
echo "================================"

# 1. Check/Install Node.js
if ! command -v node &>/dev/null; then
  echo "📦 Node.js not found. Installing..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew &>/dev/null; then
      brew install node
    else
      echo "Installing Homebrew first..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      brew install node
    fi
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
else
  echo "✅ Node.js $(node --version) found"
fi

# 2. Check/Install Qwen CLI
if ! command -v qwen &>/dev/null; then
  echo "📦 Installing Qwen CLI..."
  # Try pip install first (DashScope), then npm if available
  if command -v pip3 &>/dev/null; then
    pip3 install dashscope qwen-cli 2>/dev/null || echo "⚠️  Qwen CLI package not found via pip. You may need to install it manually."
  elif command -v pip &>/dev/null; then
    pip install dashscope qwen-cli 2>/dev/null || echo "⚠️  Qwen CLI package not found via pip."
  else
    echo "⚠️  Qwen CLI not found. Install it manually from https://dashscope.console.aliyun.com/"
  fi
else
  echo "✅ Qwen CLI found"
fi

# 3. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 4. Build
echo "🔨 Building..."
npm run build

# 5. Link globally
echo "🔗 Linking 'qp' command..."
npm link 2>/dev/null || sudo npm link

# 6. Setup
echo "⚙️ Running setup..."
node dist/cli/index.js setup

# 7. Doctor
echo ""
echo "🏥 Running doctor..."
node dist/cli/index.js doctor

echo ""
echo "✅ Installation complete!"
echo ""
echo "Usage:"
echo "  qp harness          # Launch enhanced Qwen session"
echo "  qp team 3           # Launch 3-agent team"
echo "  qp ask \"question\"   # Single query"
echo "  qp --help           # See all commands"
