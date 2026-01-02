/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { ProviderName } from './gridSettingsTypes.js';
import { IGridSettingsService } from './gridSettingsService.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

/**
 * Model information from remote provider catalogs
 */
export interface RemoteModelInfo {
	id: string;
	name: string;
	description?: string;
	contextWindow?: number;
	supportsVision?: boolean;
	supportsPDF?: boolean;
	supportsCode?: boolean;
	cost?: {
		input: number;
		output: number;
	};
	deprecated?: boolean;
	beta?: boolean;
	preview?: boolean;
}

/**
 * Cached catalog entry with TTL
 */
interface CachedCatalog {
	models: RemoteModelInfo[];
	timestamp: number;
	ttl: number; // milliseconds
}

/**
 * Service for fetching and caching remote provider model catalogs
 */
export interface IRemoteCatalogService {
	readonly _serviceBrand: undefined;

	/**
	 * Fetch models from a remote provider's catalog
	 */
	fetchCatalog(providerName: ProviderName, forceRefresh?: boolean): Promise<RemoteModelInfo[]>;

	/**
	 * Health check a specific model
	 */
	healthCheck(providerName: ProviderName, modelId: string): Promise<boolean>;

	/**
	 * Clear cache for a provider
	 */
	clearCache(providerName: ProviderName): void;
}

export class RemoteCatalogService implements IRemoteCatalogService {
	readonly _serviceBrand: undefined;

	private cache: Map<ProviderName, CachedCatalog> = new Map();
	private readonly DEFAULT_TTL = 3600_000; // 1 hour

	constructor(@IGridSettingsService private readonly settingsService: IGridSettingsService) { }

	async fetchCatalog(providerName: ProviderName, forceRefresh: boolean = false): Promise<RemoteModelInfo[]> {
		// Check cache first
		if (!forceRefresh) {
			const cached = this.cache.get(providerName);
			if (cached && Date.now() - cached.timestamp < cached.ttl) {
				return cached.models;
			}
		}

		// Fetch from provider
		const models = await this.fetchFromProvider(providerName);

		// Cache result
		this.cache.set(providerName, {
			models,
			timestamp: Date.now(),
			ttl: this.DEFAULT_TTL,
		});

		return models;
	}

	private async fetchFromProvider(providerName: ProviderName): Promise<RemoteModelInfo[]> {
		const settings = this.settingsService.state.settingsOfProvider[providerName];

		// Only fetch if provider is configured
		if (!settings._didFillInProviderSettings) {
			return [];
		}

		// Get API key - it might be undefined
		const apiKey = settings.apiKey;

		// Local providers don't strictly require an API key
		const isLocalProvider = ['ollama', 'vLLM', 'lmStudio', 'localai'].includes(providerName);

		if (!apiKey && !isLocalProvider) {
			return [];
		}

		try {
			switch (providerName) {
				case 'openAI':
					return await this.fetchOpenAICatalog(apiKey!);
				case 'anthropic':
					return await this.fetchAnthropicCatalog(apiKey!);
				case 'gemini':
					return await this.fetchGeminiCatalog(apiKey!);
				case 'mistral':
					return await this.fetchMistralCatalog(apiKey!);
				case 'groq':
					return await this.fetchGroqCatalog(apiKey!);
				case 'xAI':
					return await this.fetchXAICatalog(apiKey!);
				case 'deepseek':
					return await this.fetchDeepSeekCatalog(apiKey!);
				case 'openRouter':
					return await this.fetchOpenRouterCatalog(apiKey!);
				case 'ollama':
					return await this.fetchOllamaCatalog(settings.url || 'http://127.0.0.1:11434');
				default:
					// For providers without public catalog APIs, return empty
					// They rely on hardcoded lists in modelCapabilities.ts
					return [];
			}
		} catch (error) {
			console.error(`Failed to fetch catalog for ${providerName}:`, error);
			return [];
		}
	}

