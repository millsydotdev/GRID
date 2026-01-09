/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';

export const IAutocompleteLoggingService = createDecorator<IAutocompleteLoggingService>('autocompleteLoggingService');

/**
 * Autocomplete outcome
 */
export interface IAutocompleteOutcome {
	/**
	 * Unique completion ID
	 */
	completionId: string;

	/**
	 * Whether completion was accepted
	 */
	accepted: boolean;

	/**
	 * Completion text
	 */
	completion: string;

	/**
	 * Prefix (text before cursor)
	 */
	prefix: string;

	/**
	 * Suffix (text after cursor)
	 */
	suffix: string;

	/**
	 * File path
	 */
	filepath: string;

	/**
	 * Model used
	 */
	modelName?: string;

	/**
	 * Cache hit
	 */
	cacheHit: boolean;

	/**
	 * Time taken (ms)
	 */
	time: number;

	/**
	 * Number of lines in completion
	 */
	numLines: number;

	/**
	 * Timestamp
	 */
	timestamp: number;
}

/**
 * Autocomplete Logging Service
 *
 * Tracks autocomplete outcomes and telemetry:
 * - Logs accepted/rejected completions
 * - Manages abort controllers
 * - Tracks rejection timeouts
 * - Provides analytics data
 */
export interface IAutocompleteLoggingService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when outcome is logged
	 */
	readonly onDidLogOutcome: Event<IAutocompleteOutcome>;

	/**
	 * Create abort controller for a completion
	 *
	 * @param completionId Completion ID
	 * @returns Abort controller
	 */
	createAbortController(completionId: string): AbortController;

	/**
	 * Delete abort controller
	 *
	 * @param completionId Completion ID
	 */
	deleteAbortController(completionId: string): void;

	/**
	 * Cancel all pending completions
	 */
	cancel(): void;

	/**
	 * Mark completion as displayed
	 *
	 * Starts rejection timeout (10 seconds)
	 *
	 * @param completionId Completion ID
	 * @param outcome Outcome data
	 */
	markDisplayed(completionId: string, outcome: IAutocompleteOutcome): void;

	/**
	 * Mark completion as accepted
	 *
	 * @param completionId Completion ID
	 * @returns Outcome if found
	 */
	accept(completionId: string): IAutocompleteOutcome | undefined;

	/**
	 * Cancel rejection timeout
	 *
	 * @param completionId Completion ID
	 */
	cancelRejectionTimeout(completionId: string): void;

	/**
	 * Get statistics
	 */
	getStatistics(): {
		totalCompletions: number;
		acceptedCompletions: number;
		rejectedCompletions: number;
		acceptanceRate: number;
		averageTime: number;
		cacheHitRate: number;
	};
}

export class AutocompleteLoggingService extends Disposable implements IAutocompleteLoggingService {
	readonly _serviceBrand: undefined;

	// Abort controllers by completion ID
	private readonly _abortControllers = new Map<string, AbortController>();

	// Rejection timeouts by completion ID
	private readonly _logRejectionTimeouts = new Map<string, any>();

	// Outcomes by completion ID
	private readonly _outcomes = new Map<string, IAutocompleteOutcome>();

	// Last displayed completion tracking
	private _lastDisplayedCompletion: { id: string; displayedAt: number } | undefined;

	// Statistics
	private _totalCompletions = 0;
	private _acceptedCompletions = 0;
	private _rejectedCompletions = 0;
	private _totalTime = 0;
	private _cacheHits = 0;

	// Constants
	private readonly REJECTION_TIMEOUT = 10000; // 10 seconds
	private readonly RAPID_CHANGE_THRESHOLD = 500; // 500ms

	private readonly _onDidLogOutcome = this._register(new Emitter<IAutocompleteOutcome>());
	readonly onDidLogOutcome = this._onDidLogOutcome.event;

	constructor() {
		super();
	}

	/**
	 * Create abort controller for a completion
	 */
	createAbortController(completionId: string): AbortController {
		const abortController = new AbortController();
		this._abortControllers.set(completionId, abortController);
		return abortController;
	}

	/**
	 * Delete abort controller
	 */
	deleteAbortController(completionId: string): void {
		this._abortControllers.delete(completionId);
	}

	/**
	 * Cancel all pending completions
	 */
	cancel(): void {
		this._abortControllers.forEach((abortController) => {
			abortController.abort();
		});
		this._abortControllers.clear();
	}

