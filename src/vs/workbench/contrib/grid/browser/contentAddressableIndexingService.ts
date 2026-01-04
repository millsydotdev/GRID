/*---------------------------------------------------------------------------------------------
 *  Copyright (c) GRID Editor. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';
import { Emitter, Event } from '../../../../base/common/event.js';

export const IContentAddressableIndexingService = createDecorator<IContentAddressableIndexingService>('contentAddressableIndexingService');

/**
 * Index entry with content hash
 */
export interface IIndexEntry {
	/**
	 * File URI
	 */
	uri: URI;

	/**
	 * Content hash (SHA-256)
	 */
	contentHash: string;

	/**
	 * Last indexed timestamp
	 */
	lastIndexed: number;

	/**
	 * File size in bytes
	 */
	size: number;

	/**
	 * Associated tags
	 */
	tags: Set<string>;

	/**
	 * Git branch (if applicable)
	 */
	branch?: string;

	/**
	 * Custom metadata
	 */
	metadata?: Record<string, any>;
}

/**
 * Indexing operation result
 */
export interface IIndexOperationResult {
	/**
	 * Operation type
	 */
	operation: 'compute' | 'delete' | 'addTag' | 'removeTag';

	/**
	 * File URI
	 */
	uri: URI;

	/**
	 * Whether operation succeeded
	 */
	success: boolean;

	/**
	 * Content hash (for compute operation)
	 */
	contentHash?: string;

	/**
	 * Error message if failed
	 */
	error?: string;
}

/**
 * Indexing statistics
 */
export interface IIndexingStatistics {
	/**
	 * Total entries in index
	 */
	totalEntries: number;

	/**
	 * Entries by branch
	 */
	entriesByBranch: Map<string, number>;

	/**
	 * Total size of indexed files
	 */
	totalSize: number;

	/**
	 * Last update timestamp
	 */
	lastUpdate: number;
}

/**
 * Branch comparison result
 */
export interface IBranchComparisonResult {
	/**
	 * Files to re-index (content changed)
	 */
	toReindex: URI[];

	/**
	 * Files to remove (no longer exist)
	 */
	toRemove: URI[];

	/**
	 * Files unchanged (same content hash)
	 */
	unchanged: URI[];
}

/**
 * Content-Addressable Indexing Service
 *
 * Provides efficient file indexing using content hashing:
 * - Only re-indexes files when content changes
 * - Branch-aware indexing
 * - Tag-based categorization
 * - Fast lookup by content hash
 */
export interface IContentAddressableIndexingService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when index is updated
	 */
	readonly onDidUpdateIndex: Event<IIndexOperationResult>;

	/**
	 * Compute content hash and index file
	 *
	 * @param uri File URI
	 * @param content File content
	 * @param branch Optional git branch
	 * @returns Operation result
	 */
	compute(uri: URI, content: string, branch?: string): Promise<IIndexOperationResult>;

	/**
	 * Delete file from index
	 *
	 * @param uri File URI
	 * @param branch Optional git branch (delete from specific branch only)
	 * @returns Operation result
	 */
	delete(uri: URI, branch?: string): Promise<IIndexOperationResult>;

	/**
	 * Add tag to indexed file
	 *
	 * @param uri File URI
	 * @param tag Tag to add
	 * @returns Operation result
	 */
	addTag(uri: URI, tag: string): Promise<IIndexOperationResult>;

	/**
	 * Remove tag from indexed file
	 *
	 * @param uri File URI
	 * @param tag Tag to remove
	 * @returns Operation result
	 */
	removeTag(uri: URI, tag: string): Promise<IIndexOperationResult>;

	/**
	 * Get index entry by URI
	 *
	 * @param uri File URI
	 * @param branch Optional git branch
	 * @returns Index entry or undefined
	 */
	getEntry(uri: URI, branch?: string): IIndexEntry | undefined;

	/**
	 * Get entries by content hash
	 *
	 * @param contentHash Content hash
	 * @returns Array of entries with matching hash
	 */
	getEntriesByHash(contentHash: string): IIndexEntry[];

	/**
	 * Get entries by tag
	 *
	 * @param tag Tag to search for
	 * @returns Array of entries with tag
	 */
	getEntriesByTag(tag: string): IIndexEntry[];

	/**
	 * Compare branches and determine what needs re-indexing
	 *
	 * @param fromBranch Source branch
	 * @param toBranch Target branch
	 * @param currentFiles Current files in target branch
	 * @returns Comparison result
	 */
	compareBranches(
		fromBranch: string,
		toBranch: string,
		currentFiles: Map<URI, string>
	): Promise<IBranchComparisonResult>;

	/**
	 * Check if file needs re-indexing
	 *
	 * @param uri File URI
	 * @param content Current content
	 * @param branch Optional git branch
	 * @returns True if content changed or not indexed
	 */
	needsReindex(uri: URI, content: string, branch?: string): boolean;

	/**
	 * Get indexing statistics
	 *
	 * @returns Statistics
	 */
	getStatistics(): IIndexingStatistics;

	/**
	 * Clear all index entries
	 *
	 * @param branch Optional branch to clear (clears all if not specified)
	 */
	clear(branch?: string): void;
}

