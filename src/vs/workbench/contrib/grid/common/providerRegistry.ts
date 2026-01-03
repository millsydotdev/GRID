/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Provider Registry
 *
 * Centralized registry tracking provider implementation status, endpoints,
 * and verification dates. Used to ensure accurate provider counts and
 * documentation across the IDE and website.
 */

export type ImplementationStatus = 'verified' | 'compatible' | 'stub' | 'deprecated';

export interface ProviderRegistryEntry {
    /** Provider identifier matching ProviderName in gridSettingsTypes */
    id: string;
    /** Human-readable display name */
    displayName: string;
    /** Implementation status */
    status: ImplementationStatus;
    /** ISO date of last verification */
    lastVerified: string;
    /** Primary API endpoint URL */
    endpoint: string;
    /** Whether the provider has a public model catalog API */
    hasModelCatalogAPI: boolean;
    /** URL for fetching model catalog (if available) */
    catalogUrl?: string;
    /** Category for UI grouping */
    category: 'major' | 'enterprise' | 'local' | 'chinese' | 'inference' | 'aggregator' | 'specialized';
    /** Notes about implementation */
    notes?: string;
}

/**
 * Provider Registry - Single source of truth for provider implementation status
 *
 * Status meanings:
 * - verified: Dedicated implementation in sendLLMMessage.impl.ts, tested and working
 * - compatible: Works via OpenAI-compatible API fallback
 * - stub: Settings exist but not yet implemented
 * - deprecated: No longer supported
 */
