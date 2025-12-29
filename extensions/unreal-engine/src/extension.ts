/*--------------------------------------------------------------------------------------
 *  Copyright 2025 GRID. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as net from 'node:net';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';

const execAsync = promisify(exec);

// GRID-Unreal Bridge connection state
let unrealClient: net.Socket | null = null;
let unrealOutputChannel: vscode.OutputChannel | null = null;
let portWatcher: fsSync.FSWatcher | null = null;
let currentPort: number = 0;

/**
 * Connect to the Unreal Editor plugin via TCP.
 * The plugin writes its port to Saved/Config/GRID/Port.txt
 */
async function connectToUnreal(projectRoot: string): Promise<void> {
	const portFilePath = path.join(projectRoot, 'Saved', 'Config', 'GRID', 'Port.txt');

	try {
		const portContent = await fs.readFile(portFilePath, 'utf8');
		const port = Number.parseInt(portContent.trim(), 10);

		if (Number.isNaN(port) || port <= 0 || port > 65535) {
			console.log('[GRID-UE] Invalid port in Port.txt');
			return;
		}

		if (port === currentPort && unrealClient?.writable) {
			return; // Already connected to this port
		}

		// Disconnect existing connection
		if (unrealClient) {
			unrealClient.destroy();
			unrealClient = null;
		}

		currentPort = port;
		console.log(`[GRID-UE] Connecting to Unreal Editor on port ${port}...`);

		if (!unrealOutputChannel) {
			unrealOutputChannel = vscode.window.createOutputChannel('Unreal Engine');
		}

		unrealClient = new net.Socket();

		unrealClient.connect(port, '127.0.0.1', () => {
			console.log('[GRID-UE] Connected to Unreal Editor');
			unrealOutputChannel?.appendLine('[GRID] Connected to Unreal Editor');

			// Send connection check
			sendCommand('check_connection', {}).then(response => {
				if (response?.success) {
					vscode.window.showInformationMessage(
						`GRID connected to Unreal Editor (v${String(response.data?.engine_version ?? 'unknown')})`
					);
				}
			}).catch(() => { });
		});

		unrealClient.on('data', (data) => {
			const message = data.toString();
			unrealOutputChannel?.appendLine(`[UE] ${message}`);
		});

		unrealClient.on('close', () => {
			console.log('[GRID-UE] Connection closed');
			unrealClient = null;
			currentPort = 0;
		});

		unrealClient.on('error', (err) => {
			console.log(`[GRID-UE] Connection error: ${err.message}`);
			unrealClient = null;
			currentPort = 0;
		});

	} catch {
		// Port file doesn't exist yet - Unreal not running
		console.log('[GRID-UE] Port file not found - Unreal Editor not running');
	}
}

/**
 * Send a command to Unreal Editor and wait for response
 */
async function sendCommand(command: string, params: Record<string, unknown>): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string } | null> {
	return new Promise((resolve) => {
		if (!unrealClient?.writable) {
			resolve(null);
			return;
		}

		const request = JSON.stringify({ command, params });
		let responseData = '';

		const onData = (data: Buffer) => {
			responseData += data.toString();
			try {
				const response = JSON.parse(responseData) as { success: boolean; data?: Record<string, unknown>; error?: string };
				unrealClient?.off('data', onData);
				resolve(response);
			} catch {
				// Incomplete JSON, wait for more data
			}
		};

		unrealClient.on('data', onData);
		unrealClient.write(request);

		// Timeout after 10 seconds
		setTimeout(() => {
			unrealClient?.off('data', onData);
			resolve(null);
		}, 10000);
	});
}

/**
 * Watch for port file changes to auto-reconnect when Unreal starts
 */
function watchPortFile(projectRoot: string): void {
	const portDir = path.join(projectRoot, 'Saved', 'Config', 'GRID');

	// Ensure directory exists
	fsSync.mkdirSync(portDir, { recursive: true });



	if (portWatcher) {
		portWatcher.close();
	}

	// Watch the directory for changes
	portWatcher = fsSync.watch(portDir, (_eventType, filename) => {
		if (filename === 'Port.txt') {
			console.log('[GRID-UE] Port file changed, reconnecting...');
			void connectToUnreal(projectRoot);
		}
	});

	// Try initial connection
	void connectToUnreal(projectRoot);
}

interface UProjectFile {
	path: string;
	name: string;
	engineVersion?: string;
	projectRoot: string;
}

export function activate(context: vscode.ExtensionContext): void {
	console.log('Unreal Engine extension activated');

	// Auto-detect .uproject files on activation
	void detectAndSetupUnrealProject(context);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('unrealEngine.installPlugin', () => {
			void installGridPlugin(context);
		}),
		vscode.commands.registerCommand('unrealEngine.refreshProject', () => {
			void refreshProjectFiles();
		}),
		vscode.commands.registerCommand('unrealEngine.buildEditor', () => {
			void buildEditor();
		})
	);

	// Watch for .uproject file changes
	const watcher = vscode.workspace.createFileSystemWatcher('**/*.uproject');
	watcher.onDidCreate(() => {
		void detectAndSetupUnrealProject(context);
	});
	context.subscriptions.push(watcher);
}

