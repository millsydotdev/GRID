# GRID Multi-Modal AI Support Documentation

GRID supports a comprehensive range of AI model types across **27 providers** with **189+ explicit models**!

## 🎯 Supported Model Types

### 1. 💬 Chat / Text Generation Models

**Purpose:** Conversational AI, code generation, question answering, content creation

**Supported Providers:**
- OpenAI (GPT-5, GPT-4.1, GPT-4o series)
- Anthropic (Claude 4.5, 4.1, 3.7 series)
- Google (Gemini 3, Gemini 2.5 series)
- xAI (Grok 4, 3, 2 series)
- DeepSeek (Chat, Reasoner)
- Mistral (Medium, Small series)
- Together AI (100+ open-source models)
- Fireworks AI
- Perplexity (with online search!)
- Cerebras (ultra-fast)
- Cohere (Command R series)
- DeepInfra
- AI21 Labs (Jamba)
- Hyperbolic
- Nebius
- And many more...

**Total:** 150+ chat models across all providers

### 2. 🧠 Reasoning Models

**Purpose:** Complex problem solving, chain-of-thought, extended reasoning

**Providers with Reasoning Support:**
- OpenAI: o3, o3-mini, o3-pro, o1-pro, o1, o1-mini
- Anthropic: Claude 4.5 Opus/Sonnet (with thinking budget slider)
- Claude 3.7 Sonnet (extended reasoning)
- DeepSeek: DeepSeek-R1, DeepSeek-Reasoner
- Qwen: QwQ-32B, Qwen3 (with <think> tags)
- Microsoft: Phi-4-reasoning
- Mistral: Magistral Medium/Small (multimodal reasoning)

**Features:**
- ✅ Configurable reasoning budget (Anthropic)
- ✅ Reasoning effort control (OpenAI)
- ✅ Visible thinking process (some models)
- ✅ Extended context for reasoning

### 3. 🎨 Image Generation Models

**Purpose:** Text-to-image, creative visuals, design assets

**Implementation:** Fully integrated via `imageGenerationService.ts`

**Supported Providers:**

#### OpenAI
- DALL-E 3 (best quality, 1024x1024, HD mode)
- DALL-E 2 (fast generation)

#### Hugging Face
- **FLUX.1 Dev** - State-of-the-art quality
- **FLUX.1 Schnell** - Ultra-fast (4 steps)
- **Stable Diffusion XL** - High resolution
- **Stable Diffusion 3 Medium** - Better text rendering
- **Stable Diffusion 1.5** - Classic, reliable

#### Stability AI (Direct API)
- Stable Diffusion Ultra
- Stable Diffusion Core

#### Local/Self-Hosted
- **Automatic1111** - Popular SD web UI
- **ComfyUI** - Node-based workflows
- **OpenAI-Compatible** - Any compatible endpoint

**Features:**
- ✅ Customizable dimensions (512-2048px)
- ✅ Inference steps control
- ✅ Guidance scale adjustment
- ✅ Negative prompts
- ✅ Sampler selection
- ✅ Prompt enhancement (AI-powered)
- ✅ Image history & gallery
- ✅ Download & clipboard support

**File:** `/src/vs/workbench/contrib/grid/common/imageGenerationService.ts`

### 4. 👁️ Vision / Multimodal Models

**Purpose:** Image understanding, visual question answering, OCR

**Supported Models:**
- **Gemini 3 Pro** - Multimodal (text/image/video/audio/PDF)
- **Gemini 2.5 Flash** - Fast multimodal
- **Claude 4.5** series - Image understanding
- **GPT-4o** - Vision capabilities
- **Llama 3.2 Vision** (11B, 90B) - Open-source vision
- **Qwen2-VL** - Vision-language model
- **Phi-3 Vision** - Microsoft's vision model
- **Pixtral** (Mistral) - 12B multimodal

**Features:**
- ✅ Image attachments in chat
- ✅ PDF document understanding
- ✅ Screenshot analysis
- ✅ Diagram interpretation
- ✅ Code from images

### 5. 🔤 Embedding Models

**Purpose:** Semantic search, vector similarity, RAG (Retrieval Augmented Generation)

**Implementation:** Vector store with Qdrant integration

**Supported Models (via Hugging Face):**
- `sentence-transformers/all-MiniLM-L6-v2` - Fast, lightweight
- `BAAI/bge-large-en-v1.5` - High quality
- `BAAI/bge-small-en-v1.5` - Small & fast
- `mixedbread-ai/mxbai-embed-large-v1` - Excellent general purpose

**Features:**
- ✅ Vector database integration (Qdrant)
- ✅ Semantic code search
- ✅ Repository indexing
- ✅ Contextual retrieval
- ✅ Similarity scoring

**Files:**
- `/src/vs/workbench/contrib/grid/common/vectorStore.ts`
- `/src/vs/workbench/contrib/grid/browser/repoIndexerService.ts`

### 6. 🎤 Audio / Speech Models

**Purpose:** Speech-to-text, text-to-speech, audio processing

**Speech-to-Text (via Hugging Face):**
- `openai/whisper-large-v3` - Best quality transcription
- `openai/whisper-medium` - Faster transcription

**Text-to-Speech:**
- `microsoft/speecht5_tts` - TTS generation
- **Voxtral** (Mistral) - Audio input capabilities