export const PROVIDER_REGISTRY: ProviderRegistryEntry[] = [
    // ============================================
    // MAJOR PROVIDERS (verified implementations)
    // ============================================
    {
        id: 'openAI',
        displayName: 'OpenAI',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.openai.com/v1',
        hasModelCatalogAPI: true,
        catalogUrl: 'https://api.openai.com/v1/models',
        category: 'major',
    },
    {
        id: 'anthropic',
        displayName: 'Anthropic',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.anthropic.com/v1',
        hasModelCatalogAPI: false,
        category: 'major',
        notes: 'Uses native Anthropic API format',
    },
    {
        id: 'gemini',
        displayName: 'Google Gemini',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        hasModelCatalogAPI: true,
        catalogUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        category: 'major',
    },
    {
        id: 'deepseek',
        displayName: 'DeepSeek',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.deepseek.com/v1',
        hasModelCatalogAPI: false,
        category: 'major',
    },
    {
        id: 'mistral',
        displayName: 'Mistral AI',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.mistral.ai/v1',
        hasModelCatalogAPI: true,
        catalogUrl: 'https://api.mistral.ai/v1/models',
        category: 'major',
    },
    {
        id: 'groq',
        displayName: 'Groq',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.groq.com/openai/v1',
        hasModelCatalogAPI: true,
        catalogUrl: 'https://api.groq.com/openai/v1/models',
        category: 'major',
    },
    {
        id: 'xAI',
        displayName: 'xAI (Grok)',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.x.ai/v1',
        hasModelCatalogAPI: false,
        category: 'major',
    },
    {
        id: 'huggingFace',
        displayName: 'Hugging Face',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'https://api-inference.huggingface.co',
        hasModelCatalogAPI: false,
        category: 'major',
        notes: 'Uses Inference Providers router API',
    },
    {
        id: 'openRouter',
        displayName: 'OpenRouter',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'https://openrouter.ai/api/v1',
        hasModelCatalogAPI: true,
        catalogUrl: 'https://openrouter.ai/api/v1/models',
        category: 'aggregator',
    },

    // ============================================
    // LOCAL PROVIDERS (verified implementations)
    // ============================================
    {
        id: 'ollama',
        displayName: 'Ollama',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'http://127.0.0.1:11434',
        hasModelCatalogAPI: true,
        catalogUrl: 'http://127.0.0.1:11434/api/tags',
        category: 'local',
    },
    {
        id: 'vLLM',
        displayName: 'vLLM',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'http://localhost:8000',
        hasModelCatalogAPI: true,
        catalogUrl: 'http://localhost:8000/v1/models',
        category: 'local',
    },
    {
        id: 'lmStudio',
        displayName: 'LM Studio',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'http://localhost:1234',
        hasModelCatalogAPI: true,
        catalogUrl: 'http://localhost:1234/v1/models',
        category: 'local',
    },
    {
        id: 'openAICompatible',
        displayName: 'OpenAI Compatible',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: '', // User-configured
        hasModelCatalogAPI: true,
        category: 'local',
        notes: 'Generic OpenAI-compatible endpoint',
    },
    {
        id: 'liteLLM',
        displayName: 'LiteLLM',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: '', // User-configured
        hasModelCatalogAPI: true,
        category: 'local',
    },

    // ============================================
    // ENTERPRISE CLOUD (verified implementations)
    // ============================================
    {
        id: 'googleVertex',
        displayName: 'Google Vertex AI',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'https://{region}-aiplatform.googleapis.com',
        hasModelCatalogAPI: false,
        category: 'enterprise',
    },
    {
        id: 'microsoftAzure',
        displayName: 'Azure OpenAI',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'https://{resource}.openai.azure.com',
        hasModelCatalogAPI: false,
        category: 'enterprise',
    },
    {
        id: 'awsBedrock',
        displayName: 'AWS Bedrock',
        status: 'verified',
        lastVerified: '2025-12-30',
        endpoint: 'https://bedrock-runtime.{region}.amazonaws.com',
        hasModelCatalogAPI: false,
        category: 'enterprise',
    },

    // ============================================
    // INFERENCE PLATFORMS (OpenAI-compatible)
    // ============================================
    {
        id: 'togetherai',
        displayName: 'Together AI',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.together.xyz/v1',
        hasModelCatalogAPI: true,
        catalogUrl: 'https://api.together.xyz/v1/models',
        category: 'inference',
    },
    {
        id: 'fireworksAI',
        displayName: 'Fireworks AI',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.fireworks.ai/inference/v1',
        hasModelCatalogAPI: true,
        catalogUrl: 'https://api.fireworks.ai/inference/v1/models',
        category: 'inference',
    },
    {
        id: 'replicate',
        displayName: 'Replicate',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.replicate.com/v1',
        hasModelCatalogAPI: false,
        category: 'inference',
        notes: 'Uses different API format, wrapped as OpenAI-compatible',
    },
    {
        id: 'perplexity',
        displayName: 'Perplexity',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.perplexity.ai',
        hasModelCatalogAPI: false,
        category: 'inference',
    },
    {
        id: 'cerebras',
        displayName: 'Cerebras',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.cerebras.ai/v1',
        hasModelCatalogAPI: false,
        category: 'inference',
    },
    {
        id: 'cohere',
        displayName: 'Cohere',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.cohere.ai/v1',
        hasModelCatalogAPI: true,
        catalogUrl: 'https://api.cohere.ai/v1/models',
        category: 'inference',
    },
    {
        id: 'deepinfra',
        displayName: 'DeepInfra',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.deepinfra.com/v1/openai',
        hasModelCatalogAPI: true,
        catalogUrl: 'https://api.deepinfra.com/models/list',
        category: 'inference',
    },
    {
        id: 'ai21',
        displayName: 'AI21 Labs',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.ai21.com/studio/v1',
        hasModelCatalogAPI: false,
        category: 'inference',
    },
    {
        id: 'hyperbolic',
        displayName: 'Hyperbolic',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.hyperbolic.xyz/v1',
        hasModelCatalogAPI: false,
        category: 'inference',
    },
    {
        id: 'nebius',
        displayName: 'Nebius',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.studio.nebius.ai/v1',
        hasModelCatalogAPI: false,
        category: 'inference',
    },
    {
        id: 'sambanova',
        displayName: 'SambaNova',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.sambanova.ai/v1',
        hasModelCatalogAPI: false,
        category: 'inference',
    },
    {
        id: 'novitaai',
        displayName: 'Novita AI',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.novita.ai/v3/openai',
        hasModelCatalogAPI: false,
        category: 'inference',
    },
    {
        id: 'featherless',
        displayName: 'Featherless',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.featherless.ai/v1',
        hasModelCatalogAPI: false,
        category: 'inference',
    },
    {
        id: 'nvidiaNim',
        displayName: 'NVIDIA NIM',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://integrate.api.nvidia.com/v1',
        hasModelCatalogAPI: false,
        category: 'inference',
    },

    // ============================================
    // CHINESE AI PROVIDERS (OpenAI-compatible)
    // ============================================
    {
        id: 'moonshot',
        displayName: 'Moonshot (Kimi)',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.moonshot.cn/v1',
        hasModelCatalogAPI: false,
        category: 'chinese',
    },
    {
        id: 'zhipu',
        displayName: 'Zhipu (ChatGLM)',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://open.bigmodel.cn/api/paas/v4',
        hasModelCatalogAPI: false,
        category: 'chinese',
    },
    {
        id: 'baichuan',
        displayName: 'Baichuan',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.baichuan-ai.com/v1',
        hasModelCatalogAPI: false,
        category: 'chinese',
    },
    {
        id: 'yi',
        displayName: '01.AI (Yi)',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.01.ai/v1',
        hasModelCatalogAPI: false,
        category: 'chinese',
    },
    {
        id: 'alibabaCloud',
        displayName: 'Alibaba Cloud (Qwen)',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        hasModelCatalogAPI: false,
        category: 'chinese',
    },
    {
        id: 'minimax',
        displayName: 'Minimax',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.minimax.chat/v1',
        hasModelCatalogAPI: false,
        category: 'chinese',
    },
    {
        id: 'siliconflow',
        displayName: 'SiliconFlow',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.siliconflow.cn/v1',
        hasModelCatalogAPI: true,
        catalogUrl: 'https://api.siliconflow.cn/v1/models',
        category: 'chinese',
    },
    {
        id: 'tencentHunyuan',
        displayName: 'Tencent Hunyuan',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://hunyuan.tencentcloudapi.com',
        hasModelCatalogAPI: false,
        category: 'chinese',
    },
    {
        id: 'bytedanceDoubao',
        displayName: 'ByteDance Doubao',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
        hasModelCatalogAPI: false,
        category: 'chinese',
    },
    {
        id: 'stepfun',
        displayName: 'Stepfun',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.stepfun.com/v1',
        hasModelCatalogAPI: false,
        category: 'chinese',
    },

    // ============================================
    // AGGREGATORS & GATEWAYS
    // ============================================
    {
        id: 'aimlapi',
        displayName: 'AIML API',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.aimlapi.com/v1',
        hasModelCatalogAPI: false,
        category: 'aggregator',
    },
    {
        id: 'unifyai',
        displayName: 'Unify AI',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.unify.ai/v0',
        hasModelCatalogAPI: false,
        category: 'aggregator',
    },
    {
        id: 'portkey',
        displayName: 'Portkey',
        status: 'compatible',
        lastVerified: '2025-12-30',
        endpoint: 'https://api.portkey.ai/v1',
        hasModelCatalogAPI: false,
        category: 'aggregator',
    },
];

