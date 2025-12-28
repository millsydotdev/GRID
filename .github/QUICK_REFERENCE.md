# GRID GitHub Quick Reference

## Essential Commands

### Daily Workflow

```bash
# Check status
git status
gh pr list

# Create a branch
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "feat: add new feature"

# Push to GitHub
git push -u origin feature/my-feature

# Create pull request
gh pr create --title "Add new feature" --body "Description"

# View PR checks
gh pr checks
```

### Pull Requests

```bash
gh pr list                           # List all PRs
gh pr create                         # Create new PR (interactive)
gh pr view 123                       # View PR #123
gh pr checkout 123                   # Checkout PR #123 locally
gh pr diff 123                       # View PR diff
gh pr merge 123                      # Merge PR
gh pr review 123 --approve           # Approve PR
gh browse                            # Open repo in browser
```

### Issues

```bash
gh issue list                        # List all issues
gh issue create                      # Create new issue (interactive)
gh issue view 42                     # View issue #42
gh issue close 42                    # Close issue
```

### GitHub Actions

```bash
gh workflow list                     # List workflows
gh run list                          # List recent runs
gh run view 123456                   # View run details
gh run watch                         # Watch latest run
gh run rerun 123456                  # Re-run a workflow
```

### Repository

```bash
gh repo view                         # View repo info
gh repo view --web                   # Open in browser
gh api repos/GRID-NETWORK-REPO/GRID  # View full API data
```

## One-Line Helpers

```bash
# Quick commit and push
git add . && git commit -m "msg" && git push

# Create PR from current branch
gh pr create --fill

# Sync with main
git checkout main && git pull && git checkout - && git merge main

# View latest workflow run
gh run list --limit 1

# Quick status check
gh pr status && git status
```

## Environment Setup

```bash
# Re-run setup (if needed)
./scripts/setup-github.sh YOUR_TOKEN

# Load environment
source .env  # or
export $(cat .env | xargs)

# Verify setup
gh auth status && git remote -v
```

## Troubleshooting

```bash
# Re-authenticate
echo "YOUR_TOKEN" | gh auth login --with-token

# Fix remote URL
git remote set-url origin https://github.com/GRID-NETWORK-REPO/GRID.git

# Clear credential cache
git config --unset credential.helper

# View detailed error logs
gh run view --log
```

## Token Scopes Required

Your GitHub token needs these scopes:
- `repo` - Full repository access
- `workflow` - GitHub Actions access
- `admin:org` - Organization settings
- `admin:repo_hook` - Repository webhooks

Generate token: https://github.com/settings/tokens

## Quick Links

- **Repository:** https://github.com/GRID-NETWORK-REPO/GRID
- **Actions:** https://github.com/GRID-NETWORK-REPO/GRID/actions
- **Settings:** https://github.com/GRID-NETWORK-REPO/GRID/settings
- **Token Management:** https://github.com/settings/tokens

## Help

```bash
gh --help
gh pr --help
gh issue --help
gh workflow --help
```

Full documentation: `./GITHUB_SETUP.md`
