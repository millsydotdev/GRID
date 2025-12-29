# GRID Builder & Downloads - Complete Setup

## ✅ What's Been Fixed

### 1. GRID Repo (Completed)

- ✅ Fixed `@electron/get` version compatibility
- ✅ Added `package.json` overrides forcing v2.0.3
- ✅ Created complete fix documentation (`GRID_BUILDER_FIXES.md`)
- ✅ Created example workflow files for grid-builder
- ✅ All changes committed and pushed to `claude/cli-github-builder-setup-BQCdi`

### 2. Documentation Created

- ✅ `GRID_BUILDER_FIXES.md` - Comprehensive fix guide
- ✅ `DOWNLOADS.md` - User-facing download instructions
- ✅ `BUILDER_SETUP.md` - Complete builder documentation
- ✅ `grid-builder-workflows/` - Fixed workflow files ready to use

---

## 🔧 Grid-Builder Issues Found & Fixes

### Issue 1: Node Version Mismatch

**Problem:** Builder uses Node v20.18.2, but GRID requires Node >=22

**Fix:** Update all workflows to read Node version from GRID's `.nvmrc`

**Status:** ✅ Fixed workflow provided in `grid-builder-workflows/stable-linux.yml`

### Issue 2: @electron/get ESM Error

**Problem:** `@electron/get@4.0.1` is ESM, required in CommonJS context

**Fix:** Force downgrade to v2.0.3 via package.json overrides

**Status:** ✅ Fixed in GRID repo `package.json`

---

## 📋 What You Need to Do

### Step 1: Apply Workflow Fixes to grid-builder Repo

1. **Go to grid-builder repo:**

```bash
cd /path/to/grid-builder
```

1. **Copy the fixed workflow:**

```bash
# Copy from your GRID repo clone
cp /path/to/GRID/grid-builder-workflows/stable-linux.yml .github/workflows/

# Or create manually using the template in grid-builder-workflows/stable-linux.yml
```

1. **Update other workflows similarly:**
   - `stable-macos.yml` - Apply same Node version detection
   - `stable-windows.yml` - Apply same Node version detection

2. **Commit and push:**

```bash
git add .github/workflows/
git commit -m "fix: Update workflows to use dynamic Node version from GRID .nvmrc"
git push
```

### Step 2: Test the Builder

1. **Trigger a build:**

```bash
gh workflow run stable-linux.yml --repo GRID-Editor/grid-builder
```

1. **Monitor the build:**

```bash
gh run watch --repo GRID-Editor/grid-builder
```

1. **Verify success:**
   - No "EBADENGINE" warnings
   - No "ERR_REQUIRE_ESM" errors
   - Artifacts created successfully

### Step 3: Merge GRID Changes

Once builder works:

1. **Create PR for this branch:**

```bash
cd /path/to/GRID
gh pr create --title "Fix grid-builder compatibility issues" \
  --body "Fixes Node version mismatch and @electron/get ESM errors in grid-builder"
```

1. **Merge when approved**

---

## 🌐 Release Flow (After Fixes)

### How It Works Now

```text
1. Developer pushes to GRID main
   ↓
2. grid-builder auto-triggers
   ↓
3. Clones GRID, reads .nvmrc
   ↓
4. Uses correct Node version (22.20.0)
   ↓
5. Installs deps with @electron/get@2.0.3 (forced)
   ↓
6. Builds successfully for Linux/Mac/Windows
   ↓
7. Uploads to GRID-Editor/binaries
   ↓
8. Updates GRID-Editor/versions metadata
   ↓
9. Website fetches new version
   ↓
10. Users download from https://grid.millsy.dev
```

### Download Links Structure

**Binaries Repo:**

