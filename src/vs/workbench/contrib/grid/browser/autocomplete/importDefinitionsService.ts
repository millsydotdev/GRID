/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { PrecalculatedLRUCache } from '../lruCache.js';

export const IImportDefinitionsService = createDecorator<IImportDefinitionsService>('importDefinitionsService');

/**
 * Import information
 */
export interface IImportInfo {
	/**
	 * Import name/identifier
	 */
	name: string;

	/**
	 * Source module/file
	 */
	source: string;

	/**
	 * Is default import
	 */
	isDefault: boolean;

	/**
	 * Import range in file
	 */
	range: Range;
}

/**
 * Definition location
 */
export interface IDefinitionLocation {
	/**
	 * File URI
	 */
	uri: URI;

	/**
	 * Range in file
	 */
	range: Range;

	/**
	 * Definition content
	 */
	content?: string;
}

/**
 * File import information
 */
export interface IFileImportInfo {
	/**
	 * Map of import name to definition locations
	 */
	imports: Map<string, IDefinitionLocation[]>;

	/**
	 * All import statements
	 */
	importStatements: IImportInfo[];
}

/**
 * Import Definitions Service
 *
 * Tracks and caches import statements and their definitions:
 * - Parses import statements from files
 * - Resolves import definitions
 * - LRU cache for performance
 * - Provides context for autocomplete
 */
export interface IImportDefinitionsService {
	readonly _serviceBrand: undefined;

	/**
	 * Get file import information
	 *
	 * @param uri File URI
	 * @returns Import information or undefined
	 */
	get(uri: URI): IFileImportInfo | undefined;

	/**
	 * Initialize cache for a file
	 *
	 * @param uri File URI
	 */
	initKey(uri: URI): Promise<void>;

	/**
	 * Clear cache
	 */
	clear(): void;
}

export class ImportDefinitionsService extends Disposable implements IImportDefinitionsService {
	readonly _serviceBrand: undefined;

	private static readonly CACHE_SIZE = 10;

	private readonly cache: PrecalculatedLRUCache<IFileImportInfo>;

	constructor() {
		super();

		this.cache = this._register(new PrecalculatedLRUCache<IFileImportInfo>(
			this._getFileInfo.bind(this),
			ImportDefinitionsService.CACHE_SIZE
		));
	}

	/**
	 * Get file import information
	 */
	get(uri: URI): IFileImportInfo | undefined {
		return this.cache.get(uri.toString());
	}

	/**
	 * Initialize cache for a file
	 */
	async initKey(uri: URI): Promise<void> {
		try {
			await this.cache.initKey(uri.toString());
		} catch (error) {
			console.warn(`Failed to initialize ImportDefinitionService for ${uri.toString()}:`, error);
		}
	}

	/**
	 * Get file information (imports and definitions)
	 */
	private async _getFileInfo(uriString: string): Promise<IFileImportInfo | null> {
		const uri = URI.parse(uriString);

		// Skip Jupyter notebooks
		if (uri.path.endsWith('.ipynb')) {
			return null;
		}

		// Skip non-code files
		const extension = this.getFileExtension(uri);
		if (!this.isCodeFile(extension)) {
			return {
				imports: new Map(),
				importStatements: [],
			};
		}

		try {
			// Read file content (would need IFileService here in real implementation)
			// For now, we'll return basic structure
			const imports = await this.parseImports(uri);

			return {
				imports: new Map(), // Would resolve definitions here
				importStatements: imports,
			};
		} catch (error) {
			console.warn(`Failed to get file info for ${uriString}:`, error);
			return null;
		}
	}

	/**
	 * Parse import statements from file
	 */
	private async parseImports(uri: URI): Promise<IImportInfo[]> {
		const imports: IImportInfo[] = [];
		const extension = this.getFileExtension(uri);

		// Note: In a real implementation, we would:
		// 1. Read file content using IFileService
		// 2. Parse with tree-sitter or regex patterns
		// 3. Extract all import statements

		// For now, return empty array as placeholder
		// Real implementation would use tree-sitter queries or regex patterns
		// based on file type (TypeScript, JavaScript, Python, etc.)

		return imports;
	}