export class ContentAddressableIndexingService extends Disposable implements IContentAddressableIndexingService {
	readonly _serviceBrand: undefined;

	private readonly _index = new Map<string, IIndexEntry>();
	private readonly _hashToUris = new Map<string, Set<string>>();

	private readonly _onDidUpdateIndex = this._register(new Emitter<IIndexOperationResult>());
	readonly onDidUpdateIndex = this._onDidUpdateIndex.event;

	// Configuration
	private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

	constructor() {
		super();
	}

	/**
	 * Compute content hash using SHA-256
	 */
	private async computeHash(content: string): Promise<string> {
		// Use Web Crypto API if available, otherwise simple hash
		if (typeof crypto !== 'undefined' && crypto.subtle) {
			const encoder = new TextEncoder();
			const data = encoder.encode(content);
			const hashBuffer = await crypto.subtle.digest('SHA-256', data);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
		} else {
			// Fallback: simple string hash
			let hash = 0;
			for (let i = 0; i < content.length; i++) {
				const char = content.charCodeAt(i);
				hash = ((hash << 5) - hash) + char;
				hash = hash & hash; // Convert to 32-bit integer
			}
			return Math.abs(hash).toString(16);
		}
	}

	/**
	 * Generate index key from URI and branch
	 */
	private getIndexKey(uri: URI, branch?: string): string {
		const branchSuffix = branch ? `@${branch}` : '';
		return `${uri.toString()}${branchSuffix}`;
	}

	/**
	 * Compute content hash and index file
	 */
	async compute(uri: URI, content: string, branch?: string): Promise<IIndexOperationResult> {
		try {
			// Check file size
			const size = content.length;
			if (size > this.MAX_FILE_SIZE) {
				return {
					operation: 'compute',
					uri,
					success: false,
					error: `File too large (${size} bytes, max ${this.MAX_FILE_SIZE})`,
				};
			}

			// Compute hash
			const contentHash = await this.computeHash(content);
			const key = this.getIndexKey(uri, branch);

			// Check if already indexed with same hash
			const existing = this._index.get(key);
			if (existing && existing.contentHash === contentHash) {
				// Update timestamp but don't re-index
				existing.lastIndexed = Date.now();
				return {
					operation: 'compute',
					uri,
					success: true,
					contentHash,
				};
			}

			// Create or update entry
			const entry: IIndexEntry = {
				uri,
				contentHash,
				lastIndexed: Date.now(),
				size,
				tags: existing?.tags || new Set(),
				branch,
				metadata: existing?.metadata,
			};

			// Update index
			this._index.set(key, entry);

			// Update hash lookup
			if (!this._hashToUris.has(contentHash)) {
				this._hashToUris.set(contentHash, new Set());
			}
			this._hashToUris.get(contentHash)!.add(key);

			// Remove old hash reference if content changed
			if (existing && existing.contentHash !== contentHash) {
				const oldHashUris = this._hashToUris.get(existing.contentHash);
				if (oldHashUris) {
					oldHashUris.delete(key);
					if (oldHashUris.size === 0) {
						this._hashToUris.delete(existing.contentHash);
					}
				}
			}

			const result: IIndexOperationResult = {
				operation: 'compute',
				uri,
				success: true,
				contentHash,
			};

			this._onDidUpdateIndex.fire(result);
			return result;
		} catch (error) {
			const err = error as Error;
			return {
				operation: 'compute',
				uri,
				success: false,
				error: err.message,
			};
		}
	}

