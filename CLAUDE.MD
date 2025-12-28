# GRID IDE - Claude AI Assistant Guide

> **Source of Truth**: This document represents the absolute state of the codebase and serves as the primary reference for AI-assisted development.
>
> **Last Updated**: December 2025

## 1. Core Identity & Product Overview

### Product Information
* **Product Name**: GRID
* **Tagline**: Open-source Cursor alternative with privacy-first AI coding
* **Version**: 1.106.0 (Release 0906)
* **Base**: VSCodium / VS Code 1.96+
* **Repository**: https://github.com/GRID-NETWORK-REPO/GRID
* **Website**: https://grideditor.com
* **Discord**: https://discord.gg/bP3V8FKYux
* **License**: MIT
* **Maintainer**: Millsy.dev
* **Key Principle**: Privacy First - Direct model access, no data retention

### Repository Role
This repository ("The Brain") contains:
- All source code and business logic
- AI agent implementations
- React-based UI components
- Build and packaging scripts
- Extension integrations

### Privacy & Telemetry
* **Telemetry**: Completely disabled (verified in `product.json` and patches)
* **Data Flow**: Direct to model providers - GRID never retains user data
* **Philosophy**: "Privacy First" - users control where their data goes

## 2. AI Architecture ("Gemini" Engine)

### A. Model Capabilities System

**Location**: `src/vs/workbench/contrib/grid/common/modelCapabilities.ts`

This file is the **heart of the AI system** - it defines all supported models and their capabilities.

#### HuggingFace Integration (Native, No Middleman)

* **Status**: Direct Integration
* **Endpoint**: `https://router.huggingface.co/v1`
* **Technology**: Safetensors, connection pooling, OpenAI-compatible schema
* **Auto-Routing**: Models with `:auto` suffix use HuggingFace's optimal inference provider

**Supported Models (45+ models across 4 categories)**:

1. **Text Models**:
   - Llama 3.1 (70B, 8B)
   - Llama 3.2 (3B)
   - Mistral 7B / Mixtral 8x7B
   - Phi-3.5
   - Google Gemma 2 (9B, 27B)

2. **Code Models**:
   - **Qwen 2.5 Coder** (32B, 7B) - Primary code model
   - DeepSeek Coder V2
   - StarCoder2 (15B)

3. **Reasoning Models**:
   - **DeepSeek R1** - Advanced reasoning
   - Qwen QwQ-32B (supports `<think>` tags)

4. **Vision Models**:
   - Llama 3.2 Vision (11B, 90B)
   - Qwen2-VL
   - Phi-3 Vision

5. **Image Generation**:
   - FLUX.1 (dev/schnell)
   - Stable Diffusion XL

6. **Audio**:
   - Whisper Large V3

#### Other Provider Integrations

* **OpenAI**: GPT-5 Series (5.1, 5-mini), GPT-4o, o3-deep-search
* **Anthropic**: Claude 3.5 Sonnet, Claude 3.7 Sonnet (Reasoning), Haiku 4.5
* **Google**: Gemini 3 Pro/Flash (Previews), Gemini 2.5 Flash
* **Local Providers**:
  - Ollama (`http://127.0.0.1:11434`)
  - vLLM
  - LM Studio
* **MCP**: Native support via `@modelcontextprotocol/sdk` v1.11.2

### B. The "Big Three" Unique Features

#### 1. Auto-Debug 🐛

**File**: `src/vs/workbench/contrib/grid/common/autoDebugService.ts`

**Mechanism**:
1. Listens to linter diagnostics in real-time
2. Sends diagnostic context to LLM
3. Receives suggested fix
4. Applies fix automatically (with user approval)
5. **Learning Component**: Tracks success rates of fixes to improve future suggestions

**Key Innovation**: Self-improving system that learns from past fixes

#### 2. Live Coding 👥

**File**: `src/vs/workbench/contrib/grid/common/liveCodingService.ts`

**Technology**:
- WebSocket synchronization
- Relative cursor tracking
- Peer-to-peer coordination via `@peerjs` (WebRTC)
- Custom socket service for real-time updates

**Use Case**: Collaborative coding sessions with live cursor positions and edits

#### 3. PR Review 🔍

**File**: `src/vs/workbench/contrib/grid/common/prReviewService.ts`

**Capabilities**:
- SQL Injection detection
- XSS vulnerability scanning
- Time-complexity analysis
- Security best practices validation
- Code quality metrics

### C. Agent Modes

**Implementation**: Intent parser switches between 5 distinct operational modes

1. **BUILD** Mode
   - Focus: Implementation and code generation
   - Use Case: Writing new features, implementing logic

2. **PLAN** Mode
   - Focus: Architectural reasoning and design
   - Use Case: System design, feature planning, refactoring strategy

3. **EXPLORE** Mode
   - Focus: Codebase navigation and understanding
   - Use Case: Finding code, understanding architecture, discovery

