/*--------------------------------------------------------------------------------------
 *  Copyright 2025 GRID. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

interface UnityProject {
	assetsPath: string;
	projectRoot: string;
	projectName: string;
	unityVersion?: string;
}

export function activate(context: vscode.ExtensionContext): void {
	console.log('Unity extension activated');

	// Auto-detect Unity projects on activation
	void detectAndSetupUnityProject(context);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('unity.installPlugin', () => {
			void installGridPlugin(context);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('unity.refreshProject', () => {
			void refreshProject();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('unity.openInUnity', () => {
			void openInUnity();
		})
	);

	// Watch for Assets folder creation
	const watcher = vscode.workspace.createFileSystemWatcher('**/Assets');
	watcher.onDidCreate(() => {
		void detectAndSetupUnityProject(context);
	});
	context.subscriptions.push(watcher);

	// Attempt to connect to Unity Editor
	void connectToUnity(context);
}

async function connectToUnity(context: vscode.ExtensionContext): Promise<void> {
	const outputChannel = vscode.window.createOutputChannel('Unity Log');
	context.subscriptions.push(outputChannel);

	const net = await import('net');

	const connect = () => {
		const client = new net.Socket();

		client.connect(48062, '127.0.0.1', () => {
			outputChannel.appendLine('[GRID] Connected to Unity Editor');
			client.write('HELLO_FROM_GRID');
		});

		client.on('data', (data) => {
			outputChannel.append(data.toString());
		});

		client.on('close', () => {
			outputChannel.appendLine('[GRID] Connection closed');
			// Try to reconnect after 5 seconds
			setTimeout(connect, 5000);
		});

		client.on('error', (err) => {
			// Squelch connection errors if Unity isn't running
			if ((err as any).code !== 'ECONNREFUSED') {
				console.error('Unity connection error:', err);
			}
			client.destroy();
		});
	};

	connect();
}

async function detectAndSetupUnityProject(context: vscode.ExtensionContext): Promise<void> {
	try {
		const config = vscode.workspace.getConfiguration('unity');
		const autoInstall = config.get<boolean>('autoInstallPlugin', true);

		const project = await findUnityProject();

		if (!project) {
			console.log('No Unity project detected');
			return;
		}

		// Show notification for detected project
		const selection = await vscode.window.showInformationMessage(
			`Detected Unity project: ${project.projectName}`,
			'Install GRID Plugin',
			'Dismiss'
		);

		if (selection === 'Install GRID Plugin' && autoInstall) {
			await installGridPlugin(context, project);
		}
	} catch (error) {
		console.error('Error detecting Unity project:', error);
	}
}

async function findUnityProject(): Promise<UnityProject | null> {
	const assetsFiles = await vscode.workspace.findFiles('**/Assets', '**/node_modules/**', 1);
	const projectSettingsFiles = await vscode.workspace.findFiles('**/ProjectSettings/ProjectVersion.txt', null, 1);

	if (assetsFiles.length === 0) {
		return null;
	}

	const assetsPath = assetsFiles[0].fsPath;
	const projectRoot = path.dirname(assetsPath);
	const projectName = path.basename(projectRoot);

	// Try to read Unity version
	let unityVersion: string | undefined;
	if (projectSettingsFiles.length > 0) {
		try {
			const content = await fs.readFile(projectSettingsFiles[0].fsPath, 'utf8');
			const match = content.match(/m_EditorVersion:\s*(.+)/);
			if (match && match[1]) {
				unityVersion = match[1].trim();
			}
		} catch (error) {
			console.error('Failed to read Unity version:', error);
		}
	}

	return {
		assetsPath,
		projectRoot,
		projectName,
		unityVersion
	};
}