async function detectAndSetupUnrealProject(context: vscode.ExtensionContext): Promise<void> {
	try {
		const config = vscode.workspace.getConfiguration('unrealEngine');
		const autoInstall = config.get<boolean>('autoInstallPlugin', true);

		const projects = await findUProjectFiles();

		if (projects.length === 0) {
			console.log('No Unreal Engine project detected');
			return;
		}

		// Show notification for detected project
		const project = projects[0]; // Use first project if multiple found

		// Start watching for Unreal Editor connection
		watchPortFile(project.projectRoot);

		const selection = await vscode.window.showInformationMessage(
			`Detected Unreal Engine project: ${project.name}`,
			'Install GRID Plugin',
			'Dismiss'
		);

		if (selection === 'Install GRID Plugin' && autoInstall) {
			await installGridPlugin(context, project);
		}
	} catch (error) {
		console.error('Error detecting Unreal project:', error);
	}
}

async function findUProjectFiles(): Promise<UProjectFile[]> {
	const files = await vscode.workspace.findFiles('**/*.uproject', '**/node_modules/**', 10);

	const projects: UProjectFile[] = [];

	for (const uri of files) {
		const filePath = uri.fsPath;
		const projectRoot = path.dirname(filePath);
		const name = path.basename(filePath, '.uproject');

		// Try to read engine version
		let engineVersion: string | undefined;
		try {
			const content = await fs.readFile(filePath, 'utf8');
			const json = JSON.parse(content) as { EngineAssociation?: string };
			engineVersion = json.EngineAssociation;
		} catch (error) {
			console.error('Failed to parse .uproject file:', error);
		}

		projects.push({
			path: filePath,
			name,
			engineVersion,
			projectRoot
		});
	}

	return projects;
}

async function installGridPlugin(context: vscode.ExtensionContext, project?: UProjectFile): Promise<void> {
	try {
		const projects = project ? [project] : await findUProjectFiles();

		if (projects.length === 0) {
			await vscode.window.showErrorMessage('No Unreal Engine project found in workspace');
			return;
		}

		const targetProject = projects[0];
		if (!targetProject) {
			return;
		}

		// Find engine installation path
		const enginePath = await findEngineInstallPath(targetProject.engineVersion);
		if (!enginePath) {
			// Fallback to project-local installation
			const pluginsDir = path.join(targetProject.projectRoot, 'Plugins', 'GRID');
			await fs.mkdir(pluginsDir, { recursive: true });
			const templateDir = path.join(context.extensionPath, 'plugin-template');
			await copyPluginFiles(templateDir, pluginsDir);

			await vscode.window.showInformationMessage(
				`GRID plugin installed to project (engine path not found). Restart Unreal Editor to activate.`
			);
			return;
		}

		// Install to Engine/Plugins/Marketplace/GRID (or Engine/Plugins/GRID)
		const enginePluginsDir = path.join(enginePath, 'Engine', 'Plugins', 'Marketplace', 'GRID');

		// Check if already installed
		try {
			await fs.access(path.join(enginePluginsDir, 'GRID.uplugin'));
			const update = await vscode.window.showInformationMessage(
				'GRID plugin already installed in engine. Update?',
				'Update',
				'Skip'
			);
			if (update !== 'Update') {
				return;
			}
		} catch {
			// Plugin not installed yet - continue
		}

		await fs.mkdir(enginePluginsDir, { recursive: true });

		// Copy plugin template files
		const templateDir = path.join(context.extensionPath, 'plugin-template');
		await copyPluginFiles(templateDir, enginePluginsDir);

		await vscode.window.showInformationMessage(
			`GRID plugin installed to Unreal Engine ${targetProject.engineVersion || 'installation'}. All projects using this engine will have GRID support.`,
			'OK'
		);

	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await vscode.window.showErrorMessage(`Failed to install GRID plugin: ${message}`);
	}
}

/**
 * Find the Unreal Engine installation path for a given engine version.
 * Checks Windows registry and common installation locations.
 */
