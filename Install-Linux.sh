#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Qwen Pilot — Linux Installer (bulletproof edition)
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

# ── sudo helper (skip if already root) ───────────────────────
SUDO=""
if [[ $(id -u) -ne 0 ]]; then
  if command -v sudo &>/dev/null; then
    SUDO="sudo"
  else
    warn "Not root and sudo not found. Some installs may fail."
  fi
fi

clear
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║                                          ║"
echo "  ║   Qwen Pilot -- Auto Installer (Linux)  ║"
echo "  ║                                          ║"
echo "  ║   Do not close this window!              ║"
echo "  ║                                          ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── Detect OS / Arch ─────────────────────────────────────────
ARCH=$(uname -m)
if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  DISTRO="${NAME:-unknown} ${VERSION_ID:-}"
else
  DISTRO="unknown"
fi
info "Detected: ${DISTRO} (${ARCH})"

# ── Detect package manager ───────────────────────────────────
PKG=""
if command -v apt-get &>/dev/null; then
  PKG="apt"
elif command -v dnf &>/dev/null; then
  PKG="dnf"
elif command -v yum &>/dev/null; then
  PKG="yum"
elif command -v pacman &>/dev/null; then
  PKG="pacman"
elif command -v zypper &>/dev/null; then
  PKG="zypper"
elif command -v apk &>/dev/null; then
  PKG="apk"
fi
info "Package manager: ${PKG:-none detected}"

# ── pkg_install helper ───────────────────────────────────────
pkg_install() {
  local pkg="$1"
  case "$PKG" in
    apt)    $SUDO apt-get update -qq && $SUDO apt-get install -y "$pkg" ;;
    dnf)    $SUDO dnf install -y "$pkg" ;;
    yum)    $SUDO yum install -y "$pkg" ;;
    pacman) $SUDO pacman -Sy --noconfirm "$pkg" ;;
    zypper) $SUDO zypper install -y "$pkg" ;;
    apk)    $SUDO apk add --no-cache "$pkg" ;;
    *)      fail "No supported package manager found. Install '$pkg' manually." ;;
  esac
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
  elif command -v python &>/dev/null; then
    python -m pip "$@"
  else
    return 1
  fi
}

# ═════════════════════════════════════════════════════════════
# STEP 1 — Prerequisites (curl, git)
# ═════════════════════════════════════════════════════════════
step "1/8  Checking prerequisites (curl, git)..."

if command -v curl &>/dev/null; then
  ok "curl found"
else
  info "Installing curl..."
  pkg_install curl
  ok "curl installed"
fi

if command -v git &>/dev/null; then
  ok "git found"
else
  info "Installing git..."
  pkg_install git
  ok "git installed"
fi

# ═════════════════════════════════════════════════════════════
# STEP 2 — Node.js (>= 20)
# ═════════════════════════════════════════════════════════════
step "2/8  Checking Node.js (>= ${REQUIRED_NODE_MAJOR})..."

install_node() {
  info "Installing Node.js 22.x via NodeSource..."
  case "$PKG" in
    apt)
      curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash -
      $SUDO apt-get install -y nodejs
      ;;
    dnf|yum)
      curl -fsSL https://rpm.nodesource.com/setup_22.x | $SUDO bash -
      $SUDO "$PKG" install -y nodejs
      ;;
    pacman)
      $SUDO pacman -Sy --noconfirm nodejs npm
      ;;
    zypper)
      curl -fsSL https://rpm.nodesource.com/setup_22.x | $SUDO bash -
      $SUDO zypper install -y nodejs
      ;;
    apk)
      $SUDO apk add --no-cache nodejs npm
      ;;
    *)
      fail "Cannot install Node.js: no supported package manager. Install manually: https://nodejs.org/"
      ;;
  esac
}

if command -v node &>/dev/null; then
  NODE_MAJOR=$(get_node_major)
  if (( NODE_MAJOR >= REQUIRED_NODE_MAJOR )); then
    ok "Node.js $(node --version) already installed"
  else
    warn "Node.js v${NODE_MAJOR} found but >= ${REQUIRED_NODE_MAJOR} required. Upgrading..."
    install_node
    ok "Node.js upgraded to $(node --version)"
  fi
else
  install_node
  ok "Node.js $(node --version) installed"
fi

# ═════════════════════════════════════════════════════════════
# STEP 3 — Python / pip
# ═════════════════════════════════════════════════════════════
step "3/8  Checking Python / pip..."

if run_pip --version &>/dev/null; then
  ok "pip available"
else
  info "pip not found. Installing Python 3 + pip..."
  case "$PKG" in
    apt)    $SUDO apt-get update -qq && $SUDO apt-get install -y python3-pip ;;
    dnf)    $SUDO dnf install -y python3-pip ;;
    yum)    $SUDO yum install -y python3-pip ;;
    pacman) $SUDO pacman -Sy --noconfirm python-pip ;;
    zypper) $SUDO zypper install -y python3-pip ;;
    apk)    $SUDO apk add --no-cache py3-pip ;;
    *)      warn "Cannot install pip automatically. Install Python 3 manually." ;;
  esac
  if run_pip --version &>/dev/null; then
    ok "pip installed"
  else
    warn "pip still not available after install attempt"
  fi
fi

# ═════════════════════════════════════════════════════════════
# STEP 4 — Qwen CLI (dashscope)
# ═════════════════════════════════════════════════════════════
step "4/8  Checking Qwen CLI..."
if command -v qwen &>/dev/null; then
  ok "Qwen CLI already installed"
else
  info "Installing Qwen CLI (dashscope via pip)..."
  if run_pip install dashscope 2>/dev/null; then
    ok "dashscope package installed"
  else
    warn "Could not install dashscope. Try manually: pip3 install dashscope"
  fi
  info "Qwen CLI setup -- see https://dashscope.console.aliyun.com/"
fi

# ═════════════════════════════════════════════════════════════
# STEP 5 — npm install
# ═════════════════════════════════════════════════════════════
step "5/8  Installing dependencies..."
npm install --no-fund --no-audit || fail "npm install failed"
ok "Done"

# ═════════════════════════════════════════════════════════════
# STEP 6 — Build
# ═════════════════════════════════════════════════════════════
step "6/8  Building..."
npm run build || fail "Build failed"
ok "Done"

# ═════════════════════════════════════════════════════════════
# STEP 7 — npm link
# ═════════════════════════════════════════════════════════════
step "7/8  Registering 'qp' command..."
npm link 2>/dev/null || $SUDO npm link || fail "npm link failed"
ok "Done"

# ═════════════════════════════════════════════════════════════
# STEP 8 — Setup + Doctor
# ═════════════════════════════════════════════════════════════
step "8/8  Running setup & doctor..."
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