```text
GRID-Editor/binaries/releases/
└── 1.106.0/
    ├── grid-1.106.0-linux-x86_64.deb
    ├── grid-1.106.0-linux-x86_64.tar.gz
    ├── grid-1.106.0-linux-x86_64.rpm
    ├── grid-1.106.0-darwin-x86_64.dmg
    ├── grid-1.106.0-darwin-aarch64.dmg
    ├── grid-1.106.0-windows-x64.exe
    └── checksums.txt
```

**Versions Repo:**

```text
GRID-Editor/versions/
└── stable/
    ├── linux/x86_64/latest.json
    ├── darwin/x86_64/latest.json
    ├── darwin/aarch64/latest.json
    └── windows/x64/latest.json
```

**Website:**

- Fetches `latest.json` from versions repo
- Displays download button with correct binary link
- Auto-detects user's platform

---

## 📊 Testing Checklist

### Before Declaring Success

- [ ] Builder runs without Node version errors
- [ ] Builder runs without ESM errors
- [ ] Linux build completes successfully
- [ ] macOS build completes successfully
- [ ] Windows build completes successfully
- [ ] Artifacts uploaded to binaries repo
- [ ] Metadata updated in versions repo
- [ ] Website shows new version
- [ ] Download links work
- [ ] Users can actually install and run GRID

---

## 🚨 Troubleshooting

### If Builder Still Fails

**Check 1 - Node Version:**

```bash
# In builder logs, look for:
echo "Node version: $(node --version)"
# Should show v22.20.0 or similar
```

**Check 2 - @electron/get Version:**

```bash
# In builder logs during npm install:
grep "@electron/get" package-lock.json
# Should show 2.0.3
```

**Check 3 - Workflow Syntax:**

```bash
# Validate workflow file:
gh workflow view stable-linux.yml --repo GRID-Editor/grid-builder
```

### Common Issues

**"GITHUB_TOKEN permissions":**

- Make sure `STRONGER_GITHUB_TOKEN` secret is set in grid-builder
- Token needs access to GRID repo

**"Artifact upload failed":**

- Check artifact size < 500MB
- Verify paths in `uses: actions/upload-artifact@v4`

**"npm install fails":**

- Check network connectivity
- Try adding retry logic to npm install step

---

## 📁 Files Reference

### In GRID Repo

| File | Purpose |
| --- | --- |
| `package.json` | Forces @electron/get@2.0.3 |
| `GRID_BUILDER_FIXES.md` | Complete fix documentation |
| `DOWNLOADS.md` | User download instructions |
| `BUILDER_SETUP.md` | Builder documentation |
| `grid-builder-workflows/` | Example workflow files |

### In grid-builder Repo (To Update)

| File | Change Needed |
| --- | --- |
| `.github/workflows/stable-linux.yml` | Use dynamic Node version |
| `.github/workflows/stable-macos.yml` | Use dynamic Node version |
| `.github/workflows/stable-windows.yml` | Use dynamic Node version |

---

## 🎯 Success Criteria

You'll know everything works when:

1. ✅ Builder completes without errors
2. ✅ All 3 platforms build successfully
3. ✅ Binaries appear in binaries repo
4. ✅ Metadata updated in versions repo
5. ✅ Website shows correct version
6. ✅ Users can download and install
7. ✅ GRID runs without issues

---

## 📞 Next Steps

1. **Apply workflow fixes to grid-builder** (5 minutes)
2. **Test a build** (15-30 minutes for full build)
3. **Verify downloads work** (5 minutes)
4. **Merge this PR** (when ready)
5. **Document for team** (share these docs)

---

## 🔗 Related Documentation

- [RELEASE_CYCLE.md](RELEASE_CYCLE.md) - Complete release process
- [GRID_BUILDER_FIXES.md](GRID_BUILDER_FIXES.md) - Technical fix details
- [DOWNLOADS.md](DOWNLOADS.md) - User-facing download guide

---

**Last Updated:** 2025-12-26
**Branch:** claude/cli-github-builder-setup-BQCdi
**Status:** Ready for grid-builder workflow updates
