/*---------------------------------------------------------------------------------------------
 *  Copyright (c) GRID Editor. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';

export const INextEditService = createDecorator<INextEditService>('nextEditService');

/**
 * Represents a predicted edit that the user might make next
 */
export interface IPredictedEdit {
	/**
	 * Confidence score (0-1) of this prediction
	 */
	confidence: number;

	/**
	 * The URI of the file where the edit should happen
	 */
	uri: URI;

	/**
	 * The position where the edit should be made
	 */
	position: Position;

	/**
	 * The range to replace (if any)
	 */
	range?: Range;

	/**
	 * The suggested text to insert
	 */
	text: string;

	/**
	 * Type of edit predicted
	 */
	type: 'insertion' | 'deletion' | 'replacement' | 'refactor';

	/**
	 * Reasoning for this prediction
	 */
	reason: string;

	/**
	 * Source of the prediction (pattern, chain, AI model)
	 */
	source: 'pattern' | 'chain' | 'ai_model';
}

/**
 * Represents a document change event
 */
export interface IDocumentChange {
	uri: URI;
	timestamp: number;
	changes: {
		range: Range;
		rangeLength: number;
		text: string;
	}[];
	versionId: number;
}

/**
 * Represents an edit pattern learned from history
 */
export interface IEditPattern {
	id: string;
	pattern: string;
	occurrences: number;
	confidence: number;
	context: {
		before: string;
		after: string;
		fileType?: string;
	};
}

/**
 * Represents a chain of related edits
 */
export interface IEditChain {
	id: string;
	edits: IDocumentChange[];
	pattern: string;
	confidence: number;
}

/**
 * Next Edit Service
 *
 * Predicts the user's next edit based on edit history, patterns, and AI analysis.
 */
export interface INextEditService {
	readonly _serviceBrand: undefined;

	/**
	 * Track a document change
	 */
	trackChange(change: IDocumentChange): void;

	/**
	 * Predict the next edit for a document at a given position
	 */
	predictNextEdit(uri: URI, position: Position): Promise<IPredictedEdit | undefined>;

	/**
	 * Get all current predictions for a document
	 */
	getPredictions(uri: URI): Promise<IPredictedEdit[]>;

	/**
	 * Prefetch predictions for a document
	 */
	prefetchPredictions(uri: URI): Promise<void>;

	/**
	 * Clear history for a document
	 */
	clearHistory(uri?: URI): void;

	/**
	 * Get edit patterns learned from history
	 */
	getPatterns(): IEditPattern[];

	/**
	 * Get edit chains detected in history
	 */
	getEditChains(): IEditChain[];
}

export class NextEditService extends Disposable implements INextEditService {
	readonly _serviceBrand: undefined;

	private readonly documentHistory: Map<string, IDocumentChange[]> = new Map();
	private readonly editPatterns: Map<string, IEditPattern> = new Map();
	private readonly editChains: Map<string, IEditChain> = new Map();
	private readonly prefetchQueue: Set<string> = new Set();

