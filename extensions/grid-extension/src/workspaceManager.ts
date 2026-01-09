/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as https from 'node:https';
import * as http from 'node:http';
import { TextDecoder, TextEncoder } from 'node:util';

interface CloudWorkspace {
	id: string;
	name: string;
	// other fields ignored
}

export class WorkspaceManager {
	private readonly hubUrl: string;
	private readonly tokenProvider: () => Promise<string | undefined>;
	private readonly activeWorkspaces: Map<string, string> = new Map(); // folderUri -> workspaceId

	constructor(hubUrl: string, tokenProvider: () => Promise<string | undefined>) {
		this.hubUrl = hubUrl;
		this.tokenProvider = tokenProvider;
	}

	public async initialize(): Promise<void> {
		const folders = vscode.workspace.workspaceFolders;
		if (!folders) { return; }

		for (const folder of folders) {
			await this.resolveWorkspace(folder);
		}

		// Watch for new folders
		vscode.workspace.onDidChangeWorkspaceFolders(e => {
			e.added.forEach(f => this.resolveWorkspace(f));
			// Handle removed?
		});
	}

	public getWorkspaceId(folderUri: vscode.Uri): string | undefined {
		return this.activeWorkspaces.get(folderUri.toString());
	}

	private async resolveWorkspace(folder: vscode.WorkspaceFolder): Promise<void> {
		console.log(`Resolving workspace for ${folder.name}`);

		// 1. Check local config
		const configId = await this.readLocalConfig(folder);
		if (configId) {
			console.log(`Found local config for ${folder.name}: ${configId}`);
			this.activeWorkspaces.set(folder.uri.toString(), configId);
			return;
		}

		// 2. If no local config, we need a token to check remote
		const token = await this.tokenProvider();
		if (!token) {
			console.warn('No token available to resolve remote workspaces');
			return;
		}

		// 3. Prompt user: Link or Create?
		const remoteWs = await this.findRemoteWorkspaceByName(folder.name, token);

		if (remoteWs) {
			const choice = await vscode.window.showInformationMessage(
				`Found existing Cloud Workspace "${remoteWs.name}". Link to this folder?`,
				'Link', 'Create New', 'Ignore'
			);
			if (choice === 'Link') {
				await this.linkWorkspace(folder, remoteWs.id);
			} else if (choice === 'Create New') {
				const newWs = await this.createWorkspace(folder.name, folder.uri.fsPath);
				if (newWs) {
					await this.linkWorkspace(folder, newWs.id);
				}
			}
		} else {
			// No matching remote workspace found - offer to create
			const choice = await vscode.window.showInformationMessage(
				`No Cloud Workspace found for "${folder.name}". Create one?`,
				'Create', 'Ignore'
			);
			if (choice === 'Create') {
				const newWs = await this.createWorkspace(folder.name, folder.uri.fsPath);
				if (newWs) {
					await this.linkWorkspace(folder, newWs.id);
				}
			}
		}
	}

	private async readLocalConfig(folder: vscode.WorkspaceFolder): Promise<string | undefined> {
		try {
			const configUri = vscode.Uri.joinPath(folder.uri, '.grid', 'config.json');
			const data = await vscode.workspace.fs.readFile(configUri);
			const content = new TextDecoder().decode(data);
			const json = JSON.parse(content);
			return json.workspaceId;
		} catch (e) {
			// Configuration might not exist, which is expected for new workspaces
			return undefined;
		}
	}

	private async linkWorkspace(folder: vscode.WorkspaceFolder, workspaceId: string): Promise<void> {
		try {
			const configDir = vscode.Uri.joinPath(folder.uri, '.grid');
			try {
				await vscode.workspace.fs.createDirectory(configDir);
			} catch { /* ignore if exists */ }

			const configUri = vscode.Uri.joinPath(configDir, 'config.json');
			const content = JSON.stringify({ workspaceId }, null, 2);
			await vscode.workspace.fs.writeFile(configUri, new TextEncoder().encode(content));

			this.activeWorkspaces.set(folder.uri.toString(), workspaceId);
			vscode.window.showInformationMessage(`Linked to Cloud Workspace: ${workspaceId}`);
		} catch (e) {
			vscode.window.showErrorMessage(`Failed to write config: ${e}`);
		}
	}

	private async findRemoteWorkspaceByName(name: string, token: string): Promise<CloudWorkspace | undefined> {
		const url = new URL('/api/workspaces', this.hubUrl);
		const client = url.protocol === 'https:' ? https : http;

		return new Promise((resolve) => {
			const req = client.request(url, {
				headers: { 'Authorization': `Bearer ${token}` }
			}, (res) => this.handleWorkspaceResponse(res, name, resolve));

			req.on('error', () => resolve(undefined));
			req.end();
		});
	}

	private handleWorkspaceResponse(res: http.IncomingMessage, name: string, resolve: (value: CloudWorkspace | undefined) => void) {
		let data = '';
		res.on('data', chunk => data += chunk);
		res.on('end', () => {
			if (res.statusCode === 200) {
				try {

					const { workspaces } = JSON.parse(data) as { workspaces: any[] };

					const match = workspaces.find((w: any) => w.name === name);
					resolve(match as CloudWorkspace);
				} catch {
					resolve(undefined);
				}
			} else {
				resolve(undefined);
			}
		});
	}

	/**
	 * Create a new cloud workspace via POST /api/workspaces
	 */
	public async createWorkspace(name: string, path: string): Promise<CloudWorkspace | undefined> {
		const token = await this.tokenProvider();
		if (!token) {
			vscode.window.showWarningMessage('GRID: Please connect to create cloud workspaces.');
			return undefined;
		}

		const url = new URL('/api/workspaces', this.hubUrl);
		const client = url.protocol === 'https:' ? https : http;

		return new Promise((resolve) => {
			const payload = JSON.stringify({ name, path });
			const req = client.request(url, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			}, (res) => {
				let data = '';
				res.on('data', chunk => data += chunk);
				res.on('end', () => {
					if (res.statusCode === 200 || res.statusCode === 201) {
						try {
							const { workspace } = JSON.parse(data);
							vscode.window.showInformationMessage(`GRID: Created cloud workspace "${workspace.name}"`);
							resolve(workspace as CloudWorkspace);
						} catch {
							resolve(undefined);
						}
					} else if (res.statusCode === 403) {
						vscode.window.showWarningMessage('GRID: Pro tier required to create cloud workspaces.');
						resolve(undefined);
					} else {
						resolve(undefined);
					}
				});
			});

			req.on('error', () => resolve(undefined));
			req.write(payload);
			req.end();
		});
	}

	/**
	 * Get workspace details by ID via GET /api/workspaces/:id
	 */
	public async getWorkspaceById(id: string): Promise<CloudWorkspace | undefined> {
		const token = await this.tokenProvider();
		if (!token) {
			return undefined;
		}

		const url = new URL(`/api/workspaces/${id}`, this.hubUrl);
		const client = url.protocol === 'https:' ? https : http;

		return new Promise((resolve) => {
			const req = client.request(url, {
				headers: { 'Authorization': `Bearer ${token}` }
			}, (res) => {
				let data = '';
				res.on('data', chunk => data += chunk);
				res.on('end', () => {
					if (res.statusCode === 200) {
						try {
							const { workspace } = JSON.parse(data);
							resolve(workspace as CloudWorkspace);
						} catch {
							resolve(undefined);
						}
					} else {
						resolve(undefined);
					}
				});
			});

			req.on('error', () => resolve(undefined));
			req.end();
		});
	}
}

