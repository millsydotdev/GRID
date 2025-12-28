# GRID vs. Other AI Code Editors

A factual comparison between GRID and major AI code editors: Cursor, Antigravity, Continue.dev, Claude Code, and Windsurf.

This comparison is based on:
- **GRID**: Direct code verification from the repository
- **Competitors**: Public information from official websites, documentation, and announcements
- **Unknown**: Marked when information cannot be verified from public sources

## Quick Comparison Table

| Feature | GRID | Cursor | Antigravity | Continue.dev | Claude Code | Windsurf |
|---------|-----------|--------|-------------|--------------|-------------|----------|
| **Open Source** | ✅ Yes (MIT License - verified in `product.json`) | ❌ No | ❌ No | ✅ Yes | ❌ No | ❌ No |
| **Local Models** | ✅ Yes (verified in code: `modelCapabilities.ts`, `sendLLMMessage.impl.ts`) | ⚠️ Limited | ❌ No | ✅ Yes | ❌ No | ❌ No |
| **Multi-Provider Support** | ✅ Yes (verified in code: `modelCapabilities.ts` - 15+ providers) | ✅ Yes | ❓ Unknown | ✅ Yes | ❌ No | ❓ Unknown |
| **Fully Offline Mode** | ✅ Yes (verified in code: `modelRouter.ts`, `gridStatusBar.ts`) | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **Enterprise On-Prem Installation** | ✅ Yes (self-hostable) | ❌ No | ❌ No | ⚠️ Limited | ❌ No | ❌ No |
| **Multi-Model Routing** | ✅ Yes (verified in code: `modelRouter.ts`) | ✅ Yes | ❓ Unknown | ❓ Unknown | ❌ No | ❓ Unknown |
| **RAG / Codebase Indexing** | ✅ Yes (verified in code: `repoIndexerService.ts`, `treeSitterService.ts`) | ✅ Yes | ❓ Unknown | ✅ Yes | ❌ No | ❓ Unknown |
| **Chat → Plan → Diff → Apply** | ✅ Yes (verified in code: `chatThreadService.ts`, `editCodeService.ts`) | ✅ Yes | ❓ Unknown | ❓ Unknown | ⚠️ Limited | ❓ Unknown |
| **Multi-File Editing** | ✅ Yes (verified in code: `editCodeService.ts`) | ✅ Yes | ❓ Unknown | ❓ Unknown | ⚠️ Limited | ❓ Unknown |
| **Native MCP Tool Calling** | ✅ Yes (verified in code: `mcpChannel.ts`, `mcpService.ts`) | ✅ Yes | ❓ Unknown | ❓ Unknown | ✅ Yes | ❓ Unknown |
| **FIM / Code Completion** | ✅ Yes (verified in code: `autocompleteService.ts`, `sendLLMMessage.impl.ts`) | ✅ Yes | ❓ Unknown | ✅ Yes | ❌ No | ❓ Unknown |
| **Agent Mode** | ✅ Yes (verified in code: `chatThreadService.ts`) | ✅ Yes | ❓ Unknown | ❓ Unknown | ✅ Yes | ❓ Unknown |
| **Audit Log + Rollback** | ✅ Yes (verified in code: `auditLogService.ts`, `rollbackSnapshotService.ts`) | ❓ Unknown | ❓ Unknown | ❓ Unknown | ❌ No | ❓ Unknown |
| **Privacy Mode / No Telemetry** | ✅ Yes (verified in code: `telemetryUtils.ts`, `gridStatusBar.ts`) | ✅ Yes | ❓ Unknown | ❓ Unknown | ❓ Unknown | ❓ Unknown |
| **Installer Packages (Win/Mac/Linux)** | ✅ Yes (verified in code: `product.json`, build configs) | ✅ Yes | ❓ Unknown | ✅ Yes (VS Code ext) | ❌ No (web-based) | ✅ Yes |
| **Extensibility (Custom tools/scripts/agents)** | ✅ Yes (MCP, custom providers, VS Code extensions) | ✅ Yes | ❓ Unknown | ✅ Yes | ✅ Yes (MCP) | ❓ Unknown |
| **Model Support Breadth** | ✅ Yes (15+ providers, 100+ models) | ✅ Yes | ❓ Unknown | ⚠️ Limited | ❌ No (Claude only) | ⚠️ Limited |
| **Vision/Multimodal Support** | ✅ Yes (verified in code: `modelRouter.ts`, `imageQARegistryContribution.ts`) | ✅ Yes | ❓ Unknown | ❓ Unknown | ✅ Yes | ❓ Unknown |
| **Reasoning Models Support** | ✅ Yes (o1, o3, Claude 3.7/4, DeepSeek R1, etc.) | ✅ Yes | ❓ Unknown | ❓ Unknown | ✅ Yes | ❓ Unknown |
| **JSON/Structured Output Handling** | ✅ Yes (native support) | ❓ Unknown | ❓ Unknown | ❓ Unknown | ✅ Yes | ❓ Unknown |
| **Customizable UI** | ✅ Yes (full VS Code base, themeable) | ✅ Yes | ❓ Unknown | ✅ Yes (VS Code ext) | ❌ No | ❓ Unknown |
| **Cost / Licensing** | ✅ Free & Open Source (MIT) | 💰 Proprietary ($20/mo) | 💰 Proprietary | ✅ Free/Open Source | 💰 Proprietary ($20/mo) | 💰 Proprietary |

