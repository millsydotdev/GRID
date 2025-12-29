# GitHub Repository Setup Guide

## Quick Setup (Automated)

The fastest way to set up the GRID repository is using the automated setup script:

```bash
./scripts/setup-github.sh YOUR_GITHUB_TOKEN
```

This script will:

- ✅ Install GitHub CLI
- ✅ Authenticate with your GitHub token
- ✅ Configure git remote for GitHub
- ✅ Enable optimal repository settings
- ✅ Create local `.env` file with your token
- ✅ Configure git settings

---

## Manual Setup

If you prefer to set things up manually, follow these steps:

### 1. Install GitHub CLI

**On Ubuntu/Debian:**

```bash
curl -L https://github.com/cli/cli/releases/download/v2.62.0/gh_2.62.0_linux_amd64.tar.gz -o /tmp/gh.tar.gz
cd /tmp && tar -xzf gh.tar.gz
sudo mv gh_2.62.0_linux_amd64/bin/gh /usr/local/bin/
sudo chmod +x /usr/local/bin/gh
```

**Verify installation:**

```bash
gh --version
```

### 2. Authenticate with GitHub

```bash
echo "YOUR_GITHUB_TOKEN" | gh auth login --with-token
```

**Verify authentication:**

```bash
gh auth status
```

### 3. Configure Git Remote

```bash
git remote set-url origin https://github.com/GRID-Editor/GRID.git
git remote -v  # Verify
```

### 4. Create Local .env File

```bash
cat > .env << EOF
GITHUB_TOKEN=YOUR_GITHUB_TOKEN
ELECTRON_SKIP_BINARY_DOWNLOAD=1
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
NODE_OPTIONS=--max-old-space-size=8192
VSCODE_QUALITY=oss
EOF
```

### 5. Configure Git Settings

```bash
git config credential.helper store
git config pull.rebase false
git config push.default current
```

---

## Repository Information

**Repository:** <https://github.com/GRID-Editor/GRID>
**Owner:** GRID-Editor
**Type:** Private
**Default Branch:** main

### Current Settings

- ✅ **GitHub Actions:** Enabled (11 active workflows)
- ✅ **Issues:** Enabled
- ✅ **Projects:** Enabled
- ✅ **Wiki:** Disabled
- ✅ **Delete branch on merge:** Enabled
- ❌ **Auto-merge:** Disabled (requires GitHub Pro for private repos)
- ❌ **Branch protection:** Disabled (requires GitHub Pro for private repos)

### Active GitHub Actions Workflows

1. **Copilot Setup Steps** - `.github/workflows/copilot-setup-steps.yml`
2. **Monaco Editor checks** - `.github/workflows/monaco-editor.yml`
3. **Prevent package-lock.json changes** - `.github/workflows/no-package-lock-changes.yml`
4. **Prevent yarn.lock changes** - `.github/workflows/no-yarn-lock-changes.yml`
5. **PR Darwin Test** - `.github/workflows/pr-darwin-test.yml`
6. **PR Linux CLI Test** - `.github/workflows/pr-linux-cli-test.yml`
7. **PR Linux Test** - `.github/workflows/pr-linux-test.yml`
8. **Code OSS (node_modules)** - `.github/workflows/pr-node-modules.yml`
9. **PR Win32 Test** - `.github/workflows/pr-win32-test.yml`
10. **Code OSS** - `.github/workflows/pr.yml`
11. **Telemetry** - `.github/workflows/telemetry.yml`

---

## Common GitHub CLI Commands

### Repository Management

```bash
# View repository information
gh repo view

# View repository in browser
gh browse

# Clone the repository
gh repo clone GRID-Editor/GRID

# Fork the repository
gh repo fork
```

### Pull Requests

```bash
# List pull requests
gh pr list

# Create a pull request
gh pr create --title "Title" --body "Description"

# View a pull request
gh pr view PR_NUMBER

# Check out a pull request locally
gh pr checkout PR_NUMBER

# Merge a pull request
gh pr merge PR_NUMBER

# Review a pull request
gh pr review PR_NUMBER --approve
gh pr review PR_NUMBER --comment --body "Feedback"
gh pr review PR_NUMBER --request-changes --body "Changes needed"
```

### Issues

```bash
# List issues
gh issue list

# Create an issue
gh issue create --title "Issue title" --body "Issue description"

# View an issue
gh issue view ISSUE_NUMBER

# Close an issue
gh issue close ISSUE_NUMBER
```

### GitHub Actions

```bash
# List workflows
gh workflow list

# View workflow runs
gh run list

# View specific run
gh run view RUN_ID

# Re-run a workflow
gh run rerun RUN_ID

# Watch a workflow run
gh run watch RUN_ID
```

### Secrets and Variables

```bash
# List secrets
gh secret list

# Set a secret
gh secret set SECRET_NAME

# Delete a secret
gh secret delete SECRET_NAME

# List variables
gh variable list

# Set a variable
gh variable set VARIABLE_NAME --body "value"
```

### Advanced Operations

```bash
# View repository API response
gh api repos/GRID-Editor/GRID

# List collaborators
gh api repos/GRID-Editor/GRID/collaborators

# View branch protection rules (requires GitHub Pro)
gh api repos/GRID-Editor/GRID/branches/main/protection

# Trigger a workflow dispatch
gh workflow run WORKFLOW_NAME

# View action logs
gh run view --log
```

---

## Environment Variables

The `.env` file should contain:

```bash
# Required for npm install and GitHub operations
GITHUB_TOKEN=ghp_...

# Optional - Speed up npm install
ELECTRON_SKIP_BINARY_DOWNLOAD=1
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Optional - Increase Node.js memory for builds
NODE_OPTIONS=--max-old-space-size=8192

# Optional - VS Code build quality
VSCODE_QUALITY=oss
```

**Important:** The `.env` file is already in `.gitignore` and will not be committed to the repository.

---

## Getting Your GitHub Token

1. Go to <https://github.com/settings/tokens>
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a descriptive name (e.g., "GRID Development")
4. Select scopes:
   - ✅ **repo** (Full control of private repositories)
   - ✅ **workflow** (Update GitHub Action workflows)
   - ✅ **admin:org** (Full control of orgs and teams)
   - ✅ **admin:repo_hook** (Full control of repository hooks)
   - ✅ **admin:org_hook** (Full control of organization hooks)
   - ✅ **delete_repo** (Delete repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't be able to see it again)
7. Use it in the setup script or `.env` file

---

## Troubleshooting

### "gh: command not found"

Run the installation script again or install manually following the steps in section 1.

### "Authentication failed"

1. Verify your token is correct
2. Check token scopes: `gh auth status`
3. Re-authenticate: `echo "YOUR_TOKEN" | gh auth login --with-token`

### "Could not resolve to a Repository"

Make sure you're authenticated and have access to the repository:

```bash
gh auth status
gh repo view GRID-Editor/GRID
```

### Git operations ask for username/password

Configure credential helper:

```bash
git config credential.helper store
```

Then perform a git operation (push/pull) and enter your credentials once.

---

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Rotate tokens regularly** - Generate new tokens every 90 days
3. **Use minimal scopes** - Only grant permissions you need
4. **Store tokens securely** - Use password managers
5. **Revoke unused tokens** - Clean up old tokens at <https://github.com/settings/tokens>

---

## Additional Resources

- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Git Documentation](https://git-scm.com/doc)

---

## Support

For issues or questions:

1. Check this documentation
2. Run `gh --help` for CLI help
3. Check GitHub Actions logs: `gh run list`
4. View repository settings: `gh repo view`

**Repository URL:** <https://github.com/GRID-Editor/GRID>
