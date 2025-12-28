# GRID-BUILDER Fixes Required

## Issues Found

From the latest build logs, grid-builder is failing with these critical errors:

### 1. Node Version Mismatch ❌

**Current**: Node v20.18.2
**Required**: Node >=22

**Error Message:**
```
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: '@vscode/gulp-electron@1.38.2',
npm warn EBADENGINE   required: { node: '>=22' },
npm warn EBADENGINE   current: { node: 'v20.18.2', npm: '10.8.2' }
npm warn EBADENGINE }
```

### 2. ESM Module Incompatibility ❌

**Error:**
```
Error [ERR_REQUIRE_ESM]: require() of ES Module
/vscode/node_modules/@vscode/gulp-electron/node_modules/@electron/get/dist/index.js
from /vscode/node_modules/@vscode/gulp-electron/src/download.js not supported.
```

**Cause**: `@electron/get@4.0.1` is an ESM module being required in a CommonJS context

---

## Fixes Required in grid-builder

### Fix 1: Update Node Version in Workflows

**Files to update:**
- `.github/workflows/stable-linux.yml`
- `.github/workflows/stable-macos.yml`
- `.github/workflows/stable-windows.yml`

**Change:**
```yaml
# BEFORE
- uses: actions/setup-node@v4
  with:
    node-version: '20'

# AFTER
- uses: actions/setup-node@v4
  with:
    node-version: '22.20.0'  # Or read from .nvmrc in GRID repo
```

**Option 2 - Read from GRID repo's .nvmrc:**
```yaml
- name: Get Node version from GRID
  id: node-version
  run: |
    echo "NODE_VERSION=$(cat vscode/.nvmrc)" >> $GITHUB_OUTPUT

- uses: actions/setup-node@v4
  with:
    node-version: ${{ steps.node-version.outputs.NODE_VERSION }}
```

### Fix 2: Force Downgrade @electron/get

**In GRID repo - Add to `package.json`:**

```json
{
  "overrides": {
    "@electron/get": "2.0.3"
  },
  "resolutions": {
    "@electron/get": "2.0.3"
  }
}
```

This forces the older CommonJS-compatible version of `@electron/get`.

**Alternative - Update in builder's prepare script:**

In `prepare_vscode.sh`, after `npm ci`, add:
```bash
# Force compatible @electron/get version
npm install @electron/get@2.0.3 --save-exact --legacy-peer-deps
```

---

## Implementation Steps

### Step 1: Fix in GRID Repo (This Repo)

1. **Add package.json overrides:**

```bash
cd /home/user/GRID
```

Edit `package.json` to add:
```json
{
  "name": "grid",
  "version": "1.106.0",
  "overrides": {
    "@electron/get": "2.0.3"
  },
  "resolutions": {
    "@electron/get": "2.0.3"
  }
}
```

2. **Commit and push:**
```bash
git add package.json
git commit -m "fix: Force @electron/get to v2.0.3 for builder compatibility"
git push
```

### Step 2: Fix in grid-builder Repo

**Option A - Update workflows (Recommended):**

In all workflow files (`stable-linux.yml`, `stable-macos.yml`, `stable-windows.yml`):

1. Update Node version to 22.20.0
2. Add step to read Node version from GRID's .nvmrc

**Example for `stable-linux.yml`:**
```yaml
name: Stable Linux

on:
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-22.04
    steps:
      - name: Checkout grid-builder
        uses: actions/checkout@v4

      - name: Checkout GRID
        uses: actions/checkout@v4
        with:
          repository: GRID-NETWORK-REPO/GRID
          token: ${{ secrets.STRONGER_GITHUB_TOKEN }}
          path: vscode

      - name: Get Node version
        id: node-version
        run: echo "NODE_VERSION=$(cat vscode/.nvmrc)" >> $GITHUB_OUTPUT

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ steps.node-version.outputs.NODE_VERSION }}

      - name: Build
        run: ./build.sh
```

**Option B - Fix in prepare script:**

In `prepare_vscode.sh`, after the `npm ci` step, add:

```bash
# Fix @electron/get version for compatibility
echo "Forcing @electron/get to v2.0.3..."
npm install @electron/get@2.0.3 --save-exact --legacy-peer-deps

# Verify installation
npm list @electron/get
```

---

## Testing

After applying fixes:

1. **Trigger build manually:**
```bash
gh workflow run stable-linux.yml --repo GRID-NETWORK-REPO/grid-builder
```

2. **Monitor build:**
```bash
gh run watch --repo GRID-NETWORK-REPO/grid-builder
```

3. **Check for success:**
- Build completes without Node version warnings
- No ESM/CommonJS errors
- Binaries created successfully

---

## Quick Fix (Do This First)

**In GRID repo right now:**

1. Add the package.json overrides (Step 1 above)
2. Commit and push
3. This will make the next builder run work

**Then in grid-builder:**

Update all 3 workflow files to use Node 22.20.0

---

## Files Changed Summary

### In GRID repo:
- ✅ `package.json` - Add overrides section

### In grid-builder repo:
- ⬜ `.github/workflows/stable-linux.yml` - Update Node version
- ⬜ `.github/workflows/stable-macos.yml` - Update Node version
- ⬜ `.github/workflows/stable-windows.yml` - Update Node version
- ⬜ (Optional) `prepare_vscode.sh` - Add electron/get fix

---

## Expected Outcome

After fixes:
- ✅ Builder uses Node 22.20.0
- ✅ Compatible @electron/get version (2.0.3)
- ✅ Builds complete successfully
- ✅ Binaries uploaded to binaries repo
- ✅ Metadata updated in versions repo
- ✅ Website shows new downloads
