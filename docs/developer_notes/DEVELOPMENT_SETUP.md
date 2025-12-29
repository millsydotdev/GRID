# GRID Development Environment Setup Guide

Complete guide for setting up your development environment for GRID.

> **Note**: This guide is for **developing GRID itself** (working on GRID's source code).
> To **build the GRID IDE for distribution**, see [BUILDING_GRID_IDE.md](./BUILDING_GRID_IDE.md).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Environment Variables & API Keys](#environment-variables--api-keys)
4. [Installation Steps](#installation-steps)
5. [Building & Running](#building--running)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

#### All Platforms

- **Node.js**: Version `22.20.0` (exact version - see `.nvmrc`)
  - Use [nvm](https://github.com/nvm-sh/nvm) for easy version management:

    ```bash
    nvm install
    nvm use
    ```

- **npm**: Comes with Node.js
- **Git**: For version control
- **Rust & Cargo**: Required for CLI builds
  - Install from: <https://rustup.rs/>

#### macOS

- **Python**: Usually pre-installed
- **Xcode Command Line Tools**:

  ```bash
  xcode-select --install
  ```

#### Windows

- **Visual Studio 2022** (Community Edition) or **VS Build Tools**
  - Download from: <https://visualstudio.microsoft.com/>
  - Required Workloads:
    - `Desktop development with C++`
    - `Node.js build tools`
  - Required Individual Components:
    - `MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs (Latest)`
    - `C++ ATL for latest build tools with Spectre Mitigations`
    - `C++ MFC for latest build tools with Spectre Mitigations`

#### Linux

- **Build tools and libraries**:

  **Debian/Ubuntu:**

  ```bash
  sudo apt-get install build-essential g++ libx11-dev libxkbfile-dev libsecret-1-dev libkrb5-dev python-is-python3
  npm install -g node-gyp
  ```

  **Fedora/Red Hat:**

  ```bash
  sudo dnf install @development-tools gcc gcc-c++ make libsecret-devel krb5-devel libX11-devel libxkbfile-devel
  npm install -g node-gyp
  ```

  **openSUSE/SUSE:**

  ```bash
  sudo zypper install patterns-devel-C-C++-devel_C_C++ krb5-devel libsecret-devel libxkbfile-devel libX11-devel
  npm install -g node-gyp
  ```

---

## System Requirements

- **RAM**: 8GB minimum, 16GB+ recommended
- **Disk Space**: ~10GB for development environment
- **CPU**: Modern multi-core processor recommended

---

## Environment Variables & API Keys

GRID supports multiple AI providers. You'll configure these through the GRID settings UI, not environment variables.

### Supported AI Providers

#### Cloud Providers (Require API Keys)

1. **Anthropic (Claude)**
   - Get API key: <https://console.anthropic.com/>
   - Models: claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5, etc.

2. **OpenAI (GPT)**
   - Get API key: <https://platform.openai.com/api-keys>
   - Models: gpt-5.1, gpt-4.1, gpt-4o, o3, o1, etc.

3. **DeepSeek**
   - Get API key: <https://platform.deepseek.com/>
   - Cost-effective alternative

4. **OpenRouter**
   - Get API key: <https://openrouter.ai/>
   - Access to multiple models through one API

5. **Gemini (Google)**
   - Get API key: <https://makersuite.google.com/app/apikey>
   - Google's AI models

6. **Groq**
   - Get API key: <https://console.groq.com/>
   - Fast inference platform

7. **xAI (Grok)**
   - Get API key: <https://x.ai/>
   - Grok models

8. **Mistral**
   - Get API key: <https://console.mistral.ai/>
   - European AI provider

9. **HuggingFace**
   - Get API key: <https://huggingface.co/settings/tokens>
   - Access to HF models

10. **Microsoft Azure**
    - Requires: Project/Resource name, API key
    - Region-specific deployment

11. **Google Vertex AI**
    - Requires: Project ID, Region
    - Google Cloud Platform

12. **AWS Bedrock**
    - Requires: API key, Region
    - Amazon's AI service

#### Local Providers (No API Keys Required)

1. **Ollama** (Recommended for local development)
   - Default endpoint: `http://127.0.0.1:11434`
   - Install: `./scripts/install-ollama.sh` (Linux/macOS)
   - Pull models: `ollama pull llama3.1`

2. **vLLM**
   - Default endpoint: `http://localhost:8000`
   - Self-hosted inference server

3. **LM Studio**
   - Default endpoint: `http://localhost:1234`
   - Desktop app for running local models

4. **LiteLLM**
   - Proxy server for multiple providers
   - Requires custom endpoint

5. **OpenAI Compatible**
   - For custom OpenAI-compatible endpoints
   - Requires endpoint and optional API key

### Configuration

API keys and endpoints are configured through:

- **GRID Settings UI**: Open GRID → Settings → AI Providers
- Settings are stored in: `~/.grid/` (Linux/macOS) or `%APPDATA%\.grid\` (Windows)

---

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/GRID-Editor/GRID.git
cd GRID
```

### 2. Install Node.js (Correct Version)

Using nvm (recommended):

```bash
nvm install
nvm use
```

Verify:

```bash
node --version  # Should output: v22.20.0
```

### 3. Install Rust & Cargo

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify
cargo --version
rustc --version
```

### 4. Install Dependencies

```bash
npm install
```

This will:

- Install all Node.js dependencies
- Run post-install scripts
- Set up the development environment

**Note**: This can take 5-15 minutes depending on your system.

### 5. (Optional) Install Ollama for Local AI

```bash
# Linux/macOS
./scripts/install-ollama.sh

# Then pull a model
ollama pull llama3.1
```

---

## Building & Running

### Development Mode (Recommended)

1. **Start the build watchers** (compiles TypeScript/React on change):

   **Inside GRID/VSCode:**
   - Press `Ctrl+Shift+B` (Windows/Linux) or `Cmd+Shift+B` (macOS)
   - Select "npm: watch"

   **From Terminal:**

   ```bash
   npm run watch
   ```

   Wait until you see:

   ```
   [watch-extensions] Finished compilation extensions with 0 errors
   [watch-client] Finished compilation with 0 errors
   ```

2. **Launch GRID Developer Mode**:

   ```bash
   # Linux/macOS
   ./scripts/code.sh

   # Windows
   ./scripts/code.bat
   ```

   **Pro tip**: Add these flags to use isolated settings:

   ```bash
   ./scripts/code.sh --user-data-dir ./.tmp/user-data --extensions-dir ./.tmp/extensions
   ```

3. **Reload after changes**:
   - Press `Ctrl+R` (Windows/Linux) or `Cmd+R` (macOS) in the developer window
   - Or: `Ctrl+Shift+P` → "Reload Window"

### Alternative: Terminal-Only Build

```bash
# Start watchers
npm run watch

# In another terminal, run GRID
./scripts/code.sh
```

### React Component Development

If you're working on GRID's React UI components:

```bash
# Build React components once
npm run buildreact

# Watch React components (auto-rebuild on change)
npm run watchreact

# Or run in background with deemon
npm run watchreactd
```

### Kill Background Watchers

```bash
# Kill all watchers
npm run kill-watchd

# Kill specific watchers
npm run kill-watch-clientd
npm run kill-watch-extensionsd
```

---

## Building Executables

### Development Builds (Fast, for testing)

```bash
# Linux
npm run dev:build-linux

# Windows
npm run dev:build-windows
```

Output: `dev-builds/linux/code` or `dev-builds/windows/code.exe`

### Production Builds (Slow, ~25 minutes)

**macOS:**

```bash
# Apple Silicon
npm run gulp vscode-darwin-arm64

# Intel
npm run gulp vscode-darwin-x64
```

**Windows:**

```bash
# x64 (most common)
npm run gulp vscode-win32-x64

# ARM64
npm run gulp vscode-win32-arm64
```

**Linux:**

```bash
# x64 (most common)
npm run gulp vscode-linux-x64

# ARM64
npm run gulp vscode-linux-arm64
```

**Output Location**: The executable will be in a folder outside the repo:

```
workspace/
├── GRID/          # Your repo
└── VSCode-*/      # Generated build
```

---

## Testing

### Run All Tests

```bash
npm run test:ci
```

### Specific Test Suites

```bash
# Node tests
npm run test-node

# Browser tests (installs Playwright first)
npm run test-browser

# Browser tests (skip Playwright install)
npm run test-browser-no-install

# Extension tests
npm run test-extension

# Build script tests
npm run test-build-scripts
```

### Linting

```bash
# Run ESLint
npm run eslint

# Run Stylelint
npm run stylelint

# Run all linters (CI mode)
npm run lint:ci
```

### Type Checking

```bash
# Compile check
npm run compile

# TypeScript native check
npm run compile-check-ts-native

# Monaco editor type check
npm run monaco-compile-check

# Layer validation
npm run valid-layers-check
```

---

## Deployment

GRID uses GitHub Actions for CI/CD. See `.github/workflows/` for pipeline configuration.

### Building for Release

Production releases are built using GitHub Actions workflows:

- `pr.yml` - Pull request validation
- `pr-linux-test.yml` - Linux tests
- `pr-darwin-test.yml` - macOS tests
- `pr-win32-test.yml` - Windows tests

### Manual Release Build

```bash
# Compile with minification
npm run compile-build

# Compile extensions with minification
npm run compile-extensions-build

# Minify main application
npm run minify-vscode
```

---

## Troubleshooting

### Common Issues

#### "TypeError: Failed to fetch dynamically imported module"

- **Fix**: Make sure all imports end with `.js`

#### React/Style Issues

- **Fix**:

  ```bash
  NODE_OPTIONS="--max-old-space-size=8192" npm run buildreact
  ```

- Wait a few seconds and reload the window

#### Node Version Mismatch

- **Fix**: Use the exact version in `.nvmrc`:

  ```bash
  nvm install
  nvm use
  ```

#### Path with Spaces

- **Fix**: Make sure the path to your GRID folder has no spaces
- Move to a path like `/home/user/projects/GRID` instead of `/home/user/My Projects/GRID`

#### Linux: "libtool: error: unrecognised option: '-static'"

- **Fix**: Install GNU libtool (macOS uses BSD libtool by default)

  ```bash
  brew install libtool
  ```

#### Linux: "SUID sandbox helper binary error"

- **Fix**:

  ```bash
  sudo chown root:root .build/electron/chrome-sandbox
  sudo chmod 4755 .build/electron/chrome-sandbox
  ./scripts/code.sh
  ```

#### Build Fails on npm install

- **Fix**: Make sure you have platform-specific build tools installed (see Prerequisites)
- On Windows: Verify Visual Studio components are installed
- On Linux: Run the `apt-get install` / `dnf install` / `zypper install` commands above

#### Watchers Won't Stop

- **Fix**: Press `Ctrl+D` in the terminal running the watcher
- Don't use `Ctrl+C` as it leaves processes running in background

### Getting Help

- **Discord**: <https://discord.gg/bP3V8FKYux>
- **GitHub Issues**: <https://github.com/GRID-Editor/GRID/issues>
- **Discussions**: <https://github.com/GRID-Editor/GRID/discussions>

---

## Quick Reference

### Essential Commands

```bash
# Install dependencies
npm install

# Start development mode
npm run watch                    # Build watcher
./scripts/code.sh               # Launch GRID

# Build React components
npm run buildreact              # One-time build
npm run watchreact              # Watch mode

# Testing
npm run test:ci                 # All tests
npm run eslint                  # Linting

# Production build
npm run compile-build           # Compile for production
npm run gulp vscode-linux-x64   # Build Linux executable
```

### File Locations

- **Source Code**: `src/vs/workbench/contrib/grid/`
- **Build Scripts**: `scripts/`, `dev-builds/scripts/`
- **Configuration**: `product.json`, `package.json`
- **Tests**: `test/`, `src/**/test/`
- **CI/CD**: `.github/workflows/`

### Important Scripts

| Script | Purpose |
|--------|---------|
| `npm run watch` | Start development build watchers |
| `npm run compile` | One-time compilation |
| `npm run buildreact` | Build React components |
| `./scripts/code.sh` | Launch GRID in dev mode |
| `npm run test:ci` | Run all tests |
| `npm run dev:build-linux` | Quick development build |

---

## Next Steps

1. **Configure AI Providers**: Open GRID → Settings → Add your API keys
2. **Join Community**: <https://discord.gg/bP3V8FKYux>
3. **Read Codebase Guide**: See `GRID_CODEBASE_GUIDE.md`
4. **Check Roadmap**: <https://github.com/orgs/GRID-Editor/projects/1>
5. **Start Contributing**: See `HOW_TO_CONTRIBUTE.md`

Happy coding! 🚀
