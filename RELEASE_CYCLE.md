# GRID Complete Release Cycle Documentation

## Overview

This document describes the complete end-to-end release cycle for GRID, from source code to user downloads.

## Architecture

GRID uses a multi-repository architecture with automated CI/CD:

```
┌─────────────────────────────────────────────────────────────────┐
│                          GRID Ecosystem                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
         ┌──────▼──────┐                 ┌─────▼──────┐
         │  GRID Repo  │                 │  Builder   │
         │  (Source)   │────────────────►│  Pipeline  │
         └─────────────┘    Triggers     └────────────┘
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        │                       │                       │
                 ┌──────▼──────┐         ┌──────▼───────┐       ┌──────▼──────┐
                 │  binaries   │         │   versions   │       │   Website   │
                 │  (Artifacts)│         │  (Metadata)  │       │ (Downloads) │
                 └─────────────┘         └──────────────┘       └─────────────┘
                        │                       │                       │
                        └───────────────────────┼───────────────────────┘
                                                │
                                         ┌──────▼──────┐
                                         │    Users    │
                                         │  Download   │
                                         └─────────────┘
```

## Repositories

### 1. GRID (Main Repository)
**URL:** https://github.com/GRID-NETWORK-REPO/GRID  
**Purpose:** Source code, development, features

**Configuration:**
- Description: AI-powered code editor built on VS Code
- Topics: ai, ai-assistant, anthropic, claude, code-editor, copilot, deepseek, etc.
- Labels: 21 comprehensive labels (type, priority, status)
- Issues: Enabled with templates
- Discussions: Enabled
- Projects: Enabled

**Key Files:**
- `product.json` - Product metadata, version, GRID version
- `package.json` - NPM package info, base version

### 2. GRID-BUILDER
**URL:** https://github.com/GRID-NETWORK-REPO/GRID-BUILDER  
**Purpose:** Build automation, CI/CD pipeline

**Configuration:**
- Description: Build infrastructure for GRID
- Topics: build-automation, cicd, github-actions, vscode, electron, grid
- Secrets: `STRONGER_GITHUB_TOKEN` (for cloning GRID repo)

**Workflows:**
- `stable-linux.yml` - Linux builds (deb, rpm, tar.gz, AppImage)
- `stable-macos.yml` - macOS builds (dmg, x86_64, aarch64)
- `stable-windows.yml` - Windows builds (exe, zip, x64, arm64)

**Build Process:**
1. Clone GRID repository
2. Extract version from `product.json`
3. Apply patches and modifications
4. Compile for each platform
5. Create installers/packages
6. Upload to `binaries` repository
7. Update `versions` repository metadata

### 3. binaries
**URL:** https://github.com/GRID-NETWORK-REPO/binaries  
**Purpose:** Store compiled release artifacts

**Configuration:**
- Description: GRID release binaries storage
- Topics: releases, binaries, downloads, artifacts, grid
- Issues: Disabled (artifact storage only)

**Structure:**
```
binaries/
└── releases/
    └── 1.106.0/
        ├── grid-1.106.0-linux-x86_64.deb
        ├── grid-1.106.0-linux-x86_64.tar.gz
        ├── grid-1.106.0-darwin-x86_64.dmg
        ├── grid-1.106.0-windows-x64.exe
        └── checksums-1.106.0.txt
```

### 4. versions
**URL:** https://github.com/GRID-NETWORK-REPO/versions  
**Purpose:** Version metadata for auto-updates

**Configuration:**
- Description: GRID version metadata
- Topics: metadata, versioning, auto-update, releases, grid
- Issues: Disabled (metadata only)

**Structure:**
```
versions/
├── stable/
│   ├── linux/
│   │   ├── x86_64/latest.json
│   │   ├── aarch64/latest.json
│   │   └── armv7/latest.json
│   ├── darwin/
│   │   ├── x86_64/latest.json
│   │   └── aarch64/latest.json
│   └── windows/
│       ├── x86_64/latest.json
│       └── aarch64/latest.json
└── insiders/
    └── (same structure)
```

