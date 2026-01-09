/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DiversionAuthenticationProvider } from './diversionAuth';
import { DiversionClient } from './diversionClient';

// Note: Type definition for RemoteSourceProvider might need to be inferred or stubbed
// if @types/vscode doesn't expose git api types directly without specific setup
// We assume generic structure here matching vscode.git.d.ts

export class DiversionRemoteSourceProvider {
	readonly name = 'Diversion';
	readonly icon = 'icon.png';
	readonly supportsQuery = true;

	constructor(private authProvider: DiversionAuthenticationProvider) { }

	async getRemoteSources(_query?: string): Promise<any[]> {
		// 1. Get Session
		const sessions = await this.authProvider.getSessions();
		if (sessions.length === 0) {
			// Trigger login if no session?
			// Or just return empty and let user sign in
			return [];
		}

		const token = sessions[0].accessToken;
		const client = new DiversionClient(token);

		try {
			const result = await client.listRepos();
			if (!result || !result.items) {
				return [];
			}

			return result.items.map(repo => ({
				name: repo.repo_name || repo.name, // adapting to potential API response
				description: repo.description,
				// Proposed: diversion://repo_id or https link if they support git over https
				url: repo.sync_git_repo_url || `https://diversion.dev/${repo.repo_name}`
			}));
		} catch (e) {
			console.error('Failed to list Diversion repos', e);
			return [];
		}
	}
}