	// Configuration
	private readonly MAX_HISTORY_PER_DOCUMENT = 100;
	private readonly PATTERN_MIN_OCCURRENCES = 3;
	private readonly CHAIN_MIN_LENGTH = 2;
	private readonly PREFETCH_DELAY = 500; // ms

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService
	) {
		super();
	}

	/**
	 * Track a document change and update patterns/chains
	 */
	trackChange(change: IDocumentChange): void {
		const uriKey = change.uri.toString();

		// Add to history
		let history = this.documentHistory.get(uriKey);
		if (!history) {
			history = [];
			this.documentHistory.set(uriKey, history);
		}

		history.push(change);

		// Limit history size
		if (history.length > this.MAX_HISTORY_PER_DOCUMENT) {
			history.shift();
		}

		// Analyze for patterns
		this.analyzePatterns(uriKey, history);

		// Analyze for edit chains
		this.analyzeEditChains(uriKey, history);

		// Schedule prefetch
		this.schedulePrefetch(change.uri);
	}

	/**
	 * Predict the next edit at a given position
	 */
	async predictNextEdit(uri: URI, position: Position): Promise<IPredictedEdit | undefined> {
		const predictions = await this.getPredictions(uri);

		if (predictions.length === 0) {
			return undefined;
		}

		// Find the most relevant prediction for this position
		return this.selectBestPrediction(predictions, position);
	}

	/**
	 * Get all predictions for a document
	 */
	async getPredictions(uri: URI): Promise<IPredictedEdit[]> {
		const predictions: IPredictedEdit[] = [];

		// Get predictions from patterns
		const patternPredictions = this.getPredictionsFromPatterns(uri);
		predictions.push(...patternPredictions);

		// Get predictions from edit chains
		const chainPredictions = this.getPredictionsFromChains(uri);
		predictions.push(...chainPredictions);

		// Sort by confidence
		predictions.sort((a, b) => b.confidence - a.confidence);

		return predictions;
	}

	/**
	 * Prefetch predictions for a document
	 */
	async prefetchPredictions(uri: URI): Promise<void> {
		// Prefetching is done in the background
		await this.getPredictions(uri);
	}

	/**
	 * Clear history for a document (or all documents if uri is undefined)
	 */
	clearHistory(uri?: URI): void {
		if (uri) {
			this.documentHistory.delete(uri.toString());
		} else {
			this.documentHistory.clear();
			this.editPatterns.clear();
			this.editChains.clear();
		}
	}

	/**
	 * Get all learned edit patterns
	 */
	getPatterns(): IEditPattern[] {
		return Array.from(this.editPatterns.values());
	}

	/**
	 * Get all detected edit chains
	 */
	getEditChains(): IEditChain[] {
		return Array.from(this.editChains.values());
	}

	/**
	 * Analyze edit history to find patterns
	 */
	private analyzePatterns(uriKey: string, history: IDocumentChange[]): void {
		if (history.length < this.PATTERN_MIN_OCCURRENCES) {
			return;
		}

		// Look for repeated edit sequences
		for (let i = 0; i < history.length - this.PATTERN_MIN_OCCURRENCES + 1; i++) {
			const sequence = history.slice(i, i + 3);
			const pattern = this.extractPattern(sequence);

			if (pattern) {
				const existing = this.editPatterns.get(pattern.id);
				if (existing) {
					existing.occurrences++;
					existing.confidence = Math.min(0.95, existing.confidence + 0.05);
				} else {
					this.editPatterns.set(pattern.id, pattern);
				}
			}
		}
	}

	/**
	 * Analyze edit history to find edit chains
	 */
	private analyzeEditChains(uriKey: string, history: IDocumentChange[]): void {
		if (history.length < this.CHAIN_MIN_LENGTH) {
			return;
		}

		// Look for sequential related edits
		const recentEdits = history.slice(-10); // Last 10 edits
		const chains: IDocumentChange[][] = [];
		let currentChain: IDocumentChange[] = [recentEdits[0]];

		for (let i = 1; i < recentEdits.length; i++) {
			const prev = recentEdits[i - 1];
			const curr = recentEdits[i];

			// Check if edits are related (same file, nearby timestamps, related positions)
			if (this.areEditsRelated(prev, curr)) {
				currentChain.push(curr);
			} else {
				if (currentChain.length >= this.CHAIN_MIN_LENGTH) {
					chains.push([...currentChain]);
				}
				currentChain = [curr];
			}
		}

		// Process chains
		for (const chain of chains) {
			const chainId = `chain-${Date.now()}-${Math.random()}`;
			const pattern = this.extractChainPattern(chain);

			this.editChains.set(chainId, {
				id: chainId,
				edits: chain,
				pattern,
				confidence: this.calculateChainConfidence(chain),
			});
		}
	}

	/**
	 * Check if two edits are related (part of a chain)
	 */
	private areEditsRelated(prev: IDocumentChange, curr: IDocumentChange): boolean {
		// Same file
		if (prev.uri.toString() !== curr.uri.toString()) {
			return false;
		}

		// Within 30 seconds
		if (curr.timestamp - prev.timestamp > 30000) {
			return false;
		}

		// TODO: Check if positions are nearby or follow a pattern
		return true;
	}

	/**
	 * Extract a pattern from a sequence of edits
	 */
	private extractPattern(sequence: IDocumentChange[]): IEditPattern | null {
		if (sequence.length === 0) {
			return null;
		}

		// Create a pattern signature from the edit sequence
		const signature = sequence
			.map((change) => {
				return change.changes
					.map((c) => `${c.text.substring(0, 20)}`)
					.join('|');
			})
			.join('::');

		const id = `pattern-${this.hashString(signature)}`;

		return {
			id,
			pattern: signature,
			occurrences: 1,
			confidence: 0.5,
			context: {
				before: '',
				after: '',
			},
		};
	}

	/**
	 * Extract a pattern from an edit chain
	 */
	private extractChainPattern(chain: IDocumentChange[]): string {
		return chain
			.map((edit) => {
				return edit.changes.map((c) => c.text.substring(0, 10)).join('');
			})
			.join(' -> ');
	}

	/**
	 * Calculate confidence for an edit chain
	 */
	private calculateChainConfidence(chain: IDocumentChange[]): number {
		// Base confidence on chain length and recency
		const lengthFactor = Math.min(chain.length / 10, 1);
		const now = Date.now();
		const avgAge = chain.reduce((sum, edit) => sum + (now - edit.timestamp), 0) / chain.length;
		const recencyFactor = Math.max(0, 1 - avgAge / 60000); // Decay over 1 minute

		return lengthFactor * 0.5 + recencyFactor * 0.5;
	}

	/**
	 * Get predictions from patterns
	 */
	private getPredictionsFromPatterns(uri: URI): IPredictedEdit[] {
		const predictions: IPredictedEdit[] = [];
		const uriKey = uri.toString();
		const history = this.documentHistory.get(uriKey);

		if (!history || history.length === 0) {
			return predictions;
		}

		const lastEdit = history[history.length - 1];

		// Match patterns against recent history
		for (const pattern of this.editPatterns.values()) {
			if (pattern.confidence >= 0.6 && pattern.occurrences >= this.PATTERN_MIN_OCCURRENCES) {
				// Predict next edit based on this pattern
				const prediction = this.createPredictionFromPattern(uri, lastEdit, pattern);
				if (prediction) {
					predictions.push(prediction);
				}
			}
		}

		return predictions;
	}

	/**
	 * Get predictions from edit chains
	 */
	private getPredictionsFromChains(uri: URI): IPredictedEdit[] {
		const predictions: IPredictedEdit[] = [];
		const uriKey = uri.toString();
		const history = this.documentHistory.get(uriKey);

		if (!history || history.length === 0) {
			return predictions;
		}

		const lastEdit = history[history.length - 1];

		// Find matching chains
		for (const chain of this.editChains.values()) {
			if (chain.confidence >= 0.5 && chain.edits.length >= this.CHAIN_MIN_LENGTH) {
				const prediction = this.createPredictionFromChain(uri, lastEdit, chain);
				if (prediction) {
					predictions.push(prediction);
				}
			}
		}

		return predictions;
	}

	/**
	 * Create a prediction from a pattern
	 */
	private createPredictionFromPattern(
		uri: URI,
		lastEdit: IDocumentChange,
		pattern: IEditPattern
	): IPredictedEdit | null {
		// For now, create a simple prediction
		// In production, this would use more sophisticated logic

		if (lastEdit.changes.length === 0) {
			return null;
		}

		const lastChange = lastEdit.changes[lastEdit.changes.length - 1];

		return {
			confidence: pattern.confidence,
			uri,
			position: new Position(lastChange.range.endLineNumber, lastChange.range.endColumn),
			text: '', // Would be filled based on pattern analysis
			type: 'insertion',
			reason: `Pattern "${pattern.id}" suggests this edit`,
			source: 'pattern',
		};
	}

	/**
	 * Create a prediction from an edit chain
	 */
	private createPredictionFromChain(
		uri: URI,
		lastEdit: IDocumentChange,
		chain: IEditChain
	): IPredictedEdit | null {
		if (lastEdit.changes.length === 0) {
			return null;
		}

		const lastChange = lastEdit.changes[lastEdit.changes.length - 1];

		return {
			confidence: chain.confidence,
			uri,
			position: new Position(lastChange.range.endLineNumber, lastChange.range.endColumn),
			text: '', // Would be filled based on chain analysis
			type: 'insertion',
			reason: `Edit chain suggests continuation`,
			source: 'chain',
		};
	}

	/**
	 * Select the best prediction for a given position
	 */
	private selectBestPrediction(predictions: IPredictedEdit[], position: Position): IPredictedEdit | undefined {
		if (predictions.length === 0) {
			return undefined;
		}

		// Find predictions near the given position
		const nearbyPredictions = predictions.filter((pred) => {
			const distance = Math.abs(pred.position.lineNumber - position.lineNumber);
			return distance <= 5; // Within 5 lines
		});

		if (nearbyPredictions.length > 0) {
			return nearbyPredictions[0]; // Return highest confidence nearby prediction
		}

		return predictions[0]; // Return highest confidence overall
	}

	/**
	 * Schedule a prefetch for predictions
	 */
	private schedulePrefetch(uri: URI): void {
		const uriKey = uri.toString();

		if (this.prefetchQueue.has(uriKey)) {
			return; // Already scheduled
		}

		this.prefetchQueue.add(uriKey);

		setTimeout(() => {
			this.prefetchPredictions(uri).catch(() => {
				// Ignore errors in background prefetch
			});
			this.prefetchQueue.delete(uriKey);
		}, this.PREFETCH_DELAY);
	}

	/**
	 * Simple hash function for strings
	 */
	private hashString(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash |= 0; // Convert to 32-bit integer
		}
		return hash.toString(36);
	}
}
