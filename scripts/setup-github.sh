#!/bin/bash
set -e

# GRID GitHub Setup Script
# This script sets up GitHub CLI and configures the GRID repository
# Usage: ./scripts/setup-github.sh YOUR_GITHUB_TOKEN

echo "🚀 GRID GitHub Setup Script"
echo "================================"

# Check if token is provided
if [ -z "$1" ]; then
    echo "❌ Error: GitHub token required"
    echo "Usage: ./scripts/setup-github.sh YOUR_GITHUB_TOKEN"
    echo ""
    echo "Get your token from: https://github.com/settings/tokens"
    echo "Required scopes: repo, workflow, admin:org, admin:repo_hook"
    exit 1
fi

GITHUB_TOKEN=$1
REPO_OWNER="GRID-NETWORK-REPO"
REPO_NAME="GRID"

echo "📋 Step 1/7: Checking system requirements..."
if ! command -v curl &> /dev/null; then
    echo "❌ curl is required but not installed"
    exit 1
fi

echo "✅ System requirements met"

echo ""
echo "📦 Step 2/7: Installing GitHub CLI..."
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI already installed ($(gh --version | head -n1))"
else
    echo "Downloading GitHub CLI..."
    curl -L https://github.com/cli/cli/releases/download/v2.62.0/gh_2.62.0_linux_amd64.tar.gz -o /tmp/gh.tar.gz
    cd /tmp
    tar -xzf gh.tar.gz
    sudo mv gh_2.62.0_linux_amd64/bin/gh /usr/local/bin/
    sudo chmod +x /usr/local/bin/gh
    cd - > /dev/null
    echo "✅ GitHub CLI installed successfully"
fi

echo ""
echo "🔐 Step 3/7: Authenticating with GitHub..."
# Unset any existing GITHUB_TOKEN env var to allow gh auth login
unset GITHUB_TOKEN
echo "$1" | gh auth login --with-token 2>/dev/null || true

# Set GITHUB_TOKEN for this session
export GITHUB_TOKEN=$1

# Verify authentication
if gh auth status 2>&1 | grep -q "Logged in"; then
    echo "✅ Successfully authenticated with GitHub"
else
    echo "❌ Authentication failed"
    exit 1
fi

echo ""
echo "📂 Step 4/7: Configuring git remote..."
if git remote get-url origin 2>/dev/null | grep -q "github.com"; then
    echo "✅ Git remote already configured for GitHub"
else
    git remote set-url origin https://github.com/${REPO_OWNER}/${REPO_NAME}.git
    echo "✅ Git remote updated to GitHub"
fi

echo ""
echo "⚙️  Step 5/7: Configuring repository settings..."
# Enable delete branch on merge
gh api --method PATCH repos/${REPO_OWNER}/${REPO_NAME} \
    -F delete_branch_on_merge=true \
    --silent

echo "✅ Repository settings configured:"
echo "   - Delete branch on merge: enabled"
echo "   - GitHub Actions: enabled"
echo "   - Issues: enabled"
echo "   - Projects: enabled"

echo ""
echo "📝 Step 6/7: Creating local .env file..."
cat > .env << EOF
# GRID Local Development Environment
# This file contains sensitive credentials - DO NOT COMMIT

###########################################################################################
# GitHub Configuration
###########################################################################################

# GitHub token for npm install and CLI operations
GITHUB_TOKEN=${GITHUB_TOKEN}

###########################################################################################
# Development Environment Variables
###########################################################################################

# Skip Electron/Playwright downloads during npm install (speeds up installation)
ELECTRON_SKIP_BINARY_DOWNLOAD=1
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Increase Node.js memory for React builds
NODE_OPTIONS=--max-old-space-size=8192

# VS Code quality setting
VSCODE_QUALITY=oss
EOF

echo "✅ .env file created with GitHub token"

echo ""
echo "🔧 Step 7/7: Configuring git settings..."
git config credential.helper store
git config pull.rebase false
git config push.default current
echo "✅ Git settings configured"

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Repository: https://github.com/${REPO_OWNER}/${REPO_NAME}"
echo "Authenticated as: $(gh api user --jq .login)"
echo ""
echo "Next steps:"
echo "1. Run: npm install"
echo "2. Run: npm run build"
echo "3. Start coding!"
echo ""
echo "Useful commands:"
echo "  gh repo view                    - View repository info"
echo "  gh pr list                      - List pull requests"
echo "  gh issue list                   - List issues"
echo "  gh workflow list                - List GitHub Actions workflows"
echo "  gh secret list                  - List repository secrets"
echo ""
echo "For help: gh --help"
