/*---------------------------------------------------------------------------------------------
 *  Copyright (c) GRID Editor. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';

export const ICodeChunkingService = createDecorator<ICodeChunkingService>('codeChunkingService');

/**
 * A chunk of code with metadata
 */
export interface ICodeChunk {
	/**
	 * Chunk content
	 */
	content: string;

	/**
	 * Start line number (0-based)
	 */
	startLine: number;

	/**
	 * End line number (0-based)
	 */
	endLine: number;

	/**
	 * Estimated token count
	 */
	tokenCount: number;

	/**
	 * Chunk type
	 */
	type: 'class' | 'function' | 'method' | 'block' | 'text';

	/**
	 * Optional chunk identifier (e.g., function name)
	 */
	identifier?: string;
}

/**
 * Chunking options
 */
export interface IChunkingOptions {
	/**
	 * Maximum tokens per chunk
	 */
	maxChunkSize: number;

	/**
	 * Whether to use smart chunking (AST-aware)
	 */
	smartChunking?: boolean;

	/**
	 * Overlap between chunks (in lines)
	 */
	overlapLines?: number;

	/**
	 * Language hint for better chunking
	 */
	language?: string;
}

/**
 * Code Chunking Service
 *
 * Intelligently chunks code into semantically meaningful pieces:
 * - Basic line-based chunking for simple cases
 * - Smart chunking that respects code structure
 * - Language-aware chunking strategies
 */
export interface ICodeChunkingService {
	readonly _serviceBrand: undefined;

	/**
	 * Chunk a document into pieces
	 *
	 * @param uri File URI
	 * @param content File content
	 * @param options Chunking options
	 * @returns Array of chunks
	 */
	chunkDocument(
		uri: URI,
		content: string,
		options: IChunkingOptions
	): Promise<ICodeChunk[]>;

	/**
	 * Estimate token count for text
	 *
	 * @param text Text to count
	 * @returns Estimated token count
	 */
	estimateTokenCount(text: string): number;

	/**
	 * Check if file should be chunked
	 *
	 * @param uri File URI
	 * @param content File content
	 * @returns True if should chunk
	 */
	shouldChunk(uri: URI, content: string): boolean;
}

export class CodeChunkingService extends Disposable implements ICodeChunkingService {
	readonly _serviceBrand: undefined;

	// Configuration
	private readonly CHARS_PER_TOKEN = 4;
	private readonly MAX_FILE_SIZE = 1_000_000; // 1MB

	// Language patterns for smart chunking
	private readonly CODE_LANGUAGES = new Set([
		'typescript', 'javascript', 'python', 'java', 'cpp', 'c',
		'csharp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin'
	]);

	private readonly NON_CODE_EXTENSIONS = new Set([
		'css', 'html', 'htm', 'json', 'toml', 'yaml', 'yml', 'xml', 'md', 'txt'
	]);

	constructor() {
		super();
	}

	/**
	 * Chunk a document into pieces
	 */
	async chunkDocument(
		uri: URI,
		content: string,
		options: IChunkingOptions
	): Promise<ICodeChunk[]> {
		if (!this.shouldChunk(uri, content)) {
			return [];
		}

		const extension = this.getFileExtension(uri);
		const useSmartChunking = options.smartChunking !== false &&
			!this.NON_CODE_EXTENSIONS.has(extension);

		if (useSmartChunking) {
			try {
				return await this.smartChunk(content, options);
			} catch (error) {
				// Fallback to basic chunking
				console.warn('Smart chunking failed, falling back to basic chunking:', error);
			}
		}

		return await this.basicChunk(content, options);
	}

