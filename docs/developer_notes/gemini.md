# GRID IDE - Project "Gemini" Deep Analysis
>
> **Source of Truth**: This document represents the absolute state of the codebase as of Dec 2025.

## 1. Core Identity & Branding

* **Product Name**: GRID
* **Version**: 1.106.0 (Release 0906 - Package Version)
* **Base**: VSCodium / VS Code 1.96+
* **Repo Role**: The "Brain" - contains all source code and business logic.
* **License**: MIT
* **Maintainer**: Millsy.dev
* **Repository**: <https://github.com/GRID-Editor/GRID>
* **Website**: <https://grideditor.com>
* **Discord**: <https://discord.gg/bP3V8FKYux>
* **Tagline**: Open-source Cursor alternative with privacy-first AI coding
* **Telemetry**: Disabled / "Privacy First" (verified in `product.json` and patches).
* **Philosophy**: Direct model access - GRID never retains user data.

## 2. AI Architecture (The "Gemini" Engine)

### A. Model Capabilities (`src/vs/workbench/contrib/grid/common/modelCapabilities.ts`)

This file is the heart of the AI system. It defines exactly what models are supported.

#### **HuggingFace Integration (Native)**

* **Status**: Direct Integration (No Middleman).
* **Endpoint**: `https://router.huggingface.co/v1`.
* **Key Tech**: Safetensors, connection pooling, OpenAI-compatible schema.
* **Supported Models (45+)**:
  * **Text**: Llama 3.1 (70B, 8B), Llama 3.2 (3B), Mistral 7B/Mixtral 8x7B, Phi-3.5, Google Gemma 2 (9B, 27B).
  * **Code**: **Qwen 2.5 Coder** (32B, 7B), DeepSeek Coder V2, StarCoder2 (15B).
  * **Reasoning**: **DeepSeek R1**, Qwen QwQ-32B (supports `<think>` tags).
  * **Vision**: Llama 3.2 Vision (11B, 90B), Qwen2-VL, Phi-3 Vision.
  * **Image Gen**: FLUX.1 (dev/schnell), Stable Diffusion XL.
  * **Audio**: Whisper Large V3.
* **Auto-Routing**: Models with `:auto` suffix use HF's optimal inference provider.

#### **Other Providers**

* **OpenAI**: GPT-5 Series (5.1, 5-mini), GPT-4o, o3-deep-search.
* **Anthropic**: Claude 3.5 Sonnet, Claude 3.7 Sonnet (Reasoning), Haiku 4.5.
* **Google**: Gemini 3 Pro/Flash (Previews), Gemini 2.5 Flash.
* **Local**: Ollama (`http://127.0.0.1:11434`), vLLM, LM Studio.
* **MCP**: Native support via `@modelcontextprotocol/sdk`.

### B. "Big Three" Unique Features

1. **Auto-Debug 🐛**
    * **File**: `src/vs/workbench/contrib/grid/common/autoDebugService.ts`
    * **Mechanism**: Listens to linter diagnostics -> Sends to LLM -> Applies Fix.
    * **Learning**: Tracks success rates of fixes to improve future suggestions.
2. **Live Coding 👥**
    * **File**: `src/vs/workbench/contrib/grid/common/liveCodingService.ts`
    * **Tech**: WebSocket synchronization, relative cursor tracking.
    * **Dependencies**: `@peerjs` (implied for WebRTC), custom socket service.
3. **PR Review 🔍**
    * **File**: `src/vs/workbench/contrib/grid/common/prReviewService.ts`
    * **Capabilities**: SQL Injection detection, XSS scanning, time-complexity analysis.

### C. Agent Modes

The IDE parses user intent to switch between these 5 modes:

1. **BUILD**: Implementation focus - writing new features, generating code.
2. **PLAN**: Architectural reasoning - system design, feature planning, refactoring strategy.
3. **EXPLORE**: Codebase navigation - finding code, understanding architecture, discovery.
4. **REVIEW**: Quality assurance - code review, security audits, best practices validation.
5. **DEBUG**: Error logic analysis - bug fixing, performance issues, troubleshooting.