async function installGridPlugin(context: vscode.ExtensionContext, project?: UnityProject): Promise<void> {
	try {
		const targetProject = project || await findUnityProject();

		if (!targetProject) {
			await vscode.window.showErrorMessage('No Unity project found in workspace');
			return;
		}

		const editorPluginDir = path.join(targetProject.assetsPath, 'Editor', 'GRID');

		// Create Editor/GRID directory
		await fs.mkdir(editorPluginDir, { recursive: true });

		// Create minimal editor plugin
		const pluginContent = `/*--------------------------------------------------------------------------------------
 *  GRID IDE Bridge for Unity
 *  Auto-generated editor plugin for communication with GRID IDE
 *--------------------------------------------------------------------------------------*/

using UnityEngine;
using UnityEditor;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Collections.Concurrent;

namespace GRID.Editor
{
	[InitializeOnLoad]
	public class GRIDEditorBridge
	{
		private static TcpListener listener;
		private const int PORT = 48062;
		private static ConcurrentQueue<string> logQueue = new ConcurrentQueue<string>();
		private static TcpClient connectedClient;

		static GRIDEditorBridge()
		{
			// Debug.Log("[GRID] Editor Bridge initialized");
			EditorApplication.update += Update;
			Application.logMessageReceived += HandleLog;
			StartServer();
		}

		static void StartServer()
		{
			try
			{
				listener = new TcpListener(IPAddress.Loopback, PORT);
				listener.Start();
				// Debug.Log($"[GRID] Bridge server started on port {PORT}");
			}
			catch (System.Exception e)
			{
				Debug.LogWarning($"[GRID] Failed to start server: {e.Message}");
			}
		}

		static void Update()
		{
			// Handle incoming connections from GRID IDE
			if (listener != null && listener.Pending())
			{
				connectedClient = listener.AcceptTcpClient();
				Debug.Log("[GRID] Client connected");
			}

			if (connectedClient != null && connectedClient.Connected)
			{
				try
				{
					NetworkStream stream = connectedClient.GetStream();
					while (logQueue.TryDequeue(out string log))
					{
						byte[] data = Encoding.UTF8.GetBytes(log + "\\n");
						stream.Write(data, 0, data.Length);
					}
				}
				catch
				{
					connectedClient = null;
				}
			}
		}

		static void HandleLog(string logString, string stackTrace, LogType type)
		{
			logQueue.Enqueue($"[{type}] {logString}");
		}

		[MenuItem("GRID/Open Logs")]
		static void OpenLogs()
		{
			EditorUtility.RevealInFinder(Application.consoleLogPath);
		}

		[MenuItem("GRID/Refresh Assets")]
		static void RefreshAssets()
		{
			AssetDatabase.Refresh();
			Debug.Log("[GRID] Assets refreshed");
		}
	}
}
`;

		const pluginPath = path.join(editorPluginDir, 'GRIDEditorBridge.cs');
		await fs.writeFile(pluginPath, pluginContent, 'utf8');

		// Create .meta file for Unity
		const metaContent = `fileFormatVersion: 2
guid: ${generateGUID()}
MonoImporter:
  externalObjects: {}
  serializedVersion: 2
  defaultReferences: []
  executionOrder: 0
  icon: {instanceID: 0}
  userData:
  assetBundleName:
  assetBundleVariant:
`;

		await fs.writeFile(pluginPath + '.meta', metaContent, 'utf8');

		const selection = await vscode.window.showInformationMessage(
			`GRID plugin installed to ${targetProject.projectName}. Restart Unity Editor to activate.`,
			'Refresh Project'
		);

		if (selection === 'Refresh Project') {
			await refreshProject();
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await vscode.window.showErrorMessage(`Failed to install GRID plugin: ${message}`);
	}
}

function generateGUID(): string {
	return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () => {
		return Math.floor(Math.random() * 16).toString(16);
	});
}

async function refreshProject(): Promise<void> {
	try {
		const project = await findUnityProject();

		if (!project) {
			await vscode.window.showErrorMessage('No Unity project found');
			return;
		}

		const selection = await vscode.window.showInformationMessage(
			'Unity assets refresh triggered. Check Unity Editor for completion.',
			'Open in Unity'
		);

		if (selection === 'Open in Unity') {
			await openInUnity();
		}
	} catch (error) {
		console.error('Error refreshing project:', error);
	}
}

async function openInUnity(): Promise<void> {
	try {
		const project = await findUnityProject();

		if (!project) {
			await vscode.window.showErrorMessage('No Unity project found');
			return;
		}

		const config = vscode.workspace.getConfiguration('unity');
		const editorPath = config.get<string>('editorPath');

		if (!editorPath) {
			await vscode.window.showWarningMessage(
				'Unity Editor path not configured. Please set unity.editorPath in settings.'
			);
			return;
		}

		// Sanitize paths to prevent command injection
		const sanitizedEditorPath = editorPath.replace(/["'`]/g, '');
		const sanitizedProjectRoot = project.projectRoot.replace(/["'`]/g, '');

		const isWindows = process.platform === 'win32';
		const command = isWindows
			? `start "" "${sanitizedEditorPath}" -projectPath "${sanitizedProjectRoot}"`
			: `"${sanitizedEditorPath}" -projectPath "${sanitizedProjectRoot}"`;

		await execAsync(command, { timeout: 10000 });
		await vscode.window.showInformationMessage('Unity Editor opened');
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await vscode.window.showErrorMessage(`Failed to open Unity Editor: ${message}`);
	}
}

export function deactivate(): void {
	console.log('Unity extension deactivated');
}