async function findEngineInstallPath(engineVersion?: string): Promise<string | null> {
	if (process.platform !== 'win32') {
		// TODO: Add macOS/Linux support
		return null;
	}

	// Common Epic Games installation paths
	const commonPaths = [
		'C:\\Program Files\\Epic Games',
		'C:\\Program Files (x86)\\Epic Games',
		'D:\\Epic Games',
		'E:\\Epic Games'
	];

	// If we have a specific version, look for that
	if (engineVersion) {
		for (const basePath of commonPaths) {
			const versionPath = path.join(basePath, `UE_${engineVersion}`);
			try {
				await fs.access(versionPath);
				return versionPath;
			} catch {
				// Try without UE_ prefix
				const altPath = path.join(basePath, engineVersion);
				try {
					await fs.access(altPath);
					return altPath;
				} catch {
					continue;
				}
			}
		}
	}

	// Try to find any UE installation
	for (const basePath of commonPaths) {
		try {
			const entries = await fs.readdir(basePath);
			for (const entry of entries) {
				if (entry.startsWith('UE_') || entry.match(/^\d+\.\d+/)) {
					const enginePath = path.join(basePath, entry);
					try {
						await fs.access(path.join(enginePath, 'Engine'));
						return enginePath;
					} catch {
						continue;
					}
				}
			}
		} catch {
			continue;
		}
	}

	// Try to read from registry (Windows)
	try {
		const { stdout } = await execAsync(
			'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\EpicGames\\Unreal Engine" /s /v "InstalledDirectory"',
			{ timeout: 5000 }
		);

		const match = stdout.match(/InstalledDirectory\s+REG_SZ\s+(.+)/);
		if (match?.[1]) {
			const enginePath = match[1].trim();
			try {
				await fs.access(path.join(enginePath, 'Engine'));
				return enginePath;
			} catch {
				// Path doesn't exist
			}
		}
	} catch {
		// Registry query failed
	}

	return null;
}

async function copyPluginFiles(source: string, destination: string): Promise<void> {
	try {
		await fs.access(source);
	} catch {
		console.warn('Plugin template not found, creating minimal plugin structure');
		// Create minimal .uplugin file
		const upluginContent = {
			FileVersion: 3,
			Version: 1,
			VersionName: '1.0',
			FriendlyName: 'GRID IDE Bridge',
			Description: 'Enables communication between GRID IDE and Unreal Editor',
			Category: 'Developer Tools',
			CreatedBy: 'GRID',
			CreatedByURL: 'https://grideditor.com',
			DocsURL: '',
			MarketplaceURL: '',
			SupportURL: '',
			CanContainContent: false,
			IsBetaVersion: false,
			IsExperimentalVersion: false,
			Installed: false,
			Modules: [
				{
					Name: 'GRIDEditorBridge',
					Type: 'Editor',
					LoadingPhase: 'PostEngineInit'
				}
			]
		};

		await fs.writeFile(
			path.join(destination, 'GRID.uplugin'),
			JSON.stringify(upluginContent, null, '\t'),
			'utf8'
		);
		return;
	}

	// Copy all files from template
	const files = await fs.readdir(source);
	for (const file of files) {
		const srcPath = path.join(source, file);
		const destPath = path.join(destination, file);

		const stat = await fs.stat(srcPath);
		if (stat.isDirectory()) {
			await fs.mkdir(destPath, { recursive: true });
			await copyPluginFiles(srcPath, destPath);
		} else {
			await fs.copyFile(srcPath, destPath);
		}
	}
}

async function refreshProjectFiles(): Promise<void> {
	try {
		const projects = await findUProjectFiles();

		if (projects.length === 0) {
			await vscode.window.showErrorMessage('No Unreal Engine project found');
			return;
		}

		const project = projects[0];
		if (!project) {
			return;
		}

		// Sanitize path to prevent command injection
		const sanitizedPath = project.path.replaceAll(/["'`]/g, '');
		const sanitizedRoot = project.projectRoot.replaceAll(/["'`]/g, '');

		// Determine platform
		const isWindows = process.platform === 'win32';
		const command = isWindows
			? `"${sanitizedPath}" -projectfiles`
			: `sh "${sanitizedPath}" -projectfiles`;

		await vscode.window.showInformationMessage('Refreshing Unreal Engine project files...');

		await execAsync(command, {
			cwd: sanitizedRoot,
			timeout: 60000 // 60 second timeout
		});

		await vscode.window.showInformationMessage('Project files refreshed successfully');
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await vscode.window.showErrorMessage(`Failed to refresh project files: ${message}`);
	}
}

async function buildEditor(): Promise<void> {
	try {
		const projects = await findUProjectFiles();

		if (projects.length === 0) {
			await vscode.window.showErrorMessage('No Unreal Engine project found');
			return;
		}

		const project = projects[0];
		if (!project) {
			return;
		}

		// This is a placeholder - real implementation would use UnrealBuildTool
		const selection = await vscode.window.showInformationMessage(
			'Editor build initiated. Use Unreal Build Tool or IDE compilation for full builds.',
			'Open Terminal'
		);

		if (selection === 'Open Terminal') {
			const terminal = vscode.window.createTerminal('Unreal Build');
			terminal.sendText(`cd "${project.projectRoot}"`);
			terminal.show();
		}
	} catch (error) {
		console.error('Error building editor:', error);
	}
}

export function deactivate(): void {
	console.log('Unreal Engine extension deactivated');

	// Clean up Unreal connection
	if (unrealClient) {
		unrealClient.destroy();
		unrealClient = null;
	}

	if (portWatcher) {
		portWatcher.close();
		portWatcher = null;
	}

	if (unrealOutputChannel) {
		unrealOutputChannel.dispose();
		unrealOutputChannel = null;
	}
}
