/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Base protocol type - maps message types to [request, response] tuples
 */
export type IProtocol = Record<string, [unknown, unknown]>;

/**
 * Message structure for protocol communication
 */
export interface IMessage<T = unknown> {
	/**
	 * Type of the message
	 */
	messageType: string;

	/**
	 * Unique ID for request/response matching
	 */
	messageId: string;

	/**
	 * Message payload
	 */
	data: T;

	/**
	 * Whether this is a streaming response
	 */
	streaming?: boolean;

	/**
	 * Whether streaming is complete
	 */
	done?: boolean;

	/**
	 * Status of the response
	 */
	status?: 'success' | 'error';

	/**
	 * Error message if status is error
	 */
	error?: string;
}

/**
 * Type-safe messenger interface for bidirectional communication
 */
export interface IMessenger<TSend extends IProtocol, TReceive extends IProtocol> {
	/**
	 * Send a message
	 *
	 * @param messageType Type of message to send
	 * @param data Message payload
	 * @param messageId Optional message ID
	 * @returns Message ID
	 */
	send<T extends keyof TSend>(
		messageType: T,
		data: TSend[T][0],
		messageId?: string
	): string;

	/**
	 * Register a handler for incoming messages
	 *
	 * @param messageType Type of message to handle
	 * @param handler Message handler function
	 */
	on<T extends keyof TReceive>(
		messageType: T,
		handler: (message: IMessage<TReceive[T][0]>) => Promise<TReceive[T][1]> | TReceive[T][1]
	): void;

	/**
	 * Make a request and wait for response
	 *
	 * @param messageType Type of message to send
	 * @param data Message payload
	 * @returns Promise resolving to response
	 */
	request<T extends keyof TSend>(
		messageType: T,
		data: TSend[T][0]
	): Promise<TSend[T][1]>;

	/**
	 * Register error handler
	 *
	 * @param handler Error handler function
	 */
	onError(handler: (message: IMessage, error: Error) => void): void;
}

/**
 * Response wrapper for streaming and non-streaming responses
 */
export interface IResponse<T> {
	/**
	 * Whether streaming is complete
	 */
	done: boolean;

	/**
	 * Response content
	 */
	content?: T;

	/**
	 * Status of the response
	 */
	status: 'success' | 'error';

	/**
	 * Error message if status is error
	 */
	error?: string;
}
