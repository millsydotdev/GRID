/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../../base/common/uri.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';

import { CompletionStreamer } from './completionStreamer.js';
import { AutocompleteDebouncer, IAutocompleteDebouncer } from './autocompleteDebouncer.js';
import { BracketMatchingService, IBracketMatchingService } from './bracketMatchingService.js';
import { IImportDefinitionsService } from './importDefinitionsService.js';
import { IRootPathContextService } from './rootPathContextService.js';
import { IContextRankingService } from './contextRankingService.js';

export const IEnhancedAutocompleteService = createDecorator<IEnhancedAutocompleteService>('enhancedAutocompleteService');

/**
 * Autocomplete request
 */
export interface IAutocompleteRequest {
	/**
	 * File URI
	 */
	uri: URI;

	/**
	 * Cursor position
	 */
	position: Position;

	/**
	 * Text before cursor
	 */
	prefix: string;

	/**
	 * Text after cursor
	 */
	suffix: string;

	/**
	 * Whether multiline completion is enabled
	 */
	multiline?: boolean;

	/**
	 * Language identifier
	 */
	language?: string;
}

/**
 * Autocomplete suggestion
 */
export interface IAutocompleteSuggestion {
	/**
	 * Suggestion text
	 */
	text: string;

	/**
	 * Confidence score (0-1)
	 */
	confidence: number;

	/**
	 * Source of suggestion
	 */
	source: 'llm' | 'cache' | 'reuse';

	/**
	 * Context snippets used
	 */
	contextSnippets?: number;
}

/**
 * Autocomplete statistics
 */
export interface IAutocompleteStatistics {
	/**
	 * Total requests
	 */
	totalRequests: number;

	/**
	 * Cached responses
	 */
	cachedResponses: number;

	/**
	 * Reused generators
	 */
	reusedGenerators: number;

	/**
	 * Average response time (ms)
	 */
	averageResponseTime: number;

	/**
	 * Bracket matches prevented
	 */
	bracketMatchesPrevented: number;
}

/**
 * Enhanced Autocomplete Service
 *
 * Coordinates all autocomplete features:
 * - Debouncing rapid requests
 * - Generator reuse for performance
 * - Context ranking for better suggestions
 * - Bracket matching for correctness
 * - Import-aware context
 */
export interface IEnhancedAutocompleteService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when autocomplete completes
	 */
	readonly onDidComplete: Event<IAutocompleteSuggestion>;

	/**
	 * Get autocomplete suggestions
	 *
	 * @param request Autocomplete request
	 * @param token Cancellation token
	 * @returns Async generator of suggestion chunks
	 */
	getCompletions(
		request: IAutocompleteRequest,
		token: CancellationToken
	): AsyncGenerator<string>;

	/**
	 * Accept a completion
	 *
	 * @param uri File URI
	 * @param completion Accepted completion text
	 */
	acceptCompletion(uri: URI, completion: string): void;

	/**
	 * Get statistics
	 */
	getStatistics(): IAutocompleteStatistics;

	/**
	 * Clear caches
	 */
	clearCaches(): void;
}

export class EnhancedAutocompleteService extends Disposable implements IEnhancedAutocompleteService {
	readonly _serviceBrand: undefined;

	private readonly completionStreamer: CompletionStreamer;
	private readonly statistics: IAutocompleteStatistics;

	private readonly _onDidComplete = this._register(new Emitter<IAutocompleteSuggestion>());
	readonly onDidComplete = this._onDidComplete.event;

	constructor(
		@IAutocompleteDebouncer private readonly debouncer: IAutocompleteDebouncer,
		@IBracketMatchingService private readonly bracketMatching: IBracketMatchingService,
		@IImportDefinitionsService private readonly importDefinitions: IImportDefinitionsService,
		@IRootPathContextService private readonly rootPathContext: IRootPathContextService,
		@IContextRankingService private readonly contextRanking: IContextRankingService
	) {
		super();

		this.completionStreamer = this._register(new CompletionStreamer((err) => {
			console.error('Completion streaming error:', err);
		}));

		this.statistics = {
			totalRequests: 0,
			cachedResponses: 0,
			reusedGenerators: 0,
			averageResponseTime: 0,
			bracketMatchesPrevented: 0,
		};

		// Add bracket matching transform
		this.completionStreamer.addTransform(
			async function* (stream, prefix, suffix, multiline, _stopSequences, fullStop) {
				// Delegate to bracket matching service
				// Note: In full implementation, we'd get the URI and use it
				// For now, we just pass through
				yield* stream;
			}
		);
	}

