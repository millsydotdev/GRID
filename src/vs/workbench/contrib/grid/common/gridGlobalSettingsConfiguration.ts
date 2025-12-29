/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import {
	IWorkbenchContribution,
	registerWorkbenchContribution2,
	WorkbenchPhase,
} from '../../../../workbench/common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import {
	IConfigurationRegistry,
	Extensions as ConfigurationExtensions,
	ConfigurationScope,
} from '../../../../platform/configuration/common/configurationRegistry.js';
import { localize } from '../../../../nls.js';

export class GridGlobalSettingsConfigurationContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.gridGlobalSettingsConfiguration';

	constructor() {
		super();

		const registry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);

		registry.registerConfiguration({
			id: 'grid.global',
			title: localize('grid.global.title', 'GRID Global Settings'),
			type: 'object',
			properties: {
				'grid.global.localFirstAI': {
					type: 'boolean',
					default: false,
					description: localize(
						'grid.global.localFirstAI',
						'Prefer local models (Ollama, vLLM, LM Studio, localhost endpoints) over cloud models when possible. Cloud models will be used as fallback if local models are unavailable or insufficient.'
					),
					scope: ConfigurationScope.APPLICATION,
				},
				// --- Browser Subagent / Web Search APIs ---
				'grid.browserSubagent.tavilyApiKey': {
					type: 'string',
					default: '',
					description: localize(
						'grid.browserSubagent.tavilyApiKey',
						'Tavily API key for AI-optimized web search. Get yours at https://tavily.com. Recommended for best agent research.'
					),
					scope: ConfigurationScope.APPLICATION,
				},
				'grid.browserSubagent.braveApiKey': {
					type: 'string',
					default: '',
					description: localize(
						'grid.browserSubagent.braveApiKey',
						'Brave Search API key. Privacy-first search with independent index. Get yours at https://brave.com/search/api.'
					),
					scope: ConfigurationScope.APPLICATION,
				},
				'grid.browserSubagent.serperApiKey': {
					type: 'string',
					default: '',
					description: localize(
						'grid.browserSubagent.serperApiKey',
						'Serper API key for Google SERP results. Fast and affordable. Get yours at https://serper.dev.'
					),
					scope: ConfigurationScope.APPLICATION,
				},
				'grid.browserSubagent.serpApiKey': {
					type: 'string',
					default: '',
					description: localize(
						'grid.browserSubagent.serpApiKey',
						'SerpAPI key for structured Google/Bing results. Get yours at https://serpapi.com.'
					),
					scope: ConfigurationScope.APPLICATION,
				},
				'grid.browserSubagent.exaApiKey': {
					type: 'string',
					default: '',
					description: localize(
						'grid.browserSubagent.exaApiKey',
						'Exa API key for neural/semantic search. Best for conceptual queries. Get yours at https://exa.ai.'
					),
					scope: ConfigurationScope.APPLICATION,
				},
				'grid.browserSubagent.perplexityApiKey': {
					type: 'string',
					default: '',
					description: localize(
						'grid.browserSubagent.perplexityApiKey',
						'Perplexity API key for AI-powered search with citations. Get yours at https://perplexity.ai.'
					),
					scope: ConfigurationScope.APPLICATION,
				},
				'grid.browserSubagent.firecrawlApiKey': {
					type: 'string',
					default: '',
					description: localize(
						'grid.browserSubagent.firecrawlApiKey',
						'Firecrawl API key for deep web crawling and scraping. Get yours at https://firecrawl.dev.'
					),
					scope: ConfigurationScope.APPLICATION,
				},
				'grid.browserSubagent.jinaApiKey': {
					type: 'string',
					default: '',
					description: localize(
						'grid.browserSubagent.jinaApiKey',
						'Jina AI API key for semantic search and embeddings. Get yours at https://jina.ai.'
					),
					scope: ConfigurationScope.APPLICATION,
				},
				// --- Preferred Search Provider ---
				'grid.browserSubagent.preferredProvider': {
					type: 'string',
					enum: ['auto', 'tavily', 'brave', 'serper', 'serpapi', 'exa', 'perplexity', 'firecrawl', 'jina', 'duckduckgo'],
					default: 'auto',
					description: localize(
						'grid.browserSubagent.preferredProvider',
						'Preferred search provider. "auto" uses the first configured API key. "duckduckgo" requires no API key.'
					),
					scope: ConfigurationScope.APPLICATION,
				},
			},
		});
	}
}

// Register the contribution to be initialized early
registerWorkbenchContribution2(
	GridGlobalSettingsConfigurationContribution.ID,
	GridGlobalSettingsConfigurationContribution,
	WorkbenchPhase.BlockRestore
);