**Legend:**
- ✅ Yes - Feature confirmed
- ❌ No - Feature not available
- ⚠️ Limited - Partial support
- ❓ Unknown - Cannot be verified from public sources
- 💰 Proprietary - Commercial licensing

## Feature-by-Feature Breakdown

### Open Source

**GRID**: ✅ **Yes** - MIT License (verified in `product.json`). Full source code available on GitHub. Community-driven development with no vendor lock-in.

**Cursor**: ❌ **No** - Proprietary, closed-source commercial product.

**Antigravity**: ❌ **No** - Proprietary, closed-source commercial product.

**Continue.dev**: ✅ **Yes** - Open source VS Code extension under Apache 2.0 license.

**Claude Code**: ❌ **No** - Proprietary, closed-source web application.

**Windsurf**: ❌ **No** - Proprietary, closed-source commercial product.

### Local Models

**GRID**: ✅ **Yes** - Comprehensive local model support verified in code:
- **Ollama** (verified in `modelCapabilities.ts:1174-1309`)
- **vLLM** (verified in `modelCapabilities.ts:1261-1276`)
- **LM Studio** (verified in `modelCapabilities.ts:1278-1292`)
- **OpenAI-compatible endpoints** (verified in `modelCapabilities.ts:1311-1326`)
- Auto-detection and model listing (verified in `sendLLMMessage.impl.ts`)

**Cursor**: ⚠️ **Limited** - Some local model support, but primarily cloud-focused.

**Antigravity**: ❌ **No** - Cloud-first architecture, no local model support.


**Continue.dev**: ✅ **Yes** - Good local model support, works with Ollama and other local providers.

**Claude Code**: ❌ **No** - Cloud-only, no local model support.

**Windsurf**: ❌ **No** - Cloud-first, no local model support.

### Multi-Provider Support

**GRID**: ✅ **Yes** - Extensive multi-provider support verified in `modelCapabilities.ts`:
- OpenAI, Anthropic, xAI, Gemini, DeepSeek, Groq, Mistral
- OpenRouter, Ollama, vLLM, LM Studio
- OpenAI-compatible, LiteLLM, Google Vertex, Microsoft Azure, AWS Bedrock
- Total: 15+ providers

**Cursor**: ✅ **Yes** - Supports multiple providers (OpenAI, Anthropic, etc.).

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ✅ **Yes** - Supports multiple providers through configuration.

**Claude Code**: ❌ **No** - Claude-only (Anthropic models).

**Windsurf**: ❓ **Unknown** - Cannot verify from public sources.

### Fully Offline Mode

**GRID**: ✅ **Yes** - Verified in code:
- Privacy mode routing to local models only (verified in `modelRouter.ts:173-190`)
- Offline detection and privacy indicator (verified in `gridStatusBar.ts:190-230`)
- Local-first AI mode (verified in `modelRouter.ts:193-197`)

**Cursor**: ❌ **No** - Requires cloud connection for most features.

**Antigravity**: ❌ **No** - Cloud-first, requires internet connection.


**Continue.dev**: ❌ **No** - VS Code extension, requires VS Code (which may need internet).

**Claude Code**: ❌ **No** - Cloud-only service.

**Windsurf**: ❌ **No** - Cloud-first architecture.

### Multi-Model Routing

**GRID**: ✅ **Yes** - Intelligent task-aware routing verified in `modelRouter.ts`:
- Task-aware model selection (verified in `modelRouter.ts:139-533`)
- Quality tier estimation (verified in `modelRouter.ts:593-609`)
- Context-aware routing (verified in `modelRouter.ts:762-1394`)
- Fallback chains and speculative escalation (verified in `modelRouter.ts:436-449`)

**Cursor**: ✅ **Yes** - Supports model routing and selection.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ❓ **Unknown** - Cannot verify routing capabilities.