	/**
	 * Get autocomplete suggestions with all optimizations
	 */
	async *getCompletions(
		request: IAutocompleteRequest,
		token: CancellationToken
	): AsyncGenerator<string> {
		const startTime = Date.now();
		this.statistics.totalRequests++;

		try {
			// 1. Debounce rapid requests
			const shouldDebounce = await this.debouncer.delayAndShouldDebounce(150);
			if (shouldDebounce) {
				return; // Request was superseded
			}

			// 2. Get context snippets
			const contextSnippets = await this.rootPathContext.getContextSnippets(
				request.uri,
				request.position
			);

			// 3. Rank context using our ranking service
			// In full implementation, we'd pass edit history
			const rankedSnippets = this.contextRanking.rankSnippets(
				request.uri,
				contextSnippets.map(s => ({
					uri: s.uri,
					content: s.content,
					range: s.range,
					score: s.score,
				})),
				[] // Edit history would come from document history tracker
			);

			// 4. Stream completion with optimizations
			const completionGenerator = (abortSignal: AbortSignal) => {
				// In full implementation, this would call the LLM
				// For now, return a mock generator
				return this.mockCompletionGenerator(request, abortSignal);
			};

			let fullCompletion = '';

			for await (const chunk of this.completionStreamer.streamCompletionWithFilters(
				token,
				completionGenerator,
				request.prefix,
				request.suffix,
				request.multiline ?? false,
				{
					maxProcessingTime: 30000,
					applyTransforms: true,
				}
			)) {
				fullCompletion += chunk;
				yield chunk;
			}

			// Update statistics
			const responseTime = Date.now() - startTime;
			this.updateAverageResponseTime(responseTime);

			const reuseStats = this.completionStreamer.getStatistics();
			if (reuseStats.hasGenerator && reuseStats.pendingPrefix) {
				this.statistics.reusedGenerators++;
			}

			// Fire completion event
			this._onDidComplete.fire({
				text: fullCompletion,
				confidence: 0.8,
				source: reuseStats.hasGenerator ? 'reuse' : 'llm',
				contextSnippets: rankedSnippets.length,
			});

		} catch (error) {
			console.error('Autocomplete error:', error);
			throw error;
		}
	}

	/**
	 * Mock completion generator for demonstration
	 * In production, this would call the LLM
	 */
	private async *mockCompletionGenerator(
		_request: IAutocompleteRequest,
		_abortSignal: AbortSignal
	): AsyncGenerator<string> {
		// Mock implementation - would call LLM in production
		const mockCompletion = 'const result = ';
		for (const char of mockCompletion) {
			await new Promise(resolve => setTimeout(resolve, 50));
			yield char;
		}
	}

	/**
	 * Accept a completion and update bracket tracking
	 */
	acceptCompletion(uri: URI, completion: string): void {
		this.bracketMatching.handleAcceptedCompletion(completion, uri);
	}

	/**
	 * Update average response time
	 */
	private updateAverageResponseTime(newTime: number): void {
		const total = this.statistics.totalRequests;
		const current = this.statistics.averageResponseTime;
		this.statistics.averageResponseTime = ((current * (total - 1)) + newTime) / total;
	}

	/**
	 * Get statistics
	 */
	getStatistics(): IAutocompleteStatistics {
		return { ...this.statistics };
	}

	/**
	 * Clear all caches
	 */
	clearCaches(): void {
		this.importDefinitions.clear();
		this.rootPathContext.clear();
		this.bracketMatching.clear();
		this.completionStreamer.cancel();
	}

	/**
	 * Dispose and clean up
	 */
	override dispose(): void {
		this.completionStreamer.dispose();
		super.dispose();
	}
}
