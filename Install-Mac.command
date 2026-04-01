#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Qwen Pilot — macOS Installer (bulletproof edition)
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ── Timer ────────────────────────────────────────────────────
START_TIME=$(date +%s)

# ── Helpers ──────────────────────────────────────────────────
info()  { printf "  ${CYAN}%s${NC}\n" "$*"; }
ok()    { printf "  ${GREEN}[OK]${NC} %s\n" "$*"; }
warn()  { printf "  ${YELLOW}[WARN]${NC} %s\n" "$*"; }
fail()  { printf "  ${RED}[FAIL]${NC} %s\n" "$*"; exit 1; }
step()  { printf "\n  ${BOLD}▸ %s${NC}\n  ─────────────────────────────\n" "$1"; }

REQUIRED_NODE_MAJOR=20

clear
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║                                          ║"
echo "  ║   Qwen Pilot -- Auto Installer (macOS)  ║"
echo "  ║                                          ║"
echo "  ║   Do not close this window!              ║"
echo "  ║                                          ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── Detect OS / Arch ─────────────────────────────────────────
ARCH=$(uname -m)
OS_VER=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
info "Detected: macOS ${OS_VER} (${ARCH})"

# ── Brew path helper (Apple Silicon vs Intel) ────────────────
setup_brew_env() {
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
}

# ── node_major helper ────────────────────────────────────────
get_node_major() {
  local ver
  ver=$(node --version 2>/dev/null | sed 's/^v//')
  echo "${ver%%.*}"
}

# ── pip helper (try pip3, pip, python3 -m pip) ───────────────
run_pip() {
  if command -v pip3 &>/dev/null; then
    pip3 "$@"
  elif command -v pip &>/dev/null; then
    pip "$@"
  elif command -v python3 &>/dev/null; then
    python3 -m pip "$@"
  else
    warn "No pip found. Please install Python 3 and re-run."
    return 1
  fi
}

# ═════════════════════════════════════════════════════════════
# STEP 1 — Homebrew
# ═════════════════════════════════════════════════════════════
step "1/7  Checking Homebrew..."
if command -v brew &>/dev/null; then
  ok "Homebrew already installed"
else
  info "Installing Homebrew (may prompt for password)..."
  # xcode-select is required by Homebrew
  if ! xcode-select -p &>/dev/null; then
    info "Installing Xcode Command Line Tools first..."
    xcode-select --install 2>/dev/null || true
    # Wait for xcode-select to finish (user clicks Install in the dialog)
    until xcode-select -p &>/dev/null; do
      sleep 5
    done
    ok "Xcode Command Line Tools installed"
  fi
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" \
    || fail "Homebrew installation failed"
  setup_brew_env
  ok "Homebrew installed"
fi
setup_brew_env

# ═════════════════════════════════════════════════════════════
# STEP 2 — Node.js (>= 20)
# ═════════════════════════════════════════════════════════════
step "2/7  Checking Node.js (>= ${REQUIRED_NODE_MAJOR})..."
if command -v node &>/dev/null; then
  NODE_MAJOR=$(get_node_major)
  if (( NODE_MAJOR >= REQUIRED_NODE_MAJOR )); then
    ok "Node.js $(node --version) already installed"
  else
    warn "Node.js v${NODE_MAJOR} found but >= ${REQUIRED_NODE_MAJOR} required. Upgrading..."
    brew upgrade node || brew install node
    ok "Node.js upgraded to $(node --version)"
  fi
else
  info "Installing Node.js via Homebrew..."
  brew install node || fail "Node.js installation failed"
  ok "Node.js $(node --version) installed"
fi

# ═════════════════════════════════════════════════════════════
# STEP 3 — Qwen CLI (dashscope via pip)
# ═════════════════════════════════════════════════════════════
step "3/7  Checking Qwen CLI..."
if command -v qwen &>/dev/null; then
  ok "Qwen CLI already installed"
else
  info "Installing Qwen CLI (dashscope via pip)..."
  if run_pip install dashscope 2>/dev/null; then
    ok "dashscope package installed"
  else
    warn "Could not install dashscope. Install Python 3 / pip and run: pip3 install dashscope"
  fi
  info "Qwen CLI setup -- see https://dashscope.console.aliyun.com/"
fi

# ═════════════════════════════════════════════════════════════
# STEP 4 — npm install
# ═════════════════════════════════════════════════════════════
step "4/7  Installing dependencies..."
npm install --no-fund --no-audit || fail "npm install failed"
ok "Done"

# ═════════════════════════════════════════════════════════════
# STEP 5 — Build
# ═════════════════════════════════════════════════════════════
step "5/7  Building..."
npm run build || fail "Build failed"
ok "Done"

# ═════════════════════════════════════════════════════════════
# STEP 6 — npm link
# ═════════════════════════════════════════════════════════════
step "6/7  Registering 'qp' command..."
npm link 2>/dev/null || sudo npm link || fail "npm link failed"
ok "Done"

# ═════════════════════════════════════════════════════════════
# STEP 7 — Setup + Doctor
# ═════════════════════════════════════════════════════════════
step "7/7  Running setup & doctor..."
node dist/cli/index.js setup || fail "Setup failed"
ok "Setup complete"

if command -v qp &>/dev/null; then
  info "Running qp doctor..."
  qp doctor || warn "qp doctor reported issues (see above)"
else
  warn "'qp' command not found in PATH -- try opening a new terminal"
fi

# ── Summary ──────────────────────────────────────────────────
END_TIME=$(date +%s)
ELAPSED=$(( END_TIME - START_TIME ))
MINS=$(( ELAPSED / 60 ))
SECS=$(( ELAPSED % 60 ))

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   Installation Complete!                 ║"
echo "  ║                                          ║"
echo "  ║   qp harness    (start session)          ║"
echo "  ║   qp ask \"q\"    (quick query)            ║"
echo "  ║   qp team 3     (multi-agent)            ║"
echo "  ║   qp --help     (all commands)           ║"
echo "  ╚══════════════════════════════════════════╝"
printf "\n  ${CYAN}Total time: ${MINS}m ${SECS}s${NC}\n\n"
echo "  Press any key to close..."
read -n 1 -s