	/**
	 * Basic line-by-line chunking
	 */
	private async basicChunk(
		content: string,
		options: IChunkingOptions
	): Promise<ICodeChunk[]> {
		const chunks: ICodeChunk[] = [];
		const lines = content.split('\n');

		let chunkContent = '';
		let chunkTokens = 0;
		let startLine = 0;
		let currentLine = 0;

		for (const line of lines) {
			const lineTokens = this.estimateTokenCount(line) + 1; // +1 for newline

			// Check if adding this line would exceed max chunk size
			if (chunkTokens + lineTokens > options.maxChunkSize - 5) {
				if (chunkContent) {
					chunks.push({
						content: chunkContent,
						startLine,
						endLine: currentLine - 1,
						tokenCount: chunkTokens,
						type: 'text',
					});
				}

				chunkContent = '';
				chunkTokens = 0;
				startLine = currentLine;
			}

			// Don't add lines that are too long by themselves
			if (lineTokens < options.maxChunkSize) {
				chunkContent += line + '\n';
				chunkTokens += lineTokens;
			}

			currentLine++;
		}

		// Add final chunk
		if (chunkContent) {
			chunks.push({
				content: chunkContent,
				startLine,
				endLine: currentLine - 1,
				tokenCount: chunkTokens,
				type: 'text',
			});
		}

		return chunks;
	}

	/**
	 * Smart chunking that respects code structure
	 */
	private async smartChunk(
		content: string,
		options: IChunkingOptions
	): Promise<ICodeChunk[]> {
		const chunks: ICodeChunk[] = [];
		const lines = content.split('\n');

		// Find code blocks (classes, functions, etc.)
		const codeBlocks = this.findCodeBlocks(lines);

		for (const block of codeBlocks) {
			const blockContent = lines.slice(block.startLine, block.endLine + 1).join('\n');
			const tokenCount = this.estimateTokenCount(blockContent);

			if (tokenCount <= options.maxChunkSize) {
				// Block fits in one chunk
				chunks.push({
					content: blockContent,
					startLine: block.startLine,
					endLine: block.endLine,
					tokenCount,
					type: block.type,
					identifier: block.identifier,
				});
			} else {
				// Block is too large, try to split it
				const subChunks = await this.splitLargeBlock(block, lines, options);
				chunks.push(...subChunks);
			}
		}

		// Fill gaps with basic chunks
		const filledChunks = this.fillGaps(chunks, lines, options);

		return filledChunks;
	}