**Metadata Format (`latest.json`):**
```json
{
  "version": "1.106.0",
  "gridVersion": "0.0.8",
  "gridRelease": "0906",
  "releaseDate": "2025-12-26T00:00:00Z",
  "channel": "stable",
  "platform": "linux",
  "arch": "x86_64",
  "artifacts": [
    {
      "name": "grid-1.106.0-linux-x86_64.deb",
      "type": "deb",
      "url": "https://github.com/GRID-NETWORK-REPO/binaries/releases/download/1.106.0/grid-1.106.0-linux-x86_64.deb",
      "size": 98765432,
      "checksum": {
        "sha256": "abc123..."
      }
    }
  ]
}
```

### 5. GRID-WEBSITE
**URL:** https://github.com/GRID-NETWORK-REPO/GRID-WEBSITE  
**Purpose:** Official download website

**Configuration:**
- Description: Official GRID website
- Homepage: https://grid.millsy.dev
- Topics: website, grid, vercel, static-site, downloads, releases

**Features:**
- Dynamic download page
- Fetches latest releases from `versions` repository
- Platform auto-detection
- Multi-provider information
- Feature showcase

**Deployment:** Vercel (configured)

## Release Workflow

### 1. Development
```bash
# Work on GRID repository
cd GRID
git checkout -b feature/my-feature
# Make changes
git commit -m "feat: add new feature"
git push
```

### 2. Version Bump
Update version in GRID repository:
- `package.json` - Base version (e.g., "1.106.0")
- `product.json` - GRID version and release (e.g., gridVersion: "0.0.8", gridRelease: "0906")

### 3. Trigger Build
Builds are triggered automatically by:
- **Push to main**: Automatic build
- **Manual dispatch**: Run workflow manually
- **Scheduled**: Periodic builds (if configured)

```bash
# Manual trigger via GitHub CLI
gh workflow run stable-linux.yml --repo GRID-NETWORK-REPO/GRID-BUILDER
gh workflow run stable-macos.yml --repo GRID-NETWORK-REPO/GRID-BUILDER
gh workflow run stable-windows.yml --repo GRID-NETWORK-REPO/GRID-BUILDER
```

### 4. Build Process
For each platform, the builder:

1. **Clone GRID**
   ```bash
   git clone https://github.com/GRID-NETWORK-REPO/GRID.git
   ```

2. **Extract Version**
   ```bash
   MS_TAG=$(jq -r '.version' package.json)        # 1.106.0
   GRID_VERSION=$(jq -r '.gridVersion' product.json)  # 0.0.8
   GRID_RELEASE=$(jq -r '.gridRelease' product.json)  # 0906
   ```

3. **Apply Modifications**
   - Apply patches
   - Remove telemetry
   - Update branding
   - Configure auto-update endpoints

4. **Compile & Package**
   - Linux: Create .deb, .rpm, .tar.gz, AppImage
   - macOS: Create .dmg for Intel and Apple Silicon
   - Windows: Create .exe installer and .zip portable

5. **Upload Artifacts**
   ```bash
   gh release create $VERSION --repo GRID-NETWORK-REPO/binaries
   gh release upload $VERSION grid-*.* --repo GRID-NETWORK-REPO/binaries
   ```

6. **Update Metadata**
   Create/update `versions/{channel}/{platform}/{arch}/latest.json`

### 5. Website Update
The website automatically detects new releases:
- Fetches `latest.json` from `versions` repository
- Displays new version
- Updates download links
- Cache expires in 5 minutes

### 6. User Download
1. User visits https://grid.millsy.dev
2. Website detects platform/architecture
3. Fetches metadata from `versions` repository
4. Displays download button with latest version
5. User downloads from `binaries` repository

