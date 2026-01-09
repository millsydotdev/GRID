/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';

export const IContextRankingService = createDecorator<IContextRankingService>('contextRankingService');

/**
 * Represents a code snippet with its metadata
 */
export interface ICodeSnippet {
	/**
	 * File URI
	 */
	uri: URI;

	/**
	 * Range in the file
	 */
	range: Range;

	/**
	 * Content of the snippet
	 */
	content: string;

	/**
	 * Optional base score (if pre-computed)
	 */
	score?: number;

	/**
	 * Last edit timestamp
	 */
	lastEditTime?: number;

	/**
	 * File type/language
	 */
	language?: string;
}

/**
 * A ranked snippet with computed scores
 */
export interface IRankedSnippet extends ICodeSnippet {
	/**
	 * Final combined score (higher is better)
	 */
	finalScore: number;

	/**
	 * Individual score components for transparency
	 */
	scores: {
		editRecency: number;
		fileSimilarity: number;
		importRelationship: number;
		directoryProximity: number;
		jaccardSimilarity: number;
	};
}

/**
 * Edit history entry
 */
export interface IFileEdit {
	uri: URI;
	timestamp: number;
	changeCount: number;
}

/**
 * Context Ranking Service
 *
 * Ranks code snippets for autocomplete based on multiple signals:
 * - Edit recency (exponential decay)
 * - File similarity (Jaccard distance)
 * - Import relationships
 * - Directory proximity
 */
export interface IContextRankingService {
	readonly _serviceBrand: undefined;

	/**
	 * Rank code snippets for autocomplete
	 *
	 * @param currentFile - The file being edited
	 * @param snippets - Available code snippets
	 * @param editHistory - Recent edit history
	 * @returns Ranked snippets in descending order of relevance
	 */
	rankSnippets(
		currentFile: URI,
		snippets: ICodeSnippet[],
		editHistory: IFileEdit[]
	): IRankedSnippet[];

	/**
	 * Calculate Jaccard similarity between two code snippets
	 */
	jaccardSimilarity(snippet1: string, snippet2: string): number;

	/**
	 * Calculate edit recency score
	 */
	scoreEditRecency(file: URI, editHistory: IFileEdit[]): number;

	/**
	 * Calculate file similarity score
	 */
	scoreFileSimilarity(file1: URI, file2: URI): number;

	/**
	 * Calculate import relationship score
	 */
	scoreImportRelationship(file1: URI, file2: URI): number;

	/**
	 * Calculate directory proximity score
	 */
	scoreDirectoryProximity(file1: URI, file2: URI): number;

	/**
	 * Fill prompt with snippets up to a token limit
	 */
	fillPromptWithSnippets(
		rankedSnippets: IRankedSnippet[],
		maxTokens: number
	): IRankedSnippet[];
}

export class ContextRankingService extends Disposable implements IContextRankingService {
	readonly _serviceBrand: undefined;

	// Scoring weights
	private readonly WEIGHTS = {
		editRecency: 0.3,
		fileSimilarity: 0.25,
		importRelationship: 0.2,
		directoryProximity: 0.15,
		jaccardSimilarity: 0.1,
	};

	// Recency decay parameters
	private readonly RECENCY_DECAY_HOURS = 24;

	constructor() {
		super();
	}

	/**
	 * Rank code snippets based on multiple signals
	 */
	rankSnippets(
		currentFile: URI,
		snippets: ICodeSnippet[],
		editHistory: IFileEdit[]
	): IRankedSnippet[] {
		const rankedSnippets: IRankedSnippet[] = snippets.map((snippet) => {
			// Calculate individual scores
			const scores = {
				editRecency: this.scoreEditRecency(snippet.uri, editHistory),
				fileSimilarity: this.scoreFileSimilarity(currentFile, snippet.uri),
				importRelationship: this.scoreImportRelationship(currentFile, snippet.uri),
				directoryProximity: this.scoreDirectoryProximity(currentFile, snippet.uri),
				jaccardSimilarity: snippet.score ?? 0, // Use pre-computed if available
			};

			// Weighted combination
			const finalScore =
				scores.editRecency * this.WEIGHTS.editRecency +
				scores.fileSimilarity * this.WEIGHTS.fileSimilarity +
				scores.importRelationship * this.WEIGHTS.importRelationship +
				scores.directoryProximity * this.WEIGHTS.directoryProximity +
				scores.jaccardSimilarity * this.WEIGHTS.jaccardSimilarity;

			return {
				...snippet,
				finalScore,
				scores,
			};
		});

		// Sort by final score (descending)
		return rankedSnippets.sort((a, b) => b.finalScore - a.finalScore);
	}

	/**
	 * Calculate Jaccard similarity between two snippets
	 *
	 * Jaccard similarity = |A intersect B| / |A union B|
	 */
	jaccardSimilarity(snippet1: string, snippet2: string): number {
		const symbols1 = this.extractSymbols(snippet1);
		const symbols2 = this.extractSymbols(snippet2);

		// Calculate intersection
		let intersection = 0;
		for (const symbol of symbols1) {
			if (symbols2.has(symbol)) {
				intersection++;
			}
		}

		// Calculate union
		const union = new Set([...symbols1, ...symbols2]).size;

		// Avoid division by zero
		if (union === 0) {
			return 0;
		}

		return intersection / union;
	}

