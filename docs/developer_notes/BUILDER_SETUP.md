# GRID Builder Setup Guide

This document explains how the GRID build system works and how to create releases.

## Overview

GRID uses **GitHub Actions** for automated building and releasing. The builder creates distributable packages for:

- **Linux x64**: `.tar.gz` archive
- **Windows x64**: `.zip` archive
- **macOS Universal**: `.tar.gz` archive (Intel + Apple Silicon)

## Release Workflow

The release build workflow is defined in `.github/workflows/release-build.yml`.

### Triggering a Release Build

There are two ways to trigger a release build:

#### Method 1: Manual Workflow Dispatch (Recommended)

1. Go to **Actions** tab in GitHub
2. Select **"Release Build"** workflow
3. Click **"Run workflow"**
4. Fill in the parameters:
   - **Version**: e.g., `1.106.0`
   - **Create GitHub Release**: Check this to auto-create a release
5. Click **"Run workflow"**

The workflow will:

- ✅ Build for Linux, Windows, and macOS in parallel
- ✅ Upload build artifacts
- ✅ Create a GitHub Release (if selected)
- ✅ Attach all platform builds to the release

#### Method 2: Git Tag Push (Automated)

```bash
# Create and push a version tag
git tag v1.106.0
git push origin v1.106.0
```

This automatically triggers the release workflow and creates a GitHub Release.

## Build Process Details

### Linux Build (`ubuntu-22.04`)

Steps:

1. Install system dependencies (`libx11-dev`, `libxkbfile-dev`, etc.)
2. Install Node.js dependencies
3. Compile build scripts
4. Compile application code
5. Build extensions
6. Minify and package
7. Create `.tar.gz` archive
8. Upload artifact

**Build time**: ~15-20 minutes

### Windows Build (`windows-2022`)

Steps:

1. Install Node.js dependencies
2. Compile build scripts
3. Compile application code
4. Build extensions
5. Minify and package
6. Create `.zip` archive
7. Upload artifact

**Build time**: ~20-25 minutes

### macOS Build (`macos-14`)

Steps:

1. Install Node.js dependencies
2. Compile build scripts
3. Compile application code
4. Build extensions
5. Minify and package
6. Create `.tar.gz` archive
7. Upload artifact

**Build time**: ~20-30 minutes

## Testing the Builder

### Test Without Creating a Release

Run the workflow manually with:

- **Version**: `test-build-<date>`
- **Create GitHub Release**: **Unchecked**

This will build all platforms and upload artifacts without creating a release. You can download the artifacts from the workflow run page.

### Verify Build Artifacts

After the workflow completes:

1. Go to the workflow run page
2. Scroll to **"Artifacts"** section
3. Download each platform build
4. Extract and test on respective platforms

### Local Build Testing

To test the build process locally:

```bash
# Install dependencies
npm ci

# Compile build tools
cd build && npm run compile && cd ..

# Compile application
npm run compile

# Build extensions
npm run compile-extensions-build

# Package (minify)
npm run minify-vscode
```

## Build Artifacts

Each successful build produces:

| Platform | File Name | Size (approx) |
|----------|-----------|---------------|
| Linux x64 | `GRID-linux-x64-<version>.tar.gz` | ~150-200 MB |
| Windows x64 | `GRID-windows-x64-<version>.zip` | ~150-200 MB |
| macOS Universal | `GRID-macos-universal-<version>.tar.gz` | ~200-250 MB |

Artifacts are retained for **30 days** by default.

## Troubleshooting

### Build Fails on Linux

**Common issues**:

- Missing system dependencies → Check apt install step
- Node version mismatch → Verify `.nvmrc` file
- Compilation errors → Check TypeScript errors in logs

### Build Fails on Windows

**Common issues**:

- Path length limits → Use shorter paths or enable long paths
- PowerShell execution policy → Should be unrestricted in CI
- Native module compilation → Check node-gyp setup

### Build Fails on macOS

**Common issues**:

- Xcode command line tools → Should be pre-installed on runner
- Code signing (if enabled) → Verify certificates
- Native modules → Check for ARM64 compatibility

### Artifact Upload Fails

**Common issues**:

- Artifact too large → Check artifact size limits (500 MB default)
- Network timeout → Retry the workflow
- Path not found → Verify archive creation step succeeded

## Advanced Configuration

### Custom Build Scripts

You can customize the build by modifying:

- **Compilation**: `package.json` scripts
- **Packaging**: `npm run minify-vscode` in `gulpfile.js`
- **Bundling**: Modify gulp tasks in `/build/gulpfile.*.js`

### Adding New Platforms

To add support for new platforms (e.g., Linux ARM64):

1. Add a new job to `.github/workflows/release-build.yml`
2. Specify the appropriate runner (e.g., `ubuntu-22.04-arm64`)
3. Update artifact names and paths
4. Add to release assets

### Code Signing

For production releases, you should add code signing:

**macOS**: Use Xcode codesign with Apple Developer certificate
**Windows**: Use SignTool with code signing certificate
**Linux**: Use GPG signatures for packages

Add signing steps before the "Create distribution archive" step in each job.

## CI/CD Integration

### Pull Request Builds

PR builds run on `.github/workflows/pr.yml` and include:

- Compilation checks
- Hygiene checks
- Unit tests
- Integration tests

These do NOT create release artifacts.

### Release Builds

Release builds run on `.github/workflows/release-build.yml` and:

- Build production-ready binaries
- Create downloadable archives
- Publish to GitHub Releases
- Optionally publish to CDN (configure separately)

## Monitoring Builds

### GitHub Actions Dashboard

View all workflow runs:

1. Go to **Actions** tab
2. Filter by workflow: "Release Build"
3. Click on a run to see details
4. View logs for each job

### Build Status Badge

Add to your README:

```markdown
[![Release Build](https://github.com/GRID-Editor/GRID/actions/workflows/release-build.yml/badge.svg)](https://github.com/GRID-Editor/GRID/actions/workflows/release-build.yml)
```

## Next Steps

1. ✅ Builder is configured and ready
2. ⬜ Test the workflow with a manual run
3. ⬜ Verify artifacts download and run correctly
4. ⬜ Create your first official release
5. ⬜ Update DOWNLOADS.md with release links
6. ⬜ Announce the release to users

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Building Electron Apps](https://www.electronjs.org/docs/latest/tutorial/application-distribution)
- [VS Code Build Documentation](https://github.com/microsoft/vscode/wiki/How-to-Contribute)

---

**Need help?** Open an issue or check the [main README](README.md) for more information.
