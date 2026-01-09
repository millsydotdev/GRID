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

export const IStaticContextService = createDecorator<IStaticContextService>('staticContextService');

/**
 * Type declaration found in code
 */
export interface ITypeDeclaration {
	/**
	 * Type name
	 */
	name: string;

	/**
	 * Type definition
	 */
	definition: string;

	/**
	 * Source file URI
	 */
	uri: URI;

	/**
	 * Range in source file
	 */
	range: Range;
}

/**
 * Function declaration found in code
 */
export interface IFunctionDeclaration {
	/**
	 * Function name
	 */
	name: string;

	/**
	 * Function signature
	 */
	signature: string;

	/**
	 * Return type (if available)
	 */
	returnType?: string;

	/**
	 * Parameters
	 */
	parameters: Array<{
		name: string;
		type?: string;
	}>;

	/**
	 * Source file URI
	 */
	uri: URI;

	/**
	 * Range in source file
	 */
	range: Range;
}

/**
 * Static context for a position in code
 */
export interface IStaticContext {
	/**
	 * Current position URI
	 */
	uri: URI;

	/**
	 * Current position
	 */
	position: Position;

	/**
	 * Hole type (expected type at cursor)
	 */
	holeType?: string;

	/**
	 * Relevant type declarations
	 */
	relevantTypes: Map<string, ITypeDeclaration[]>;

	/**
	 * Relevant function declarations
	 */
	relevantFunctions: Map<string, IFunctionDeclaration[]>;

	/**
	 * Import statements in current file
	 */
	imports: string[];

	/**
	 * Enclosing function/class context
	 */
	enclosingContext?: {
		type: 'function' | 'class' | 'method';
		name: string;
		range: Range;
	};
}

/**
 * Static Context Service
 *
 * Provides static code context for autocomplete:
 * - Extracts type declarations
 * - Finds function signatures
 * - Analyzes enclosing context
 * - Tracks imports and dependencies
 */
export interface IStaticContextService {
	readonly _serviceBrand: undefined;

	/**
	 * Get static context for a position
	 *
	 * @param uri File URI
	 * @param position Position in file
	 * @param content File content
	 * @returns Static context
	 */
	getContext(uri: URI, position: Position, content: string): Promise<IStaticContext>;

	/**
	 * Extract type declarations from content
	 *
	 * @param content File content
	 * @param uri File URI
	 * @returns Array of type declarations
	 */
	extractTypeDeclarations(content: string, uri: URI): ITypeDeclaration[];

	/**
	 * Extract function declarations from content
	 *
	 * @param content File content
	 * @param uri File URI
	 * @returns Array of function declarations
	 */
	extractFunctionDeclarations(content: string, uri: URI): IFunctionDeclaration[];

	/**
	 * Clear cache
	 */
	clear(): void;
}

export class StaticContextService extends Disposable implements IStaticContextService {
	readonly _serviceBrand: undefined;

	private readonly cache: LRUCache<IStaticContext>;

	constructor() {
		super();

		this.cache = this._register(new LRUCache<IStaticContext>({
			maxSize: 50,
			ttl: 60000, // 1 minute TTL
		}));
	}

	/**
	 * Get static context for a position
	 */
	async getContext(uri: URI, position: Position, content: string): Promise<IStaticContext> {
		const cacheKey = this.getCacheKey(uri, position);

		// Check cache
		const cached = this.cache.get(cacheKey);
		if (cached) {
			return cached;
		}

		// Extract context
		const imports = this.extractImports(content);
		const typeDeclarations = this.extractTypeDeclarations(content, uri);
		const functionDeclarations = this.extractFunctionDeclarations(content, uri);
		const enclosingContext = this.findEnclosingContext(content, position);
		const holeType = this.inferHoleType(content, position);

		// Group declarations by file
		const relevantTypes = new Map<string, ITypeDeclaration[]>();
		relevantTypes.set(uri.toString(), typeDeclarations);

		const relevantFunctions = new Map<string, IFunctionDeclaration[]>();
		relevantFunctions.set(uri.toString(), functionDeclarations);

		const context: IStaticContext = {
			uri,
			position,
			holeType,
			relevantTypes,
			relevantFunctions,
			imports,
			enclosingContext,
		};

		// Cache the result
		this.cache.set(cacheKey, context);

		return context;
	}

	/**
	 * Extract imports from content
	 */
	private extractImports(content: string): string[] {
		const imports: string[] = [];
		const lines = content.split('\n');

		// Match ES6 imports and CommonJS requires
		const importRegex = /^import\s+.+\s+from\s+['"]([^'"]+)['"]/;
		const requireRegex = /require\(['"]([^'"]+)['"]\)/;

		for (const line of lines) {
			const importMatch = line.match(importRegex);
			if (importMatch) {
				imports.push(importMatch[1]);
				continue;
			}

			const requireMatch = line.match(requireRegex);
			if (requireMatch) {
				imports.push(requireMatch[1]);
			}
		}

		return imports;
	}

	/**
	 * Extract type declarations from content
	 */
	extractTypeDeclarations(content: string, uri: URI): ITypeDeclaration[] {
		const declarations: ITypeDeclaration[] = [];
		const lines = content.split('\n');

		// Match type/interface declarations
		const typeRegex = /^(?:export\s+)?(?:type|interface)\s+(\w+)/;
		const classRegex = /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			// Type/interface
			const typeMatch = line.match(typeRegex);
			if (typeMatch) {
				const endLine = this.findDeclarationEnd(lines, i);
				const definition = lines.slice(i, endLine + 1).join('\n');

				declarations.push({
					name: typeMatch[1],
					definition,
					uri,
					range: new Range(i + 1, 1, endLine + 1, lines[endLine].length + 1),
				});
			}

			// Class
			const classMatch = line.match(classRegex);
			if (classMatch) {
				const endLine = this.findBlockEnd(lines, i);
				const definition = lines.slice(i, Math.min(i + 10, endLine + 1)).join('\n'); // First 10 lines

				declarations.push({
					name: classMatch[1],
					definition,
					uri,
					range: new Range(i + 1, 1, endLine + 1, lines[endLine].length + 1),
				});
			}
		}

