/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as https from 'node:https';
import * as http from 'node:http';

const HUB_URL_CONFIG = 'grid.enterprise.hubUrl';

export type UserTier = 'community' | 'pro' | 'enterprise';

export interface UserInfo {
	id: string;
	email: string;
	tier: UserTier;
	teamId?: string;
	isTeamAdmin?: boolean;
}

export class AuthManager {
	public readonly onDidTierChange: vscode.Event<UserTier>;

	private readonly context: vscode.ExtensionContext;
	private _currentTier: UserTier = 'community';
	private readonly _onDidTierChange = new vscode.EventEmitter<UserTier>();

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
		this.onDidTierChange = this._onDidTierChange.event;
	}

	private get tokenKey() {
		return vscode.env.appName.toLowerCase().replaceAll(/\s+/g, '.') + '.extension.auth';
	}

	public get currentTier() {
		return this._currentTier;
	}

	public async getToken(): Promise<string | undefined> {
		return this.context.secrets.get(this.tokenKey);
	}

	public async checkConnection(): Promise<void> {
		const token = await this.getToken();

		if (!token) {
			this.setTier('community');
			return;
		}

		const hubUrl = vscode.workspace.getConfiguration().get<string>(HUB_URL_CONFIG, 'https://grideditor.com');
		const userInfo = await this.validateToken(hubUrl, token);

		if (userInfo) {
			this.setTier(userInfo.tier);
			vscode.window.setStatusBarMessage(`GRID ${userInfo.tier}: Active`, 5000);
		} else {
			this.setTier('community');
			vscode.window.showWarningMessage('GRID: Your session has expired. Please reconnect for Pro/Enterprise features.');
		}
	}

	public async loginWithCredentials(email: string, pass: string, onSuccess?: () => void): Promise<{ success: boolean; error?: string }> {
		const hubUrl = vscode.workspace.getConfiguration().get<string>(HUB_URL_CONFIG, 'https://grideditor.com');
		const url = new URL('/api/ide/auth/login', hubUrl);
		const result = await this.postJson(url, { email, password: pass });

		if (result.success && result.token) {
			await this.handleLoginSuccess(result.token, result.user, onSuccess);
			return { success: true };
		} else {
			return { success: false, error: result.error || 'Login failed' };
		}
	}

	public async register(email: string, pass: string, onSuccess?: () => void): Promise<{ success: boolean; error?: string }> {
		const hubUrl = vscode.workspace.getConfiguration().get<string>(HUB_URL_CONFIG, 'https://grideditor.com');
		const url = new URL('/api/ide/auth/register', hubUrl);
		// Expecting 200/201
		const result = await this.postJson(url, { email, password: pass });

		if (result.success) {
			if (result.token) {
				await this.handleLoginSuccess(result.token, result.user, onSuccess);
			}
			return { success: true };
		} else {
			return { success: false, error: result.error || 'Registration failed' };
		}
	}

	public async logout(): Promise<void> {
		await this.context.secrets.delete(this.tokenKey);
		this.setTier('community');
		vscode.window.showInformationMessage('GRID: Signed out. Now using Community tier.');
	}

	public async authenticatedFetch(path: string, options?: https.RequestOptions & { body?: string }): Promise<any> {
		const token = await this.getToken();
		if (!token) { throw new Error('Not authenticated'); }

		const hubUrl = vscode.workspace.getConfiguration().get<string>(HUB_URL_CONFIG, 'https://grideditor.com');
		const url = new URL(path, hubUrl);

		return new Promise((resolve, reject) => {
			const client = url.protocol === 'https:' ? https : http;
			const finalOptions: https.RequestOptions = {
				method: options?.method || 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
					...options?.headers
				}
			};

			const req = client.request(url, finalOptions, (res) => {
				let data = '';
				res.on('data', chunk => data += chunk);
				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						try {
							resolve(JSON.parse(data));
						} catch {
							resolve({});
						}
					} else {
						reject(new Error(`Request failed: ${res.statusCode}`));
					}
				});
			});
			req.on('error', (e) => reject(e));
			if (options?.body) {
				req.write(options.body);
			}
			req.end();
		});
	}

	public async startBrowserLogin(onSuccess?: () => void): Promise<void> {
		const hubUrl = vscode.workspace.getConfiguration().get<string>(HUB_URL_CONFIG, 'https://grideditor.com');
		const sessionData = await this.initiateOAuthSession(hubUrl);

		if (!sessionData) {
			vscode.window.showErrorMessage('GRID: Failed to start login. Please try again.');
			return;
		}

		const opened = await vscode.env.openExternal(vscode.Uri.parse(sessionData.auth_url));
		if (!opened) {
			vscode.window.showErrorMessage('GRID: Failed to open browser. Please login manually.');
			return;
		}

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'GRID: Waiting for login...',
			cancellable: true
		}, async (_progress, token) => {
			const result = await this.pollForOAuthCompletion(hubUrl, sessionData.session_id, token);
			if (result) {
				await this.handleLoginSuccess(result.token, result.user, onSuccess);
			}
		});
	}

	// --- Private Helpers ---

	private setTier(tier: UserTier) {
		if (this._currentTier !== tier) {
			this._currentTier = tier;
			vscode.commands.executeCommand('setContext', 'grid.tier', tier);
			this._onDidTierChange.fire(tier);
		}
	}

	private async handleLoginSuccess(token: string, user: UserInfo | undefined, onSuccess?: () => void) {
		await this.context.secrets.store(this.tokenKey, token);
		const tier = user?.tier || 'community';
		this.setTier(tier);
		vscode.window.showInformationMessage(`GRID: Welcome, ${user?.email || 'User'} (${tier} tier)`);
		if (onSuccess) { onSuccess(); }
	}

	private async validateToken(hubUrl: string, token: string): Promise<UserInfo | null> {
		const url = new URL('/api/ide/auth/validate', hubUrl);
		const result = await this.postJson(url, { apiKey: token });
		if (result?.id) {
			return result as UserInfo;
		}
		return null; // Fixed optional chain
	}

	private async initiateOAuthSession(hubUrl: string): Promise<{ session_id: string; auth_url: string } | null> {
		return this.postJson(new URL('/api/ide/oauth/initiate', hubUrl), { client: 'ide' });
	}

	private async pollForOAuthCompletion(hubUrl: string, sessionId: string, cancelToken: vscode.CancellationToken): Promise<{ token: string; user: UserInfo } | null> {
		const maxAttempts = 120;
		let attempts = 0;

		while (attempts < maxAttempts && !cancelToken.isCancellationRequested) {
			await new Promise(r => setTimeout(r, 1000));
			attempts++;

			const result = await this.getJson(new URL(`/api/ide/oauth/poll?session_id=${sessionId}`, hubUrl));
			if (result?.status === 'completed' && result.token && result.user) {
				return { token: result.token, user: result.user };
			}
			if (result?.status === 'expired') {
				vscode.window.showWarningMessage('GRID: Login session expired.');
				return null;
			}
		}
		return null;
	}

	private postJson(url: URL, payload: any): Promise<any> {
		return new Promise((resolve) => {
			const client = url.protocol === 'https:' ? https : http;
			const req = client.request(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			}, (res) => this.handleResponse(res, resolve));
			req.on('error', () => resolve({ error: 'Connection error' }));
			req.write(JSON.stringify(payload));
			req.end();
		});
	}

	private getJson(url: URL): Promise<any> {
		return new Promise((resolve) => {
			const client = url.protocol === 'https:' ? https : http;
			const req = client.request(url, {}, (res) => this.handleResponse(res, resolve));
			req.on('error', () => resolve(null));
			req.end();
		});
	}

	private handleResponse(res: http.IncomingMessage, resolve: (value: any) => void) {
		let data = '';
		res.on('data', chunk => data += chunk);
		res.on('end', () => {
			try {
				if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
					resolve(JSON.parse(data));
				} else {
					// try parse error
					try { resolve(JSON.parse(data)); } catch { resolve({ error: `Status ${res.statusCode}` }); }
				}
			} catch {
				resolve({ error: 'Invalid JSON' });
			}
		});
	}
}
