# GRID Development Builds

This folder contains **development builds** for testing GRID on Windows and Linux. These builds are:

- ✅ **Fast to compile** (dev mode, no optimizations)
- ✅ **Hot reload enabled** (auto-rebuild on file changes)
- ✅ **Not for release** (kept separate from production builds)
- ✅ **Easy to test** (simple scripts to run and test)

---

## 📁 Folder Structure

```
dev-builds/
├── linux/          # Linux dev builds (binaries auto-copied here)
├── windows/        # Windows dev builds (binaries auto-copied here)
├── scripts/        # Build and watch scripts
└── README.md       # This file
```

---

## 🚀 Quick Start

### One-Time Build

**Linux:**
```bash
npm run dev:build-linux
```

**Windows:**
```cmd
npm run dev:build-windows
```

### Hot Reload Mode (Recommended for Development)

**Linux:**
```bash
npm run dev:watch-linux
```

**Windows:**
```cmd
npm run dev:watch-windows
```

This will:
1. Watch for changes in `cli/src/` (Rust code)
2. Watch for changes in TypeScript/JavaScript files
3. Auto-rebuild when files change
4. Copy the new binary to `dev-builds/linux/` or `dev-builds/windows/`

---

## 🧪 Testing Your Changes

### Option 1: Direct Script Execution

**Linux:**
```bash
./dev-builds/scripts/test-linux.sh [arguments]
```

**Windows:**
```cmd
dev-builds\scripts\test-windows.bat [arguments]
```

### Option 2: Run the Binary Directly

**Linux:**
```bash
./dev-builds/linux/code --version
./dev-builds/linux/code --help
```

**Windows:**
```cmd
dev-builds\windows\code.exe --version
dev-builds\windows\code.exe --help
```

---

## 🔥 Hot Reload Workflow

This is the recommended workflow for active development:

1. **Start watch mode** (in one terminal):
   ```bash
   # Linux
   npm run dev:watch-linux

   # Windows
   npm run dev:watch-windows
   ```

2. **Edit your code** in another terminal/editor:
   - Edit Rust files in `cli/src/`
   - Edit TypeScript files in `src/`
   - Watch the terminal for build status

3. **Test immediately**:
   ```bash
   # The binary is auto-updated, just run it again!
   ./dev-builds/linux/code --version
   ```

### Example Development Session (Linux)

```bash
# Terminal 1: Start hot reload
$ npm run dev:watch-linux
👀 Watching Rust CLI for changes (Linux)...
📁 Output: /home/user/GRID/dev-builds/linux/code
💡 Edit files in cli/src/ and they'll auto-rebuild

# Terminal 2: Make changes
$ vim cli/src/main.rs
# ... edit code ...
# ... watch Terminal 1 auto-rebuild ...

# Terminal 2: Test immediately
$ ./dev-builds/linux/code --version
# Your changes are live!
```

---

## 📋 Available Scripts

All scripts are available via npm:

| Command | Description |
|---------|-------------|
| `npm run dev:build-linux` | Build once for Linux (dev mode) |
| `npm run dev:build-windows` | Build once for Windows (dev mode) |
| `npm run dev:watch-linux` | Watch + auto-rebuild for Linux |
| `npm run dev:watch-windows` | Watch + auto-rebuild for Windows |

Direct script access:

| Script | Platform | Purpose |
|--------|----------|---------|
| `dev-builds/scripts/dev-build-linux.sh` | Linux | Single dev build |
| `dev-builds/scripts/dev-build-windows.bat` | Windows | Single dev build |
| `dev-builds/scripts/watch-cli-linux.sh` | Linux | Watch Rust CLI |
| `dev-builds/scripts/watch-cli-windows.bat` | Windows | Watch Rust CLI |
| `dev-builds/scripts/test-linux.sh` | Linux | Quick test runner |
| `dev-builds/scripts/test-windows.bat` | Windows | Quick test runner |

---

## 🔧 Build Modes Explained

### Dev Build (This Folder)
- **Speed:** ⚡ Fast (2-10 seconds)
- **Optimizations:** ❌ None
- **Debug info:** ✅ Full
- **Binary size:** 📦 Large (~50-100 MB)
- **Use case:** 🧪 Development & testing
- **Location:** `dev-builds/linux/` or `dev-builds/windows/`

### Release Build (Production)
- **Speed:** 🐌 Slow (5-30 minutes)
- **Optimizations:** ✅ Full (LTO, strip, etc.)
- **Debug info:** ❌ Stripped
- **Binary size:** 📦 Small (~10-20 MB)
- **Use case:** 🚀 Production deployment
- **Command:** `cargo build --release`

---

## 💡 Tips & Tricks

### Speed Up Rust Builds

Install `cargo-watch` for better file watching:
```bash
cargo install cargo-watch
```

### Parallel Development

Run multiple watch processes in parallel:
```bash
# Terminal 1: Watch Rust CLI
npm run dev:watch-cli-linux

# Terminal 2: Watch TypeScript/React
npm run watch-client

# Terminal 3: Test your changes
./dev-builds/linux/code
```

### Cross-Platform Development

Build for both platforms from Linux (requires cross-compilation setup):
```bash
# Install Windows cross-compilation tools
sudo apt install mingw-w64

# Add Windows target
rustup target add x86_64-pc-windows-gnu

# Build for Windows from Linux (experimental)
cargo build --target x86_64-pc-windows-gnu
```

### Debugging

The dev builds include full debug symbols. Use with debuggers:

**Linux:**
```bash
gdb ./dev-builds/linux/code
lldb ./dev-builds/linux/code
```

**Windows:**
```cmd
# Use Visual Studio debugger or WinDbg
```

---

## ⚠️ Important Notes

1. **Not for Distribution:** These builds are **only for local testing**. Do not distribute them.
2. **Slower Runtime:** Dev builds run slower than release builds due to lack of optimizations.
3. **Larger Size:** Dev binaries are 5-10x larger than release builds.
4. **Git Ignored:** All binaries in this folder are git-ignored (see `.gitignore`).

---

## 🐛 Troubleshooting

### "cargo: command not found"

Install Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### "Binary not found after build"

The build might have failed. Check the output. Common issues:
- Missing dependencies (OpenSSL, etc.)
- Rust version too old
- Platform-specific compilation errors

Run a manual build to see errors:
```bash
cd cli
cargo build
```

### "Hot reload not working"

**Linux:** Install `inotify-tools`:
```bash
sudo apt install inotify-tools
```

Or install `cargo-watch`:
```bash
cargo install cargo-watch
```

**Windows:** The scripts use PowerShell's FileSystemWatcher, which should work by default.

---

## 📚 More Information

- Main README: `/README.md`
- Testing Guide: `/TESTING.md`
- Build Scripts: `/build/`
- CLI Source: `/cli/`

---

## 🤝 Contributing

When developing new features:

1. Use `npm run dev:watch-linux` or `npm run dev:watch-windows`
2. Make your changes
3. Test with the dev build
4. Run tests: `npm test`
5. When ready, test a release build before submitting PR

---

**Happy Coding! 🎉**