/**
 * Get count of providers by status
 */
export function getProviderCounts(): { verified: number; compatible: number; stub: number; total: number } {
    const verified = PROVIDER_REGISTRY.filter((p) => p.status === 'verified').length;
    const compatible = PROVIDER_REGISTRY.filter((p) => p.status === 'compatible').length;
    const stub = PROVIDER_REGISTRY.filter((p) => p.status === 'stub').length;
    return {
        verified,
        compatible,
        stub,
        total: verified + compatible,
    };
}

/**
 * Get all providers that support model catalog fetching
 */
export function getProvidersWithCatalog(): ProviderRegistryEntry[] {
    return PROVIDER_REGISTRY.filter((p) => p.hasModelCatalogAPI && p.catalogUrl);
}

/**
 * Get provider by ID
 */
export function getProvider(id: string): ProviderRegistryEntry | undefined {
    return PROVIDER_REGISTRY.find((p) => p.id === id);
}

/**
 * Get providers by category
 */
export function getProvidersByCategory(category: ProviderRegistryEntry['category']): ProviderRegistryEntry[] {
    return PROVIDER_REGISTRY.filter((p) => p.category === category);
}

/**
 * Get all working providers (verified + compatible)
 */
export function getWorkingProviders(): ProviderRegistryEntry[] {
    return PROVIDER_REGISTRY.filter((p) => p.status === 'verified' || p.status === 'compatible');
}