		return declarations;
	}

	/**
	 * Extract function declarations from content
	 */
	extractFunctionDeclarations(content: string, uri: URI): IFunctionDeclaration[] {
		const declarations: IFunctionDeclaration[] = [];
		const lines = content.split('\n');

		// Match function declarations
		const funcRegex = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?/;
		const arrowRegex = /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)(?:\s*:\s*(\w+))?\s*=>/;
		const methodRegex = /^\s*(?:public|private|protected|static)?\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?/;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Regular function
			const funcMatch = line.match(funcRegex);
			if (funcMatch) {
				const [, name, params, returnType] = funcMatch;
				const endLine = this.findBlockEnd(lines, i);

				declarations.push({
					name,
					signature: line.trim(),
					returnType,
					parameters: this.parseParameters(params),
					uri,
					range: new Range(i + 1, 1, endLine + 1, lines[endLine].length + 1),
				});
				continue;
			}

			// Arrow function
			const arrowMatch = line.match(arrowRegex);
			if (arrowMatch) {
				const [, name, params, returnType] = arrowMatch;

				declarations.push({
					name,
					signature: line.trim(),
					returnType,
					parameters: this.parseParameters(params),
					uri,
					range: new Range(i + 1, 1, i + 1, line.length + 1),
				});
				continue;
			}

			// Method
			const methodMatch = line.match(methodRegex);
			if (methodMatch) {
				const [, name, params, returnType] = methodMatch;
				const endLine = this.findBlockEnd(lines, i);

				declarations.push({
					name,
					signature: line.trim(),
					returnType,
					parameters: this.parseParameters(params),
					uri,
					range: new Range(i + 1, 1, endLine + 1, lines[endLine].length + 1),
				});
			}
		}

		return declarations;
	}

	/**
	 * Parse function parameters
	 */
	private parseParameters(paramsStr: string): Array<{ name: string; type?: string }> {
		if (!paramsStr.trim()) {
			return [];
		}

		return paramsStr.split(',').map(param => {
			const trimmed = param.trim();
			const colonIndex = trimmed.indexOf(':');

			if (colonIndex > 0) {
				return {
					name: trimmed.substring(0, colonIndex).trim(),
					type: trimmed.substring(colonIndex + 1).trim(),
				};
			}

			return { name: trimmed };
		});
	}

	/**
	 * Find end of type/interface declaration
	 */
	private findDeclarationEnd(lines: string[], startLine: number): number {
		let braceCount = 0;
		let foundOpenBrace = false;

		for (let i = startLine; i < lines.length; i++) {
			const line = lines[i];

			// Count braces
			for (const char of line) {
				if (char === '{') {
					braceCount++;
					foundOpenBrace = true;
				} else if (char === '}') {
					braceCount--;
					if (foundOpenBrace && braceCount === 0) {
						return i;
					}
				}
			}

			// For type aliases without braces
			if (!foundOpenBrace && line.includes(';')) {
				return i;
			}
		}

		return lines.length - 1;
	}

	/**
	 * Find end of a code block
	 */
	private findBlockEnd(lines: string[], startLine: number): number {
		let braceCount = 0;
		let foundOpenBrace = false;

		for (let i = startLine; i < lines.length; i++) {
			for (const char of lines[i]) {
				if (char === '{') {
					braceCount++;
					foundOpenBrace = true;
				} else if (char === '}') {
					braceCount--;
					if (foundOpenBrace && braceCount === 0) {
						return i;
					}
				}
			}
		}

		return lines.length - 1;
	}

	/**
	 * Find enclosing context (function/class/method)
	 */
	private findEnclosingContext(content: string, position: Position): IStaticContext['enclosingContext'] {
		const lines = content.split('\n');
		const targetLine = position.lineNumber - 1;

		// Search backwards for enclosing declaration
		for (let i = targetLine; i >= 0; i--) {
			const line = lines[i];

			// Check for function
			if (line.match(/function\s+(\w+)/)) {
				const match = line.match(/function\s+(\w+)/);
				if (match) {
					const endLine = this.findBlockEnd(lines, i);
					if (endLine >= targetLine) {
						return {
							type: 'function',
							name: match[1],
							range: new Range(i + 1, 1, endLine + 1, lines[endLine].length + 1),
						};
					}
				}
			}

			// Check for class
			if (line.match(/class\s+(\w+)/)) {
				const match = line.match(/class\s+(\w+)/);
				if (match) {
					const endLine = this.findBlockEnd(lines, i);
					if (endLine >= targetLine) {
						return {
							type: 'class',
							name: match[1],
							range: new Range(i + 1, 1, endLine + 1, lines[endLine].length + 1),
						};
					}
				}
			}
		}

		return undefined;
	}

	/**
	 * Infer expected type at cursor (hole type)
	 */
	private inferHoleType(content: string, position: Position): string | undefined {
		const lines = content.split('\n');
		const line = lines[position.lineNumber - 1];

		if (!line) {
			return undefined;
		}

		// Look for type annotations
		const typeMatch = line.match(/:\s*(\w+)/);
		if (typeMatch) {
			return typeMatch[1];
		}

		// Look for variable assignments
		const assignMatch = line.match(/=\s*$/);
		if (assignMatch) {
			return 'any';
		}

		return undefined;
	}

	/**
	 * Get cache key
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