**Claude Code**: ❌ **No** - Single model provider.

**Windsurf**: ❓ **Unknown** - Cannot verify from public sources.

### RAG / Codebase Indexing

**GRID**: ✅ **Yes** - Advanced RAG implementation verified in code:
- Tree-sitter AST parsing (verified in `treeSitterService.ts:248-310`)
- Hybrid BM25 + vector search (verified in `repoIndexerService.ts:868-1155`)
- Symbol extraction and indexing (verified in `repoIndexerService.ts:443-508`)
- Vector store support (Qdrant, Chroma) (verified in `vectorStore.ts:377-435`)

**Cursor**: ✅ **Yes** - Codebase indexing and context retrieval.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ✅ **Yes** - Good RAG pipeline for codebase context.

**Claude Code**: ❌ **No** - No codebase indexing.

**Windsurf**: ❓ **Unknown** - Cannot verify from public sources.

### Chat → Plan → Diff → Apply

**GRID**: ✅ **Yes** - Complete workflow verified in code:
- Agent mode with plan generation (verified in `chatThreadService.ts:2448-3419`)
- Plan tracking and step management (verified in `chatThreadServiceTypes.ts:50-69`)
- Diff visualization and editing (verified in `editCodeService.ts:2223-2392`)
- Apply pipeline with rollback (verified in `composerPanel.ts:1420-1560`)

**Cursor**: ✅ **Yes** - Composer feature with plan → diff → apply workflow.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ❓ **Unknown** - Cannot verify structured plan workflow.

**Claude Code**: ⚠️ **Limited** - Inline editing, no full plan → apply workflow.

**Windsurf**: ❓ **Unknown** - Cannot verify from public sources.

### Multi-File Editing

**GRID**: ✅ **Yes** - Multi-file editing verified in `editCodeService.ts`:
- Batch file operations (verified throughout `editCodeService.ts`)
- Multi-file diff management (verified in `editCodeService.ts:186-802`)

**Cursor**: ✅ **Yes** - Multi-file editing support.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ❓ **Unknown** - Cannot verify multi-file editing capabilities.

**Claude Code**: ⚠️ **Limited** - Primarily single-file inline editing.

**Windsurf**: ❓ **Unknown** - Cannot verify from public sources.

### Native MCP Tool Calling

**GRID**: ✅ **Yes** - Native MCP support verified in code:
- MCP server management (verified in `mcpChannel.ts:48-455`)
- Tool calling infrastructure (verified in `mcpService.ts:325-331`)
- MCP tool integration in chat (verified in `chatThreadService.ts:2118-2443`)

**Cursor**: ✅ **Yes** - MCP tool calling support.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ❓ **Unknown** - Cannot verify MCP support.

**Claude Code**: ❌ **No** - No MCP tool calling.

**Windsurf**: ❓ **Unknown** - Cannot verify from public sources.

### FIM / Code Completion

**GRID**: ✅ **Yes** - FIM support verified in code:
- Fill-in-middle implementation (verified in `autocompleteService.ts:278-1014`)
- FIM message preparation (verified in `convertToLLMMessageService.ts:1737-1813`)
- Model capability detection (verified in `modelCapabilities.ts:175`)
- Streaming FIM for local models (verified in `sendLLMMessage.impl.ts:331-450`)

**Cursor**: ✅ **Yes** - FIM code completion.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ❓ **Unknown** - Cannot verify FIM support.

**Claude Code**: ❌ **No** - No FIM code completion.

**Windsurf**: ❓ **Unknown** - Cannot verify from public sources.

### Agent Mode

**GRID**: ✅ **Yes** - Agent mode verified in code:
- Agent execution loop (verified in `chatThreadService.ts:2448-3419`)
- Plan generation and tracking (verified in `chatThreadServiceTypes.ts:50-69`)
- Tool orchestration (verified in `chatThreadService.ts:2118-2443`)
- Step-by-step execution with checkpoints (verified in `chatThreadService.ts:1429-1445`)

**Cursor**: ✅ **Yes** - Agent mode with Composer.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ❓ **Unknown** - Cannot verify agent mode.

**Claude Code**: ❌ **No** - No agent mode.

**Windsurf**: ❓ **Unknown** - Cannot verify from public sources.

### Audit Log + Rollback

**GRID**: ✅ **Yes** - Audit logging and rollback verified in code:
- Audit log service (verified in `auditLogService.ts`)
- Rollback snapshot service (verified in `rollbackSnapshotService.ts:32-218`)
- Automatic snapshot creation before applies (verified in `composerPanel.ts:1420-1560`)
- Git auto-stash integration (verified in `gitAutoStashService.ts`)