	private async fetchOllamaCatalog(baseUrl: string): Promise<RemoteModelInfo[]> {
		try {
			// Ollama tags endpoint
			const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`);

			if (!response.ok) {
				throw new Error(`Ollama API returned ${response.status}`);
			}

			const data = await response.json();
			return (data.models || []).map((model: { name: string; size?: number; details?: { parameter_size?: string; family?: string } }) => ({
				id: model.name,
				name: model.name,
				description: model.details ? `${model.details.family} ${model.details.parameter_size}` : undefined,
				// Heuristic: models with 'vision' or 'llava' in name likely support vision
				supportsVision: model.name.includes('vision') || model.name.includes('llava'),
				supportsCode: model.name.includes('code') || model.name.includes('oder'),
			}));
		} catch (error) {
			console.error('Failed to fetch Ollama catalog:', error);
			return [];
		}
	}

	private async fetchOpenAICatalog(apiKey: string): Promise<RemoteModelInfo[]> {
		// OpenAI has a models endpoint that returns available models
		try {
			const response = await fetch('https://api.openai.com/v1/models', {
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			});

			if (!response.ok) {
				throw new Error(`OpenAI API returned ${response.status}`);
			}

			const data = await response.json();
			// Filter to only chat models (gpt-*, o1-*, o3-*)
			const chatModels = (data.data || []).filter((model: { id: string }) => {
				const id = model.id.toLowerCase();
				return id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3') || id.startsWith('o4');
			});

			return chatModels.map((model: { id: string; created: number }) => ({
				id: model.id,
				name: model.id,
				deprecated: model.id.includes('0301') || model.id.includes('0314'), // Old snapshot versions
			}));
		} catch (error) {
			console.error('Failed to fetch OpenAI catalog:', error);
			return [];
		}
	}

	private async fetchAnthropicCatalog(apiKey: string): Promise<RemoteModelInfo[]> {
		// Anthropic models are documented but not via API
		// Could scrape docs or use hardcoded list
		return [];
	}

	private async fetchGeminiCatalog(apiKey: string): Promise<RemoteModelInfo[]> {
		// Google Gemini has a models list endpoint
		try {
			const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

			if (!response.ok) {
				throw new Error(`Gemini API returned ${response.status}`);
			}

			const data = await response.json();
			return (data.models || []).map((model: { name: string; displayName: string; description?: string; inputTokenLimit?: number }) => ({
				id: model.name.replace('models/', ''),
				name: model.displayName,
				description: model.description,
				contextWindow: model.inputTokenLimit,
			}));
		} catch (error) {
			console.error('Failed to fetch Gemini catalog:', error);
			return [];
		}
	}

	private async fetchMistralCatalog(apiKey: string): Promise<RemoteModelInfo[]> {
		// Mistral has an OpenAI-compatible models endpoint
		try {
			const response = await fetch('https://api.mistral.ai/v1/models', {
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Mistral API returned ${response.status}`);
			}

			const data = await response.json();
			return (data.data || []).map((model: { id: string; name?: string; deprecated?: boolean }) => ({
				id: model.id,
				name: model.name || model.id,
				deprecated: model.deprecated,
			}));
		} catch (error) {
			console.error('Failed to fetch Mistral catalog:', error);
			return [];
		}
	}

	private async fetchGroqCatalog(apiKey: string): Promise<RemoteModelInfo[]> {
		// Groq uses OpenAI-compatible models endpoint
		try {
			const response = await fetch('https://api.groq.com/openai/v1/models', {
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Groq API returned ${response.status}`);
			}

			const data = await response.json();
			return (data.data || []).map((model: { id: string; context_window?: number }) => ({
				id: model.id,
				name: model.id,
				contextWindow: model.context_window,
			}));
		} catch (error) {
			console.error('Failed to fetch Groq catalog:', error);
			return [];
		}
	}

	private async fetchXAICatalog(apiKey: string): Promise<RemoteModelInfo[]> {
		// xAI models are documented at https://docs.x.ai/docs/models
		return [];
	}

	private async fetchDeepSeekCatalog(apiKey: string): Promise<RemoteModelInfo[]> {
		// DeepSeek models are documented at https://api-docs.deepseek.com/
		return [];
	}

	private async fetchOpenRouterCatalog(apiKey: string): Promise<RemoteModelInfo[]> {
		// OpenRouter has a public models endpoint
		try {
			const response = await fetch('https://openrouter.ai/api/v1/models', {
				headers: apiKey
					? {
						Authorization: `Bearer ${apiKey}`,
					}
					: {},
			});

			if (!response.ok) {
				throw new Error(`OpenRouter API returned ${response.status}`);
			}

			const data = await response.json();
			return (data.data || []).map((model: unknown) => ({
				id: model.id,
				name: model.name,
				description: model.description,
				contextWindow: model.context_length,
				supportsVision: model.architecture?.modalities?.includes('image'),
				supportsCode: model.name?.toLowerCase().includes('code') || model.name?.toLowerCase().includes('coder'),
				cost: model.pricing
					? {
						input: model.pricing.prompt || 0,
						output: model.pricing.completion || 0,
					}
					: undefined,
			}));
		} catch (error) {
			console.error('Failed to fetch OpenRouter catalog:', error);
			return [];
		}
	}

	async healthCheck(providerName: ProviderName, modelId: string): Promise<boolean> {
		// Simple health check: try to make a minimal API call
		// This is a placeholder - actual implementation would vary by provider
		try {
			// For now, assume models are healthy if they're in the catalog
			const catalog = await this.fetchCatalog(providerName);
			return catalog.some((m) => m.id === modelId && !m.deprecated);
		} catch {
			return false;
		}
	}

	clearCache(providerName: ProviderName): void {
		this.cache.delete(providerName);
	}
}

export const IRemoteCatalogService = createDecorator<IRemoteCatalogService>('RemoteCatalogService');

registerSingleton(IRemoteCatalogService, RemoteCatalogService, InstantiationType.Delayed);