	/**
	 * Parse TypeScript/JavaScript imports
	 */
	private parseJavaScriptImports(content: string, uri: URI): IImportInfo[] {
		const imports: IImportInfo[] = [];

		// Match ES6 imports
		const es6ImportRegex = /import\s+(?:{([^}]+)}|(\*\s+as\s+\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
		const lines = content.split('\n');

		for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
			const line = lines[lineIndex];
			let match;

			while ((match = es6ImportRegex.exec(line)) !== null) {
				const [fullMatch, namedImports, namespaceImport, defaultImport, source] = match;
				const startCol = match.index;
				const endCol = match.index + fullMatch.length;

				if (defaultImport) {
					imports.push({
						name: defaultImport.trim(),
						source,
						isDefault: true,
						range: new Range(lineIndex + 1, startCol + 1, lineIndex + 1, endCol + 1),
					});
				}

				if (namedImports) {
					const names = namedImports.split(',').map(n => n.trim());
					for (const name of names) {
						imports.push({
							name: name.replace(/\s+as\s+.+/, '').trim(),
							source,
							isDefault: false,
							range: new Range(lineIndex + 1, startCol + 1, lineIndex + 1, endCol + 1),
						});
					}
				}

				if (namespaceImport) {
					const name = namespaceImport.replace('*', '').replace(/\s+as\s+/, '').trim();
					imports.push({
						name,
						source,
						isDefault: false,
						range: new Range(lineIndex + 1, startCol + 1, lineIndex + 1, endCol + 1),
					});
				}
			}
		}

		// Match CommonJS requires
		const requireRegex = /(?:const|let|var)\s+(?:{([^}]+)}|(\w+))\s*=\s*require\(['"]([^'"]+)['"]\)/g;

		for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
			const line = lines[lineIndex];
			let match;

			while ((match = requireRegex.exec(line)) !== null) {
				const [fullMatch, namedImports, singleImport, source] = match;
				const startCol = match.index;
				const endCol = match.index + fullMatch.length;

				if (singleImport) {
					imports.push({
						name: singleImport.trim(),
						source,
						isDefault: true,
						range: new Range(lineIndex + 1, startCol + 1, lineIndex + 1, endCol + 1),
					});
				}

				if (namedImports) {
					const names = namedImports.split(',').map(n => n.trim());
					for (const name of names) {
						imports.push({
							name: name.replace(/\s+as\s+.+/, '').trim(),
							source,
							isDefault: false,
							range: new Range(lineIndex + 1, startCol + 1, lineIndex + 1, endCol + 1),
						});
					}
				}
			}
		}

		return imports;
	}

	/**
	 * Parse Python imports
	 */
	private parsePythonImports(content: string, uri: URI): IImportInfo[] {
		const imports: IImportInfo[] = [];
		const lines = content.split('\n');

		// Match: import module
		// Match: from module import name
		const importRegex = /^(?:from\s+([^\s]+)\s+)?import\s+(.+)$/;

		for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
			const line = lines[lineIndex].trim();
			const match = importRegex.exec(line);

			if (match) {
				const [fullMatch, fromModule, importPart] = match;
				const source = fromModule || importPart.split(',')[0].split(' as ')[0].trim();
				const names = importPart.split(',').map(n => n.trim());

				for (const nameWithAlias of names) {
					const name = nameWithAlias.split(' as ')[0].trim();
					imports.push({
						name,
						source,
						isDefault: false,
						range: new Range(lineIndex + 1, 1, lineIndex + 1, line.length + 1),
					});
				}
			}
		}

		return imports;
	}

	/**
	 * Check if file extension is a code file
	 */
	private isCodeFile(extension: string): boolean {
		const codeExtensions = new Set([
			'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'c', 'cs',
			'go', 'rs', 'php', 'rb', 'swift', 'kt', 'scala', 'sh'
		]);

		return codeExtensions.has(extension);
	}

	/**
	 * Get file extension from URI
	 */
	private getFileExtension(uri: URI): string {
		const path = uri.path;
		const lastDot = path.lastIndexOf('.');
		if (lastDot === -1) {
			return '';
		}
		return path.substring(lastDot + 1).toLowerCase();
	}

	/**
	 * Clear cache
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Dispose and clear cache
	 */
	override dispose(): void {
		this.cache.dispose();
		super.dispose();
	}
}
