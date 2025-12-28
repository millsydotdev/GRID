/*--------------------------------------------------------------------------------------
 *  Copyright 2025 GRID. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

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
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('unrealEngine.refreshProject', () => {
			void refreshProjectFiles();
		})
	);

	context.subscriptions.push(
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

		const pluginsDir = path.join(targetProject.projectRoot, 'Plugins', 'GRID');

		// Create Plugins/GRID directory
		await fs.mkdir(pluginsDir, { recursive: true });

		// Copy plugin template files
		const templateDir = path.join(context.extensionPath, 'plugin-template');
		await copyPluginFiles(templateDir, pluginsDir);

		const selection = await vscode.window.showInformationMessage(
			`GRID plugin installed to ${targetProject.name}. Restart Unreal Editor to activate.`,
			'Refresh Project Files'
		);

		if (selection === 'Refresh Project Files') {
			await refreshProjectFiles();
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await vscode.window.showErrorMessage(`Failed to install GRID plugin: ${message}`);
	}
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
			CreatedByURL: 'https://grid.millsy.dev',
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
		const sanitizedPath = project.path.replace(/["'`]/g, '');
		const sanitizedRoot = project.projectRoot.replace(/["'`]/g, '');

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
}
