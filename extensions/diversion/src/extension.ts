/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DiversionAuthenticationProvider } from './diversionAuth';
import { DiversionRemoteSourceProvider } from './diversionRemoteSourceProvider';
import { DiversionUriHandler } from './diversionUriHandler';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Diversion Extension Active');

	// 1. Setup URI Handler for OAuth
	const uriHandler = new DiversionUriHandler();
	context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));

	// 2. Register Authentication Provider
	const authProvider = new DiversionAuthenticationProvider(context.secrets, uriHandler);
	context.subscriptions.push(
		vscode.authentication.registerAuthenticationProvider(
			DiversionAuthenticationProvider.id,
			'Diversion',
			authProvider,
			{ supportsMultipleAccounts: false }
		)
	);

	// 2. Register Remote Source Provider (for Clone)
	// We need to wait for git extension or check if we can register directly
	// Usually via git API v1
	try {
		const gitExtension = vscode.extensions.getExtension('vscode.git');
		if (gitExtension) {
			const git = gitExtension.exports.getAPI(1);
			if (git) {
				context.subscriptions.push(
					git.registerRemoteSourceProvider(new DiversionRemoteSourceProvider(authProvider))
				);
			}
		}
	} catch (e) {
		console.error('Failed to register remote source provider', e);
	}
}

export function deactivate() { }
