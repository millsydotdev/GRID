/*---------------------------------------------------------------------------------------------
 *  Copyright (c) GRID Editor. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { Range } from '../../../../editor/common/core/range.js';
import { DiffLine, myersDiff, myersCharDiff, DiffChar } from './diff/myersDiff.js';
import { stringToLineStream } from './diff/streamDiff.js';

export const IStreamingDiffService = createDecorator<IStreamingDiffService>('streamingDiffService');

/**
 * Streaming diff visualization mode
 */
export enum DiffVisualizationMode {
	/**
	 * Show inline decorations (highlights)
	 */
	Inline = 'inline',

	/**
	 * Show side-by-side comparison
	 */
	SideBySide = 'side-by-side',

	/**
	 * Show as editor suggestions
	 */
	Suggestion = 'suggestion',
}

/**
 * Options for streaming diff
 */
export interface IStreamingDiffOptions {
	/**
	 * Visualization mode
	 */
	visualizationMode?: DiffVisualizationMode;

	/**
	 * Show character-level diffs within changed lines
	 */
	showCharacterDiffs?: boolean;

	/**
	 * Allow user to accept/reject during streaming
	 */
	allowInteractiveDiff?: boolean;

	/**
	 * Callback when user accepts a diff chunk
	 */
	onAccept?: (diffLines: DiffLine[]) => void;

	/**
	 * Callback when user rejects a diff chunk
	 */
	onReject?: (diffLines: DiffLine[]) => void;

	/**
	 * Callback for each diff line as it streams
	 */
	onDiffLine?: (diffLine: DiffLine) => void;
}

/**
 * Streaming Diff Service
 *
 * Provides real-time diff streaming capabilities for GRID's edit operations.
 * Allows users to see and interact with diffs as AI generates code.
 */
export interface IStreamingDiffService {
	readonly _serviceBrand: undefined;

	/**
	 * Stream a diff between old and new content
	 *
	 * @param editor - The editor to apply diff to
	 * @param oldContent - Original content
	 * @param newContentStream - Stream of new content as it arrives
	 * @param options - Streaming diff options
	 */
	streamDiff(
		editor: ICodeEditor,
		oldContent: string,
		newContentStream: AsyncIterableIterator<string>,
		options?: IStreamingDiffOptions
	): Promise<void>;

	/**
	 * Apply a complete diff (non-streaming)
	 *
	 * @param editor - The editor to apply diff to
	 * @param oldContent - Original content
	 * @param newContent - New content
	 * @param options - Streaming diff options
	 */
	applyDiff(
		editor: ICodeEditor,
		oldContent: string,
		newContent: string,
		options?: IStreamingDiffOptions
	): Promise<void>;

	/**
	 * Get diff between two strings (non-streaming)
	 */
	getDiff(oldContent: string, newContent: string): DiffLine[];

	/**
	 * Get character-level diff between two strings
	 */
	getCharDiff(oldContent: string, newContent: string): DiffChar[];

	/**
	 * Cancel any active streaming diff
	 */
	cancelStreaming(editor: ICodeEditor): void;
}

export class StreamingDiffService extends Disposable implements IStreamingDiffService {
	readonly _serviceBrand: undefined;

	private readonly activeStreams = new Map<string, AbortController>();

	constructor() {
		super();
	}

	/**
	 * Stream a diff between old and new content
	 */
	async streamDiff(
		editor: ICodeEditor,
		oldContent: string,
		newContentStream: AsyncIterableIterator<string>,
		options: IStreamingDiffOptions = {}
	): Promise<void> {
		const model = editor.getModel();
		if (!model) {
			throw new Error('Editor has no model');
		}

		const editorId = editor.getId();
		const abortController = new AbortController();
		this.activeStreams.set(editorId, abortController);

		try {
			// Convert string stream to line stream
			const _oldLines = oldContent.split('\n');
			const _newLineStream = stringToLineStream(''); // Placeholder

			// Create an async generator that yields new content as it arrives
			const streamGenerator = async function* () {
				let accumulated = '';
				try {
					for await (const chunk of newContentStream) {
						if (abortController.signal.aborted) {
							break;
						}
						accumulated += chunk;
						yield chunk;
					}
				} finally {
					// Empty
				}
			};

			// Stream the diff
			let accumulatedContent = '';
			for await (const chunk of streamGenerator()) {
				if (abortController.signal.aborted) {
					break;
				}

				accumulatedContent += chunk;

				// Calculate diff for current accumulated content
				const diffLines = myersDiff(oldContent, accumulatedContent);

				// Notify callback
				if (options.onDiffLine) {
					for (const diffLine of diffLines) {
						options.onDiffLine(diffLine);
					}
				}

				// Apply visual diff (update editor decorations)
				this.applyVisualDiff(editor, diffLines, options);

				// Small delay to prevent overwhelming the UI
				await new Promise((resolve) => setTimeout(resolve, 10));
			}

			// Final diff
			if (!abortController.signal.aborted) {
				const finalDiff = myersDiff(oldContent, accumulatedContent);
				this.applyVisualDiff(editor, finalDiff, options);

				// Auto-accept if not interactive
				if (!options.allowInteractiveDiff) {
					this.acceptDiff(editor, oldContent, accumulatedContent);
				}
			}
		} finally {
			this.activeStreams.delete(editorId);
		}
	}

