/*---------------------------------------------------------------------------------------------
 *  Copyright (c) GRID Editor. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../../base/common/uri.js';
import { IProtocol } from './messenger.js';

/**
 * File index entry
 */
export interface IFileIndexEntry {
	uri: URI;
	contentHash: string;
	lastModified: number;
	size: number;
	language?: string;
	symbols?: ISymbolInfo[];
}

/**
 * Symbol information
 */
export interface ISymbolInfo {
	name: string;
	kind: string;
	range: {
		startLine: number;
		startColumn: number;
		endLine: number;
		endColumn: number;
	};
}

/**
 * Index query
 */
export interface IIndexQuery {
	pattern?: string;
	language?: string;
	tags?: string[];
	limit?: number;
}

/**
 * Index statistics
 */
export interface IIndexStatistics {
	totalFiles: number;
	totalSymbols: number;
	indexSize: number;
	lastUpdated: number;
}

/**
 * Protocol for File System → Indexing Service communication
 */
export type ToIndexingServiceProtocol = {
	/**
	 * Index a file
	 */
	'index/file': [{ uri: URI; content: string }, IFileIndexEntry];

	/**
	 * Remove file from index
	 */
	'index/remove': [{ uri: URI }, void];

	/**
	 * Query the index
	 */
	'index/query': [IIndexQuery, IFileIndexEntry[]];

	/**
	 * Add tag to file
	 */
	'index/addTag': [{ uri: URI; tag: string }, void];

	/**
	 * Remove tag from file
	 */
	'index/removeTag': [{ uri: URI; tag: string }, void];

	/**
	 * Get file by content hash
	 */
	'index/getByHash': [{ hash: string }, IFileIndexEntry | undefined];

	/**
	 * Get index statistics
	 */
	'index/stats': [undefined, IIndexStatistics];

	/**
	 * Clear index
	 */
	'index/clear': [undefined, void];

	/**
	 * Rebuild index
	 */
	'index/rebuild': [{ workspaceUri: URI }, void];
};

/**
 * Protocol for Indexing Service → File System communication
 */
export type FromIndexingServiceProtocol = {
	/**
	 * Notify about index update
	 */
	'index/updated': [{ uri: URI; operation: 'add' | 'remove' | 'update' }, void];

	/**
	 * Notify about indexing progress
	 */
	'index/progress': [{ processed: number; total: number; currentFile?: URI }, void];

	/**
	 * Notify about indexing complete
	 */
	'index/complete': [{ filesIndexed: number; duration: number }, void];
};