4. **REVIEW** Mode
   - Focus: Quality assurance and security
   - Use Case: Code review, security audits, best practices

5. **DEBUG** Mode
   - Focus: Error analysis and troubleshooting
   - Use Case: Bug fixing, performance issues, logic errors

### D. Learning Engine

**File**: `src/vs/workbench/contrib/grid/common/gridLearningEngine.ts`

**Purpose**: Self-improving AI that learns from conversations

**Capabilities**:
- Conversation pattern analysis
- Success/failure tracking
- Context optimization
- User preference learning

## 3. Technical Stack & Configuration

### Dependencies (`package.json`)

**Core Framework**:
- **UI**: React 19.1.0 (`react`, `react-dom`)
- **Build**: Gulp + Custom Scripts
- **Runtime**: Electron 37.7.0
- **Language**: TypeScript (with custom `tsgo` compiler)

**AI SDKs**:
- `@anthropic-ai/sdk`: ^0.40.0
- `openai`: Latest
- `@google/genai`: ^0.13.0
- `@huggingface/inference`: ^2.8.1
- `ollama`: Latest
- `@mistralai/mistralai`: ^1.6.0
- `@modelcontextprotocol/sdk`: ^1.11.2

**Key Libraries**:
- `@floating-ui/react`: ^0.27.8 (UI tooltips/popovers)
- `@microsoft/1ds-core-js`: Telemetry (disabled in builds)

### Product Configuration (`product.json`)

* **Application ID**: `GRID.Editor`
* **Protocol Handler**: `grid://`
* **Extensions**: Uses VS Marketplace (`marketplace.visualstudio.com`)
* **Update Channel**: Configurable (stable/insiders)

### Build System

**Primary Build Tool**: Gulp (via `./node_modules/gulp/bin/gulp.js`)

**Key Build Commands**:
```bash
npm run compile              # Full compilation
npm run watch                # Watch mode (client + extensions)
npm run watch-client         # Watch client only
npm run watch-extensions     # Watch extensions only
npm run buildreact           # Build React components
npm run watchreact           # Watch React components
```

**React Build**:
- Location: `src/vs/workbench/contrib/grid/browser/react/`
- Build script: `build.js` (custom bundler)
- Watch mode available: `npm run watchreact`

**Memory Limits**:
- Compile: 12GB (`--max-old-space-size=12288`)
- Watch: 8GB (`--max-old-space-size=8192`)

## 4. Codebase Architecture & Navigation

### Directory Structure

#### Core GRID Code

```
src/vs/workbench/contrib/grid/
├── browser/
│   ├── react/                    # ALL React UI Components
│   │   └── src/                  # React source files
│   ├── gridSettingsPane.ts       # Settings UI
│   └── sidebar*.ts               # Sidebar and chat UI
├── common/
│   ├── modelCapabilities.ts      # Model definitions (CRITICAL)
│   ├── autoDebugService.ts       # Auto-debug logic
│   ├── liveCodingService.ts      # Live coding sync
│   ├── prReviewService.ts        # PR review engine
│   ├── gridLearningEngine.ts     # Learning system
│   └── llm*/                     # LLM providers, settings, services
└── telemetry/                    # Telemetry (disabled)
```

#### Build & Configuration

```
build/                            # Build scripts and tooling
resources/
├── completions/                  # Shell completions
├── linux/                        # Linux packaging files
│   ├── grid.desktop
│   ├── grid-url-handler.desktop
│   └── grid.appdata.xml
└── provider-config.example.json  # Provider configuration template
```

#### Scripts & Entry Points

```
scripts/
├── grid*.sh                      # Linux/macOS CLI wrappers
└── grid*.bat                     # Windows CLI wrappers
```

### React Components Location

**Path**: `src/vs/workbench/contrib/grid/browser/react/src/`

All modern UI components are built with React 19.1.0. The build process is separate from the main Gulp build.

### Provider Configuration

**Example File**: `resources/provider-config.example.json`

Users configure API keys and endpoints for:
- OpenAI
- Anthropic
- Google
- HuggingFace
- Local providers (Ollama, etc.)

## 5. Development Workflow

### Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Watch Mode**:
   ```bash
   npm run watch        # Full watch (client + extensions)
   # OR
   npm run watchd       # With deemon (auto-restart)
   ```

3. **Watch React Components** (separate terminal):
   ```bash
   npm run watchreact   # Manual watch
   # OR
   npm run watchreactd  # With deemon
   ```

### Common Tasks

**Compile TypeScript**:
```bash
npm run compile
```

**Type Checking Only**:
```bash
npm run compile-check-ts-native
```

**Lint Code**:
```bash
npm run eslint
npm run stylelint
```

**Run Tests**:
```bash
npm run test-node          # Node tests
npm run test-browser       # Browser tests
```

