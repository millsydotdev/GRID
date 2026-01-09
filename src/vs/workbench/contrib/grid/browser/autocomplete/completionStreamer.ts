/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { GeneratorReuseManager } from './generatorReuseManager.js';

/**
 * Completion options
 */
export interface ICompletionOptions {
	/**
	 * Maximum processing time in milliseconds
	 */
	maxProcessingTime?: number;

	/**
	 * Stop sequences
	 */
	stop?: string[];

	/**
	 * Temperature
	 */
	temperature?: number;

	/**
	 * Max tokens
	 */
	maxTokens?: number;

	/**
	 * Apply transforms
	 */
	applyTransforms?: boolean;
}

/**
 * Transform function for completion stream
 */
export type StreamTransform = (
	stream: AsyncGenerator<string>,
	prefix: string,
	suffix: string,
	multiline: boolean,
	stopSequences: string[],
	fullStop: () => void
) => AsyncGenerator<string>;

/**
 * Completion Streamer
 *
 * High-level streaming service with optimizations:
 * - Generator reuse for better performance
 * - Configurable transforms
 * - Cancellation support
 * - Timeout handling
 */
export class CompletionStreamer extends Disposable {
	private generatorReuseManager: GeneratorReuseManager;
	private transforms: StreamTransform[] = [];

	constructor(onError: (err: Error) => void) {
		super();
		this.generatorReuseManager = this._register(new GeneratorReuseManager(onError));
	}

	/**
	 * Add a stream transform
	 */
	addTransform(transform: StreamTransform): void {
		this.transforms.push(transform);
	}

	/**
	 * Clear all transforms
	 */
	clearTransforms(): void {
		this.transforms = [];
	}

	/**
	 * Stream completion with filters and optimizations
	 */
	async *streamCompletionWithFilters(
		token: CancellationToken,
		completionGenerator: (abortSignal: AbortSignal) => AsyncGenerator<string>,
		prefix: string,
		suffix: string,
		multiline: boolean,
		options?: ICompletionOptions
	): AsyncGenerator<string> {
		// Function to stop the LLM generation
		const fullStop = () => this.generatorReuseManager.currentGenerator?.cancel();

		try {
			// Try to reuse pending requests if what the user typed matches start of completion
			const generator = this.generatorReuseManager.getGenerator(
				prefix,
				(abortSignal: AbortSignal) => {
					const gen = completionGenerator(abortSignal);

					// Apply timeout if configured
					if (options?.maxProcessingTime) {
						return this.withTimeout(gen, options.maxProcessingTime, fullStop);
					}

					return gen;
				},
				multiline
			);

			// Create cancellable generator
			const generatorWithCancellation = async function* () {
				for await (const update of generator) {
					if (token.isCancellationRequested) {
						fullStop();
						return;
					}
					yield update;
				}
			};

			let transformedGenerator = generatorWithCancellation();

			// Apply transforms if enabled
			if (options?.applyTransforms !== false) {
				for (const transform of this.transforms) {
					transformedGenerator = transform(
						transformedGenerator,
						prefix,
						suffix,
						multiline,
						options?.stop || [],
						fullStop
					);
				}
			}

			// Stream the final result
			for await (const update of transformedGenerator) {
				yield update;
			}
		} catch (error) {
			console.error('Completion streaming error:', error);
			fullStop();
			throw error;
		}
	}

	/**
	 * Wrap generator with timeout
	 */
	private async *withTimeout(
		generator: AsyncGenerator<string>,
		timeoutMs: number,
		onTimeout: () => void
	): AsyncGenerator<string> {
		const startTime = Date.now();

		for await (const chunk of generator) {
			if (Date.now() - startTime > timeoutMs) {
				onTimeout();
				break;
			}
			yield chunk;
		}
	}

	/**
	 * Stop on sequence
	 *
	 * Transform that stops generation when stop sequence is encountered
	 */
	static stopOnSequence(stopSequences: string[]): StreamTransform {
		return async function* (
			stream: AsyncGenerator<string>,
			_prefix: string,
			_suffix: string,
			_multiline: boolean,
			_stopSequences: string[],
			fullStop: () => void
		): AsyncGenerator<string> {
			let accumulated = '';

			for await (const chunk of stream) {
				accumulated += chunk;

				// Check for stop sequences
				let shouldStop = false;
				for (const stopSeq of stopSequences) {
					if (accumulated.includes(stopSeq)) {
						const index = accumulated.indexOf(stopSeq);
						if (index > 0) {
							yield accumulated.slice(0, index);
						}
						shouldStop = true;
						break;
					}
				}

				if (shouldStop) {
					fullStop();
					break;
				}

				yield chunk;
			}
		};
	}

	/**
	 * Trim whitespace
	 *
	 * Transform that trims leading/trailing whitespace
	 */
	static trimWhitespace(): StreamTransform {
		return async function* (
			stream: AsyncGenerator<string>
		): AsyncGenerator<string> {
			let isFirst = true;
			let buffer = '';

			for await (const chunk of stream) {
				if (isFirst) {
					// Trim leading whitespace
					buffer += chunk;
					const trimmed = buffer.trimStart();
					if (trimmed) {
						yield trimmed;
						isFirst = false;
						buffer = '';
					}
				} else {
					buffer += chunk;
					// Only yield when we have non-whitespace or are sure it's trailing
					if (buffer.trim()) {
						yield buffer;
						buffer = '';
					}
				}
			}

			// Handle trailing content
			if (buffer.trim()) {
				yield buffer.trim();
			}
		};
	}

	/**
	 * Cancel current generation
	 */
	cancel(): void {
		this.generatorReuseManager.cancel();
	}

	/**
	 * Get reuse statistics
	 */
	getStatistics() {
		return this.generatorReuseManager.getStatistics();
	}

	/**
	 * Dispose and clean up
	 */
	override dispose(): void {
		this.generatorReuseManager.dispose();
		super.dispose();
	}
}
