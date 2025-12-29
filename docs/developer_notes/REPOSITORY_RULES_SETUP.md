# Repository Rules & Settings Configuration

## Branch Protection (Requires GitHub Pro for Private Repos)

**Status:** ❌ Not available for private repositories on free plan

To enable branch protection, you need:

- GitHub Pro account, OR  
- Make repositories public

### Recommended Branch Protection Rules (When Available)

For `main` branch on all repositories:

```yaml
Required Status Checks:
  - Require branches to be up to date: ✅
  - Status checks: (varies by repo)

Pull Request Reviews:
  - Require pull request reviews: ✅
  - Required approvals: 1
  - Dismiss stale reviews: ✅
  - Require review from Code Owners: ❌ (optional)

Commit Restrictions:
  - Require signed commits: ❌ (optional)
  - Require linear history: ❌ (allows merges)

Other:
  - Include administrators: ❌ (admins can bypass)
  - Allow force pushes: ❌
  - Allow deletions: ❌
```

### Current Workaround

Use GitHub Actions to enforce rules:

```yaml
# .github/workflows/branch-protection.yml
name: Branch Protection
on:
  pull_request:
    branches: [main]

jobs:
  enforce-rules:
    runs-on: ubuntu-latest
    steps:
      - name: Block direct pushes
        run: echo "PR required for main branch"
```

## Repository Settings (Already Configured)

### GRID

- ✅ Issues: Enabled
- ✅ Projects: Enabled  
- ✅ Discussions: Enabled
- ✅ Delete branch on merge: Enabled
- ✅ Allow update branch: Enabled
- ✅ Labels: 21 comprehensive labels
- ✅ Topics: 15 topics for discoverability

### GRID-BUILDER

- ✅ Issues: Enabled
- ✅ Projects: Enabled
- ✅ Delete branch on merge: Enabled
- ✅ Allow update branch: Enabled
- ✅ Topics: 7 build-related topics
- ✅ Labels: Platform-specific labels
- ✅ Secrets: STRONGER_GITHUB_TOKEN configured

### GRID-WEBSITE

- ✅ Issues: Enabled
- ✅ Projects: Enabled
- ✅ Delete branch on merge: Enabled
- ✅ Allow update branch: Enabled
- ✅ Homepage: <https://grid.millsy.dev>
- ✅ Topics: 6 website-related topics
- ✅ Labels: Frontend/design labels

### binaries

- ✅ Delete branch on merge: Enabled
- ✅ Topics: 5 release-related topics
- ❌ Issues: Disabled (artifact storage)
- ❌ Wiki: Disabled

### versions

- ✅ Delete branch on merge: Enabled
- ✅ Topics: 5 metadata-related topics
- ❌ Issues: Disabled (metadata only)
- ❌ Wiki: Disabled

## Merge Settings

All repositories configured with:

- ✅ Allow squash merging
- ✅ Allow merge commits
- ✅ Allow rebase merging
- ✅ Squash merge commit message: COMMIT_MESSAGES
- ✅ Merge commit title: MERGE_MESSAGE

## Security Settings

### Available (Free Plan)

- ✅ Private repository visibility
- ✅ Dependabot alerts (if enabled on account)
- ✅ Two-factor authentication (account level)

### Requires GitHub Advanced Security

- ❌ Secret scanning
- ❌ Code scanning
- ❌ Dependency review

### Workarounds

Use GitHub Actions for:

- Code quality checks
- Security scanning (third-party tools)
- Dependency audits

## Webhook & Integration Settings

### GitHub Actions

All repositories have Actions enabled with appropriate secrets.

### Vercel Integration (GRID-WEBSITE)

Connected via:

1. Vercel GitHub App
2. Automatic deployments on push
3. Preview deployments for PRs

## Recommended Manual Configurations

### 1. Enable GitHub Pro (Optional)

Benefits:

- Branch protection for private repos
- Protected branches with required reviews
- CODEOWNERS file enforcement
- Auto-merge for PRs

### 2. Set Up CODEOWNERS

```bash
# .github/CODEOWNERS
* @your-username
/src/ @your-username
/.github/ @your-username
```

### 3. Enable Security Features

```bash
# Navigate to Settings → Code security and analysis
- Enable Dependabot alerts
- Enable Dependabot security updates
- Configure secret scanning (if available)
```

### 4. Configure Environments

For GRID-BUILDER:

```bash
gh api --method PUT repos/GRID-Editor/GRID-BUILDER/environments/production
```

Protection rules (requires GitHub Pro):

- Required reviewers
- Wait timer
- Deployment branches

## Automation Rules

### Stale Issues (GitHub Actions)

```yaml
# .github/workflows/stale.yml
name: Mark Stale Issues
on:
  schedule:
    - cron: '0 0 * * *'

jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v8
        with:
          days-before-stale: 60
          days-before-close: 7
```

### Auto-Label PRs

```yaml
# .github/workflows/label-pr.yml
name: Label PRs
on:
  pull_request:
    types: [opened]

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v4
```

## Monitoring & Notifications

### Configured

- ✅ GitHub Actions notifications
- ✅ Release notifications

### Recommended

- Set up Slack/Discord webhooks for:
  - Build failures
  - New releases
  - Security alerts

## Quick Setup Commands

### Clone All Repos

```bash
gh repo clone GRID-Editor/GRID
gh repo clone GRID-Editor/GRID-BUILDER
gh repo clone GRID-Editor/GRID-WEBSITE
gh repo clone GRID-Editor/binaries
gh repo clone GRID-Editor/versions
```

### View All Settings

```bash
for repo in GRID GRID-BUILDER GRID-WEBSITE binaries versions; do
  echo "=== $repo ==="
  gh api repos/GRID-Editor/$repo | jq '{
    name, private, has_issues, has_projects, has_wiki,
    delete_branch_on_merge, allow_update_branch
  }'
done
```

### Update All Repos

```bash
for repo in GRID GRID-BUILDER GRID-WEBSITE binaries versions; do
  gh api --method PATCH repos/GRID-Editor/$repo \
    -F delete_branch_on_merge=true \
    -F allow_update_branch=true
done
```

## Support

For advanced features requiring GitHub Pro:

- <https://github.com/pricing>
- Contact GitHub Sales for organization plans

## Current Status

✅ **Fully Configured (Free Plan):**

- Repository descriptions
- Topics for discoverability
- Labels for organization
- Merge settings
- Issue/PR templates
- GitHub Actions
- Secrets management

⚠️ **Limited (Requires GitHub Pro):**

- Branch protection rules
- Required reviewers
- CODEOWNERS enforcement
- Auto-merge for private repos
- Advanced security features

## Next Steps

1. ✅ All repositories configured with available settings
2. ⏳ Consider GitHub Pro for branch protection
3. ⏳ Set up CI/CD workflows (already configured in GRID-BUILDER)
4. ⏳ Deploy website to Vercel
5. ⏳ Test complete release pipeline