	/**
	 * Mark completion as displayed
	 */
	markDisplayed(completionId: string, outcome: IAutocompleteOutcome): void {
		// Set rejection timeout
		const timeout = setTimeout(() => {
			// After timeout, assume rejected
			outcome.accepted = false;
			this.logAutocompleteOutcome(outcome);
			this._logRejectionTimeouts.delete(completionId);
		}, this.REJECTION_TIMEOUT);

		this._outcomes.set(completionId, outcome);
		this._logRejectionTimeouts.set(completionId, timeout);

		// Handle continuation of previous completion
		const previous = this._lastDisplayedCompletion;
		const now = Date.now();

		if (previous && this._logRejectionTimeouts.has(previous.id)) {
			const previousOutcome = this._outcomes.get(previous.id);

			if (previousOutcome) {
				// Check if this is a continuation of the previous completion
				const c1 = previousOutcome.completion.split('\n')[0] ?? '';
				const c2 = outcome.completion.split('\n')[0];

				if (
					c1.endsWith(c2) ||
					c2.endsWith(c1) ||
					c1.startsWith(c2) ||
					c2.startsWith(c1)
				) {
					// Cancel previous rejection timeout (it's a continuation)
					this.cancelRejectionTimeout(previous.id);
				} else if (now - previous.displayedAt < this.RAPID_CHANGE_THRESHOLD) {
					// Rapid change - cancel previous
					this.cancelRejectionTimeout(previous.id);
				}
			}
		}

		this._lastDisplayedCompletion = {
			id: completionId,
			displayedAt: now,
		};
	}

	/**
	 * Mark completion as accepted
	 */
	accept(completionId: string): IAutocompleteOutcome | undefined {
		// Clear rejection timeout
		if (this._logRejectionTimeouts.has(completionId)) {
			clearTimeout(this._logRejectionTimeouts.get(completionId));
			this._logRejectionTimeouts.delete(completionId);
		}

		// Log outcome if found
		if (this._outcomes.has(completionId)) {
			const outcome = this._outcomes.get(completionId)!;
			outcome.accepted = true;
			this.logAutocompleteOutcome(outcome);
			this._outcomes.delete(completionId);
			return outcome;
		}

		return undefined;
	}

	/**
	 * Cancel rejection timeout
	 */
	cancelRejectionTimeout(completionId: string): void {
		if (this._logRejectionTimeouts.has(completionId)) {
			clearTimeout(this._logRejectionTimeouts.get(completionId));
			this._logRejectionTimeouts.delete(completionId);
		}

		if (this._outcomes.has(completionId)) {
			this._outcomes.delete(completionId);
		}
	}

	/**
	 * Log autocomplete outcome
	 */
	private logAutocompleteOutcome(outcome: IAutocompleteOutcome): void {
		// Update statistics
		this._totalCompletions++;
		this._totalTime += outcome.time;

		if (outcome.accepted) {
			this._acceptedCompletions++;
		} else {
			this._rejectedCompletions++;
		}

		if (outcome.cacheHit) {
			this._cacheHits++;
		}

		// Fire event
		this._onDidLogOutcome.fire(outcome);

		// In production, would send to telemetry service
		console.log('[AutocompleteLog]', {
			completionId: outcome.completionId,
			accepted: outcome.accepted,
			cacheHit: outcome.cacheHit,
			time: outcome.time,
			numLines: outcome.numLines,
			modelName: outcome.modelName,
		});
	}

	/**
	 * Get statistics
	 */
	getStatistics() {
		const acceptanceRate = this._totalCompletions > 0
			? (this._acceptedCompletions / this._totalCompletions) * 100
			: 0;

		const averageTime = this._totalCompletions > 0
			? this._totalTime / this._totalCompletions
			: 0;

		const cacheHitRate = this._totalCompletions > 0
			? (this._cacheHits / this._totalCompletions) * 100
			: 0;

		return {
			totalCompletions: this._totalCompletions,
			acceptedCompletions: this._acceptedCompletions,
			rejectedCompletions: this._rejectedCompletions,
			acceptanceRate,
			averageTime,
			cacheHitRate,
		};
	}

	/**
	 * Reset statistics
	 */
	resetStatistics(): void {
		this._totalCompletions = 0;
		this._acceptedCompletions = 0;
		this._rejectedCompletions = 0;
		this._totalTime = 0;
		this._cacheHits = 0;
	}

	/**
	 * Dispose and clean up
	 */
	override dispose(): void {
		// Cancel all pending
		this.cancel();

		// Clear all timeouts
		for (const timeout of this._logRejectionTimeouts.values()) {
			clearTimeout(timeout);
		}
		this._logRejectionTimeouts.clear();

		// Clear outcomes
		this._outcomes.clear();

		super.dispose();
	}
}