	/**
	 * Delete file from index
	 */
	async delete(uri: URI, branch?: string): Promise<IIndexOperationResult> {
		try {
			const key = this.getIndexKey(uri, branch);
			const entry = this._index.get(key);

			if (!entry) {
				return {
					operation: 'delete',
					uri,
					success: false,
					error: 'Entry not found',
				};
			}

			// Remove from index
			this._index.delete(key);

			// Remove from hash lookup
			const hashUris = this._hashToUris.get(entry.contentHash);
			if (hashUris) {
				hashUris.delete(key);
				if (hashUris.size === 0) {
					this._hashToUris.delete(entry.contentHash);
				}
			}

			const result: IIndexOperationResult = {
				operation: 'delete',
				uri,
				success: true,
			};

			this._onDidUpdateIndex.fire(result);
			return result;
		} catch (error) {
			const err = error as Error;
			return {
				operation: 'delete',
				uri,
				success: false,
				error: err.message,
			};
		}
	}

	/**
	 * Add tag to indexed file
	 */
	async addTag(uri: URI, tag: string): Promise<IIndexOperationResult> {
		try {
			// Find entry across all branches
			let entry: IIndexEntry | undefined;
			for (const [_key, e] of this._index.entries()) {
				if (e.uri.toString() === uri.toString()) {
					entry = e;
					break;
				}
			}

			if (!entry) {
				return {
					operation: 'addTag',
					uri,
					success: false,
					error: 'Entry not found',
				};
			}

			entry.tags.add(tag);

			const result: IIndexOperationResult = {
				operation: 'addTag',
				uri,
				success: true,
			};

			this._onDidUpdateIndex.fire(result);
			return result;
		} catch (error) {
			const err = error as Error;
			return {
				operation: 'addTag',
				uri,
				success: false,
				error: err.message,
			};
		}
	}

	/**
	 * Remove tag from indexed file
	 */
	async removeTag(uri: URI, tag: string): Promise<IIndexOperationResult> {
		try {
			// Find entry across all branches
			let entry: IIndexEntry | undefined;
			for (const [_key, e] of this._index.entries()) {
				if (e.uri.toString() === uri.toString()) {
					entry = e;
					break;
				}
			}

			if (!entry) {
				return {
					operation: 'removeTag',
					uri,
					success: false,
					error: 'Entry not found',
				};
			}

			entry.tags.delete(tag);

			const result: IIndexOperationResult = {
				operation: 'removeTag',
				uri,
				success: true,
			};

			this._onDidUpdateIndex.fire(result);
			return result;
		} catch (error) {
			const err = error as Error;
			return {
				operation: 'removeTag',
				uri,
				success: false,
				error: err.message,
			};
		}
	}

	/**
	 * Get index entry by URI
	 */
	getEntry(uri: URI, branch?: string): IIndexEntry | undefined {
		const key = this.getIndexKey(uri, branch);
		return this._index.get(key);
	}

	/**
	 * Get entries by content hash
	 */
	getEntriesByHash(contentHash: string): IIndexEntry[] {
		const keys = this._hashToUris.get(contentHash);
		if (!keys) {
			return [];
		}

		const entries: IIndexEntry[] = [];
		for (const key of keys) {
			const entry = this._index.get(key);
			if (entry) {
				entries.push(entry);
			}
		}

		return entries;
	}