### 7. Auto-Update
GRID clients periodically:
1. Check `versions/{channel}/{platform}/{arch}/latest.json`
2. Compare with installed version
3. Download update if available
4. Verify checksum
5. Install update

## Environment Setup

### Required Secrets

#### GRID-BUILDER
- `STRONGER_GITHUB_TOKEN` - Token to clone GRID repository
  ```bash
  gh secret set STRONGER_GITHUB_TOKEN --repo GRID-NETWORK-REPO/GRID-BUILDER
  ```
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

### Repository Settings

All repositories configured with:
- Delete branch on merge: ✅
- Allow update branch: ✅ (where applicable)
- Squash merging: ✅
- Topics: Configured for discoverability

## Vercel Deployment

### Setup
```bash
cd GRID-WEBSITE
vercel login
vercel --prod
```

### Configuration
- **Framework:** None (static site)
- **Build Command:** None
- **Output Directory:** `.` (root)
- **Install Command:** None

### Environment Variables
None required (fetches from public GitHub repositories)

### Domain
- Production: https://grid.millsy.dev
- Preview: Auto-generated for PRs

## Maintenance

### Updating Versions
1. Update `GRID/product.json`:
   ```json
   {
     "gridVersion": "0.0.9",
     "gridRelease": "0907"
   }
   ```

2. Update `GRID/package.json`:
   ```json
   {
     "version": "1.107.0"
   }
   ```

3. Push to main → Triggers builder

### Monitoring Builds
```bash
# View workflow runs
gh run list --repo GRID-NETWORK-REPO/GRID-BUILDER

# Watch a specific run
gh run watch <run-id> --repo GRID-NETWORK-REPO/GRID-BUILDER

# View logs
gh run view <run-id> --log --repo GRID-NETWORK-REPO/GRID-BUILDER
```

### Troubleshooting

**Build fails:**
```bash
# Check workflow logs
gh run view --log --repo GRID-NETWORK-REPO/GRID-BUILDER

# Re-run failed workflow
gh run rerun <run-id> --repo GRID-NETWORK-REPO/GRID-BUILDER
```

**Website not updating:**
- Wait 5 minutes for cache to expire
- Check `versions` repository has new metadata
- Verify CORS headers allow fetching
- Check browser console for errors

**Downloads not available:**
- Verify release exists in `binaries` repository
- Check artifact URLs in `versions` metadata
- Ensure URLs are publicly accessible

## Quick Reference

### Clone All Repositories
```bash
gh repo clone GRID-NETWORK-REPO/GRID
gh repo clone GRID-NETWORK-REPO/GRID-BUILDER
gh repo clone GRID-NETWORK-REPO/GRID-WEBSITE
gh repo clone GRID-NETWORK-REPO/binaries
gh repo clone GRID-NETWORK-REPO/versions
```

### View All Repositories
```bash
gh repo list GRID-NETWORK-REPO
```

### Trigger Release Build
```bash
# Linux
gh workflow run stable-linux.yml --repo GRID-NETWORK-REPO/GRID-BUILDER

# macOS
gh workflow run stable-macos.yml --repo GRID-NETWORK-REPO/GRID-BUILDER

# Windows
gh workflow run stable-windows.yml --repo GRID-NETWORK-REPO/GRID-BUILDER
```

### Check Latest Release
```bash
# View in binaries
gh release list --repo GRID-NETWORK-REPO/binaries

# View website
curl https://grid.millsy.dev

# View metadata
curl https://raw.githubusercontent.com/GRID-NETWORK-REPO/versions/main/stable/linux/x86_64/latest.json
```

## Support

- **Issues:** https://github.com/GRID-NETWORK-REPO/GRID/issues
- **Discussions:** https://github.com/GRID-NETWORK-REPO/GRID/discussions
- **Website:** https://grid.millsy.dev

## License

MIT License - See LICENSE files in respective repositories
