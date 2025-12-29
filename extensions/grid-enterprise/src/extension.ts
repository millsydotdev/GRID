import * as vscode from 'vscode';
import * as https from 'node:https';

const HUB_URL_CONFIG = 'grid.enterprise.hubUrl';
const TOKEN_KEY = 'grid.enterprise.token';
const TELEMETRY_CONFIG = 'grid.telemetry.enabled';

export function activate(context: vscode.ExtensionContext) {
    console.log('GRID Enterprise Extension Active');

    // Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('grid.connect', () => connectToHub(context)),
        vscode.commands.registerCommand('grid.logout', () => logout(context))
    );

    // Check Auto-Connect on startup
    checkConnection(context);

    // Telemetry Loop (every 5 mins)
    setInterval(() => sendTelemetry(context), 5 * 60 * 1000);
}

export function deactivate() {
    // Cleanup handles by subscriptions
}

async function connectToHub(context: vscode.ExtensionContext) {
    const hubUrl = vscode.workspace.getConfiguration().get(HUB_URL_CONFIG) as string;

    // 1. Prompt user for token (Simple MVP flow)
    const token = await vscode.window.showInputBox({
        title: 'Connect to GRID Hub',
        prompt: `Visit ${hubUrl}/dashboard to get your Connection Token`,
        password: true,
        ignoreFocusOut: true
    });

    if (!token) return;

    // 2. Add validation here...
    try {
        await context.secrets.store(TOKEN_KEY, token);
        vscode.window.showInformationMessage('GRID Enterprise: Connected Successfully');
        checkConnection(context); // Update UI
    } catch (e) {
        console.error('Failed to store token:', e);
        vscode.window.showErrorMessage('Failed to store token');
    }
}

async function logout(context: vscode.ExtensionContext) {
    await context.secrets.delete(TOKEN_KEY);
    vscode.window.showInformationMessage('GRID Enterprise: Signed Out');
}

async function checkConnection(context: vscode.ExtensionContext) {
    const token = await context.secrets.get(TOKEN_KEY);
    if (token) {
        // We could validate the token here
        vscode.window.setStatusBarMessage('GRID Enterprise: Active', 5000);
    }
}

async function sendTelemetry(context: vscode.ExtensionContext) {
    const enabled = vscode.workspace.getConfiguration().get(TELEMETRY_CONFIG);
    if (!enabled) return;

    const token = await context.secrets.get(TOKEN_KEY);
    if (!token) return; // Only track enterprise users

    const hubUrl = vscode.workspace.getConfiguration().get(HUB_URL_CONFIG, 'http://localhost:3000');

    // Simple Ping
    // In real implementation, gather usage stats
    const payload = JSON.stringify({
        event: 'heartbeat',
        timestamp: new Date().toISOString(),
        version: vscode.version
    });

    const req = https.request(`${hubUrl}/api/telemetry`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    }, (res) => {
        // Fire and forget
    });

    req.on('error', (e) => console.error('Telemetry Error', e));
    req.write(payload);
    req.end();
}