	/**
	 * Apply a complete diff (non-streaming)
	 */
	async applyDiff(
		editor: ICodeEditor,
		oldContent: string,
		newContent: string,
		options: IStreamingDiffOptions = {}
	): Promise<void> {
		const diffLines = myersDiff(oldContent, newContent);

		// Apply visual diff
		this.applyVisualDiff(editor, diffLines, options);

		// Auto-accept if not interactive
		if (!options.allowInteractiveDiff) {
			this.acceptDiff(editor, oldContent, newContent);
		}
	}

	/**
	 * Get diff between two strings
	 */
	getDiff(oldContent: string, newContent: string): DiffLine[] {
		return myersDiff(oldContent, newContent);
	}

	/**
	 * Get character-level diff
	 */
	getCharDiff(oldContent: string, newContent: string): DiffChar[] {
		return myersCharDiff(oldContent, newContent);
	}

	/**
	 * Cancel active streaming
	 */
	cancelStreaming(editor: ICodeEditor): void {
		const editorId = editor.getId();
		const controller = this.activeStreams.get(editorId);
		if (controller) {
			controller.abort();
			this.activeStreams.delete(editorId);
		}
	}

	/**
	 * Apply visual diff to editor (decorations)
	 */
	private applyVisualDiff(
		editor: ICodeEditor,
		diffLines: DiffLine[],
		options: IStreamingDiffOptions
	): void {
		const model = editor.getModel();
		if (!model) {
			return;
		}

		// Create decorations for added/removed lines
		const decorations: any[] = [];
		let lineNumber = 1;

		for (const diffLine of diffLines) {
			if (diffLine.type === 'new') {
				// Highlight added lines in green
				decorations.push({
					range: new Range(lineNumber, 1, lineNumber, diffLine.line.length + 1),
					options: {
						isWholeLine: true,
						className: 'line-insert',
						linesDecorationsClassName: 'insert-sign',
					},
				});
			} else if (diffLine.type === 'old') {
				// Highlight removed lines in red
				decorations.push({
					range: new Range(lineNumber, 1, lineNumber, diffLine.line.length + 1),
					options: {
						isWholeLine: true,
						className: 'line-delete',
						linesDecorationsClassName: 'delete-sign',
					},
				});
			}

			if (diffLine.type !== 'old') {
				lineNumber++;
			}
		}

		// Apply decorations
		// Note: In a real implementation, we'd use editor.deltaDecorations
		// For now, this is a placeholder
	}

	/**
	 * Accept a diff and apply it to the editor
	 */
	private acceptDiff(editor: ICodeEditor, oldContent: string, newContent: string): void {
		const model = editor.getModel();
		if (!model) {
			return;
		}

		// Replace entire content
		const fullRange = model.getFullModelRange();
		model.pushEditOperations(
			[],
			[
				{
					range: fullRange,
					text: newContent,
				},
			],
			() => []
		);
	}

	/**
	 * Reject a diff and revert to old content
	 */
	private _rejectDiff(editor: ICodeEditor, oldContent: string): void {
		const model = editor.getModel();
		if (!model) {
			return;
		}

		// Revert to old content
		const fullRange = model.getFullModelRange();
		model.pushEditOperations(
			[],
			[
				{
					range: fullRange,
					text: oldContent,
				},
			],
			() => []
		);
	}

	override dispose(): void {
		// Cancel all active streams
		for (const controller of this.activeStreams.values()) {
			controller.abort();
		}
		this.activeStreams.clear();
		super.dispose();
	}
}