### D. Learning Engine

* **File**: `src/vs/workbench/contrib/grid/common/gridLearningEngine.ts`
* **Purpose**: Self-improving AI that learns from conversations and user interactions.
* **Capabilities**:
  * Conversation pattern analysis
  * Success/failure tracking for AI suggestions
  * Context optimization over time
  * User preference learning and adaptation

## 3. Technical Configuration

### Dependencies (`package.json`)

* **Package Version**: 1.106.0
* **UI Framework**: React 19.1.0 (`react`, `react-dom`)
* **Build Tool**: Gulp + Custom Scripts
* **Runtime**: Electron 37.7.0
* **Language**: TypeScript (with custom `tsgo` compiler)

**AI SDKs** (Direct Integration):

* `@anthropic-ai/sdk`: ^0.40.0
* `openai`: Latest
* `@google/genai`: ^0.13.0
* `@huggingface/inference`: ^2.8.1
* `ollama`: Latest
* `@mistralai/mistralai`: ^1.6.0
* `@modelcontextprotocol/sdk`: ^1.11.2

**Key Libraries**:

* `@floating-ui/react`: ^0.27.8 (UI tooltips/popovers)
* `@microsoft/1ds-core-js`: ^3.2.13 (Telemetry - disabled in builds)

### Product Configuration (`product.json`)

* **Application ID**: `GRID.Editor`
* **Protocol Handler**: `grid://`
* **Extensions Gallery**: Uses standard VS Marketplace (`marketplace.visualstudio.com`)
* **Update Channel**: Configurable (stable/insiders)

## 4. Folder Map (Where to find things)

### Core GRID Source Code

```
src/vs/workbench/contrib/grid/
├── browser/
│   ├── react/src/              # All React UI Components
│   ├── gridSettingsPane.ts     # Settings UI
│   └── sidebar*.ts             # Sidebar and Chat UI
├── common/
│   ├── modelCapabilities.ts    # Model definitions (HEART OF AI SYSTEM)
│   ├── autoDebugService.ts     # Auto-debug logic
│   ├── liveCodingService.ts    # Live coding synchronization
│   ├── prReviewService.ts      # PR review engine
│   ├── gridLearningEngine.ts   # Learning system
│   └── llm*/                   # LLM providers, settings, services
└── telemetry/                  # Telemetry (disabled)
```

### Build & Configuration

* `build/`: Build scripts and tooling
* `resources/`: Icons, assets, completions
* `resources/linux/`: Linux packaging files (`.desktop`, `.appdata.xml`)
* `resources/provider-config.example.json`: Provider configuration template
* `scripts/`: CLI wrappers (`grid*.sh`, `grid*.bat`)

### Key Configuration Files

* `product.json`: Product metadata, branding, telemetry settings
* `package.json`: Dependencies, scripts, version (1.106.0)

## 5. Build System & Development

### Build Commands

**Primary Compilation**:

```bash
npm run compile              # Full build (12GB memory limit)
npm run watch                # Watch mode - client + extensions (8GB)
npm run watch-client         # Watch client only
npm run watch-extensions     # Watch extensions only
```

**React Component Building** (Separate Build Process):

```bash
npm run buildreact           # Build React components
npm run watchreact           # Watch React components
npm run watchreactd          # Watch with deemon (auto-restart)
```

**Testing**:

```bash
npm run test-node            # Node tests (Mocha)
npm run test-browser         # Browser tests (Playwright)
npm run test:ci              # CI test suite
```

**Development Builds**:

```bash
npm run dev:build-linux      # Linux development build
npm run dev:build-windows    # Windows development build
```

### Memory Requirements

* **Compile**: 12GB (`--max-old-space-size=12288`)
* **Watch**: 8GB (`--max-old-space-size=8192`)

### Deemon Integration

Daemon-based watch with auto-restart on crash:

