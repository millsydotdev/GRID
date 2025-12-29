#!/usr/bin/env bash
###########################################################################################
# GRID Development Environment Setup Script
# Automates checking prerequisites and setting up the development environment
###########################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Emoji support
CHECK="✅"
CROSS="❌"
WARNING="⚠️ "
INFO="ℹ️ "
ROCKET="🚀"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ${ROCKET} GRID Development Environment Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     OS_TYPE=Linux;;
    Darwin*)    OS_TYPE=macOS;;
    CYGWIN*)    OS_TYPE=Windows;;
    MINGW*)     OS_TYPE=Windows;;
    *)          OS_TYPE="UNKNOWN"
esac

echo "${INFO} Detected OS: ${BLUE}${OS_TYPE}${NC}"
echo ""

# Track if any checks fail
CHECKS_PASSED=true

###########################################################################################
# Helper Functions
###########################################################################################

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
    CHECKS_PASSED=false
}

print_warning() {
    echo -e "${YELLOW}${WARNING}$1${NC}"
}

print_info() {
    echo -e "${BLUE}${INFO}$1${NC}"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

###########################################################################################
# Prerequisite Checks
###########################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Checking Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Node.js
echo -n "Checking Node.js... "
if check_command node; then
    NODE_VERSION=$(node --version)
    REQUIRED_VERSION="v22.20.0"
    if [ "$NODE_VERSION" = "$REQUIRED_VERSION" ]; then
        print_success "Node.js ${NODE_VERSION} (correct version!)"
    else
        print_warning "Node.js ${NODE_VERSION} (expected ${REQUIRED_VERSION})"
        print_info "   Install nvm and run: nvm install && nvm use"
        print_info "   Get nvm from: https://github.com/nvm-sh/nvm"
    fi
else
    print_error "Node.js not found!"
    print_info "   Install from: https://nodejs.org/"
    print_info "   Or use nvm: https://github.com/nvm-sh/nvm"
fi

# Check npm
echo -n "Checking npm... "
if check_command npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm ${NPM_VERSION}"
else
    print_error "npm not found!"
    print_info "   npm should come with Node.js"
fi

# Check Git
echo -n "Checking Git... "
if check_command git; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    print_success "Git ${GIT_VERSION}"
else
    print_error "Git not found!"
    print_info "   Install from: https://git-scm.com/"
fi

# Check Rust/Cargo
echo -n "Checking Rust/Cargo... "
if check_command cargo; then
    CARGO_VERSION=$(cargo --version | cut -d' ' -f2)
    print_success "Cargo ${CARGO_VERSION}"
else
    print_error "Cargo not found!"
    print_info "   Install from: https://rustup.rs/"
    print_info "   Run: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
fi

echo ""

# OS-specific checks
if [ "$OS_TYPE" = "macOS" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  macOS Specific Checks"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Check Xcode Command Line Tools
    echo -n "Checking Xcode Command Line Tools... "
    if xcode-select -p &> /dev/null; then
        print_success "Installed"
    else
        print_error "Not installed!"
        print_info "   Run: xcode-select --install"
    fi

    # Check Python
    echo -n "Checking Python... "
    if check_command python3 || check_command python; then
        PYTHON_VERSION=$(python3 --version 2>/dev/null || python --version 2>/dev/null)
        print_success "${PYTHON_VERSION}"
    else
        print_warning "Python not found (usually pre-installed on macOS)"
    fi

    echo ""

elif [ "$OS_TYPE" = "Linux" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Linux Specific Checks"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Detect Linux distro
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        print_info "Distribution: ${NAME}"
    else
        DISTRO="unknown"
        print_warning "Could not detect Linux distribution"
    fi

    # Check build essentials
    echo -n "Checking build-essential (gcc)... "
    if check_command gcc; then
        GCC_VERSION=$(gcc --version | head -n1 | cut -d' ' -f4)
        print_success "gcc ${GCC_VERSION}"
    else
        print_error "gcc not found!"
        case "$DISTRO" in
            ubuntu|debian)
                print_info "   Run: sudo apt-get install build-essential g++ libx11-dev libxkbfile-dev libsecret-1-dev libkrb5-dev python-is-python3"
                ;;
            fedora|rhel|centos)
                print_info "   Run: sudo dnf install @development-tools gcc gcc-c++ make libsecret-devel krb5-devel libX11-devel libxkbfile-devel"
                ;;
            opensuse|sles)
                print_info "   Run: sudo zypper install patterns-devel-C-C++-devel_C_C++ krb5-devel libsecret-devel libxkbfile-devel libX11-devel"
                ;;
            *)
                print_info "   Install build tools for your distribution"
                ;;
        esac
    fi

    # Check node-gyp
    echo -n "Checking node-gyp... "
    if check_command node-gyp; then
        print_success "Installed"
    else
        print_warning "node-gyp not found globally"
        print_info "   Run: npm install -g node-gyp"
    fi

    echo ""
