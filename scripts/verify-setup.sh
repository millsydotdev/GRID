#!/bin/bash

# GRID Setup Verification Script
# Verifies that GitHub CLI and repository are properly configured

echo "🔍 GRID Setup Verification"
echo "================================"
echo ""

EXIT_CODE=0

# Check GitHub CLI
echo "1️⃣  Checking GitHub CLI..."
if command -v gh &> /dev/null; then
    echo "   ✅ GitHub CLI installed: $(gh --version | head -n1)"
else
    echo "   ❌ GitHub CLI not found"
    EXIT_CODE=1
fi
echo ""

# Check Authentication
echo "2️⃣  Checking GitHub authentication..."
if gh auth status &> /dev/null; then
    ACCOUNT=$(gh api user --jq .login 2>/dev/null)
    echo "   ✅ Authenticated as: $ACCOUNT"

    # Show token scopes
    echo "   Token scopes:"
    gh auth status 2>&1 | grep "Token scopes" | sed 's/^/   /'
else
    echo "   ❌ Not authenticated with GitHub"
    echo "   Run: echo YOUR_TOKEN | gh auth login --with-token"
    EXIT_CODE=1
fi
echo ""

# Check Repository Access
echo "3️⃣  Checking repository access..."
if gh repo view GRID-NETWORK-REPO/GRID --json name &> /dev/null; then
    echo "   ✅ Access to GRID-NETWORK-REPO/GRID confirmed"

    # Show repo details
    gh repo view GRID-NETWORK-REPO/GRID --json name,isPrivate,defaultBranchRef,hasIssuesEnabled,hasProjectsEnabled \
        --jq '"   Repository: \(.name)\n   Private: \(.isPrivate)\n   Default branch: \(.defaultBranchRef.name)\n   Issues enabled: \(.hasIssuesEnabled)\n   Projects enabled: \(.hasProjectsEnabled)"'
else
    echo "   ❌ Cannot access repository"
    EXIT_CODE=1
fi
echo ""

# Check Git Remote
echo "4️⃣  Checking git remote configuration..."
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [[ "$REMOTE_URL" == *"github.com/GRID-NETWORK-REPO/GRID"* ]]; then
    echo "   ✅ Git remote configured correctly"
    echo "   Remote URL: $REMOTE_URL"
else
    echo "   ❌ Git remote not configured for GitHub"
    echo "   Current: $REMOTE_URL"
    echo "   Expected: https://github.com/GRID-NETWORK-REPO/GRID.git"
    EXIT_CODE=1
fi
echo ""

# Check .env file
echo "5️⃣  Checking .env file..."
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"

    if grep -q "GITHUB_TOKEN=" .env; then
        echo "   ✅ GITHUB_TOKEN configured in .env"
    else
        echo "   ⚠️  GITHUB_TOKEN not found in .env"
    fi

    # Check other important env vars
    ENV_VARS=("ELECTRON_SKIP_BINARY_DOWNLOAD" "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD" "NODE_OPTIONS")
    for var in "${ENV_VARS[@]}"; do
        if grep -q "$var=" .env; then
            echo "   ✅ $var configured"
        fi
    done
else
    echo "   ❌ .env file not found"
    echo "   Run: ./scripts/setup-github.sh YOUR_TOKEN"
    EXIT_CODE=1
fi
echo ""

# Check Git Configuration
echo "6️⃣  Checking git configuration..."
if [ "$(git config --get credential.helper)" = "store" ]; then
    echo "   ✅ Credential helper configured"
else
    echo "   ⚠️  Credential helper not set (recommended: store)"
fi

if [ "$(git config --get push.default)" = "current" ]; then
    echo "   ✅ Push default configured"
fi

if [ "$(git config --get pull.rebase)" = "false" ]; then
    echo "   ✅ Pull strategy configured"
fi
echo ""

# Check GitHub Actions
echo "7️⃣  Checking GitHub Actions workflows..."
WORKFLOW_COUNT=$(gh workflow list 2>/dev/null | wc -l)
if [ "$WORKFLOW_COUNT" -gt 0 ]; then
    echo "   ✅ $WORKFLOW_COUNT workflows found"
    echo "   Active workflows:"
    gh workflow list --limit 5 2>/dev/null | sed 's/^/   - /'
else
    echo "   ⚠️  No workflows found"
fi
echo ""

# Summary
echo "================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All checks passed!"
    echo ""
    echo "You're ready to:"
    echo "  1. npm install"
    echo "  2. npm run build"
    echo "  3. Start developing!"
    echo ""
    echo "Quick commands:"
    echo "  gh pr list          - List pull requests"
    echo "  gh issue list       - List issues"
    echo "  gh workflow list    - List workflows"
    echo "  gh repo view        - View repository info"
else
    echo "❌ Some checks failed"
    echo ""
    echo "To fix issues, run:"
    echo "  ./scripts/setup-github.sh YOUR_GITHUB_TOKEN"
fi
echo "================================"

exit $EXIT_CODE
