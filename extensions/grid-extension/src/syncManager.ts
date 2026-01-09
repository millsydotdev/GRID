/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import * as vscode from 'vscode';
import * as https from 'node:https';
import * as http from 'node:http';
import { WorkspaceManager } from './workspaceManager';

interface IPendingChange {
	path: string;
	content: string;
	date: Date;
	deleted?: boolean;
}

export class SyncManager {
	private readonly hubUrl: string;
	private readonly tokenProvider: () => Promise<string | undefined>;
	private readonly workspaceManager: WorkspaceManager;
	private readonly pendingChanges: Map<string, IPendingChange> = new Map();
	private syncTimer: NodeJS.Timeout | undefined;

	constructor(hubUrl: string, tokenProvider: () => Promise<string | undefined>, workspaceManager: WorkspaceManager) {
		this.hubUrl = hubUrl;
		this.tokenProvider = tokenProvider;
		this.workspaceManager = workspaceManager;
	}

	public initialize() {
		// Watch for file changes
		const watcher = vscode.workspace.createFileSystemWatcher('**/*');

		watcher.onDidChange(uri => this.handleFileChange(uri));
		watcher.onDidCreate(uri => this.handleFileChange(uri));
		watcher.onDidDelete(uri => this.handleFileDeletion(uri));
	}

	private async handleFileChange(uri: vscode.Uri) {
		// 1. Get workspace folder
		const folder = vscode.workspace.getWorkspaceFolder(uri);
		if (!folder) { return; }

		// 2. Get Workspace ID
		const wsId = this.workspaceManager.getWorkspaceId(folder.uri);
		if (!wsId) { return; }

		// 3. ignore .grid, node_modules, .git
		if (uri.path.includes('/.grid/') || uri.path.includes('/node_modules/') || uri.path.includes('/.git/')) { return; }

		// 4. Read content
		try {
			const data = await vscode.workspace.fs.readFile(uri);
			const content = new TextDecoder().decode(data);

			// 5. Queue
			const relativePath = vscode.workspace.asRelativePath(uri, false);
			this.pendingChanges.set(relativePath, {
				path: relativePath,
				content,
				date: new Date()
			});

			this.scheduleSync(wsId);
		} catch (e) {
			console.error('Error reading file', e);
		}
	}

	private async handleFileDeletion(uri: vscode.Uri) {
		// 1. Get workspace folder
		const folder = vscode.workspace.getWorkspaceFolder(uri);
		if (!folder) { return; }

		// 2. Get Workspace ID
		const wsId = this.workspaceManager.getWorkspaceId(folder.uri);
		if (!wsId) { return; } // Not linked

		// 3. ignore .grid, node_modules, .git
		if (uri.path.includes('/.grid/') || uri.path.includes('/node_modules/') || uri.path.includes('/.git/')) { return; }

		// 4. Queue deletion
		const relativePath = vscode.workspace.asRelativePath(uri, false);
		this.pendingChanges.set(relativePath, {
			path: relativePath,
			content: '', // Empty content signals deletion
			date: new Date(),
			deleted: true
		});

		this.scheduleSync(wsId);
	}

	private scheduleSync(wsId: string) {
		if (this.syncTimer) { clearTimeout(this.syncTimer); }
		this.syncTimer = setTimeout(() => this.flushChanges(wsId), 2000); // 2s debounce
	}

	private async flushChanges(wsId: string) {
		if (this.pendingChanges.size === 0) { return; }

		const changes = Array.from(this.pendingChanges.values()).map(c => ({
			path: c.path,
			content: c.content,
			deleted: c.deleted || false,
			// hash: ... // optional
		}));

		this.pendingChanges.clear();
		const token = await this.tokenProvider();
		if (!token) { return; }

		// Push to API
		console.log(`Syncing ${changes.length} files to ${wsId}`);
		// /api/workspaces/:id/sync

		const url = new URL(`/api/workspaces/${wsId}/sync`, this.hubUrl);
		const client = url.protocol === 'https:' ? https : http;

		const payload = JSON.stringify({
			changes
		});

		const req = client.request(url, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		}, res => {
			console.log(`Sync status: ${res.statusCode}`);
			if (res.statusCode === 403) {
				vscode.window.showWarningMessage('GRID Sync: Pro Tier required for sync.');
			}
		});

		req.write(payload);
		req.end();
	}
}