* `npm run watchd` - Full watch with deemon
* `npm run kill-watchd` - Stop daemon
* `npm run restart-watchd` - Restart daemon

## 6. Gemini Analysis: Code vs Marketing

The code in this repository (`GRID`) is **significantly ahead** of the marketing (`GRID-WEBSITE`).

### Major Gaps Identified

1. **DeepSeek R1 & QwQ Support**
   * ✅ **Fully Implemented**: Code has complete DeepSeek R1 and QwQ-32B support
   * ❌ **Website**: No mention of these cutting-edge reasoning models

2. **Learning Engine**
   * ✅ **Fully Implemented**: Auto-Debug learns from success/failure rates
   * ❌ **Website**: Doesn't highlight the self-improving aspect

3. **45+ Model Support**
   * ✅ **Fully Implemented**: Comprehensive model catalog across all categories
   * ⚠️ **Website**: Could better showcase the breadth of provider support

4. **MCP Integration**
   * ✅ **Fully Implemented**: Native Model Context Protocol support (v1.11.2)
   * ⚠️ **Website**: Limited documentation on MCP capabilities

### Competitive Advantages (Undermarketed)

* **Privacy First**: Zero telemetry, direct provider access (no middleman)
* **Multi-Provider**: 10+ AI providers in one IDE
* **Self-Learning AI**: Learning engine that improves over time
* **Agent Modes**: 5 specialized operational modes for different tasks
* **Local + Cloud**: Seamless support for Ollama, vLLM, LM Studio
* **Open Source**: MIT licensed, full transparency

## 7. Key Differentiators

### vs Cursor

* ✅ Open source (MIT license)
* ✅ No telemetry / data retention
* ✅ More model providers (HuggingFace, local models, etc.)
* ✅ Learning engine

### vs Continue.dev

* ✅ More polished UI (React 19.1.0)
* ✅ Advanced features (Auto-Debug, Live Coding, PR Review)
* ✅ Agent mode system

### vs Antigravity

* ✅ Privacy-first architecture
* ✅ Broader model support
* ✅ Self-learning capabilities

## 8. Critical Files Reference

When making changes to GRID, these files are the most critical:

1. **`src/vs/workbench/contrib/grid/common/modelCapabilities.ts`**
   * Model definitions and capabilities
   * Adding new models? Start here.

2. **`src/vs/workbench/contrib/grid/common/gridLearningEngine.ts`**
   * Learning and adaptation logic
   * Modifying AI behavior? Check this.

3. **`src/vs/workbench/contrib/grid/browser/react/src/`**
   * All UI components
   * UI changes? Build with `npm run buildreact`

4. **`product.json`**
   * Product metadata and branding
   * Changing app identity? Modify here.

5. **`package.json`**
   * Dependencies and version
   * Adding dependencies? Update here.

## 9. Development Best Practices

### Code Style

* **TypeScript**: Strict mode, no `any` without justification

* **React**: Hooks-based functional components
* **Testing**: Required for new features
* **Documentation**: Update CLAUDE.MD for architectural changes

### Critical Principles

1. **Privacy**: Never add telemetry or data collection
2. **Multi-Provider**: Ensure changes work across all providers
3. **Type Safety**: Maintain strict TypeScript typing
4. **Testing**: Add tests for new features
5. **Security**: PR review service should catch vulnerabilities

### Common Pitfalls to Avoid

* ❌ Don't modify VS Code core without clear need

* ❌ Don't add dependencies without checking bundle impact
* ❌ Don't skip React rebuild when changing UI
* ❌ Don't assume single provider - test cross-provider
* ❌ Don't break privacy principles

## 10. Resources & Links