	/**
	 * Find code blocks in the document
	 */
	private findCodeBlocks(lines: string[]): {
		startLine: number;
		endLine: number;
		type: 'class' | 'function' | 'method' | 'block';
		identifier?: string;
	}[] {
		const blocks: {
			startLine: number;
			endLine: number;
			type: 'class' | 'function' | 'method' | 'block';
			identifier?: string;
		}[] = [];

		// Patterns for different code structures
		const classPattern = /^(export\s+)?(abstract\s+)?(class|interface|enum)\s+(\w+)/;
		const functionPattern = /^(export\s+)?(async\s+)?(function|const|let|var)\s+(\w+)\s*[=\(]/;
		const methodPattern = /^\s+(public|private|protected|static|async)?\s*(async\s+)?(\w+)\s*\(/;

		let currentBlock: {
			startLine: number;
			endLine: number;
			type: 'class' | 'function' | 'method' | 'block';
			identifier?: string;
			braceCount: number;
		} | null = null;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			// Check for class/interface/enum
			const classMatch = trimmed.match(classPattern);
			if (classMatch) {
				if (currentBlock) {
					blocks.push({
						startLine: currentBlock.startLine,
						endLine: currentBlock.endLine,
						type: currentBlock.type,
						identifier: currentBlock.identifier,
					});
				}

				currentBlock = {
					startLine: i,
					endLine: i,
					type: 'class',
					identifier: classMatch[4],
					braceCount: 0,
				};
				continue;
			}

			// Check for function
			const functionMatch = trimmed.match(functionPattern);
			if (functionMatch && !currentBlock) {
				currentBlock = {
					startLine: i,
					endLine: i,
					type: 'function',
					identifier: functionMatch[4],
					braceCount: 0,
				};
			}

			// Check for method (inside class)
			const methodMatch = trimmed.match(methodPattern);
			if (methodMatch && currentBlock?.type === 'class') {
				// This is a method, but we're already tracking the class
				// Methods will be part of the class block
			}

			// Track braces to find block end
			if (currentBlock) {
				for (const char of line) {
					if (char === '{') {
						currentBlock.braceCount++;
					} else if (char === '}') {
						currentBlock.braceCount--;
						if (currentBlock.braceCount === 0) {
							// Block ends here
							currentBlock.endLine = i;
							blocks.push({
								startLine: currentBlock.startLine,
								endLine: currentBlock.endLine,
								type: currentBlock.type,
								identifier: currentBlock.identifier,
							});
							currentBlock = null;
							break;
						}
					}
				}

				if (currentBlock) {
					currentBlock.endLine = i;
				}
			}
		}

		// Add final block if exists
		if (currentBlock) {
			blocks.push({
				startLine: currentBlock.startLine,
				endLine: currentBlock.endLine,
				type: currentBlock.type,
				identifier: currentBlock.identifier,
			});
		}

		return blocks;
	}

	/**
	 * Split a large block into smaller chunks
	 */
	private async splitLargeBlock(
		block: {
			startLine: number;
			endLine: number;
			type: 'class' | 'function' | 'method' | 'block';
			identifier?: string;
		},
		lines: string[],
		options: IChunkingOptions
	): Promise<ICodeChunk[]> {
		const chunks: ICodeChunk[] = [];
		const blockLines = lines.slice(block.startLine, block.endLine + 1);

		// Try to split by methods/functions within the block
		if (block.type === 'class') {
			// For classes, try to extract individual methods
			const methods = this.findCodeBlocks(blockLines);
			for (const method of methods) {
				const adjustedMethod = {
					...method,
					startLine: method.startLine + block.startLine,
					endLine: method.endLine + block.startLine,
				};

				const methodContent = lines.slice(adjustedMethod.startLine, adjustedMethod.endLine + 1).join('\n');
				const tokenCount = this.estimateTokenCount(methodContent);

				if (tokenCount <= options.maxChunkSize) {
					chunks.push({
						content: methodContent,
						startLine: adjustedMethod.startLine,
						endLine: adjustedMethod.endLine,
						tokenCount,
						type: 'method',
						identifier: adjustedMethod.identifier,
					});
				}
			}
		}

		// If no methods found or still too large, fall back to basic chunking
		if (chunks.length === 0) {
			const basicChunks = await this.basicChunk(
				blockLines.join('\n'),
				options
			);

			// Adjust line numbers
			for (const chunk of basicChunks) {
				chunks.push({
					...chunk,
					startLine: chunk.startLine + block.startLine,
					endLine: chunk.endLine + block.startLine,
				});
			}
		}

		return chunks;
	}

	/**
	 * Fill gaps between chunks with basic chunks
	 */
	private fillGaps(
		chunks: ICodeChunk[],
		lines: string[],
		options: IChunkingOptions
	): ICodeChunk[] {
		// Sort chunks by start line
		chunks.sort((a, b) => a.startLine - b.startLine);

		const result: ICodeChunk[] = [];
		let lastEndLine = -1;

		for (const chunk of chunks) {
			// Check if there's a gap
			if (lastEndLine + 1 < chunk.startLine) {
				const gapLines = lines.slice(lastEndLine + 1, chunk.startLine);
				const gapContent = gapLines.join('\n');

				if (gapContent.trim()) {
					result.push({
						content: gapContent,
						startLine: lastEndLine + 1,
						endLine: chunk.startLine - 1,
						tokenCount: this.estimateTokenCount(gapContent),
						type: 'text',
					});
				}
			}

			result.push(chunk);
			lastEndLine = chunk.endLine;
		}

		// Handle any remaining lines
		if (lastEndLine + 1 < lines.length) {
			const remainingLines = lines.slice(lastEndLine + 1);
			const remainingContent = remainingLines.join('\n');

			if (remainingContent.trim()) {
				result.push({
					content: remainingContent,
					startLine: lastEndLine + 1,
					endLine: lines.length - 1,
					tokenCount: this.estimateTokenCount(remainingContent),
					type: 'text',
				});
			}
		}

		return result;
	}

	/**
	 * Estimate token count for text
	 */
	estimateTokenCount(text: string): number {
		return Math.ceil(text.length / this.CHARS_PER_TOKEN);
	}

	/**
	 * Check if file should be chunked
	 */
	shouldChunk(uri: URI, content: string): boolean {
		// Skip empty files
		if (!content || content.trim().length === 0) {
			return false;
		}

		// Skip very large files
		if (content.length > this.MAX_FILE_SIZE) {
			return false;
		}

		// Must have file extension
		const path = uri.path;
		return path.includes('.');
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
}