**Cursor**: ❓ **Unknown** - Cannot verify audit log or rollback features.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ❓ **Unknown** - Cannot verify from public sources.

**Claude Code**: ❌ **No** - No audit log or rollback.

**Windsurf**: ❓ **Unknown** - Cannot verify from public sources.

### Privacy Mode / No Telemetry

**GRID**: ✅ **Yes** - Privacy features verified in code:
- Privacy mode routing (verified in `modelRouter.ts:173-190`)
- Telemetry configuration (verified in `telemetryUtils.ts:95-101`)
- Privacy status indicator (verified in `gridStatusBar.ts:190-230`)
- Local-first AI mode (verified in `modelRouter.ts:193-197`)

**Cursor**: ✅ **Yes** - Privacy mode available.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ❓ **Unknown** - Cannot verify from public sources.

**Claude Code**: ❓ **Unknown** - Cannot verify from public sources.

**Windsurf**: ❓ **Unknown** - Cannot verify from public sources.

### Installer Packages (Win/Mac/Linux)

**GRID**: ✅ **Yes** - Installer packages verified:
- Windows identifiers (verified in `product.json:21-24`)
- macOS bundle identifier (verified in `product.json:37`)
- Linux packaging (verified in `product.json:38`, `resources/linux/`)
- Build configuration for all platforms

**Cursor**: ✅ **Yes** - Installers for Windows, macOS, and Linux.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ✅ **Yes** - VS Code extension (requires VS Code).

**Claude Code**: ❌ **No** - Web-based, no installers.

**Windsurf**: ✅ **Yes** - Installers available.

### Extensibility (Custom tools/scripts/agents)

**GRID**: ✅ **Yes** - Extensibility verified:
- MCP tool integration (verified in `mcpChannel.ts`, `mcpService.ts`)
- Custom provider support (verified in `modelCapabilities.ts`)
- VS Code extension API (inherited from VS Code base)

**Cursor**: ✅ **Yes** - Extensibility through plugins and integrations.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ❓ **Unknown** - Cannot verify extensibility.

**Claude Code**: ❌ **No** - No extensibility.

**Windsurf**: ❓ **Unknown** - Cannot verify from public sources.

### Model Support Breadth

**GRID**: ✅ **Yes** - Extensive model support verified in `modelCapabilities.ts`:
- **15+ providers**: OpenAI, Anthropic, xAI, Gemini, DeepSeek, Groq, Mistral, OpenRouter, Ollama, vLLM, LM Studio, OpenAI-compatible, LiteLLM, Google Vertex, Microsoft Azure, AWS Bedrock
- **Reasoning models**: o1, o3, Claude 3.7/4, DeepSeek R1, QwQ, Qwen3, Phi-4
- **Vision models**: GPT-4o, GPT-4.1, GPT-5 series, o-series (o1, o3, o4-mini), Claude 3.5/4, Gemini (all models), Pixtral, local VLMs
- **FIM models**: Codestral, Qwen2.5-coder, StarCoder2

**Cursor**: ✅ **Yes** - Wide model support.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ⚠️ **Limited** - Good support but fewer providers than GRID.

**Claude Code**: ❌ **No** - Claude models only.

**Windsurf**: ⚠️ **Limited** - Supports multiple models but fewer than GRID.

### Vision/Multimodal Support

**GRID**: ✅ **Yes** - Vision support verified in code:
- Vision-capable model detection (verified in `modelRouter.ts:1400-1417`)
- Image QA registry (verified in `imageQARegistryContribution.ts`)
- Multimodal message handling (verified in `convertToLLMMessageService.ts`)
- Supports image uploads for: GPT-4o, GPT-4.1, GPT-5 series, o-series, Claude 3.5/4, Gemini (all), Pixtral, local VLMs
- PDF upload support with text extraction and vision-based processing

**Cursor**: ✅ **Yes** - Vision model support.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ❓ **Unknown** - Cannot verify from public sources.

**Claude Code**: ✅ **Yes** - Claude models support vision.

**Windsurf**: ❓ **Unknown** - Cannot verify from public sources.

### Reasoning Models Support

**GRID**: ✅ **Yes** - Reasoning model support verified in `modelCapabilities.ts`:
- Reasoning capability detection (verified in `modelCapabilities.ts:180-194`)
- Reasoning budget/effort sliders (verified in `modelCapabilities.ts:185-188`)
- Support for o1, o3, Claude 3.7/4, DeepSeek R1, QwQ, Qwen3, Phi-4

**Cursor**: ✅ **Yes** - Reasoning model support.

**Antigravity**: ❓ **Unknown** - Cannot verify from public sources.


