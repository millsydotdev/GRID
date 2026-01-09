/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BaseMessenger } from './baseMessenger.js';
import { IMessage, IProtocol } from './messenger.js';

/**
 * In-process messenger for local communication
 *
 * Connects two messengers directly without network overhead
 * Useful for Editor ↔ Service communication within the same process
 */
export class InProcessMessenger<TSend extends IProtocol, TReceive extends IProtocol>
	extends BaseMessenger<TSend, TReceive> {

	private _peer: InProcessMessenger<TReceive, TSend> | undefined;

	/**
	 * Connect this messenger to a peer
	 */
	connect(peer: InProcessMessenger<TReceive, TSend>): void {
		this._peer = peer;
		peer._peer = this as unknown as InProcessMessenger<TSend, TReceive>;
	}

	/**
	 * Disconnect from peer
	 */
	disconnect(): void {
		if (this._peer) {
			this._peer._peer = undefined;
			this._peer = undefined;
		}
	}

	/**
	 * Send message to peer
	 */
	protected sendMessage(message: IMessage): void {
		if (!this._peer) {
			console.warn('InProcessMessenger: No peer connected');
			return;
		}

		// Send message asynchronously to avoid stack overflow
		setImmediate(() => {
			this._peer?.handleIncomingMessage(message);
		});
	}

	/**
	 * Clean up on dispose
	 */
	override dispose(): void {
		this.disconnect();
		super.dispose();
	}
}

/**
 * Create a pair of connected in-process messengers
 */
export function createMessengerPair<
	TProtocol1 extends IProtocol,
	TProtocol2 extends IProtocol
>(): [
		InProcessMessenger<TProtocol1, TProtocol2>,
		InProcessMessenger<TProtocol2, TProtocol1>
	] {
	const messenger1 = new InProcessMessenger<TProtocol1, TProtocol2>();
	const messenger2 = new InProcessMessenger<TProtocol2, TProtocol1>();

	messenger1.connect(messenger2);

	return [messenger1, messenger2];
}