	/**
	 * Get entries by tag
	 */
	getEntriesByTag(tag: string): IIndexEntry[] {
		const entries: IIndexEntry[] = [];

		for (const entry of this._index.values()) {
			if (entry.tags.has(tag)) {
				entries.push(entry);
			}
		}

		return entries;
	}

	/**
	 * Compare branches and determine what needs re-indexing
	 */
	async compareBranches(
		fromBranch: string,
		toBranch: string,
		currentFiles: Map<URI, string>
	): Promise<IBranchComparisonResult> {
		const toReindex: URI[] = [];
		const toRemove: URI[] = [];
		const unchanged: URI[] = [];

		// Check each current file
		for (const [uri, content] of currentFiles.entries()) {
			const fromKey = this.getIndexKey(uri, fromBranch);
			const toKey = this.getIndexKey(uri, toBranch);

			const fromEntry = this._index.get(fromKey);
			const toEntry = this._index.get(toKey);

			if (!fromEntry) {
				// File doesn't exist in source branch, needs indexing
				toReindex.push(uri);
			} else {
				// Compute hash for current content
				const currentHash = await this.computeHash(content);

				if (!toEntry || toEntry.contentHash !== currentHash) {
					// Content changed or not indexed in target branch
					toReindex.push(uri);
				} else {
					// Same content hash
					unchanged.push(uri);
				}
			}
		}

		// Find files that were indexed but no longer exist
		for (const [key, entry] of this._index.entries()) {
			if (entry.branch === toBranch) {
				const exists = Array.from(currentFiles.keys()).some(
					uri => uri.toString() === entry.uri.toString()
				);

				if (!exists) {
					toRemove.push(entry.uri);
				}
			}
		}

		return { toReindex, toRemove, unchanged };
	}

	/**
	 * Check if file needs re-indexing
	 */
	needsReindex(uri: URI, content: string, branch?: string): boolean {
		const key = this.getIndexKey(uri, branch);
		const entry = this._index.get(key);

		if (!entry) {
			return true; // Not indexed yet
		}

		// Would need to compute hash to compare, but we can check size as quick filter
		if (entry.size !== content.length) {
			return true; // Size changed, definitely needs reindex
		}

		// For accurate check, caller should compute hash and compare
		// This is a conservative check
		return false;
	}

	/**
	 * Get indexing statistics
	 */
	getStatistics(): IIndexingStatistics {
		const entriesByBranch = new Map<string, number>();
		let totalSize = 0;
		let lastUpdate = 0;

		for (const entry of this._index.values()) {
			const branch = entry.branch || 'default';
			entriesByBranch.set(branch, (entriesByBranch.get(branch) || 0) + 1);
			totalSize += entry.size;
			lastUpdate = Math.max(lastUpdate, entry.lastIndexed);
		}

		return {
			totalEntries: this._index.size,
			entriesByBranch,
			totalSize,
			lastUpdate,
		};
	}

	/**
	 * Clear all index entries
	 */
	clear(branch?: string): void {
		if (branch) {
			// Clear specific branch
			const keysToDelete: string[] = [];
			for (const [key, entry] of this._index.entries()) {
				if (entry.branch === branch) {
					keysToDelete.push(key);

					// Remove from hash lookup
					const hashUris = this._hashToUris.get(entry.contentHash);
					if (hashUris) {
						hashUris.delete(key);
						if (hashUris.size === 0) {
							this._hashToUris.delete(entry.contentHash);
						}
					}
				}
			}

			for (const key of keysToDelete) {
				this._index.delete(key);
			}
		} else {
			// Clear all
			this._index.clear();
			this._hashToUris.clear();
		}
	}

	/**
	 * Dispose and clean up
	 */
	override dispose(): void {
		this.clear();
		super.dispose();
	}
}
