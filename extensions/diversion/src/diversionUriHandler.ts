/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export class DiversionUriHandler implements vscode.UriHandler {
	private _onToken = new vscode.EventEmitter<string>();
	readonly onToken = this._onToken.event;

	handleUri(uri: vscode.Uri): void {
		const query = new URLSearchParams(uri.query);
		const token = query.get('token');

		if (token) {
			this._onToken.fire(token);
		}
	}
}
