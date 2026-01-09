/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';

/**
 * Token batch for aggregation
 */
interface ITokenBatch {
	/**
	 * Model name
	 */
	model: string;

	/**
	 * Provider name (e.g., 'openai', 'anthropic')
	 */
	provider: string;

	/**
	 * Number of events in batch
	 */
	count: number;

	/**
	 * Total prompt tokens
	 */
	totalPromptTokens: number;

	/**
	 * Total generated tokens
	 */
	totalGeneratedTokens: number;

	/**
	 * Last event timestamp
	 */
	lastEventTime: number;
}

/**
 * Flushed batch data
 */
export interface IFlushedBatch {
	model: string;
	provider: string;
	eventCount: number;
	totalPromptTokens: number;
	totalGeneratedTokens: number;
	avgPromptTokens: number;
	avgGeneratedTokens: number;
	timestamp: number;
}

/**
 * Tokens Batching Service
 *
 * Batches token usage data to reduce telemetry overhead:
 * - Aggregates tokens by model and provider
 * - Flushes when batch is full (25 events)
 * - Auto-flushes every 10 minutes
 * - Reduces telemetry API calls
 * - Provides aggregated statistics
 */
export class TokensBatchingService extends Disposable {
	private static _instance: TokensBatchingService | undefined;

	private readonly batches = new Map<string, ITokenBatch>();
	private flushTimer: any = undefined;

	// Configuration
	private readonly BATCH_SIZE_LIMIT = 25;
	private readonly FLUSH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

	private readonly _onDidFlushBatch = this._register(new Emitter<IFlushedBatch>());
	readonly onDidFlushBatch: Event<IFlushedBatch> = this._onDidFlushBatch.event;

	private constructor() {
		super();
		this.startFlushTimer();
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(): TokensBatchingService {
		if (!TokensBatchingService._instance) {
			TokensBatchingService._instance = new TokensBatchingService();
		}
		return TokensBatchingService._instance;
	}

	/**
	 * Add tokens to batch
	 *
	 * @param model Model name
	 * @param provider Provider name
	 * @param promptTokens Number of prompt tokens
	 * @param generatedTokens Number of generated tokens
	 */
	addTokens(
		model: string,
		provider: string,
		promptTokens: number,
		generatedTokens: number
	): void {
		const key = `${provider}:${model}`;

		// Create batch if doesn't exist
		if (!this.batches.has(key)) {
			this.batches.set(key, {
				model,
				provider,
				count: 0,
				totalPromptTokens: 0,
				totalGeneratedTokens: 0,
				lastEventTime: Date.now(),
			});
		}

		// Update batch
		const batch = this.batches.get(key)!;
		batch.count++;
		batch.totalPromptTokens += promptTokens;
		batch.totalGeneratedTokens += generatedTokens;
		batch.lastEventTime = Date.now();

		// Flush if batch is full
		if (batch.count >= this.BATCH_SIZE_LIMIT) {
			this.flushBatch(key, batch);
		}
	}

	/**
	 * Flush a single batch
	 */
	private flushBatch(key: string, batch: ITokenBatch): void {
		if (batch.count === 0) {
			return;
		}

		const flushedBatch: IFlushedBatch = {
			model: batch.model,
			provider: batch.provider,
			eventCount: batch.count,
			totalPromptTokens: batch.totalPromptTokens,
			totalGeneratedTokens: batch.totalGeneratedTokens,
			avgPromptTokens: Math.round(batch.totalPromptTokens / batch.count),
			avgGeneratedTokens: Math.round(batch.totalGeneratedTokens / batch.count),
			timestamp: Date.now(),
		};

		// Fire event
		this._onDidFlushBatch.fire(flushedBatch);

		// Log for debugging
		console.log('[TokensBatchingService] Flushed batch:', {
			model: flushedBatch.model,
			provider: flushedBatch.provider,
			eventCount: flushedBatch.eventCount,
			avgPromptTokens: flushedBatch.avgPromptTokens,
			avgGeneratedTokens: flushedBatch.avgGeneratedTokens,
		});

		// Remove batch
		this.batches.delete(key);
	}

	/**
	 * Flush all batches
	 */
	private flushAllBatches(): void {
		for (const [key, batch] of this.batches.entries()) {
			this.flushBatch(key, batch);
		}
	}

	/**
	 * Start auto-flush timer
	 */
	private startFlushTimer(): void {
		this.flushTimer = setInterval(() => {
			this.flushAllBatches();
		}, this.FLUSH_INTERVAL_MS);

		// Allow process to exit if this timer is the only thing keeping it alive
		if (this.flushTimer.unref) {
			this.flushTimer.unref();
		}
	}

	/**
	 * Get current batch statistics
	 */
	getStatistics(): {
		totalBatches: number;
		totalEvents: number;
		totalPromptTokens: number;
		totalGeneratedTokens: number;
		batches: Array<{
			key: string;
			model: string;
			provider: string;
			count: number;
		}>;
	} {
		let totalEvents = 0;
		let totalPromptTokens = 0;
		let totalGeneratedTokens = 0;

		const batches = Array.from(this.batches.entries()).map(([key, batch]) => {
			totalEvents += batch.count;
			totalPromptTokens += batch.totalPromptTokens;
			totalGeneratedTokens += batch.totalGeneratedTokens;

			return {
				key,
				model: batch.model,
				provider: batch.provider,
				count: batch.count,
			};
		});

		return {
			totalBatches: this.batches.size,
			totalEvents,
			totalPromptTokens,
			totalGeneratedTokens,
			batches,
		};
	}

	/**
	 * Manually flush all batches
	 */
	flush(): void {
		this.flushAllBatches();
	}

	/**
	 * Shutdown and flush
	 */
	shutdown(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = undefined;
		}
		this.flushAllBatches();
	}

	/**
	 * Dispose and clean up
	 */
	override dispose(): void {
		this.shutdown();
		super.dispose();
	}
}
