/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ListenableGenerator } from './listenableGenerator.js';

/**
 * Generator Reuse Manager
 *
 * Intelligently reuses generators to avoid creating new API requests:
 * - Reuses generator when user types ahead
 * - Matches typed characters with pending completion
 * - Saves bandwidth and improves responsiveness
 * - Handles multiline and single-line completions
 */
export class GeneratorReuseManager extends Disposable {
	currentGenerator: ListenableGenerator<string> | undefined;
	pendingGeneratorPrefix: string | undefined;
	pendingCompletion = '';

	constructor(private readonly onError: (err: Error) => void) {
		super();
	}

	/**
	 * Create a new listenable generator
	 */
	private _createListenableGenerator(
		abortController: AbortController,
		gen: AsyncGenerator<string>,
		prefix: string
	): void {
		// Cancel existing generator
		this.currentGenerator?.cancel();

		// Create new listenable generator
		const listenableGen = this._register(
			new ListenableGenerator(gen, this.onError, abortController)
		);

		// Listen for chunks to build up pending completion
		listenableGen.listen((chunk) => {
			if (chunk !== null) {
				this.pendingCompletion += chunk;
			}
		});

		this.pendingGeneratorPrefix = prefix;
		this.pendingCompletion = '';
		this.currentGenerator = listenableGen;
	}

	/**
	 * Check if we should reuse the existing generator
	 *
	 * We can reuse if:
	 * - There is a current generator
	 * - The pending generator prefix + completion starts with the new prefix
	 * - The new prefix is longer (user is typing forward, not backspace)
	 */
	private shouldReuseExistingGenerator(prefix: string): boolean {
		return (
			!!this.currentGenerator &&
			!!this.pendingGeneratorPrefix &&
			(this.pendingGeneratorPrefix + this.pendingCompletion).startsWith(prefix) &&
			// Ensure user is typing forward (not backspace)
			this.pendingGeneratorPrefix.length <= prefix.length
		);
	}

	/**
	 * Get a generator, reusing if possible
	 *
	 * @param prefix Current prefix (text before cursor)
	 * @param newGenerator Function to create new generator if needed
	 * @param multiline Whether this is a multiline completion
	 * @returns Async generator of completion chunks
	 */
	async *getGenerator(
		prefix: string,
		newGenerator: (abortSignal: AbortSignal) => AsyncGenerator<string>,
		multiline: boolean
	): AsyncGenerator<string> {
		// If we can't reuse, create a new generator
		if (!this.shouldReuseExistingGenerator(prefix)) {
			const abortController = new AbortController();
			this._createListenableGenerator(
				abortController,
				newGenerator(abortController.signal),
				prefix
			);
		}

		// Calculate characters already typed since the generator was created
		let typedSinceLastGenerator =
			prefix.slice(this.pendingGeneratorPrefix?.length) || '';

		// Stream from the current generator
		for await (let chunk of this.currentGenerator?.tee() ?? []) {
			if (!chunk) {
				continue;
			}

			// Ignore characters the user has already typed
			while (chunk.length && typedSinceLastGenerator.length) {
				if (chunk[0] === typedSinceLastGenerator[0]) {
					// User typed this character, skip it in completion
					typedSinceLastGenerator = typedSinceLastGenerator.slice(1);
					chunk = chunk.slice(1);
				} else {
					// Characters don't match, stop filtering
					break;
				}
			}

			// Break at newline unless in multiline mode
			const newLineIndex = chunk.indexOf('\n');
			if (newLineIndex >= 0 && !multiline) {
				if (newLineIndex > 0) {
					yield chunk.slice(0, newLineIndex);
				}
				break;
			} else if (chunk !== '') {
				yield chunk;
			}
		}
	}

	/**
	 * Cancel current generator
	 */
	cancel(): void {
		this.currentGenerator?.cancel();
		this.currentGenerator = undefined;
		this.pendingGeneratorPrefix = undefined;
		this.pendingCompletion = '';
	}

	/**
	 * Get statistics
	 */
	getStatistics(): {
		hasGenerator: boolean;
		pendingPrefix?: string;
		pendingCompletionLength: number;
		isGeneratorEnded?: boolean;
	} {
		return {
			hasGenerator: !!this.currentGenerator,
			pendingPrefix: this.pendingGeneratorPrefix,
			pendingCompletionLength: this.pendingCompletion.length,
			isGeneratorEnded: this.currentGenerator?.isEnded(),
		};
	}

	/**
	 * Dispose and clean up
	 */
	override dispose(): void {
		this.cancel();
		super.dispose();
	}
}
