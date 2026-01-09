/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../../base/common/uri.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { LRUCache } from '../lruCache.js';
import { IImportDefinitionsService } from './importDefinitionsService.js';

export const IRootPathContextService = createDecorator<IRootPathContextService>('rootPathContextService');

/**
 * Code snippet for autocomplete context
 */
export interface ICodeSnippet {
	/**
	 * File URI
	 */
	uri: URI;

	/**
	 * Snippet content
	 */
	content: string;

	/**
	 * Range in file
	 */
	range: Range;

	/**
	 * Snippet type
	 */
	type: 'function' | 'class' | 'method' | 'variable' | 'import';

	/**
	 * Relevance score (0-1)
	 */
	score: number;
}

/**
 * Root Path Context Service
 *
 * Finds relevant code snippets based on imports and definitions:
 * - Analyzes import statements
 * - Follows definition paths
 * - Provides context snippets for autocomplete
 * - Caches results for performance
 */
export interface IRootPathContextService {
	readonly _serviceBrand: undefined;

	/**
	 * Get context snippets for a file and position
	 *
	 * @param uri File URI
	 * @param position Position in file
	 * @returns Array of relevant code snippets
	 */
	getContextSnippets(uri: URI, position: Position): Promise<ICodeSnippet[]>;

	/**
	 * Clear cache
	 */
	clear(): void;
}

export class RootPathContextService extends Disposable implements IRootPathContextService {
	readonly _serviceBrand: undefined;

	private cache: LRUCache<ICodeSnippet[]>;

	constructor(
		@IImportDefinitionsService private readonly importDefinitionsService: IImportDefinitionsService
	) {
		super();

		this.cache = this._register(
			new LRUCache<ICodeSnippet[]>({
				maxSize: 100,
			})
		);
	}

	/**
	 * Get context snippets for a file and position
	 */
	async getContextSnippets(uri: URI, position: Position): Promise<ICodeSnippet[]> {
		const cacheKey = this.getCacheKey(uri, position);

		// Check cache first
		const cached = this.cache.get(cacheKey);
		if (cached) {
			return cached;
		}

		const snippets: ICodeSnippet[] = [];

		try {
			// Get import information
			const importInfo = this.importDefinitionsService.get(uri);

			if (importInfo) {
				// For each import, get its definition snippets
				for (const [, definitions] of importInfo.imports) {
					for (const def of definitions) {
						// In a full implementation, we would read the definition content
						// For now, we create placeholder snippets
						snippets.push({
							uri: def.uri,
							content: def.content || '',
							range: def.range,
							type: this.inferType(def.content || ''),
							score: 0.8, // High score for imported symbols
						});
					}
				}
			}

			// TODO: In a full implementation, we would:
			// 1. Parse the file with tree-sitter or similar
			// 2. Find the AST node at the cursor position
			// 3. Follow references and definitions
			// 4. Collect relevant snippets based on the context

			// Sort by score
			snippets.sort((a, b) => b.score - a.score);

			// Cache the results
			this.cache.set(cacheKey, snippets);

			return snippets;
		} catch (error) {
			console.error('Error getting context snippets:', error);
			return [];
		}
	}

	/**
	 * Infer snippet type from content
	 */
	private inferType(content: string): 'function' | 'class' | 'method' | 'variable' | 'import' {
		const trimmed = content.trim();

		if (trimmed.match(/^(export\s+)?class\s+/)) {
			return 'class';
		}

		if (trimmed.match(/^(export\s+)?(async\s+)?function\s+/)) {
			return 'function';
		}

		if (trimmed.match(/^\s*(public|private|protected|static)?\s*\w+\s*\([^)]*\)\s*{/)) {
			return 'method';
		}

		if (trimmed.match(/^import\s+/)) {
			return 'import';
		}

		return 'variable';
	}


	/**
	 * Get cache key for position
	 */
	private getCacheKey(uri: URI, position: Position): string {
		return `${uri.toString()}:${position.lineNumber}:${position.column}`;
	}

	/**
	 * Clear cache
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Dispose and clean up
	 */
	override dispose(): void {
		this.cache.dispose();
		super.dispose();
	}
}