**Voice Input (Web-based):**
- ✅ **NEW: Browser Web Speech API** - Real-time voice-to-text in chat
- ✅ Continuous recognition
- ✅ Multi-language support
- ✅ No external API needed

**File:** Voice input in `/src/vs/workbench/contrib/grid/browser/react/src/sidebar-tsx/SidebarChat.tsx`

### 7. 💻 Code Generation Specialists

**Purpose:** Autocomplete, code completion, specialized coding

**Models with FIM (Fill-in-Middle) Support:**
- **Codestral** (Mistral) - Advanced code generation
- **Qwen 2.5 Coder** - Best for code
- **DeepSeek Coder** v2/v3
- **StarCoder2** - 15B code model
- **Code Llama** - Meta's code specialist
- **Devstral** (Mistral) - SWE use cases
- **CodeGemma** 2B - Small & efficient

**Features:**
- ✅ Fill-in-middle for autocomplete
- ✅ Multi-language support
- ✅ Large context windows (128k+)
- ✅ Function generation
- ✅ Bug detection

### 8. 🔬 Specialized Models

#### Long Context Models
- **Gemini 3 Pro** - 1M+ tokens
- **GPT-5 series** - 1M+ tokens
- **Claude 4.5** - 200k tokens
- **Llama 3 Gradient** - 1M context window
- **Qwen3** - Extended context

#### Function Calling
- **GPT-4o** series - Native tool use
- **Claude 4.5** - Anthropic-style tools
- **Gemini 2.5+** - Function declarations
- **Hermes 2 Pro** - Specialized for functions

#### Safety & Moderation
- **Llama Guard 4** - Content moderation
- **Llama Prompt Guard** - Prompt injection detection

## 📊 Provider Summary

| Provider | Chat | Vision | Image Gen | Reasoning | Audio | Code | Embeddings |
|----------|------|--------|-----------|-----------|-------|------|------------|
| OpenAI | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Anthropic | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Google | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Hugging Face | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Together AI | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Fireworks AI | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Perplexity | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Mistral | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| DeepSeek | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Cerebras | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Cohere | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

## 🚀 Usage Examples

### Text Generation
```typescript
// Automatic - just select model and send message
await chatService.sendMessage(threadId, "Explain quantum computing");
```

### Image Generation
```typescript
import { imageGenerationService } from './imageGenerationService';

const image = await imageGenerationService.generateImage({
  prompt: "A futuristic city at sunset",
  modelId: "black-forest-labs/FLUX.1-dev",
  providerConfig: { huggingfaceApiKey: "hf_..." },
  width: 1024,
  height: 1024,
  steps: 28
});
```

### Vision (Image Understanding)
```typescript
// Attach image to chat message
await chatService.sendMessageWithImage(
  threadId,
  "What's in this image?",
  imageAttachment
);
```

### Voice Input
```typescript
import { useVoiceInput } from './SidebarChat';

const { toggleRecording, isRecording } = useVoiceInput((transcript) => {
  setMessage(prev => prev + ' ' + transcript);
});
```

### Embeddings / Vector Search
```typescript
import { IVectorStore } from './vectorStore';

// Index documents
await vectorStore.index(documents);

// Semantic search
const results = await vectorStore.query(queryEmbedding, k=10);
```

### Code Generation (FIM)
```typescript
// Automatically uses FIM-capable models for autocomplete
const completion = await codeService.getCompletion({
  prefix: "function calculateTotal(",
  suffix: ") {\n  return total;\n}",
  model: "codestral" // FIM-enabled
});
```

## 🔧 Adding New Model Types

To add support for new model types:

1. **Update `modelCapabilities.ts`:**
   - Add model IDs to provider list
   - Define capabilities (context, cost, features)

2. **Add service implementation:**
   - Create service file (e.g., `audioService.ts`)
   - Implement provider-specific API calls

3. **Update UI:**
   - Add model selection in dropdown
   - Add attachments/input UI if needed

4. **Update routing:**
   - Modify `modelRouter.ts` to handle new types
   - Add scoring for model selection

## 📝 File Format Support

| Format | Purpose | Providers |
|--------|---------|-----------|
| **Safetensors** | Safe model weights | Hugging Face, Local |
| **GGUF** | Quantized models | Ollama, llama.cpp |
| **PyTorch** | Standard ML format | Hugging Face |
| **Images** | PNG, JPG, WEBP | Vision models |
| **PDFs** | Document analysis | Vision models |
| **Audio** | WAV, MP3 | Whisper, Voxtral |

## 🌐 API Compatibility

GRID supports multiple API formats:
- ✅ **OpenAI-Compatible** - Most providers
- ✅ **Anthropic-Style** - Claude models
- ✅ **Gemini-Style** - Google models
- ✅ **Custom** - Provider-specific APIs

## 🎉 Summary

**GRID now supports:**
- ✅ 189+ explicit models across 27 providers
- ✅ 8+ model types (chat, vision, image gen, audio, embeddings, code, reasoning)
- ✅ Image generation with 10+ models
- ✅ Voice input via Web Speech API
- ✅ Vector embeddings with Qdrant
- ✅ Multimodal (text + image + audio + PDF)
- ✅ Local and cloud deployment
- ✅ Unlimited models via dynamic providers

**Everything you need for AI-powered development!** 🚀

---

**Questions?** Check individual service files for implementation details.
