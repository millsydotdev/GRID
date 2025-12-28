# Building GRID IDE for Distribution

Complete guide for building production-ready GRID IDE packages that end users can download and install.

## Table of Contents
1. [Overview](#overview)
2. [Build System Architecture](#build-system-architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start - Local Builds](#quick-start---local-builds)
5. [Production Packaging](#production-packaging)
6. [Code Signing & Certificates](#code-signing--certificates)
7. [Distribution Formats](#distribution-formats)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Release Process](#release-process)
10. [Troubleshooting](#troubleshooting)

---

## Overview

GRID is built on VS Code architecture and uses **Gulp** + **Electron** for packaging. There are two types of builds:

### Development Builds
- **Purpose**: Fast iteration during development
- **Speed**: 2-10 seconds (Rust dev mode)
- **Location**: `dev-builds/linux/` or `dev-builds/windows/`
- **Use**: Testing features, debugging
- **Documentation**: See `dev-builds/README.md`

### Production Builds
- **Purpose**: End-user distribution
- **Speed**: 5-30 minutes (optimized, minified)
- **Location**: Outside repo (`../VSCode-{platform}-{arch}/`)
- **Use**: Releases, installers, packages
- **Documentation**: This guide

---

## Build System Architecture

```
GRID Build Pipeline:

1. Compile TypeScript → JavaScript (with minification)
2. Build React Components → Bundled JS
3. Compile Rust CLI → Native binaries
4. Bundle Electron App → Platform-specific package
5. Create Installers → DMG, EXE, DEB, RPM, AppImage, Snap
6. Code Sign (Optional) → macOS notarization, Windows Authenticode
7. Publish → CDN, GitHub Releases
```

**Build Tools**:
- **Gulp**: Task runner for compilation and packaging
- **TypeScript**: Source compilation
- **Electron**: Desktop app framework
- **Rust/Cargo**: CLI tools compilation
- **Platform Tools**:
  - **Windows**: Inno Setup (installers), rcedit (exe metadata)
  - **macOS**: DMG creation, codesign, notarytool
  - **Linux**: dpkg (DEB), rpmbuild (RPM), snapcraft (Snap), appimagetool (AppImage)

---

## Prerequisites

### All Platforms

1. **Node.js** v22.20.0 (exact version)
   ```bash
   nvm install 22.20.0
   nvm use 22.20.0
   ```

2. **Rust & Cargo** (for CLI builds)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

3. **Dependencies installed**
   ```bash
   npm install
   ```

4. **Build tools compiled**
   ```bash
   cd build && npm install && npm run compile
   ```

### Platform-Specific

#### macOS
- **Xcode Command Line Tools**
- **For DMG creation**: `npm install -g create-dmg`
- **For code signing** (optional):
  - Apple Developer ID Application certificate
  - `security find-identity -v -p codesigning`

#### Windows
- **Visual Studio 2022** (C++ build tools)
- **Inno Setup** (installed via npm: `innosetup` package)
- **For code signing** (optional):
  - Code signing certificate (.pfx)
  - `signtool.exe` (comes with Windows SDK)

#### Linux
**Debian/Ubuntu**:
```bash
sudo apt-get install build-essential pkg-config libx11-dev libxkbfile-dev \
  libsecret-1-dev libkrb5-dev fakeroot dpkg rpm snapcraft
```

**Fedora/RHEL**:
```bash
sudo dnf install @development-tools libsecret-devel krb5-devel \
  libX11-devel libxkbfile-devel rpm-build snapcraft
```

---

## Quick Start - Local Builds

### 1. Compile the Source

```bash
# First time: Compile build scripts
cd build
npm install
npm run compile
cd ..

# Compile GRID source code
npm run compile
```

### 2. Build for Your Platform

#### macOS (Apple Silicon)
```bash
npm run gulp vscode-darwin-arm64
```

#### macOS (Intel)
```bash
npm run gulp vscode-darwin-x64
```

#### Windows (x64)
```bash
npm run gulp vscode-win32-x64
```

#### Linux (x64)
```bash
npm run gulp vscode-linux-x64
```

#### Linux (ARM64)
```bash
npm run gulp vscode-linux-arm64
```

### 3. Find Your Build

The build will be in a folder **outside** your repository:

```
workspace/
├── GRID/                      # Your repo
└── VSCode-{platform}-{arch}/  # Generated build
    ├── GRID (or GRID.exe)
    ├── resources/
    └── ...
```

**Run it**:
```bash
# macOS
../VSCode-darwin-arm64/GRID.app/Contents/MacOS/GRID

# Linux
../VSCode-linux-x64/grid

# Windows
..\VSCode-win32-x64\GRID.exe
```

---

## Production Packaging

Production builds include minification, optimization, and installer creation.

### Minified Builds

For production, use minified builds:

```bash
# Step 1: Compile with minification (takes ~5-10 min)
npm run compile-build

# Step 2: Build platform package
npm run gulp vscode-{platform}-{arch}
```

Available gulp targets:
- `vscode-darwin-arm64` - macOS Apple Silicon
- `vscode-darwin-x64` - macOS Intel
- `vscode-darwin-arm64-min` - macOS AS (minified)
- `vscode-darwin-x64-min` - macOS Intel (minified)
- `vscode-win32-x64` - Windows 64-bit
- `vscode-win32-arm64` - Windows ARM
- `vscode-linux-x64` - Linux 64-bit
- `vscode-linux-arm64` - Linux ARM64
- `vscode-linux-armhf` - Linux ARMv7

### Create Installers

#### Windows Installer (Inno Setup)

**Location**: `build/gulpfile.vscode.win32.js`

```bash
# Build Windows setup
npm run gulp vscode-win32-x64

# The installer is created automatically at:
# .build/win32-x64/system-setup/GRIDSetup-x64-<version>.exe
# .build/win32-x64/user-setup/GRIDUserSetup-x64-<version>.exe
```

**Installer Types**:
- **System Setup**: Installs to `C:\Program Files\GRID` (requires admin)
- **User Setup**: Installs to `%LOCALAPPDATA%\Programs\GRID` (no admin)

**Inno Setup Configuration**: `build/win32/code.iss`

#### macOS DMG

macOS builds create `.app` bundles. To create a DMG:

```bash
# Install DMG creator
npm install -g create-dmg

# Build app
npm run gulp vscode-darwin-arm64

# Create DMG (manual)
create-dmg '../VSCode-darwin-arm64/GRID.app' --overwrite
```

Or use the built-in packaging (if configured):
```bash
npm run gulp vscode-darwin-arm64-archive
```

#### Linux Packages

**DEB Package** (Debian/Ubuntu):
```bash
# Build DEB package
npm run gulp vscode-linux-deb-x64

# Output: .build/linux/deb/amd64/grid-<version>-amd64.deb
```

**RPM Package** (Fedora/RHEL):
```bash
# Build RPM package
npm run gulp vscode-linux-rpm-x64

# Output: .build/linux/rpm/x86_64/grid-<version>.x86_64.rpm
```

**Snap Package**:
```bash
# Location: resources/linux/snap/snapcraft.yaml
# Build using Docker (recommended)
bash build/azure-pipelines/linux/build-snap.sh
```

**AppImage**:
```bash
# Build regular package first
npm run gulp vscode-linux-x64

# Create AppImage
cd scripts/appimage
./create_appimage.sh
# Output: GRID-x86_64.AppImage
```

---

## Code Signing & Certificates

### Why Code Signing?

- **macOS**: Required for Gatekeeper (users won't see "unidentified developer")
- **Windows**: Required to avoid SmartScreen warnings
- **Linux**: Optional (package signing for trust)

### macOS Code Signing

**Requirements**:
1. Apple Developer Account ($99/year)
2. Developer ID Application certificate
3. `codesign` tool (comes with Xcode)

**Manual Signing**:
```bash
# Sign the app
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: YOUR NAME (TEAM_ID)" \
  --options runtime \
  ../VSCode-darwin-arm64/GRID.app

# Verify
codesign --verify --deep --strict --verbose=2 ../VSCode-darwin-arm64/GRID.app
spctl -a -t exec -vv ../VSCode-darwin-arm64/GRID.app
```

**macOS Notarization** (Required for macOS 10.15+):
```bash
# Create ZIP
ditto -c -k --keepParent ../VSCode-darwin-arm64/GRID.app GRID.zip

# Submit for notarization
xcrun notarytool submit GRID.zip \
  --apple-id YOUR_EMAIL \
  --team-id TEAM_ID \
  --password APP_SPECIFIC_PASSWORD \
  --wait

# Staple ticket to app
xcrun stapler staple ../VSCode-darwin-arm64/GRID.app
```

**Azure Pipeline** (Automated):
- Uses ESRP (Enterprise Signing and Reporting Pipeline)
- Configuration: `build/azure-pipelines/darwin/product-build-darwin-cli-sign.yml`
- Requires Microsoft Azure account with ESRP service

### Windows Code Signing

**Requirements**:
1. Code signing certificate (.pfx or from HSM)
2. `signtool.exe` (Windows SDK)

**Manual Signing**:
```bash
# Sign executable
signtool sign /f YOUR_CERT.pfx /p PASSWORD /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 ..\VSCode-win32-x64\GRID.exe

# Verify
signtool verify /pa ..\VSCode-win32-x64\GRID.exe
```

**Automated Signing**:
- Configuration: `build/azure-pipelines/win32/product-build-win32-cli-sign.yml`
- Uses Authenticode via ESRP
- Timestamp server: `http://timestamp.digicert.com`

### Linux Package Signing

**GPG Signing** (DEB/RPM):
```bash
# Generate GPG key (one-time)
gpg --full-generate-key

# Sign DEB package
dpkg-sig --sign builder grid-<version>-amd64.deb

# Sign RPM package
rpm --addsign grid-<version>.x86_64.rpm
```

### Certificate Storage

**For Local Builds**:
- macOS: Keychain Access
- Windows: Certificate Store or `.pfx` file
- Linux: GPG keyring

**For CI/CD**:
- **Azure Key Vault**: `vscode-build-secrets`
- Secrets:
  - `esrp-auth`: Authentication certificate
  - `esrp-sign`: Signing certificate
  - `github-distro-mixin-password`: GitHub token

---

## Distribution Formats

### Output Formats by Platform

#### macOS
- **Application Bundle**: `GRID.app` (directory)
- **ZIP Archive**: `VSCode-darwin-arm64.zip`
- **DMG**: `GRID-<version>-darwin-arm64.dmg`
- **Update Package**: For auto-update system

#### Windows
- **Portable**: `VSCode-win32-x64.zip` (unzip and run)
- **System Installer**: `GRIDSetup-x64-<version>.exe`
- **User Installer**: `GRIDUserSetup-x64-<version>.exe`
- **Update Package**: For auto-update system

#### Linux
- **Portable**: `VSCode-linux-x64.tar.gz`
- **DEB Package**: `grid-<version>-amd64.deb`
- **RPM Package**: `grid-<version>.x86_64.rpm`
- **Snap Package**: `grid-<version>.snap`
- **AppImage**: `GRID-x86_64.AppImage`

### File Sizes

| Format | Size (Approx) |
|--------|---------------|
| Portable Archive | 200-300 MB |
| Installer (compressed) | 150-250 MB |
| AppImage | 250-350 MB |
| Snap | 200-300 MB |

---

## CI/CD Pipeline

GRID uses **Azure Pipelines** for automated builds (based on VS Code infrastructure).

### Pipeline Structure

**Main Pipeline**: `build/azure-pipelines/product-build.yml`

**Stages**:
1. **Compile**: TypeScript, minification
2. **Platform Builds**: Parallel builds for all platforms
3. **Signing**: Code sign executables
4. **Packaging**: Create installers
5. **Publishing**: Upload to storage
6. **Release**: Create GitHub release

### GitHub Actions Alternative

For community/open-source builds without Azure:

**.github/workflows/build-release.yml** (Example):
```yaml
name: Build Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version-file: .nvmrc
      - run: npm install
      - run: npm run compile-build
      - run: npm run gulp vscode-linux-x64
      - run: npm run gulp vscode-linux-deb-x64
      - uses: actions/upload-artifact@v3
        with:
          name: linux-deb-x64
          path: .build/linux/deb/**/*.deb

  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run compile-build
      - run: npm run gulp vscode-darwin-arm64
      # Add DMG creation and signing steps

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run compile-build
      - run: npm run gulp vscode-win32-x64
      # Inno Setup creates installer automatically
```

---

## Release Process

### 1. Pre-Release Checklist

- [ ] All tests passing: `npm run test:ci`
- [ ] Version bumped in `package.json`
- [ ] Changelog updated
- [ ] Documentation updated
- [ ] All features tested in dev build

### 2. Create Release Tag

```bash
# Update version
npm version minor  # or major/patch

# Tag release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### 3. Build All Platforms

**Option A: Local Builds**
```bash
# Compile once
npm run compile-build

# Build for each platform (run on respective OS)
npm run gulp vscode-darwin-arm64     # macOS
npm run gulp vscode-win32-x64        # Windows
npm run gulp vscode-linux-x64        # Linux
npm run gulp vscode-linux-deb-x64    # Linux DEB
```

**Option B: CI/CD**
- Push tag to trigger automated builds
- Download artifacts from pipeline

### 4. Create Platform Packages

#### macOS
```bash
# Create DMG
create-dmg '../VSCode-darwin-arm64/GRID.app'
mv 'GRID *.dmg' GRID-1.0.0-darwin-arm64.dmg

# Sign & notarize (if you have certificates)
```

#### Windows
```bash
# Installer already created at:
# .build/win32-x64/system-setup/GRIDSetup-x64-1.0.0.exe
cp .build/win32-x64/system-setup/GRIDSetup-x64-*.exe releases/
```

#### Linux
```bash
# DEB
cp .build/linux/deb/amd64/grid-*.deb releases/

# Create portable archive
cd ../VSCode-linux-x64
tar czf ../GRID/releases/grid-linux-x64-1.0.0.tar.gz *
```

### 5. Create GitHub Release

```bash
# Install GitHub CLI
gh auth login

# Create release
gh release create v1.0.0 \
  --title "GRID v1.0.0" \
  --notes "Release notes here" \
  releases/GRID-*.dmg \
  releases/GRIDSetup-*.exe \
  releases/grid-*.deb \
  releases/grid-*.tar.gz
```

### 6. Publish Release

- [ ] Upload to GitHub Releases
- [ ] Update website download links
- [ ] Publish release notes
- [ ] Announce on social media/Discord
- [ ] Update documentation

---

## Troubleshooting

### Build Fails

**"Cannot find module" errors**:
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
cd build && npm install
```

**"Compilation failed"**:
```bash
# Check TypeScript errors
npm run compile

# Check build scripts
cd build && npm run compile
```

### Installer Issues

**Windows: Inno Setup not found**:
```bash
# Reinstall Inno Setup
npm install innosetup --save-dev
```

**macOS: Cannot create DMG**:
```bash
# Install create-dmg
npm install -g create-dmg

# Or use manual approach
hdiutil create -volname "GRID" -srcfolder ../VSCode-darwin-arm64/GRID.app -ov -format UDZO GRID.dmg
```

**Linux: DEB dependencies missing**:
```bash
# Install packaging tools
sudo apt-get install fakeroot dpkg-dev
```

### Code Signing Issues

**macOS: "No identity found"**:
```bash
# List certificates
security find-identity -v -p codesigning

# If none, you need to get Developer ID from Apple Developer
```

**Windows: "SignTool not found"**:
```bash
# Install Windows SDK
# Or locate signtool:
where signtool
# Usually at: C:\Program Files (x86)\Windows Kits\10\bin\<version>\x64\signtool.exe
```

### Build is Too Slow

**Speed up compilation**:
```bash
# Use dev builds during development
npm run dev:watch-linux  # or dev:watch-windows

# Only do production builds for releases
```

**Parallel builds**:
```bash
# Build multiple architectures in parallel on CI
```

---

## Quick Reference Commands

### Development
```bash
npm run watch                    # Watch mode (dev)
npm run dev:build-linux          # Quick dev build (Linux)
./scripts/code.sh                # Run dev instance
```

### Production
```bash
npm run compile-build            # Minified compilation
npm run gulp vscode-darwin-arm64 # Build macOS (AS)
npm run gulp vscode-win32-x64    # Build Windows
npm run gulp vscode-linux-x64    # Build Linux
npm run gulp vscode-linux-deb-x64 # Build Linux DEB
```

### Testing
```bash
npm run test:ci                  # All tests
npm run eslint                   # Lint check
npm test                         # Unit tests
```

---

## Additional Resources

- **VS Code Build Guide**: https://github.com/microsoft/vscode/wiki/How-to-Contribute
- **Electron Builder**: https://www.electron.build/ (alternative to current system)
- **Inno Setup**: https://jrsoftware.org/isinfo.php
- **Create DMG**: https://github.com/sindresorhus/create-dmg
- **AppImage**: https://appimage.org/
- **Snapcraft**: https://snapcraft.io/docs

---

## Summary

**Quick Build Path**:
1. `npm install` - Install dependencies
2. `npm run compile-build` - Compile with minification
3. `npm run gulp vscode-{platform}-{arch}` - Build for platform
4. Create installer (automatic for Windows, manual for macOS DMG)
5. (Optional) Code sign
6. Distribute!

**For most users**: Local builds without code signing are fine for personal use or internal distribution. Code signing is only necessary for public distribution to avoid OS security warnings.
