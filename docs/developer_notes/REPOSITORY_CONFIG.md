# GRID Repository Configuration

## Overview

This document describes the complete GitHub repository configuration for GRID. All settings have been configured using GitHub CLI for optimal development workflow.

## Repository Information

**Name:** GRID  
**Owner:** GRID-Editor  
**Type:** Private  
**URL:** <https://github.com/GRID-Editor/GRID>  
**Description:** GRID - AI-powered code editor built on VS Code, supporting multiple AI providers (Anthropic, OpenAI, DeepSeek, Ollama) with advanced features  
**Homepage:** <https://github.com/GRID-Editor/GRID>

### Topics (for discoverability)

- ai
- ai-assistant
- anthropic
- claude
- code-editor
- copilot
- deepseek
- developer-tools
- electron
- ide
- local-ai
- ollama
- openai
- typescript
- vscode

## Repository Settings

### General Settings

✅ **Issues:** Enabled  
✅ **Projects:** Enabled  
✅ **Discussions:** Enabled  
❌ **Wiki:** Disabled  
✅ **Downloads:** Enabled  
✅ **Delete branch on merge:** Enabled  
✅ **Allow update branch:** Enabled  
❌ **Auto-merge:** Disabled (requires GitHub Pro for private repos)

### Merge Settings

✅ **Allow merge commits:** Enabled  
✅ **Allow squash merging:** Enabled  
✅ **Allow rebase merging:** Enabled  

- **Squash merge commit message:** COMMIT_MESSAGES  
- **Squash merge commit title:** COMMIT_OR_PR_TITLE  
- **Merge commit message:** PR_TITLE  
- **Merge commit title:** MERGE_MESSAGE

### Default Branch

**Branch:** main

## Labels

The repository has a comprehensive labeling system for issue and PR management:

### Default Labels

