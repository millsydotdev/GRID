/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

import { WorkspaceManager } from './workspaceManager';
import { SyncManager } from './syncManager';
import { AuthManager } from './authManager';

const HUB_URL_CONFIG = 'grid.enterprise.hubUrl';
const TELEMETRY_CONFIG = 'grid.telemetry.enabled';

let workspaceManager: WorkspaceManager;
let syncManager: SyncManager;
let authManager: AuthManager;

export function activate(context: vscode.ExtensionContext) {
	console.log('GRID Extension Active');

	// Initialize Managers
	const hubUrl = vscode.workspace.getConfiguration().get<string>(HUB_URL_CONFIG, 'http://localhost:3000');

	authManager = new AuthManager(context);
	const tokenProvider = async () => authManager.getToken();

	workspaceManager = new WorkspaceManager(hubUrl, tokenProvider);
	syncManager = new SyncManager(hubUrl, tokenProvider, workspaceManager);

	// Register Commands
	context.subscriptions.push(
		vscode.commands.registerCommand('grid.login', () => authManager.startBrowserLogin(() => initManagers())),
		vscode.commands.registerCommand('grid.connect', () => connectToHub(context)), // Keeping wrapper for UI interaction if needed, or move UI to manager? Manager has UI.
		vscode.commands.registerCommand('grid.logout', () => authManager.logout()),
		vscode.commands.registerCommand('grid.getTier', () => authManager.currentTier),
		vscode.commands.registerCommand('grid.resolveWorkspace', () => workspaceManager.initialize()),
		vscode.commands.registerCommand('grid.createWorkspace', () => createCloudWorkspace()),
		vscode.commands.registerCommand('grid.showWorkspaces', () => showCloudWorkspaces()),
		vscode.commands.registerCommand('grid.loginWithCredentials', (email, pass) => authManager.loginWithCredentials(email, pass, () => initManagers())),
		vscode.commands.registerCommand('grid.register', (email, pass) => authManager.register(email, pass, () => initManagers())),
		vscode.commands.registerCommand('grid.getAnalytics', () => getAnalytics()),
		vscode.commands.registerCommand('grid.getAuditLogs', () => getAuditLogs()),
		vscode.commands.registerCommand('grid.getOrganizationData', () => getOrganizationData())
	);

	// First-launch check
	// Disabled in favor of Native Onboarding Wizard (Workbench Contribution)
	// promptLoginIfNeeded(context);

	// Check connection on startup
	authManager.checkConnection().then(() => {
		initManagers();
	});

	// Telemetry Loop (every 5 mins)
	setInterval(() => sendTelemetry(), 5 * 60 * 1000);
}

function initManagers() {
	workspaceManager.initialize();
	syncManager.initialize();
}

export function deactivate() {
	// Cleanup handles by subscriptions
}

async function connectToHub(context: vscode.ExtensionContext) {
	const hubUrl = vscode.workspace.getConfiguration().get<string>(HUB_URL_CONFIG, 'http://localhost:3000');

	const token = await vscode.window.showInputBox({
		title: 'Connect to GRID Hub',
		prompt: `Visit ${hubUrl}/dashboard to get your API Key`,
		password: true,
		ignoreFocusOut: true
	});

	if (!token) {
		return;
	}

	// Store token and validate via AuthManager
	const tokenKey = `${vscode.env.appName.toLowerCase().replaceAll(/\s+/g, '.')}.extension.auth`;
	await context.secrets.store(tokenKey, token);
	await authManager.checkConnection();
}

async function sendTelemetry() {
	const enabled = vscode.workspace.getConfiguration().get(TELEMETRY_CONFIG);
	if (!enabled) {
		return;
	}

	// Use authManager to send?
	// It has authenticatedFetch.
	try {
		await authManager.authenticatedFetch('/api/telemetry', {
			method: 'POST',
			body: JSON.stringify({
				event: 'heartbeat',
				timestamp: new Date().toISOString(),
				version: vscode.version,
				tier: authManager.currentTier
			})
		});
	} catch {
		// ignore
	}
}

async function createCloudWorkspace() {
	const folders = vscode.workspace.workspaceFolders;
	if (!folders || folders.length === 0) {
		vscode.window.showWarningMessage('GRID: No workspace folder open to create cloud workspace from.');
		return;
	}

	let folder = folders[0];
	if (folders.length > 1) {
		const picked = await vscode.window.showQuickPick(
			folders.map(f => ({ label: f.name, folder: f })),
			{ placeHolder: 'Select a folder to create a cloud workspace for' }
		);
		if (!picked) {
		return;
	}
		folder = picked.folder;
	}

	const name = await vscode.window.showInputBox({
		title: 'Create Cloud Workspace',
		prompt: 'Enter a name for your cloud workspace',
		value: folder.name,
		validateInput: (v) => v.trim().length === 0 ? 'Name cannot be empty' : undefined
	});

	if (!name) {
		return;
	}

	const ws = await workspaceManager.createWorkspace(name, folder.uri.fsPath);
	if (ws) {
		await vscode.commands.executeCommand('grid.resolveWorkspace');
	}
}

async function showCloudWorkspaces() {
	vscode.window.showInformationMessage('GRID: Cloud Workspaces feature coming soon. Use the Dashboard at grideditor.com/dashboard to manage workspaces.');
}

async function getAnalytics() {
	try {
		return await authManager.authenticatedFetch('/api/organization/analytics');
	} catch (e) {
		console.error('Analytics Fetch Error', e);
		return null; // Return null to indicate error/no data
	}
}

async function getAuditLogs() {
	try {
		return await authManager.authenticatedFetch('/api/organization/audit-logs');
	} catch (e) {
		console.error('Audit Logs Fetch Error', e);
		return { logs: [] };
	}
}

async function getOrganizationData() {
	try {
		return await authManager.authenticatedFetch('/api/organization');
	} catch (e) {
		console.error('Org Data Fetch Error', e);
		return null;
	}
}
