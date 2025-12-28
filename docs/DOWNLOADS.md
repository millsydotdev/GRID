# GRID Downloads

Download the latest version of GRID for your platform.

## Latest Release

Visit our [GitHub Releases](../../releases/latest) page to download the latest stable version of GRID.

## Platform-Specific Downloads

### Linux (x64)

**File**: `GRID-linux-x64-<version>.tar.gz`

```bash
# Extract the archive
tar -xzf GRID-linux-x64-<version>.tar.gz

# Navigate to the directory
cd GRID

# Run GRID
./code
```

**System Requirements**:
- 64-bit Linux distribution
- GLIBC 2.28 or later
- Recommended: Ubuntu 20.04 or later, Fedora 32 or later

### Windows (x64)

**File**: `GRID-windows-x64-<version>.zip`

```powershell
# Extract the archive (or use Windows Explorer)
Expand-Archive -Path GRID-windows-x64-<version>.zip -DestinationPath .

# Navigate to the directory
cd GRID

# Run GRID
.\Code.exe
```

**System Requirements**:
- Windows 10 version 1809 or later
- 64-bit Windows

### macOS (Universal)

**File**: `GRID-macos-universal-<version>.tar.gz`

```bash
# Extract the archive
tar -xzf GRID-macos-universal-<version>.tar.gz

# Navigate to the directory
cd GRID

# Run GRID (or drag to Applications folder)
open Visual\ Studio\ Code.app
```

**System Requirements**:
- macOS 10.15 (Catalina) or later
- Universal binary (works on Intel and Apple Silicon)

## Automated Downloads with GitHub Actions

GRID is automatically built for all platforms using GitHub Actions. Every release includes:

- ✅ Linux x64 builds
- ✅ Windows x64 builds
- ✅ macOS Universal builds (Intel + Apple Silicon)

## Building from Source

If you prefer to build from source:

```bash
# Clone the repository
git clone https://github.com/GRID-Editor/GRID.git
cd GRID

# Install dependencies
npm ci

# Compile the build tools
cd build && npm run compile && cd ..

# Compile the application
npm run compile

# Build extensions
npm run compile-extensions-build

# Package the application
npm run minify-vscode

# Run from source
./scripts/code.sh  # Linux/macOS
# or
.\scripts\code.bat  # Windows
```

## Release Channels

- **Stable**: Production-ready releases
- **Insider**: Preview builds with latest features (coming soon)

## Verifying Downloads

All releases are published through GitHub Releases with automatic checksums. To verify your download:

1. Go to the [Releases](../../releases) page
2. Expand the "Assets" section
3. Download both the archive and its checksum file (if available)
4. Verify the checksum matches

## Previous Versions

All previous versions are available on the [Releases](../../releases) page.

## Enterprise Downloads

Enterprise users with valid licenses can access special builds with additional features. Contact your administrator for access.

## Need Help?

- **Documentation**: See the [README](README.md)
- **Issues**: Report problems on our [issue tracker](../../issues)
- **Discussions**: Join our [community discussions](../../discussions)

## Update Notifications

GRID will automatically check for updates and notify you when new versions are available. You can configure this in Settings > Updates.

---

**Note**: First-time users should also read the [Getting Started Guide](README.md) and [Deployment Guide](DEPLOY_DASHBOARD.md) for complete setup instructions.
