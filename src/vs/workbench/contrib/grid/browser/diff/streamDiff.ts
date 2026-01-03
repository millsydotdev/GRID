/*---------------------------------------------------------------------------------------------
 *  Copyright (c) GRID Editor. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { DiffLine, DiffType } from './myersDiff.js';

/**
 * Line stream type for async iteration
 */
export type LineStream = AsyncIterableIterator<string>;

/**
 * Match a new line against old lines with flexible matching
 */
interface LineMatch {
	matchIndex: number;
	isPerfectMatch: boolean;
	newLine: string;
}

function matchLine(
	newLine: string,
	oldLines: string[],
	seenIndentationMistake: boolean
): LineMatch {
	// Try perfect match first
	const perfectMatchIndex = oldLines.findIndex((oldLine) => oldLine === newLine);
	if (perfectMatchIndex !== -1) {
		return {
			matchIndex: perfectMatchIndex,
			isPerfectMatch: true,
			newLine,
		};
	}

	// If no perfect match, try trimmed match (handles indentation changes)
	if (seenIndentationMistake) {
		const trimmedNew = newLine.trim();
		const trimmedMatchIndex = oldLines.findIndex(
			(oldLine) => oldLine.trim() === trimmedNew
		);
		if (trimmedMatchIndex !== -1) {
			return {
				matchIndex: trimmedMatchIndex,
				isPerfectMatch: false,
				newLine: oldLines[trimmedMatchIndex], // Use the old line's indentation
			};
		}
	}

	// No match found
	return {
		matchIndex: -1,
		isPerfectMatch: false,
		newLine,
	};
}

/**
 * Stream diff algorithm
 *
 * This function implements streaming Myers diff, which allows processing
 * diffs as new content arrives rather than waiting for the entire content.
 *
 * Invariants:
 * - new + same = newLines.length
 * - old + same = oldLinesCopy.length
 * - Lines are always output in order, at least among old and new separately
 * - Old lines in a hunk are always output before the new lines
 *
 * @param oldLines - Array of old lines (fully available)
 * @param newLines - Async stream of new lines (as they arrive)
 * @returns Async generator of DiffLine objects
 */
export async function* streamDiff(
	oldLines: string[],
	newLines: LineStream
): AsyncGenerator<DiffLine> {
	const oldLinesCopy = [...oldLines];

	// If one indentation mistake is made, others are likely.
	// So we are more permissive about matching
	let seenIndentationMistake = false;

	let newLineResult = await newLines.next();

	while (oldLinesCopy.length > 0 && !newLineResult.done) {
		const { matchIndex, isPerfectMatch, newLine } = matchLine(
			newLineResult.value,
			oldLinesCopy,
			seenIndentationMistake
		);

		if (!seenIndentationMistake && newLineResult.value !== newLine) {
			seenIndentationMistake = true;
		}

		let type: DiffType;
		const isNewLine = matchIndex === -1;

		if (isNewLine) {
			type = 'new';
		} else {
			// Insert all deleted lines before match
			for (let i = 0; i < matchIndex; i++) {
				yield { type: 'old', line: oldLinesCopy.shift()! };
			}
			type = isPerfectMatch ? 'same' : 'old';
		}

		switch (type) {
			case 'new':
				yield { type, line: newLine };
				break;

			case 'same':
				yield { type, line: oldLinesCopy.shift()! };
				break;

			case 'old':
				yield { type, line: oldLinesCopy.shift()! };
				yield { type: 'new', line: newLine };
				break;

			default:
				console.error(`Error streaming diff, unrecognized diff type: ${type}`);
		}

		newLineResult = await newLines.next();
	}

	// Once at the edge, only one choice
	if (newLineResult.done && oldLinesCopy.length > 0) {
		for (const oldLine of oldLinesCopy) {
			yield { type: 'old', line: oldLine };
		}
	}

	if (!newLineResult.done && oldLinesCopy.length === 0) {
		yield { type: 'new', line: newLineResult.value };
		for await (const newLine of newLines) {
			yield { type: 'new', line: newLine };
		}
	}
}

/**
 * Convert a string stream to a line stream
 */
export async function* stringStreamToLineStream(
	stringStream: AsyncIterableIterator<string>
): AsyncGenerator<string> {
	let buffer = '';

	for await (const chunk of stringStream) {
		buffer += chunk;

		// Yield complete lines
		const lines = buffer.split('\n');
		buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

		for (const line of lines) {
			yield line;
		}
	}

	// Yield any remaining content
	if (buffer.length > 0) {
		yield buffer;
	}
}

/**
 * Apply streaming diff to accumulate the final content
 */
export async function applyStreamingDiff(
	oldContent: string,
	diffStream: AsyncIterableIterator<DiffLine>
): Promise<string> {
	const resultLines: string[] = [];

	for await (const diffLine of diffStream) {
		// Only keep 'same' and 'new' lines (skip 'old' lines as they're being replaced)
		if (diffLine.type === 'same' || diffLine.type === 'new') {
			resultLines.push(diffLine.line);
		}
	}

	return resultLines.join('\n');
}

/**
 * Helper to create a line stream from an array
 */
export async function* arrayToLineStream(lines: string[]): AsyncGenerator<string> {
	for (const line of lines) {
		yield line;
	}
}

/**
 * Helper to create a line stream from a string
 */
export async function* stringToLineStream(content: string): AsyncGenerator<string> {
	const lines = content.split('\n');
	for (const line of lines) {
		yield line;
	}
}

/**
 * Collect all diff lines from a stream
 */
export async function collectDiffStream(
	diffStream: AsyncIterableIterator<DiffLine>
): Promise<DiffLine[]> {
	const result: DiffLine[] = [];
	for await (const diffLine of diffStream) {
		result.push(diffLine);
	}
	return result;
}
