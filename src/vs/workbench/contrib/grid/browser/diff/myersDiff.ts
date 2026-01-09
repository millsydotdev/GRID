/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// eslint-disable-next-line
import { diffLines, diffChars, type Change } from 'diff';

/**
 * Types of diff lines
 */
export type DiffType = 'old' | 'new' | 'same';

/**
 * Represents a line-level diff
 */
export interface DiffLine {
	type: DiffType;
	line: string;
}

/**
 * Represents a character-level diff
 */
export interface DiffChar {
	type: DiffType;
	char: string;
	oldIndex?: number;
	newIndex?: number;
	oldLineIndex?: number;
	newLineIndex?: number;
	oldCharIndexInLine?: number;
	newCharIndexInLine?: number;
}

/**
 * Convert diff.js Change to our DiffLine format
 */
function convertChangeToDiffLines(change: Change): DiffLine[] {
	const type: DiffType = change.added ? 'new' : change.removed ? 'old' : 'same';
	const lines = change.value.split('\n');

	// Ignore the \n at the end of the final line, if there is one
	if (lines[lines.length - 1] === '') {
		lines.pop();
	}

	return lines.map((line) => ({ type, line }));
}

/**
 * Myers diff algorithm for line-level diffs
 *
 * The interpretation of lines in oldContent and newContent is the same as jsdiff:
 * Lines are separated by \n, with the exception that a trailing \n does *not*
 * represent an empty line.
 */
export function myersDiff(oldContent: string, newContent: string): DiffLine[] {
	const theirFormat = diffLines(oldContent, newContent, {
		ignoreNewlineAtEof: true,
	});

	const ourFormat = theirFormat.flatMap(convertChangeToDiffLines);

	// Combine consecutive old/new pairs that are identical after trimming
	for (let i = 0; i < ourFormat.length - 1; i++) {
		if (
			ourFormat[i]?.type === 'old' &&
			ourFormat[i + 1]?.type === 'new' &&
			ourFormat[i].line.trim() === ourFormat[i + 1].line.trim()
		) {
			ourFormat[i] = { type: 'same', line: ourFormat[i].line };
			ourFormat.splice(i + 1, 1);
		}
	}

	// Remove trailing empty old lines
	while (
		ourFormat.length > 0 &&
		ourFormat[ourFormat.length - 1].type === 'old' &&
		ourFormat[ourFormat.length - 1].line === ''
	) {
		ourFormat.pop();
	}

	return ourFormat;
}

/**
 * Myers diff algorithm for character-level diffs
 */
export function myersCharDiff(oldContent: string, newContent: string): DiffChar[] {
	const theirFormat = diffChars(oldContent, newContent);

	// Track indices as we process the diff
	let oldIndex = 0;
	let newIndex = 0;
	let oldLineIndex = 0;
	let newLineIndex = 0;
	let oldCharIndexInLine = 0;
	let newCharIndexInLine = 0;

	const result: DiffChar[] = [];

	for (const change of theirFormat) {
		// Split the change value by newlines to handle them separately
		if (change.value.includes('\n')) {
			const parts = change.value.split(/(\n)/g); // This keeps the newlines as separate entries

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				if (part === '') {
					continue;
				}

				if (part === '\n') {
					// Handle newline
					if (change.added) {
						result.push({
							type: 'new',
							char: part,
							newIndex: newIndex,
							newLineIndex: newLineIndex,
							newCharIndexInLine: newCharIndexInLine,
						});
						newIndex += part.length;
						newLineIndex++;
						newCharIndexInLine = 0; // Reset when moving to a new line
					} else if (change.removed) {
						result.push({
							type: 'old',
							char: part,
							oldIndex: oldIndex,
							oldLineIndex: oldLineIndex,
							oldCharIndexInLine: oldCharIndexInLine,
						});
						oldIndex += part.length;
						oldLineIndex++;
						oldCharIndexInLine = 0;
					} else {
						result.push({
							type: 'same',
							char: part,
							oldIndex: oldIndex,
							newIndex: newIndex,
							oldLineIndex: oldLineIndex,
							newLineIndex: newLineIndex,
							oldCharIndexInLine: oldCharIndexInLine,
							newCharIndexInLine: newCharIndexInLine,
						});
						oldIndex += part.length;
						newIndex += part.length;
						oldLineIndex++;
						newLineIndex++;
						oldCharIndexInLine = 0;
						newCharIndexInLine = 0;
					}
				} else {
					// Handle regular characters
					for (const char of part) {
						if (change.added) {
							result.push({
								type: 'new',
								char: char,
								newIndex: newIndex,
								newLineIndex: newLineIndex,
								newCharIndexInLine: newCharIndexInLine,
							});
							newIndex++;
							newCharIndexInLine++;
						} else if (change.removed) {
							result.push({
								type: 'old',
								char: char,
								oldIndex: oldIndex,
								oldLineIndex: oldLineIndex,
								oldCharIndexInLine: oldCharIndexInLine,
							});
							oldIndex++;
							oldCharIndexInLine++;
						} else {
							result.push({
								type: 'same',
								char: char,
								oldIndex: oldIndex,
								newIndex: newIndex,
								oldLineIndex: oldLineIndex,
								newLineIndex: newLineIndex,
								oldCharIndexInLine: oldCharIndexInLine,
								newCharIndexInLine: newCharIndexInLine,
							});
							oldIndex++;
							newIndex++;
							oldCharIndexInLine++;
							newCharIndexInLine++;
						}
					}
				}
			}
		} else {
			// No newlines in the change value
			for (const char of change.value) {
				if (change.added) {
					result.push({
						type: 'new',
						char: char,
						newIndex: newIndex,
						newLineIndex: newLineIndex,
						newCharIndexInLine: newCharIndexInLine,
					});
					newIndex++;
					newCharIndexInLine++;
				} else if (change.removed) {
					result.push({
						type: 'old',
						char: char,
						oldIndex: oldIndex,
						oldLineIndex: oldLineIndex,
						oldCharIndexInLine: oldCharIndexInLine,
					});
					oldIndex++;
					oldCharIndexInLine++;
				} else {
					result.push({
						type: 'same',
						char: char,
						oldIndex: oldIndex,
						newIndex: newIndex,
						oldLineIndex: oldLineIndex,
						newLineIndex: newLineIndex,
						oldCharIndexInLine: oldCharIndexInLine,
						newCharIndexInLine: newCharIndexInLine,
					});
					oldIndex++;
					newIndex++;
					oldCharIndexInLine++;
					newCharIndexInLine++;
				}
			}
		}
	}

	return result;
}

/**
 * Calculate diff statistics
 */
export interface DiffStats {
	linesAdded: number;
	linesRemoved: number;
	linesChanged: number;
	charChanges: number;
}

export function calculateDiffStats(diffLines: DiffLine[]): DiffStats {
	const stats: DiffStats = {
		linesAdded: 0,
		linesRemoved: 0,
		linesChanged: 0,
		charChanges: 0,
	};

	for (const line of diffLines) {
		if (line.type === 'new') {
			stats.linesAdded++;
			stats.charChanges += line.line.length;
		} else if (line.type === 'old') {
			stats.linesRemoved++;
			stats.charChanges += line.line.length;
		}
	}

	// Count changed lines (lines that were modified, not just added/removed)
	for (let i = 0; i < diffLines.length - 1; i++) {
		if (diffLines[i].type === 'old' && diffLines[i + 1].type === 'new') {
			stats.linesChanged++;
		}
	}

	return stats;
}