	/**
	 * Extract symbols from code (identifiers, keywords, etc.)
	 */
	private extractSymbols(code: string): Set<string> {
		// Split on non-word characters
		const regex = /[\s.,\/#!$%\^&\*;:{}=\-_`~()\[\]]/g;
		const symbols = code
			.split(regex)
			.map((s) => s.trim())
			.filter((s) => s !== '');

		return new Set(symbols);
	}

	/**
	 * Score file based on edit recency (exponential decay)
	 *
	 * Recent edits get higher scores, with exponential decay over time
	 */
	scoreEditRecency(file: URI, editHistory: IFileEdit[]): number {
		const fileKey = file.toString();
		const now = Date.now();

		// Find edits for this file
		const fileEdits = editHistory.filter((edit) => edit.uri.toString() === fileKey);

		if (fileEdits.length === 0) {
			return 0;
		}

		// Calculate score based on most recent edit with exponential decay
		const mostRecentEdit = fileEdits.reduce((latest, edit) =>
			edit.timestamp > latest.timestamp ? edit : latest
		);

		const hoursSinceEdit =
			(now - mostRecentEdit.timestamp) / (1000 * 60 * 60);

		// Exponential decay: score = e^(-lambda * t) where lambda controls decay rate
		const decayRate = Math.log(2) / this.RECENCY_DECAY_HOURS; // Logarithmic decay
		const score = Math.exp(-decayRate * hoursSinceEdit);

		return Math.max(0, Math.min(1, score));
	}

	/**
	 * Score file similarity based on file path and name
	 *
	 * Files with similar names/paths get higher scores
	 */
	scoreFileSimilarity(file1: URI, file2: URI): number {
		const path1 = file1.path;
		const path2 = file2.path;

		// Same file = max score
		if (path1 === path2) {
			return 1.0;
		}

		// Extract file names
		const name1 = this.getFileName(path1);
		const name2 = this.getFileName(path2);

		// Calculate name similarity using Jaccard on characters
		const nameScore = this.calculateStringSimilarity(name1, name2);

		// Calculate path similarity
		const pathScore = this.calculatePathSimilarity(path1, path2);

		// Weighted combination (name is more important)
		return nameScore * 0.7 + pathScore * 0.3;
	}

	/**
	 * Score import relationship
	 *
	 * Files that import/are imported by the current file get higher scores
	 */
	scoreImportRelationship(file1: URI, file2: URI): number {
		// Same file
		if (file1.toString() === file2.toString()) {
			return 0;
		}

		// TODO: Implement actual import graph analysis
		// For now, return a basic heuristic based on file proximity

		const path1 = file1.path;
		const path2 = file2.path;

		// Files in same directory are more likely to import each other
		if (this.getDirectoryPath(path1) === this.getDirectoryPath(path2)) {
			return 0.5;
		}

		return 0;
	}

	/**
	 * Score directory proximity
	 *
	 * Files closer in the directory tree get higher scores
	 */
	scoreDirectoryProximity(file1: URI, file2: URI): number {
		const path1 = file1.path;
		const path2 = file2.path;

		const segments1 = path1.split('/').filter((s) => s !== '');
		const segments2 = path2.split('/').filter((s) => s !== '');

		// Count common path segments from the root
		let commonSegments = 0;
		const minLength = Math.min(segments1.length, segments2.length);

		for (let i = 0; i < minLength; i++) {
			if (segments1[i] === segments2[i]) {
				commonSegments++;
			} else {
				break;
			}
		}

		// Normalize by the maximum possible common segments
		const maxSegments = Math.max(segments1.length, segments2.length);
		if (maxSegments === 0) {
			return 0;
		}

		return commonSegments / maxSegments;
	}

	/**
	 * Fill prompt with snippets up to a token limit
	 */
	fillPromptWithSnippets(
		rankedSnippets: IRankedSnippet[],
		maxTokens: number
	): IRankedSnippet[] {
		let tokensRemaining = maxTokens;
		const selectedSnippets: IRankedSnippet[] = [];

		for (const snippet of rankedSnippets) {
			// Estimate token count (rough approximation: ~4 chars per token)
			const estimatedTokens = Math.ceil(snippet.content.length / 4);

			if (tokensRemaining - estimatedTokens >= 0) {
				tokensRemaining -= estimatedTokens;
				selectedSnippets.push(snippet);
			} else {
				break; // No more room
			}
		}

		return selectedSnippets;
	}

	/**
	 * Helper: Get file name from path
	 */
	private getFileName(path: string): string {
		const segments = path.split('/');
		return segments[segments.length - 1] || '';
	}

	/**
	 * Helper: Get directory path
	 */
	private getDirectoryPath(path: string): string {
		const segments = path.split('/');
		segments.pop(); // Remove file name
		return segments.join('/');
	}

	/**
	 * Helper: Calculate string similarity (character-level Jaccard)
	 */
	private calculateStringSimilarity(str1: string, str2: string): number {
		const set1 = new Set(str1.toLowerCase().split(''));
		const set2 = new Set(str2.toLowerCase().split(''));

		let intersection = 0;
		for (const char of set1) {
			if (set2.has(char)) {
				intersection++;
			}
		}

		const union = new Set([...set1, ...set2]).size;
		if (union === 0) {
			return 0;
		}

		return intersection / union;
	}

	/**
	 * Helper: Calculate path similarity based on common segments
	 */
	private calculatePathSimilarity(path1: string, path2: string): number {
		const segments1 = path1.split('/').filter((s) => s !== '');
		const segments2 = path2.split('/').filter((s) => s !== '');

		const set1 = new Set(segments1);
		const set2 = new Set(segments2);

		let intersection = 0;
		for (const segment of set1) {
			if (set2.has(segment)) {
				intersection++;
			}
		}

		const union = new Set([...set1, ...set2]).size;
		if (union === 0) {
			return 0;
		}

		return intersection / union;
	}
}