- `bug` - Something isn't working (#d73a4a)
- `documentation` - Improvements or additions to documentation (#0075ca)
- `duplicate` - This issue or pull request already exists (#cfd3d7)
- `enhancement` - New feature or request (#a2eeef)
- `good first issue` - Good for newcomers (#7057ff)
- `help wanted` - Extra attention is needed (#008672)
- `invalid` - This doesn't seem right (#e4e669)
- `question` - Further information is requested (#d876e3)
- `wontfix` - This will not be worked on (#ffffff)

### Type Labels

- `type: feature` - New feature implementation (#0e8a16)
- `type: bug` - Bug or error fix (#d73a4a)
- `type: refactor` - Code refactoring (#fbca04)
- `type: docs` - Documentation changes (#0075ca)
- `type: test` - Testing related changes (#1d76db)
- `type: chore` - Maintenance and chores (#fef2c0)

### Priority Labels

- `priority: high` - High priority (#b60205)
- `priority: medium` - Medium priority (#fbca04)
- `priority: low` - Low priority (#0e8a16)

### Status Labels

- `status: in-progress` - Currently being worked on (#c5def5)
- `status: blocked` - Blocked by dependencies (#e99695)
- `status: review-needed` - Needs code review (#fbca04)

## Issue Templates

Located in `.github/ISSUE_TEMPLATE/`:

1. **Bug Report** (`bug_report.md`) - For reporting bugs
2. **Copilot Bug Report** (`copilot_bug_report.md`) - For Copilot-specific bugs
3. **Feature Request** (`feature_request.md`) - For requesting new features
4. **Configuration** (`config.yml`) - Issue template configuration

## Pull Request Template

Located at `.github/pull_request_template.md`:

Simple template that reminds contributors to:

- Read contributing guidelines
- Associate an issue with the PR
- Ensure code is up-to-date with main
- Include description and testing instructions

## GitHub Actions

### Active Workflows

The repository has 11 active GitHub Actions workflows:

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

### Secrets

All workflows use the built-in `GITHUB_TOKEN` secret provided automatically by GitHub Actions.

**No additional secrets are currently configured.**

To add secrets:

```bash
gh secret set SECRET_NAME
```

### Variables

**No repository variables are currently configured.**

To add variables:

```bash
gh variable set VARIABLE_NAME --body "value"
```

## Environments

**Environment:** GRID  

- Created: 2025-12-26
- Can admins bypass: Yes
- Protection rules: None
- Deployment branch policy: None

To create additional environments:

```bash
gh api --method PUT repos/GRID-Editor/GRID/environments/ENVIRONMENT_NAME
```

## Branch Protection

**Status:** Not available (requires GitHub Pro for private repositories)

Branch protection rules would include:

- Require pull request reviews before merging
- Require status checks to pass
- Require branches to be up to date before merging
- Require conversation resolution before merging

## Security Settings

### Security Features

❌ **Secret scanning:** Disabled (requires GitHub Advanced Security)  
❌ **Secret scanning push protection:** Disabled  
❌ **Dependabot security updates:** Disabled  
❌ **Secret scanning non-provider patterns:** Disabled  
❌ **Secret scanning validity checks:** Disabled

These features require GitHub Advanced Security or making the repository public.

## Documentation Files

### Setup & Configuration

- `GITHUB_SETUP.md` - Complete GitHub CLI setup guide
- `.github/QUICK_REFERENCE.md` - Quick command reference
- `SETUP_COMPLETE.md` - Setup completion summary
- `REPOSITORY_CONFIG.md` - This file (complete repository configuration)

### Scripts

- `scripts/setup-github.sh` - Automated GitHub CLI setup script
- `scripts/verify-setup.sh` - Setup verification script

### Development

- `DEVELOPMENT_SETUP.md` - Development environment setup
- `CONTRIBUTING.md` - Contribution guidelines
- `README.md` - Main project documentation

## Quick Commands Reference

### View Configuration

```bash
# Repository info
gh repo view

# View in browser
gh browse

# View settings via API
gh api repos/GRID-Editor/GRID

# List labels
gh label list

# List workflows
gh workflow list

# List environments
gh api repos/GRID-Editor/GRID/environments
```

### Manage Labels

```bash
# Create label
gh label create "label-name" --description "Description" --color "hexcolor"

# Edit label
gh label edit "label-name" --description "New description"

# Delete label
gh label delete "label-name"
```

### Manage Settings

```bash
# Update repository settings
gh api --method PATCH repos/GRID-Editor/GRID -f setting=value

# Update topics
echo '{"names":["topic1","topic2"]}' | gh api --method PUT repos/GRID-Editor/GRID/topics --input -

# Enable/disable features
gh api --method PATCH repos/GRID-Editor/GRID -F has_discussions=true
```

### Manage Secrets & Variables

```bash
# List secrets
gh secret list

# Set secret
gh secret set SECRET_NAME

# Delete secret
gh secret delete SECRET_NAME

# List variables
gh variable list

# Set variable
gh variable set VAR_NAME --body "value"
```

## Configuration History

**2025-12-26:**

- ✅ Installed GitHub CLI v2.62.0
- ✅ Configured authentication with full access token
- ✅ Updated repository description and homepage
- ✅ Added 15 repository topics
- ✅ Enabled GitHub Discussions
- ✅ Enabled "Allow update branch" feature
- ✅ Enabled "Delete branch on merge"
- ✅ Verified 21 labels (9 default + 12 custom)
- ✅ Verified issue templates
- ✅ Verified PR template
- ✅ Verified 11 GitHub Actions workflows
- ✅ Created GRID environment
- ✅ Created comprehensive documentation

## Recommendations

### For Public Release

If/when the repository becomes public:

1. **Enable Security Features:**
   - Enable Dependabot security updates
   - Enable secret scanning
   - Enable code scanning with CodeQL

2. **Add Documentation:**
   - Add SECURITY.md for security policy
   - Add CODE_OF_CONDUCT.md
   - Add more comprehensive CONTRIBUTING.md

3. **Consider:**
   - GitHub Sponsors setup
   - Community health files
   - Wikis for extensive documentation

### For Current Private Use

1. **Consider GitHub Pro/Team:**
   - Enables branch protection rules
   - Enables auto-merge for private repos
   - Provides better security features

2. **Set up CI/CD:**
   - Configure deployment secrets
   - Set up environment protection rules
   - Add deployment approvals

3. **Regular Maintenance:**
   - Review and update labels as needed
   - Keep workflows updated
   - Monitor Actions usage

## Support

For GitHub CLI help:

- `gh --help` - General help
- `gh <command> --help` - Command-specific help
- <https://cli.github.com/manual/> - Official documentation

For GitHub API:

- <https://docs.github.com/en/rest> - REST API documentation
- `gh api --help` - API command help

## Last Updated

2025-12-26 - Initial comprehensive configuration