**Build for Distribution**:
```bash
npm run dev:build-linux    # Linux dev build
npm run dev:build-windows  # Windows dev build
```

### Development Helpers

**Deemon Integration** (daemon-based watch):
- `npm run watchd` - Auto-restart on crash
- `npm run kill-watchd` - Stop daemon
- `npm run restart-watchd` - Restart daemon

### Key Files to Understand

1. **`product.json`**: Product metadata, branding, telemetry settings
2. **`package.json`**: Dependencies, scripts, version
3. **`src/vs/workbench/contrib/grid/common/modelCapabilities.ts`**: Model definitions
4. **`src/vs/workbench/contrib/grid/browser/gridSettingsPane.ts`**: Settings UI
5. **`build/`**: All build scripts and tooling

## 6. Important Notes for Development

### What Makes GRID Different

1. **Privacy-First**: No telemetry, no data retention
2. **Direct Model Access**: No proxy servers
3. **Multi-Provider**: Support for 10+ AI providers
4. **Self-Learning**: Learning engine improves over time
5. **Agent Modes**: 5 specialized operational modes

### Code Style & Standards

- **TypeScript**: Strict mode enabled
- **React**: Hooks-based, functional components
- **Build**: Gulp + custom scripts
- **Testing**: Mocha (node), Playwright (browser)

### Critical Paths

**When modifying AI features**:
- Check `modelCapabilities.ts` first
- Update learning engine if behavior changes
- Consider impact on all 5 agent modes

**When modifying UI**:
- React components in `browser/react/src/`
- Rebuild with `npm run buildreact`
- Settings UI in `gridSettingsPane.ts`

**When adding providers**:
- Update `modelCapabilities.ts`
- Add SDK to `package.json`
- Update provider config examples

## 7. Known Gaps & Opportunities

### Documentation Gaps

From `gemini.md` analysis:
- **Website** doesn't mention DeepSeek R1 or QwQ support (fully implemented in code)
- **Website** doesn't mention learning aspect of Auto-Debug
- **Documentation** for MCP integration could be expanded

### Areas for Enhancement

1. **Testing**: Browser test coverage could be improved
2. **Documentation**: More examples for custom agent modes
3. **Performance**: Bundle size optimization opportunities
4. **Extensions**: Custom GRID extensions ecosystem

## 8. Contributing Guidelines

See: [HOW_TO_CONTRIBUTE.md](https://github.com/GRID-NETWORK-REPO/GRID/blob/main/HOW_TO_CONTRIBUTE.md)

**Quick Start**:
1. Check the [Project Board](https://github.com/orgs/GRID-NETWORK-REPO/projects/1)
2. Join [Discord](https://discord.gg/bP3V8FKYux) for weekly meetings
3. Fork and create a feature branch
4. Submit PR with clear description

## 9. Quick Reference

### File Extensions & Language Support

GRID inherits VS Code's language support plus:
- All standard VS Code extensions work
- Marketplace extensions compatible
- Custom GRID extensions for AI features

### CLI Commands

```bash
./scripts/grid.sh              # Launch GRID (Linux/macOS)
./scripts/grid.bat             # Launch GRID (Windows)
```

### Keyboard Shortcuts

Standard VS Code shortcuts apply. GRID-specific shortcuts configurable in settings.

## 10. Resources

- **Codebase Guide**: [GRID_CODEBASE_GUIDE.md](./GRID_CODEBASE_GUIDE.md)
- **Comparison**: [GRID vs Other AI Editors](docs/GRID-vs-Other-AI-Editors.md)
- **Downloads**: [DOWNLOADS.md](DOWNLOADS.md)
- **Discord**: https://discord.gg/bP3V8FKYux
- **Website**: https://grideditor.com

---

## For AI Assistants (Claude, etc.)

When working on this codebase:

1. **Always check `modelCapabilities.ts`** when dealing with AI features
2. **React components** require separate build step (`npm run buildreact`)
3. **Privacy is paramount** - never add telemetry or data collection
4. **Agent modes** - understand which mode is appropriate for the task
5. **Learning engine** - consider if changes should be tracked for learning
6. **Multi-provider** - ensure changes work across all providers
7. **Type safety** - strict TypeScript, no `any` types without justification
8. **Testing** - add tests for new features
9. **Documentation** - update this file when making architectural changes
10. **Security** - PR review service should catch vulnerabilities

### Common Pitfall Avoidance

- Don't modify VS Code core without clear need
- Don't add dependencies without checking bundle impact
- Don't skip React rebuild when changing UI
- Don't assume single provider - test cross-provider
- Don't break privacy principles

### When in Doubt

1. Check this file (CLAUDE.MD)
2. Check gemini.md for technical details
3. Check GRID_CODEBASE_GUIDE.md for architecture
4. Ask in Discord
5. Review recent commits for patterns

---

**End of CLAUDE.MD** - Last updated: December 2025
