/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';

/**
 * Listenable Generator
 *
 * Wraps an async generator with buffering and listener support:
 * - Buffers all generated values
 * - Supports multiple listeners
 * - Can be "teed" to create multiple consumers
 * - Cancellable via abort controller
 */
export class ListenableGenerator<T> extends Disposable {
	private _source: AsyncGenerator<T>;
	private _buffer: T[] = [];
	private _listeners: Set<(value: T | null) => void> = new Set();
	private _isEnded = false;
	private _abortController: AbortController;

	constructor(
		source: AsyncGenerator<T>,
		private readonly onError: (e: Error) => void,
		abortController: AbortController
	) {
		super();
		this._source = source;
		this._abortController = abortController;
		this._start().catch((e) => {
			console.log(`Listenable generator failed: ${e.message}`);
		});
	}

	/**
	 * Cancel the generator
	 */
	public cancel(): void {
		this._abortController.abort();
		this._isEnded = true;
	}

	/**
	 * Start consuming the source generator
	 */
	private async _start(): Promise<void> {
		try {
			for await (const value of this._source) {
				if (this._isEnded) {
					break;
				}

				// Buffer the value
				this._buffer.push(value);

				// Notify all listeners
				for (const listener of this._listeners) {
					listener(value);
				}
			}
		} catch (e) {
			this.onError(e as Error);
		} finally {
			this._isEnded = true;

			// Notify listeners of completion
			for (const listener of this._listeners) {
				listener(null);
			}
		}
	}

	/**
	 * Add a listener for new values
	 *
	 * Listener will immediately receive all buffered values,
	 * then new values as they arrive
	 */
	listen(listener: (value: T | null) => void): void {
		this._listeners.add(listener);

		// Replay buffered values
		for (const value of this._buffer) {
			listener(value);
		}

		// If already ended, notify
		if (this._isEnded) {
			listener(null);
		}
	}

	/**
	 * Remove a listener
	 */
	unlisten(listener: (value: T | null) => void): void {
		this._listeners.delete(listener);
	}

	/**
	 * Create a new async generator that reads from this listenable generator
	 *
	 * Multiple tee() calls can be made to create multiple independent consumers
	 */
	async *tee(): AsyncGenerator<T> {
		try {
			let i = 0;

			// First, yield all buffered values
			while (i < this._buffer.length) {
				yield this._buffer[i++];
			}

			// Then yield new values as they arrive
			while (!this._isEnded) {
				let resolve: ((value: T | null) => void) | undefined;

				const promise = new Promise<T | null>((res) => {
					resolve = res;
					this._listeners.add(resolve);
				});

				const value = await promise;

				if (resolve) {
					this._listeners.delete(resolve);
				}

				// Check for buffered values that arrived while waiting
				while (i < this._buffer.length) {
					yield this._buffer[i++];
				}

				// null indicates end
				if (value === null) {
					break;
				}
			}
		} finally {
			// Cleanup handled by unlisten
		}
	}

	/**
	 * Get the buffer
	 */
	getBuffer(): T[] {
		return [...this._buffer];
	}

	/**
	 * Check if generator is ended
	 */
	isEnded(): boolean {
		return this._isEnded;
	}

	/**
	 * Get buffer size
	 */
	getBufferSize(): number {
		return this._buffer.length;
	}

	/**
	 * Dispose and clean up
	 */
	override dispose(): void {
		this.cancel();
		this._listeners.clear();
		this._buffer = [];
		super.dispose();
	}
}