* **Repository**: <https://github.com/GRID-Editor/GRID>
* **Website**: <https://grideditor.com>
* **Discord**: <https://discord.gg/bP3V8FKYux>
* **Project Board**: <https://github.com/orgs/GRID-Editor/projects/1>
* **Contributing**: [HOW_TO_CONTRIBUTE.md](https://github.com/GRID-Editor/GRID/blob/main/HOW_TO_CONTRIBUTE.md)
* **Codebase Guide**: [GRID_CODEBASE_GUIDE.md](./GRID_CODEBASE_GUIDE.md)
* **Comparison**: [GRID vs Other AI Editors](docs/GRID-vs-Other-AI-Editors.md)
* **Downloads**: [DOWNLOADS.md](DOWNLOADS.md)

---

**End of Gemini Analysis** - Last Updated: December 2025

---

# GRID Website - Project "Gemini" Deep Analysis
>
> **Role**: Marketing & SaaS Frontend
> **Current Status**: Needs Update to Match IDE Capabilities.

## 1. Technology Stack

* **Framework**: Next.js 14.2.4 (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS 3.4
* **Icons**: Lucide React
* **Database/Auth**: Supabase (`@supabase/supabase-js`)
* **Payments**: Stripe

## 2. Component Architecture (`components/`)

### Core Landing Components

* **Hero.tsx**: Main value prop. Currently highlights "AI-Native", "Privacy-First".
* **AIFeatures.tsx**: The "Big Three" showcase. **CRITICAL**: Needs to be updated to show "5 Modes" instead of generic "Agent Mode".
* **Comparison.tsx**: "GRID vs The Rest". needs to highlight *why* it's better (e.g. "We don't steal your data", "Local R1 Models").
* **Pricing.tsx**: Interfaces with Stripe. Shows "Free", "Team", "Enterprise" tiers.

### Functional Components

* **Navbar.tsx**
* **Footer.tsx**
* **Downloads.tsx**: Links to `GRID-Editor/binaries` (conceptually).

## 3. SaaS Logic (`lib/` & `data/`)

### API Key Handling (`lib/ai-config.ts`)

* **Dual Strategy**:
    1. **SaaS Mode**: Checks `org_api_keys` in Supabase for logged-in users.
    2. **BYOK Mode**: Checks `x-[provider]-key` headers for community users.
* **Providers Supported in Config**: `openai`, `anthropic`, `gemini`. **MISSING**: `huggingface`, `deepseek`.

### Data Models

* **Organization**: Supports Roles (`admin`, `member`) and Tiers (`free`, `team`, `enterprise`).
* **Usage Logs**: Tracks cost per provider/model.

## 4. Gap Analysis (Website vs IDE)

| Feature | IDE Logic (`GRID`) | Website Claim (`GRID-WEBSITE`) | Fix Required |
| :--- | :--- | :--- | :--- |
| **Models** | 45+ Models (Llama 3, DeepSeek R1, Qwen 2.5) | "24+ Providers" (Generic) | **Explicitly list** R1, Qwen, and Llama 3.2. |
| **Agent Modes** | 5 Distinct Modes (Build, Plan, Explore...) | "Agent Mode" (Singular) | **Update UI** to show the 5 icons/names. |
| **Auto-Debug** | "Learning Engine" + "Pattern Recognition" | "Auto-Debug" (Simple) | **Add "Self-Improving"** copy to the feature card. |
| **HuggingFace** | Native Router Integration | Not Mentioned | **Add dedicated section** for HF Integration. |
| **Privacy** | Local Models (Ollama/vLLM) | "Privacy-First" (Good) | **Strengthen**: "Run DeepSeek R1 Locally". |

## 5. Deployment

* **Vercel**: Configured via `vercel.json` and `.vercelrc`.
* **Scripts**: `deploy.sh` and `deploy-vercel.sh` present.

---

# GRID Builder - Project "Gemini" Deep Analysis
>
> **Role**: Manufacturing / CI/CD
> **Source of Truth**: `.github/workflows/*.yml`

## 1. Build Environment Stats

* **Operating System**: Windows 2019 (for Windows builds), Ubuntu 22.04 (for Linux/Check).
* **Node.js**: Version **20.18.2**.
* **Python**: Version **3.11**.
* **Architecture Targets**: `x64`, `arm64`.

## 2. Build Pipeline (`stable-windows.yml`)

The build process flows as follows:

1. **Check Job**:
    * Determines if a build is needed (`check_cron_or_pr.sh`).
    * Checks for upstream VS Code commits (`MS_COMMIT`) and Tags (`MS_TAG`).
    * Outputs `RELEASE_VERSION`.

2. **Compile Job**:
    * **Clone**: Uses `get_repo.sh` to pull the `GRID` source code.
    * **Patch**: Runs `prepare_vscode.sh` to apply GRID-specific branding and telemetry removal.
    * **Build**: Runs `build.sh` -> `npm run buildreact` -> `gulp compile-build` -> `gulp minify-vscode`.
    * **Artifact**: Creates `vscode.tar.gz`.

3. **Build (Package) Job**:
    * **Package**: Runs `build/windows/package.sh` to create the installer (exe/msi).
    * **Assets**: Runs `prepare_assets.sh`.
    * **Checksums**: Runs `prepare_checksums.sh`.
    * **Release**: Runs `release.sh` to push binaries to the remote **GRID-NETWORK/binaries** GitHub repository.

## 3. Key Scripts

* **`prepare_vscode.sh`**: The most critical script. It transforms the Microsoft VS Code source into GRID.
  * *Action*: Applies branding patches.
  * *Action*: Disables Telemetry.
  * *Action*: Injects `product.json` values.
* **`build.sh`**: The orchestrator.
  * *Critical Step*: `npm run buildreact` (This builds the Custom GRID UI in `src/vs/workbench/contrib/grid/browser/react`).
  * *Critical Step*: `npm run gulp minify-vscode`.

## 4. Updates & Versioning

* **Versions Repo**: `GRID-NETWORK/versions` (Remote GitHub Repo) stores the latest version metadata.
* **Auto-Update**: The IDE checks this remote repo to know when to update.
* **Inputs**: Workflow accepts `force_version` and `generate_assets` flags.

## 5. Gemini Analysis

* **Important Distinction**: Mentions of `GRID-NETWORK` here refer exclusively to the **Remote GitHub Organization**. The local `GRID-NETWORK` folder is legacy and ignored.
* This builder is set up to pull *directly* from the `GRID` repo.
* Any change in `GRID/product.json` will be reflected in the next build.
* **Note**: The `buildreact` step is unique to GRID and essential for the AI features to appear.

---

# Gemini Sequential Thinking Protocol

To align with the IDE's 5 Agent Modes, all work in this project must follow a strict **Sequential Thinking** process. The AI must adopt one of the following 5 Personas for every step.

## 1. EXPLORER Agent (Research) 🕵️

* **Goal**: Gather context, read files, map dependencies.
* **Trigger**: Start of any task or when "unknowns" are encountered.
* **Output**: "Context Verified." / "Files Identified."

## 2. PLANNER Agent (Architect) 📐

* **Goal**: Create a step-by-step plan based on EXPLORER's findings.
* **Trigger**: After exploration, before any code is touched.
* **Output**: `implementation_plan.md` or strict bullet points.

## 3. BUILDER Agent (Implementer) 🔨

* **Goal**: Write code, create files, execute commands.
* **Trigger**: Only after PLANNER has "Approved" the path.
* **Output**: Code changes, new files.

## 4. REVIEWER Agent (QA) 🔍

* **Goal**: Verify the work of the BUILDER. Check against `gemini.md` "Truth".
* **Trigger**: After every significant code change.
* **Output**: "Validation Passed" or "Issues Found".

## 5. DEBUGGER Agent (Fixer) 🐛

* **Goal**: Resolve issues found by REVIEWER.
* **Trigger**: When an error occurs or verification fails.
* **Output**: Fix applied -> Return to REVIEWER.

## 📜 The Protocol Loop

For every user request, you must:

1. **EXPLORE**: verify the current state.
2. **PLAN**: Define the steps.
3. **BUILD**: Execute step 1.
4. **REVIEW**: Verify step 1.
5. **Loop**: Proceeed to step 2...
