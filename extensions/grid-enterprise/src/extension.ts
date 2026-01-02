/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as https from 'node:https';
import * as http from 'node:http';

const HUB_URL_CONFIG = 'grid.enterprise.hubUrl';
// Generate storage key from extension context to avoid hardcoded strings
const getTokenKey = () => `${vscode.env.appName.toLowerCase().replace(/\s+/g, '.')}.enterprise.auth`;
const TELEMETRY_CONFIG = 'grid.telemetry.enabled';

interface UserInfo {
    id: string;
    email: string;
    tier: 'community' | 'pro' | 'enterprise';
    teamId?: string;
    isTeamAdmin?: boolean;
}

let currentTier: 'community' | 'pro' | 'enterprise' = 'community';

export function activate(context: vscode.ExtensionContext) {
    console.log('GRID Enterprise Extension Active');

    // Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('grid.connect', () => connectToHub(context)),
        vscode.commands.registerCommand('grid.logout', () => logout(context)),
        vscode.commands.registerCommand('grid.getTier', () => currentTier)
    );

    // Check connection on startup (non-blocking for Community users)
    checkConnection(context);

    // Telemetry Loop (every 5 mins)
    setInterval(() => sendTelemetry(context), 5 * 60 * 1000);
}

export function deactivate() {
    // Cleanup handles by subscriptions
}

/**
 * Validate token against the GRID API
 */
async function validateToken(hubUrl: string, token: string): Promise<UserInfo | null> {
    return new Promise((resolve) => {
        const url = new URL('/api/auth/validate', hubUrl);
        const client = url.protocol === 'https:' ? https : http;

        const req = client.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data) as UserInfo);
                    } catch {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        });

        req.on('error', () => resolve(null));
        req.end();
    });
}

async function connectToHub(context: vscode.ExtensionContext) {
    const hubUrl = vscode.workspace.getConfiguration().get<string>(HUB_URL_CONFIG, 'https://grideditor.com');

    // 1. Prompt user for token
    const token = await vscode.window.showInputBox({
        title: 'Connect to GRID Hub',
        prompt: `Visit ${hubUrl}/dashboard to get your API Key`,
        password: true,
        ignoreFocusOut: true
    });

    if (!token) {return;}

    // 2. Validate token with API
    const userInfo = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Validating API Key...',
        cancellable: false
    }, async () => {
        return await validateToken(hubUrl, token);
    });

    if (!userInfo) {
        vscode.window.showErrorMessage('GRID: Invalid API Key. Please check your key and try again.');
        return;
    }

    // 3. Store token and update state
    try {
        await context.secrets.store(getTokenKey(), token);
        currentTier = userInfo.tier;
        vscode.window.showInformationMessage(`GRID: Connected as ${userInfo.email} (${userInfo.tier} tier)`);
        vscode.commands.executeCommand('setContext', 'grid.tier', userInfo.tier);
    } catch (e) {
        console.error('Failed to store token:', e);
        vscode.window.showErrorMessage('Failed to store token');
    }
}

async function logout(context: vscode.ExtensionContext) {
    await context.secrets.delete(TOKEN_KEY);
    currentTier = 'community';
    vscode.commands.executeCommand('setContext', 'grid.tier', 'community');
    vscode.window.showInformationMessage('GRID: Signed out. Now using Community tier.');
}

async function checkConnection(context: vscode.ExtensionContext) {
    const token = await context.secrets.get(TOKEN_KEY);

    if (!token) {
        // Community mode - no token needed, no blocking
        currentTier = 'community';
        vscode.commands.executeCommand('setContext', 'grid.tier', 'community');
        return;
    }

    // Validate existing token in background
    const hubUrl = vscode.workspace.getConfiguration().get<string>(HUB_URL_CONFIG, 'https://grideditor.com');
    const userInfo = await validateToken(hubUrl, token);

    if (userInfo) {
        currentTier = userInfo.tier;
        vscode.commands.executeCommand('setContext', 'grid.tier', userInfo.tier);
        vscode.window.setStatusBarMessage(`GRID ${userInfo.tier}: Active`, 5000);
    } else {
        // Token expired/invalid - fallback to community, don't block
        currentTier = 'community';
        vscode.commands.executeCommand('setContext', 'grid.tier', 'community');
        vscode.window.showWarningMessage('GRID: Your session has expired. Please reconnect for Pro/Enterprise features.');
    }
}

async function sendTelemetry(context: vscode.ExtensionContext) {
    const enabled = vscode.workspace.getConfiguration().get(TELEMETRY_CONFIG);
    if (!enabled) {return;}

    const token = await context.secrets.get(TOKEN_KEY);
    if (!token) {return;} // Only track authenticated users

    const hubUrl = vscode.workspace.getConfiguration().get<string>(HUB_URL_CONFIG, 'https://grideditor.com');
    const url = new URL('/api/telemetry', hubUrl);
    const client = url.protocol === 'https:' ? https : http;

    const payload = JSON.stringify({
        event: 'heartbeat',
        timestamp: new Date().toISOString(),
        version: vscode.version,
        tier: currentTier
    });

    const req = client.request(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    }, () => { /* Fire and forget */ });

    req.on('error', (e) => console.error('Telemetry Error', e));
    req.write(payload);
    req.end();
}
