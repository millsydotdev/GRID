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

	constructor(@IGridSettingsService private readonly settingsService: IGridSettingsService) {}

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
		if (!apiKey) {
			return [];
		}

		try {
			switch (providerName) {
				case 'openAI':
					return await this.fetchOpenAICatalog(apiKey);
				case 'anthropic':
					return await this.fetchAnthropicCatalog(apiKey);
				case 'gemini':
					return await this.fetchGeminiCatalog(apiKey);
				case 'mistral':
					return await this.fetchMistralCatalog(apiKey);
				case 'groq':
					return await this.fetchGroqCatalog(apiKey);
				case 'xAI':
					return await this.fetchXAICatalog(apiKey);
				case 'deepseek':
					return await this.fetchDeepSeekCatalog(apiKey);
				case 'openRouter':
					return await this.fetchOpenRouterCatalog(apiKey);
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

	private async fetchOpenAICatalog(apiKey: string): Promise<RemoteModelInfo[]> {
		// OpenAI doesn't have a public models endpoint, but we can use the API
		// For now, return empty - models are hardcoded in modelCapabilities.ts
		// In the future, could use https://api.openai.com/v1/models if API key is provided
		return [];
	}

	private async fetchAnthropicCatalog(apiKey: string): Promise<RemoteModelInfo[]> {
		// Anthropic models are documented but not via API
		// Could scrape docs or use hardcoded list
		return [];
	}

	private async fetchGeminiCatalog(apiKey: string): Promise<RemoteModelInfo[]> {
		// Google Gemini models are documented at https://ai.google.dev/gemini-api/docs/models/gemini
		// No public API, but we could parse the docs page
		return [];
	}

	private async fetchMistralCatalog(apiKey: string): Promise<RemoteModelInfo[]> {
		// Mistral has docs at https://docs.mistral.ai/getting-started/models/models_overview/
		// Could fetch from their API if available
		return [];
	}

	private async fetchGroqCatalog(apiKey: string): Promise<RemoteModelInfo[]> {
		// Groq models are at https://console.groq.com/docs/models
		// Could use their API if available
		return [];
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