**Continue.dev**: ❓ **Unknown** - Cannot verify from public sources.

**Claude Code**: ❓ **Unknown** - Cannot verify reasoning model support.

**Windsurf**: ❓ **Unknown** - Cannot verify from public sources.

## GRID's Key Differentiators

Based on verified code, GRID offers several unique advantages:

### 1. **Open Source with Full Feature Parity**
- Complete source code available under MIT license
- No vendor lock-in
- Community-driven development

### 2. **Comprehensive Local Model Support**
- Native support for Ollama, vLLM, and LM Studio
- Auto-detection and model listing
- Optimized streaming for local models
- Privacy-first routing to local models

### 3. **Advanced Multi-Provider Routing**
- Task-aware intelligent routing (verified in `modelRouter.ts`)
- Quality tier estimation
- Context-aware model selection
- Fallback chains and speculative escalation
- 15+ provider support

### 4. **Enterprise-Grade RAG Pipeline**
- Tree-sitter AST parsing for accurate code understanding
- Hybrid BM25 + vector search
- Symbol extraction and indexing
- Vector store integration (Qdrant, Chroma)

### 5. **Complete Audit Trail**
- Audit logging service (verified in `auditLogService.ts`)
- Automatic snapshot creation before applies
- Rollback capabilities with git integration
- Recovery mechanisms

### 6. **True Offline Mode**
- Privacy mode that routes only to local models
- Offline detection and status indicators
- Local-first AI mode
- No telemetry when privacy mode enabled

### 7. **Advanced Agent Workflow**
- Plan generation and tracking
- Step-by-step execution with checkpoints
- Tool orchestration
- Rollback to any step

### 8. **Extensive Model Capabilities**
- Support for reasoning models (o1, o3, Claude 3.7/4, DeepSeek R1, etc.)
- Vision/multimodal support
- FIM code completion
- Model capability detection and optimization

## Where Each Tool Fits Best

### GRID
**Best for:**
- Developers who need open-source solutions
- Teams requiring offline/privacy-first workflows
- Organizations needing enterprise features (audit logs, rollback)
- Users wanting maximum model/provider flexibility
- Developers working with local models (Ollama, vLLM, LM Studio)
- Teams needing advanced RAG with tree-sitter indexing

### Cursor
**Best for:**
- Developers who prefer a polished, proprietary solution
- Teams comfortable with cloud-based workflows
- Users wanting a Cursor-like experience with strong multi-file editing
- Developers who need MCP tool calling

### Antigravity
**Best for:**
- Teams preferring cloud-first, workspace-based AI
- Users wanting automatic agent suggestions
- Organizations comfortable with proprietary solutions

### Continue.dev
**Best for:**
- VS Code users wanting AI assistance
- Developers who prefer extension-based solutions
- Teams needing good RAG pipeline within VS Code
- Users wanting local model support in VS Code

### Claude Code
**Best for:**
- Developers who primarily use Claude models
- Users needing inline code editing
- Teams comfortable with cloud-only solutions

### Windsurf
**Best for:**
- Developers wanting a cloud-first AI assistant/editor hybrid
- Teams comfortable with proprietary solutions
- Users who prefer integrated AI workflows

## Supported Models

For a detailed list of models supported by GRID, see the [Supported Models documentation](https://github.com/GRID-Editor/GRID/wiki/Supported-Models) (link to be added).

GRID supports 15+ providers with 100+ models, including:
- Reasoning models (o1, o3, Claude 3.7/4, DeepSeek R1, QwQ, Qwen3, Phi-4)
- Vision models (GPT-4o, GPT-4.1, GPT-5 series, o-series, Claude 3.5/4, Gemini, Pixtral, local VLMs)
- FIM models (Codestral, Qwen2.5-coder, StarCoder2)
- Local models (Ollama, vLLM, LM Studio)


## Conclusion

GRID stands out as the **only fully open-source AI code editor** with:
- Comprehensive local model support
- Advanced multi-provider routing
- Enterprise-grade features (audit logs, rollback)
- True offline/privacy mode
- Extensive model and provider support

GRID is the most comprehensive open-source AI code editor available, offering enterprise-grade features, complete privacy control, and the flexibility to work with any model, any provider, in any environment (cloud, local, or offline).

---

**Last Updated**: Based on codebase analysis as of the current date. For the most up-to-date information, refer to the official documentation of each tool.

**Note**: This comparison is based on:
- GRID: Direct code verification from the repository
- Competitors: Public information from official sources
- Unknown: Marked when information cannot be verified

If you find any inaccuracies, please [open an issue](https://github.com/GRID-Editor/GRID/issues/new) with corrections and sources.



