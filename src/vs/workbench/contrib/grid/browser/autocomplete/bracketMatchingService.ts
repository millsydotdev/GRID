/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../../base/common/uri.js';

export const IBracketMatchingService = createDecorator<IBracketMatchingService>('bracketMatchingService');

/**
 * Bracket pairs
 */
export const BRACKETS: Record<string, string> = {
	'(': ')',
	'{': '}',
	'[': ']',
};

/**
 * Reverse bracket mapping (closing to opening)
 */
export const BRACKETS_REVERSE: Record<string, string> = {
	')': '(',
	'}': '{',
	']': '[',
};

/**
 * Bracket Matching Service
 *
 * Ensures proper bracket pairing in autocomplete suggestions:
 * - Only completes bracket pairs that we started
 * - Tracks opening brackets from previous completions
 * - Stops streaming on unmatched closing brackets
 * - Handles multiline and single-line completions
 */
export interface IBracketMatchingService {
	readonly _serviceBrand: undefined;

	/**
	 * Handle an accepted completion
	 *
	 * Tracks opening brackets from the completion for future reference
	 *
	 * @param completion The accepted completion text
	 * @param uri File URI where completion was accepted
	 */
	handleAcceptedCompletion(completion: string, uri: URI): void;

	/**
	 * Filter completion stream to stop on unmatched closing brackets
	 *
	 * @param stream Async generator of completion chunks
	 * @param prefix Text before cursor
	 * @param suffix Text after cursor
	 * @param uri File URI
	 * @param multiline Whether this is a multiline completion
	 * @returns Filtered async generator
	 */
	stopOnUnmatchedClosingBracket(
		stream: AsyncGenerator<string>,
		prefix: string,
		suffix: string,
		uri: URI,
		multiline: boolean
	): AsyncGenerator<string>;

	/**
	 * Clear tracked state
	 */
	clear(): void;
}

export class BracketMatchingService extends Disposable implements IBracketMatchingService {
	readonly _serviceBrand: undefined;

	private openingBracketsFromLastCompletion: string[] = [];
	private lastCompletionFile: string | undefined = undefined;

	constructor() {
		super();
	}

	/**
	 * Handle an accepted completion
	 *
	 * Analyzes the completion to track unclosed brackets
	 */
	handleAcceptedCompletion(completion: string, uri: URI): void {
		this.openingBracketsFromLastCompletion = [];
		const stack: string[] = [];

		// Parse completion to find unclosed brackets
		for (let i = 0; i < completion.length; i++) {
			const char = completion[i];

			if (Object.keys(BRACKETS).includes(char)) {
				// Opening bracket - push to stack
				stack.push(char);
			} else if (Object.values(BRACKETS).includes(char)) {
				// Closing bracket - try to match with stack
				if (stack.length === 0 || BRACKETS[stack.pop()!] !== char) {
					// Unmatched closing bracket, stop tracking
					break;
				}
			}
		}

		// Any remaining opening brackets are unclosed
		this.openingBracketsFromLastCompletion = stack;
		this.lastCompletionFile = uri.toString();
	}

