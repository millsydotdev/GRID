# GRID Development Environment Checklist

Use this checklist to ensure your development environment is fully set up.

## Prerequisites Checklist

### Core Requirements

- [ ] **Node.js v22.20.0** installed

  ```bash
  node --version  # Should show v22.20.0
  ```

  - If wrong version, install [nvm](https://github.com/nvm-sh/nvm) and run: `nvm install && nvm use`

- [ ] **npm** installed (comes with Node.js)

  ```bash
  npm --version
  ```

- [ ] **Git** installed

  ```bash
  git --version
  ```

- [ ] **Rust & Cargo** installed

  ```bash
  cargo --version
  rustc --version
  ```

  - If not installed: <https://rustup.rs/>

### Platform-Specific Requirements

#### macOS

- [ ] **Xcode Command Line Tools** installed

  ```bash
  xcode-select --install
  ```

- [ ] **Python** available (usually pre-installed)

  ```bash
  python3 --version
  ```

#### Windows

- [ ] **Visual Studio 2022** or **VS Build Tools** installed
  - [ ] Workload: "Desktop development with C++"
  - [ ] Workload: "Node.js build tools"
  - [ ] Component: "MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs"
  - [ ] Component: "C++ ATL for latest build tools with Spectre Mitigations"
  - [ ] Component: "C++ MFC for latest build tools with Spectre Mitigations"

#### Linux (Debian/Ubuntu)

- [ ] **Build tools** installed

  ```bash
  sudo apt-get install build-essential g++ libx11-dev libxkbfile-dev \
    libsecret-1-dev libkrb5-dev python-is-python3
  ```

- [ ] **node-gyp** installed globally

  ```bash
  npm install -g node-gyp
  ```

#### Linux (Fedora/Red Hat)

- [ ] **Build tools** installed

  ```bash
  sudo dnf install @development-tools gcc gcc-c++ make libsecret-devel \
    krb5-devel libX11-devel libxkbfile-devel
  ```

- [ ] **node-gyp** installed globally

  ```bash
  npm install -g node-gyp
  ```

#### Linux (openSUSE/SUSE)

- [ ] **Build tools** installed

  ```bash
  sudo zypper install patterns-devel-C-C++-devel_C_C++ krb5-devel \
    libsecret-devel libxkbfile-devel libX11-devel
  ```

- [ ] **node-gyp** installed globally

  ```bash
  npm install -g node-gyp
  ```

### Environment Checks

- [ ] Repository path has **no spaces**

  ```bash
  pwd  # Make sure path doesn't contain spaces
  ```

- [ ] **Sufficient disk space** (~10GB free)

- [ ] **Sufficient RAM** (8GB minimum, 16GB recommended)

## Installation Checklist

- [ ] **Repository cloned**

  ```bash
  git clone https://github.com/GRID-Editor/GRID.git
  cd GRID
  ```

- [ ] **Dependencies installed**

  ```bash
  npm install
  ```

  - This may take 5-15 minutes

- [ ] **No installation errors**
  - Check terminal output for errors
  - If errors occur, see DEVELOPMENT_SETUP.md troubleshooting

## Optional Components

### Local AI (Recommended)

- [ ] **Ollama installed** (optional but recommended)

  ```bash
  # Linux/macOS
  ./scripts/install-ollama.sh

  # Or manual install
  curl -fsSL https://ollama.com/install.sh | sh
  ```

- [ ] **Ollama service running**

  ```bash
  ollama serve  # Run in background
  ```

- [ ] **Test model pulled**

  ```bash
  ollama pull llama3.1
  ```

### Development Tools

- [ ] **nvm installed** (recommended for Node.js version management)
  - Get from: <https://github.com/nvm-sh/nvm>

- [ ] **Playwright installed** (for browser tests)

  ```bash
  npm exec playwright install
  ```

## Build Environment Checklist

- [ ] **Initial compilation successful**

  ```bash
  npm run compile
  ```

  - Should complete without errors

- [ ] **React components build**

  ```bash
  npm run buildreact
  ```

- [ ] **Watchers start successfully**

  ```bash
  npm run watch
  ```

  - Wait for: "Finished compilation with 0 errors"

- [ ] **Development mode launches**

  ```bash
  # Linux/macOS
  ./scripts/code.sh

  # Windows
  ./scripts/code.bat
  ```

## AI Provider Configuration

Configure at least one AI provider in GRID Settings:

### Cloud Providers (Need API Keys)

- [ ] **Anthropic (Claude)** - <https://console.anthropic.com/>
  - Recommended for: Complex reasoning, code generation
  - Models: claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5

- [ ] **OpenAI (GPT)** - <https://platform.openai.com/api-keys>
  - Recommended for: General purpose, fast responses
  - Models: gpt-5.1, gpt-4.1, gpt-4o, o3

- [ ] **DeepSeek** - <https://platform.deepseek.com/>
  - Recommended for: Cost-effective alternative

- [ ] **OpenRouter** - <https://openrouter.ai/>
  - Recommended for: Access to multiple models with one API

- [ ] **Gemini** - <https://makersuite.google.com/app/apikey>
  - Recommended for: Google ecosystem integration

- [ ] **Groq** - <https://console.groq.com/>
  - Recommended for: Fast inference

- [ ] **xAI (Grok)** - <https://x.ai/>
  - Recommended for: Grok models

- [ ] **Mistral** - <https://console.mistral.ai/>
  - Recommended for: European AI provider

- [ ] **HuggingFace** - <https://huggingface.co/settings/tokens>
  - Recommended for: Open source models

### Local Providers (No API Keys)

- [ ] **Ollama** - Default: <http://127.0.0.1:11434>
  - Recommended for: Free local AI, privacy
  - Setup: ./scripts/install-ollama.sh

- [ ] **vLLM** - Default: <http://localhost:8000>
  - Recommended for: Self-hosted inference

- [ ] **LM Studio** - Default: <http://localhost:1234>
  - Recommended for: Desktop app for local models

### Configuration Steps

- [ ] Open GRID
- [ ] Go to Settings (Ctrl+,)
- [ ] Navigate to AI Providers section
- [ ] Add API key(s) for chosen provider(s)
- [ ] Enable/select models to use
- [ ] Test with a simple prompt

## Testing Checklist

- [ ] **Run tests to verify setup**

  ```bash
  npm run test:ci
  ```

- [ ] **Linting works**

  ```bash
  npm run eslint
  ```

- [ ] **Type checking passes**

  ```bash
  npm run compile
  ```

## Quick Test of Development Workflow

- [ ] **Start watchers**
  - Press Ctrl+Shift+B (or Cmd+Shift+B on macOS)
  - Or run: `npm run watch`

- [ ] **Launch developer window**

  ```bash
  ./scripts/code.sh
  ```

- [ ] **Make a small change**
  - Edit any TypeScript file
  - Save the file

- [ ] **Reload window**
  - Press Ctrl+R (or Cmd+R on macOS) in developer window
  - Or: Ctrl+Shift+P → "Reload Window"

- [ ] **Verify change appears**

## Documentation & Community

- [ ] **Read documentation**
  - [ ] DEVELOPMENT_SETUP.md (full setup guide)
  - [ ] GRID_CODEBASE_GUIDE.md (code structure)
  - [ ] HOW_TO_CONTRIBUTE.md (contributing guidelines)

- [ ] **Join community**
  - [ ] Discord: <https://discord.gg/bP3V8FKYux>
  - [ ] GitHub: <https://github.com/GRID-Editor/GRID>

- [ ] **Bookmark resources**
  - [ ] Project Board: <https://github.com/orgs/GRID-Editor/projects/1>
  - [ ] Issues: <https://github.com/GRID-Editor/GRID/issues>

## Troubleshooting

If you encounter issues, check:

- [ ] Node version exactly matches v22.20.0
- [ ] No spaces in repository path
- [ ] All platform-specific build tools installed
- [ ] Sufficient disk space and RAM
- [ ] Review DEVELOPMENT_SETUP.md troubleshooting section
- [ ] Ask for help on Discord

## All Done! 🎉

Once all items are checked, you're ready to contribute to GRID!

Next steps:

1. Pick an issue from the project board
2. Create a new branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

Happy coding! 🚀
