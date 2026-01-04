/*---------------------------------------------------------------------------------------------
 *  Copyright (c) GRID Editor. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IAutocompleteDebouncer = createDecorator<IAutocompleteDebouncer>('autocompleteDebouncer');

/**
 * Autocomplete Debouncer Service
 *
 * Debounces rapid autocomplete requests to reduce API calls and improve performance.
 * Uses request IDs to track and cancel outdated requests.
 */
export interface IAutocompleteDebouncer {
	readonly _serviceBrand: undefined;

	/**
	 * Delay and check if request should be debounced
	 *
	 * @param debounceDelay Delay in milliseconds
	 * @returns Promise resolving to true if should debounce (cancel), false if should proceed
	 */
	delayAndShouldDebounce(debounceDelay: number): Promise<boolean>;

	/**
	 * Cancel all pending requests
	 */
	cancelAll(): void;

	/**
	 * Get current request ID
	 */
	getCurrentRequestId(): string | undefined;
}

export class AutocompleteDebouncer extends Disposable implements IAutocompleteDebouncer {
	readonly _serviceBrand: undefined;

	private debounceTimeout: any | undefined = undefined;
	private currentRequestId: string | undefined = undefined;
	private requestIdCounter = 0;

	constructor() {
		super();
	}

	/**
	 * Generate a unique request ID
	 */
	private generateRequestId(): string {
		return `req-${Date.now()}-${this.requestIdCounter++}`;
	}

	/**
	 * Delay and check if request should be debounced
	 *
	 * Returns true if this request has been superseded by a newer one (should debounce/cancel)
	 * Returns false if this is the most recent request (should proceed)
	 */
	async delayAndShouldDebounce(debounceDelay: number): Promise<boolean> {
		// Generate a unique ID for this request
		const requestId = this.generateRequestId();
		this.currentRequestId = requestId;

		// Clear any existing timeout
		if (this.debounceTimeout) {
			clearTimeout(this.debounceTimeout);
		}

		// Create a new promise that resolves after the debounce delay
		return new Promise<boolean>((resolve) => {
			this.debounceTimeout = setTimeout(() => {
				// When the timeout completes, check if this is still the most recent request
				const shouldDebounce = this.currentRequestId !== requestId;

				// If this is the most recent request, it shouldn't be debounced
				if (!shouldDebounce) {
					this.currentRequestId = undefined;
				}

				resolve(shouldDebounce);
			}, debounceDelay);
		});
	}

	/**
	 * Cancel all pending requests
	 */
	cancelAll(): void {
		if (this.debounceTimeout) {
			clearTimeout(this.debounceTimeout);
			this.debounceTimeout = undefined;
		}
		this.currentRequestId = undefined;
	}

	/**
	 * Get current request ID
	 */
	getCurrentRequestId(): string | undefined {
		return this.currentRequestId;
	}

	/**
	 * Clean up on dispose
	 */
	override dispose(): void {
		this.cancelAll();
		super.dispose();
	}
}