fi

# Check for path with spaces
echo -n "Checking repository path... "
if [[ "$PWD" == *" "* ]]; then
    print_error "Path contains spaces!"
    print_info "   Move repository to a path without spaces"
    print_info "   Current: $PWD"
else
    print_success "Path OK"
fi

echo ""

###########################################################################################
# Optional Software Checks
###########################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Optional Software (Recommended)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Ollama
echo -n "Checking Ollama (local AI)... "
if check_command ollama; then
    OLLAMA_VERSION=$(ollama --version 2>/dev/null || echo "unknown")
    print_success "Ollama ${OLLAMA_VERSION}"

    # Check if Ollama is running
    if curl -fsS http://127.0.0.1:11434/api/tags &> /dev/null; then
        print_info "   Ollama service is running"
    else
        print_warning "   Ollama installed but service not running"
        print_info "   Start with: ollama serve"
    fi
else
    print_info "Ollama not installed (optional)"
    print_info "   Install: ./scripts/install-ollama.sh"
    print_info "   Or visit: https://ollama.com/"
fi

# Check nvm
echo -n "Checking nvm... "
if [ -d "$HOME/.nvm" ] || [ -n "$NVM_DIR" ]; then
    print_success "nvm installed"
else
    print_info "nvm not installed (recommended for Node.js version management)"
    print_info "   Install: https://github.com/nvm-sh/nvm"
fi

echo ""

###########################################################################################
# Installation
###########################################################################################

if [ "$CHECKS_PASSED" = false ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  ${RED}${CROSS} Some prerequisite checks failed!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Please install missing dependencies before continuing."
    echo "See DEVELOPMENT_SETUP.md for detailed instructions."
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Installing Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_info "node_modules already exists"
    read -p "Reinstall dependencies? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping npm install"
    else
        echo "Running npm install..."
        npm install
        print_success "Dependencies installed!"
    fi
else
    echo "Running npm install (this may take 5-15 minutes)..."
    npm install
    print_success "Dependencies installed!"
fi

echo ""

###########################################################################################
# Next Steps
###########################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}${CHECK} Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo ""
echo "1. Start development mode:"
echo "   ${BLUE}npm run watch${NC}  (or press Ctrl+Shift+B in VSCode)"
echo ""
echo "2. In another terminal, launch GRID:"
if [ "$OS_TYPE" = "Windows" ]; then
    echo "   ${BLUE}./scripts/code.bat${NC}"
else
    echo "   ${BLUE}./scripts/code.sh${NC}"
fi
echo ""
echo "3. (Optional) Use isolated settings:"
if [ "$OS_TYPE" = "Windows" ]; then
    echo "   ${BLUE}./scripts/code.bat --user-data-dir ./.tmp/user-data --extensions-dir ./.tmp/extensions${NC}"
else
    echo "   ${BLUE}./scripts/code.sh --user-data-dir ./.tmp/user-data --extensions-dir ./.tmp/extensions${NC}"
fi
echo ""
echo "4. Configure AI providers in GRID:"
echo "   - Open GRID → Settings → AI Providers"
echo "   - Add your API keys for Anthropic, OpenAI, etc."
echo "   - Or use Ollama for local AI (free)"
echo ""
echo "5. Read the documentation:"
echo "   - Development guide: ${BLUE}DEVELOPMENT_SETUP.md${NC}"
echo "   - Codebase guide: ${BLUE}GRID_CODEBASE_GUIDE.md${NC}"
echo "   - Contributing: ${BLUE}HOW_TO_CONTRIBUTE.md${NC}"
echo ""
echo "6. Join the community:"
echo "   - Discord: ${BLUE}https://discord.gg/bP3V8FKYux${NC}"
echo "   - GitHub: ${BLUE}https://github.com/GRID-Editor/GRID${NC}"
echo ""
echo "${ROCKET} Happy coding!"
echo ""