	/**
	 * Filter completion stream to stop on unmatched closing brackets
	 *
	 * Implements bracket matching policy:
	 * - Only complete bracket pairs that we started
	 * - Consider brackets from previous completions (multiline)
	 * - Stop streaming when encountering unmatched closing bracket
	 */
	async *stopOnUnmatchedClosingBracket(
		stream: AsyncGenerator<string>,
		prefix: string,
		suffix: string,
		uri: URI,
		multiline: boolean
	): AsyncGenerator<string> {
		let stack: string[] = [];

		if (multiline) {
			// Add opening brackets from the previous response
			if (this.lastCompletionFile === uri.toString()) {
				stack = [...this.openingBracketsFromLastCompletion];
			} else {
				this.lastCompletionFile = undefined;
			}
		} else {
			// Single line completion: allow completing bracket pairs
			// started on current line but not finished on current line
			const currentLine =
				(prefix.split('\n').pop() ?? '') + (suffix.split('\n')[0] ?? '');

			for (let i = 0; i < currentLine.length; i++) {
				const char = currentLine[i];

				if (Object.keys(BRACKETS).includes(char)) {
					// Opening bracket
					stack.push(char);
				} else if (Object.values(BRACKETS).includes(char)) {
					// Closing bracket
					if (stack.length === 0 || BRACKETS[stack.pop()!] !== char) {
						break;
					}
				}
			}
		}

		// Add corresponding open brackets from suffix to stack
		// This allows editing after overwritten closing brackets
		for (let i = 0; i < suffix.length; i++) {
			if (suffix[i] === ' ') {
				continue;
			}

			const openBracket = BRACKETS_REVERSE[suffix[i]];
			if (!openBracket) {
				break;
			}

			stack.unshift(openBracket);
		}

		let all = '';
		let seenNonWhitespaceOrClosingBracket = false;

		// Stream chunks and check for bracket matching
		for await (let chunk of stream) {
			// Allow closing brackets before any non-whitespace characters
			if (!seenNonWhitespaceOrClosingBracket) {
				const firstNonWhitespaceOrClosingBracketIndex =
					chunk.search(/[^\s\)\}\]]/);

				if (firstNonWhitespaceOrClosingBracketIndex !== -1) {
					yield chunk.slice(0, firstNonWhitespaceOrClosingBracketIndex);
					chunk = chunk.slice(firstNonWhitespaceOrClosingBracketIndex);
					seenNonWhitespaceOrClosingBracket = true;
				} else {
					yield chunk;
					continue;
				}
			}

			all += chunk;

			// Check each character for bracket matching
			for (let i = 0; i < chunk.length; i++) {
				const char = chunk[i];

				if (Object.values(BRACKETS).includes(char)) {
					// Closing bracket
					if (stack.length === 0 || BRACKETS[stack.pop()!] !== char) {
						// Unmatched closing bracket - stop here
						yield chunk.slice(0, i);
						return;
					}
				} else if (Object.keys(BRACKETS).includes(char)) {
					// Opening bracket
					stack.push(char);
				}
			}

			yield chunk;
		}
	}

	/**
	 * Check if brackets are balanced in text
	 *
	 * @param text Text to check
	 * @returns True if all brackets are balanced
	 */
	areBracketsBalanced(text: string): boolean {
		const stack: string[] = [];

		for (let i = 0; i < text.length; i++) {
			const char = text[i];

			if (Object.keys(BRACKETS).includes(char)) {
				stack.push(char);
			} else if (Object.values(BRACKETS).includes(char)) {
				if (stack.length === 0 || BRACKETS[stack.pop()!] !== char) {
					return false;
				}
			}
		}

		return stack.length === 0;
	}

	/**
	 * Get unclosed brackets in text
	 *
	 * @param text Text to analyze
	 * @returns Array of unclosed opening brackets
	 */
	getUnclosedBrackets(text: string): string[] {
		const stack: string[] = [];

		for (let i = 0; i < text.length; i++) {
			const char = text[i];

			if (Object.keys(BRACKETS).includes(char)) {
				stack.push(char);
			} else if (Object.values(BRACKETS).includes(char)) {
				if (stack.length > 0 && BRACKETS[stack[stack.length - 1]] === char) {
					stack.pop();
				}
			}
		}

		return stack;
	}

	/**
	 * Get closing brackets needed to balance text
	 *
	 * @param text Text to analyze
	 * @returns String of closing brackets needed
	 */
	getClosingBracketsNeeded(text: string): string {
		const unclosed = this.getUnclosedBrackets(text);
		return unclosed.map(bracket => BRACKETS[bracket]).reverse().join('');
	}

	/**
	 * Clear tracked state
	 */
	clear(): void {
		this.openingBracketsFromLastCompletion = [];
		this.lastCompletionFile = undefined;
	}

	/**
	 * Dispose and clear state
	 */
	override dispose(): void {
		this.clear();
		super.dispose();
	}
}
