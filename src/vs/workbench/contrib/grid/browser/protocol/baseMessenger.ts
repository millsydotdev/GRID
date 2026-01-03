/*---------------------------------------------------------------------------------------------
 *  Copyright (c) GRID Editor. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { IMessenger, IMessage, IProtocol, IResponse } from './messenger.js';

/**
 * Base messenger implementation
 *
 * Provides type-safe message passing with request/response pattern
 */
export abstract class BaseMessenger<TSend extends IProtocol, TReceive extends IProtocol>
	extends Disposable
	implements IMessenger<TSend, TReceive> {

	private readonly _handlers = new Map<keyof TReceive, ((message: IMessage) => Promise<any> | any)[]>();
	private readonly _pendingRequests = new Map<string, {
		resolve: (value: any) => void;
		reject: (error: Error) => void;
		timeout?: NodeJS.Timeout;
	}>();

	private readonly _onError = this._register(new Emitter<{ message: IMessage; error: Error }>());
	readonly onError: Event<{ message: IMessage; error: Error }> = this._onError.event;

	// Configuration
	protected readonly requestTimeout = 30000; // 30 seconds
	protected messageIdCounter = 0;

	constructor() {
		super();
	}

	/**
	 * Send a message (fire and forget)
	 */
	send<T extends keyof TSend>(
		messageType: T,
		data: TSend[T][0],
		messageId?: string
	): string {
		const id = messageId ?? this.generateMessageId();

		const message: IMessage<TSend[T][0]> = {
			messageType: messageType as string,
			messageId: id,
			data,
		};

		this.sendMessage(message);
		return id;
	}

	/**
	 * Make a request and wait for response
	 */
	async request<T extends keyof TSend>(
		messageType: T,
		data: TSend[T][0]
	): Promise<TSend[T][1]> {
		const messageId = this.generateMessageId();

		return new Promise<TSend[T][1]>((resolve, reject) => {
			// Set up timeout
			const timeout = setTimeout(() => {
				this._pendingRequests.delete(messageId);
				reject(new Error(`Request timeout for ${String(messageType)}`));
			}, this.requestTimeout);

			// Store pending request
			this._pendingRequests.set(messageId, {
				resolve,
				reject,
				timeout,
			});

			// Send the message
			this.send(messageType, data, messageId);
		});
	}

	/**
	 * Register a handler for incoming messages
	 */
	on<T extends keyof TReceive>(
		messageType: T,
		handler: (message: IMessage<TReceive[T][0]>) => Promise<TReceive[T][1]> | TReceive[T][1]
	): void {
		if (!this._handlers.has(messageType)) {
			this._handlers.set(messageType, []);
		}
		this._handlers.get(messageType)!.push(handler);
	}

	/**
	 * Register error handler
	 */
	onError(handler: (message: IMessage, error: Error) => void): void {
		this._register(this._onError.event(({ message, error }) => handler(message, error)));
	}

	/**
	 * Handle incoming message
	 */
	protected async handleIncomingMessage(message: IMessage): Promise<void> {
		// Check if this is a response to a pending request
		const pendingRequest = this._pendingRequests.get(message.messageId);
		if (pendingRequest) {
			if (message.status === 'error') {
				pendingRequest.reject(new Error(message.error || 'Unknown error'));
			} else {
				pendingRequest.resolve(message.data);
			}

			// Clean up
			if (pendingRequest.timeout) {
				clearTimeout(pendingRequest.timeout);
			}
			this._pendingRequests.delete(message.messageId);
			return;
		}

		// Otherwise, this is a new request - find and execute handlers
		const handlers = this._handlers.get(message.messageType as keyof TReceive) || [];

		for (const handler of handlers) {
			try {
				const response = await handler(message);

				// Handle async generators (streaming)
				if (response && typeof response[Symbol.asyncIterator] === 'function') {
					for await (const chunk of response) {
						this.sendResponse(message.messageId, message.messageType, {
							done: false,
							content: chunk,
							status: 'success',
						});
					}

					// Send final message
					this.sendResponse(message.messageId, message.messageType, {
						done: true,
						status: 'success',
					});
				} else {
					// Regular response
					this.sendResponse(message.messageId, message.messageType, {
						done: true,
						content: response,
						status: 'success',
					});
				}
			} catch (error) {
				const err = error as Error;
				this._onError.fire({ message, error: err });

				this.sendResponse(message.messageId, message.messageType, {
					done: true,
					status: 'error',
					error: err.message,
				});
			}
		}
	}

	/**
	 * Send a response to a request
	 */
	protected sendResponse(messageId: string, messageType: string, response: IResponse<any>): void {
		const message: IMessage = {
			messageType,
			messageId,
			data: response.content,
			done: response.done,
			status: response.status,
			error: response.error,
		};

		this.sendMessage(message);
	}

	/**
	 * Generate a unique message ID
	 */
	protected generateMessageId(): string {
		return `msg-${Date.now()}-${this.messageIdCounter++}`;
	}

	/**
	 * Abstract method to send a message to the other side
	 * Must be implemented by subclasses
	 */
	protected abstract sendMessage(message: IMessage): void;

	/**
	 * Clean up pending requests on dispose
	 */
	override dispose(): void {
		// Reject all pending requests
		for (const [id, request] of this._pendingRequests.entries()) {
			request.reject(new Error('Messenger disposed'));
			if (request.timeout) {
				clearTimeout(request.timeout);
			}
		}
		this._pendingRequests.clear();
		this._handlers.clear();

		super.dispose();
	}
}
