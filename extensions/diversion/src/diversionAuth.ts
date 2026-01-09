/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DiversionUriHandler } from './diversionUriHandler';

export class DiversionAuthenticationProvider implements vscode.AuthenticationProvider {
	static id = 'diversion';
	static label = 'Diversion';

	private _onDidChangeSessions = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
	get onDidChangeSessions() { return this._onDidChangeSessions.event; }

	constructor(
		private readonly secretStorage: vscode.SecretStorage,
		private readonly uriHandler: DiversionUriHandler
	) { }

	async getSessions(scopes?: string[]): Promise<vscode.AuthenticationSession[]> {
		const token = await this.secretStorage.get('diversion.token');
		if (token) {
			return [{
				id: 'default',
				accessToken: token,
				account: {
					label: 'Diversion User',
					id: 'default'
				},
				scopes: scopes || []
			}];
		}
		return [];
	}

	async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
		// 1. Open Browser to Dashboard Auth Page
		const callbackUri = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://grid.diversion/auth`));

		const loginUrl = `https://grideditor.com/dashboard/diversion?ide_callback=${encodeURIComponent(callbackUri.toString())}`;

		// For development handling if localhost
		// If we are developing locally, we might want to point to localhost:3000
		// But for now let's assume the user has the website running or we point to the dev URL
		// A robust way is to just let the user know.

		await vscode.env.openExternal(vscode.Uri.parse(loginUrl));

		// 2. Wait for Token from URI Handler
		const token = await new Promise<string>((resolve, reject) => {
			// Timeout after 5 mins
			const timeout = setTimeout(() => {
				reject(new Error('Login timed out'));
				disposable.dispose();
			}, 5 * 60 * 1000);

			const disposable = this.uriHandler.onToken(token => {
				clearTimeout(timeout);
				resolve(token);
				disposable.dispose();
			});
		});

		// 3. Store Token
		await this.secretStorage.store('diversion.token', token);

		// 4. Notify & Return
		const session = {
			id: 'default',
			accessToken: token,
			account: { label: 'Diversion User', id: 'default' },
			scopes: scopes
		};

		this._onDidChangeSessions.fire({ added: [session], removed: [], changed: [] });

		return session;
	}

	async removeSession(_sessionId: string): Promise<void> {
		await this.secretStorage.delete('diversion.token');
		this._onDidChangeSessions.fire({
			added: [], removed: [{
				id: 'default',
				accessToken: '',
				account: { label: 'Diversion User', id: 'default' },
				scopes: []
			}], changed: []
		});
	}
}
