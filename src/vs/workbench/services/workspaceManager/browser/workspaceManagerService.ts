/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { IWorkspaceManagerService, IWorkspaceMetadata, ICreateWorkspaceOptions, IWorkspaceState, IWorkspaceTemplate, IWorkspacesAddedEvent, IWorkspacesRemovedEvent, IWorkspaceUpdatedEvent, IActiveWorkspaceChangedEvent } from '../common/workspaceManager.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService, WorkbenchState } from '../../../../platform/workspace/common/workspace.js';
import { IHostService } from '../../../../workbench/services/host/browser/host.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { basename, dirname, joinPath } from '../../../../base/common/resources.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IStoredWorkspace, IStoredWorkspaceFolder } from '../../../../platform/workspaces/common/workspaces.js';
import { IEditorService } from '../../../../workbench/services/editor/common/editorService.js';
import { IViewsService } from '../../../../workbench/services/views/common/viewsService.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { IWorkbenchLayoutService, Parts } from '../../layout/browser/layoutService.js';

const WORKSPACES_STORAGE_KEY = 'workspaceManager.workspaces';
const WORKSPACE_STATE_FILE = '.workspace-state.json';
const WORKSPACE_METADATA_FILE = '.workspace-metadata.json';
const TEMPLATES_STORAGE_KEY = 'workspaceManager.templates';

interface IStoredWorkspaceMetadata extends Omit<IWorkspaceMetadata, 'rootUri' | 'workspaceFile'> {
	rootUri: string;
	workspaceFile: string;
}

interface IStoredWorkspaceConfiguration extends IStoredWorkspace {
	settings?: { [key: string]: unknown };
	extensions?: { recommendations?: string[] };
	tasks?: { version: string; tasks: unknown[] };
}

export class WorkspaceManagerService extends Disposable implements IWorkspaceManagerService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidAddWorkspaces = this._register(new Emitter<IWorkspacesAddedEvent>());
	readonly onDidAddWorkspaces: Event<IWorkspacesAddedEvent> = this._onDidAddWorkspaces.event;

	private readonly _onDidRemoveWorkspaces = this._register(new Emitter<IWorkspacesRemovedEvent>());
	readonly onDidRemoveWorkspaces: Event<IWorkspacesRemovedEvent> = this._onDidRemoveWorkspaces.event;

	private readonly _onDidUpdateWorkspace = this._register(new Emitter<IWorkspaceUpdatedEvent>());
	readonly onDidUpdateWorkspace: Event<IWorkspaceUpdatedEvent> = this._onDidUpdateWorkspace.event;

	private readonly _onDidChangeActiveWorkspace = this._register(new Emitter<IActiveWorkspaceChangedEvent>());
	readonly onDidChangeActiveWorkspace: Event<IActiveWorkspaceChangedEvent> = this._onDidChangeActiveWorkspace.event;

	private workspacesCache: IWorkspaceMetadata[] | undefined;
	private templatesCache: IWorkspaceTemplate[] | undefined;

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IHostService private readonly hostService: IHostService,
		@IEditorService private readonly editorService: IEditorService,
		@IViewsService private readonly viewsService: IViewsService,
		@ILayoutService private readonly layoutService: IWorkbenchLayoutService
	) {
		super();
		this._registerDefaultTemplates();
	}

	async getWorkspaces(): Promise<IWorkspaceMetadata[]> {
		if (this.workspacesCache) {
			return this.workspacesCache;
		}

		const stored = this.storageService.get(WORKSPACES_STORAGE_KEY, StorageScope.APPLICATION);
		if (!stored) {
			this.workspacesCache = [];
			return [];
		}

		try {
			const parsed: IStoredWorkspaceMetadata[] = JSON.parse(stored);
			this.workspacesCache = parsed.map(w => this._deserializeWorkspace(w));
			return this.workspacesCache;
		} catch (error) {
			console.error('Failed to parse workspaces from storage:', error);
			this.workspacesCache = [];
			return [];
		}
	}

	async getWorkspace(id: string): Promise<IWorkspaceMetadata | undefined> {
		const workspaces = await this.getWorkspaces();
		return workspaces.find(w => w.id === id);
	}

	async getActiveWorkspace(): Promise<IWorkspaceMetadata | undefined> {
		const workspace = this.contextService.getWorkspace();
		if (!workspace || this.contextService.getWorkbenchState() === WorkbenchState.EMPTY) {
			return undefined;
		}

		// Try to find the workspace in our registry by matching the workspace file URI
		const workspaces = await this.getWorkspaces();
		const workspaceFileUri = workspace.configuration;

		if (workspaceFileUri) {
			return workspaces.find(w => w.workspaceFile.toString() === workspaceFileUri.toString());
		}

		return undefined;
	}

	async createWorkspace(options: ICreateWorkspaceOptions): Promise<IWorkspaceMetadata> {
		// Generate unique ID and create workspace folder
		const id = generateUuid();
		const workspaceFolderName = this._sanitizeFolderName(options.name);
		const workspaceRoot = joinPath(options.parentDirectory, workspaceFolderName);

		// Create workspace directory
		await this.fileService.createFolder(workspaceRoot);

		// Create .code-workspace file
		const workspaceFileName = `${workspaceFolderName}.code-workspace`;
		const workspaceFile = joinPath(workspaceRoot, workspaceFileName);

		const workspaceConfig: IStoredWorkspaceConfiguration = {
			folders: options.folders?.map(uri => ({
				path: uri.path
			} as IStoredWorkspaceFolder)) ?? [],
			settings: {}
		};

		// Apply template if specified
		if (options.template) {
			const template = await this._getTemplate(options.template);
			if (template) {
				await this._applyTemplate(template, workspaceRoot, workspaceConfig);
			}
		}

		// Write workspace file
		const workspaceContent = JSON.stringify(workspaceConfig, null, '\t');
		await this.fileService.writeFile(workspaceFile, VSBuffer.fromString(workspaceContent));

		// Create metadata
		const now = Date.now();
		const metadata: IWorkspaceMetadata = {
			id,
			name: options.name,
			description: options.description,
			rootUri: workspaceRoot,
			workspaceFile,
			createdAt: now,
			lastAccessedAt: now,
			lastModifiedAt: now,
			color: options.color,
			icon: options.icon,
			tags: options.tags,
			template: options.template,
			pinned: false,
			properties: {}
		};

		// Save metadata to workspace folder
		await this._saveWorkspaceMetadata(metadata);

		// Add to registry
		const workspaces = await this.getWorkspaces();
		workspaces.push(metadata);
		await this._saveWorkspaces(workspaces);

		this._onDidAddWorkspaces.fire({ workspaces: [metadata] });

		// Open workspace if requested
		if (options.openAfterCreate) {
			await this.switchWorkspace(id);
		}

		return metadata;
	}

	async updateWorkspace(id: string, updates: Partial<IWorkspaceMetadata>): Promise<IWorkspaceMetadata> {
		const workspaces = await this.getWorkspaces();
		const index = workspaces.findIndex(w => w.id === id);

		if (index === -1) {
			throw new Error(`Workspace with id ${id} not found`);
		}

		const updated = {
			...workspaces[index],
			...updates,
			lastModifiedAt: Date.now()
		};

		workspaces[index] = updated;
		await this._saveWorkspaces(workspaces);
		await this._saveWorkspaceMetadata(updated);

		this._onDidUpdateWorkspace.fire({ workspace: updated });
		return updated;
	}

	async deleteWorkspace(id: string, deleteFiles: boolean = false): Promise<void> {
		const workspaces = await this.getWorkspaces();
		const workspace = workspaces.find(w => w.id === id);

		if (!workspace) {
			throw new Error(`Workspace with id ${id} not found`);
		}

		// Remove from registry
		const filtered = workspaces.filter(w => w.id !== id);
		await this._saveWorkspaces(filtered);

		// Delete files if requested
		if (deleteFiles) {
			try {
				await this.fileService.del(workspace.rootUri, { recursive: true });
			} catch (error) {
				console.error('Failed to delete workspace files:', error);
			}
		}

		this._onDidRemoveWorkspaces.fire({ workspaceIds: [id] });
	}

	async switchWorkspace(id: string): Promise<void> {
		const workspace = await this.getWorkspace(id);

		if (!workspace) {
			throw new Error(`Workspace with id ${id} not found`);
		}

		// Save current workspace state before switching
		const currentWorkspace = await this.getActiveWorkspace();
		if (currentWorkspace) {
			await this.saveWorkspaceState(currentWorkspace.id);
		}

		// Update last accessed time
		await this.updateWorkspace(id, { lastAccessedAt: Date.now() });

		// Open the workspace
		await this.hostService.openWindow([{ workspaceUri: workspace.workspaceFile }], { forceReuseWindow: true });

		this._onDidChangeActiveWorkspace.fire({
			previous: currentWorkspace,
			current: workspace
		});
	}

	async saveWorkspaceState(workspaceId?: string): Promise<void> {
		const workspace = workspaceId ? await this.getWorkspace(workspaceId) : await this.getActiveWorkspace();

		if (!workspace) {
			return;
		}

		// Collect current state
		const state: IWorkspaceState = {
			openEditors: this.editorService.editors.map(editor => ({
				resource: editor.resource!,
				viewState: undefined, // Could be enhanced to save editor view state
				options: undefined
			})),
			activeEditor: this.editorService.activeEditor?.resource,
			sidebarState: {
				visible: this.layoutService.isVisible(Parts.SIDEBAR_PART),
				width: this.layoutService.getSize(Parts.SIDEBAR_PART).width
			},
			panelState: {
				visible: this.layoutService.isVisible(Parts.PANEL_PART),
				height: this.layoutService.getSize(Parts.PANEL_PART).height
			}
		};

		// Save state to workspace folder
		const stateFile = joinPath(workspace.rootUri, WORKSPACE_STATE_FILE);
		const stateContent = JSON.stringify(state, null, '\t');
		await this.fileService.writeFile(stateFile, VSBuffer.fromString(stateContent));
	}

	async loadWorkspaceState(workspaceId: string): Promise<IWorkspaceState | undefined> {
		const workspace = await this.getWorkspace(workspaceId);

		if (!workspace) {
			return undefined;
		}

		try {
			const stateFile = joinPath(workspace.rootUri, WORKSPACE_STATE_FILE);
			const content = await this.fileService.readFile(stateFile);
			return JSON.parse(content.value.toString());
		} catch (error) {
			// State file doesn't exist or is invalid
			return undefined;
		}
	}

	async getTemplates(): Promise<IWorkspaceTemplate[]> {
		if (this.templatesCache) {
			return this.templatesCache;
		}

		const stored = this.storageService.get(TEMPLATES_STORAGE_KEY, StorageScope.APPLICATION);
		if (!stored) {
			return [];
		}

		try {
			this.templatesCache = JSON.parse(stored);
			return this.templatesCache ?? [];
		} catch (error) {
			console.error('Failed to parse templates from storage:', error);
			return [];
		}
	}

	async registerTemplate(template: IWorkspaceTemplate): Promise<void> {
		const templates = await this.getTemplates();
		const index = templates.findIndex(t => t.id === template.id);

		if (index !== -1) {
			templates[index] = template;
		} else {
			templates.push(template);
		}

		await this._saveTemplates(templates);
	}

	async unregisterTemplate(templateId: string): Promise<void> {
		const templates = await this.getTemplates();
		const filtered = templates.filter(t => t.id !== templateId);
		await this._saveTemplates(filtered);
	}

	async exportWorkspace(id: string, destination: URI): Promise<void> {
		const workspace = await this.getWorkspace(id);

		if (!workspace) {
			throw new Error(`Workspace with id ${id} not found`);
		}

		// Create export package with metadata and workspace file
		const exportData = {
			metadata: workspace,
			workspaceConfig: await this.fileService.readFile(workspace.workspaceFile)
		};

		const exportContent = JSON.stringify(exportData, null, '\t');
		await this.fileService.writeFile(destination, VSBuffer.fromString(exportContent));
	}

	async importWorkspace(source: URI, parentDirectory: URI): Promise<IWorkspaceMetadata> {
		const content = await this.fileService.readFile(source);
		const imported = JSON.parse(content.value.toString());

		// Create new workspace from imported data
		const options: ICreateWorkspaceOptions = {
			name: imported.metadata.name,
			description: imported.metadata.description,
			parentDirectory,
			color: imported.metadata.color,
			icon: imported.metadata.icon,
			tags: imported.metadata.tags,
			template: imported.metadata.template
		};

		return await this.createWorkspace(options);
	}

	async searchWorkspaces(query: string): Promise<IWorkspaceMetadata[]> {
		const workspaces = await this.getWorkspaces();
		const lowerQuery = query.toLowerCase();

		return workspaces.filter(w =>
			w.name.toLowerCase().includes(lowerQuery) ||
			w.description?.toLowerCase().includes(lowerQuery) ||
			w.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
		);
	}

	async getRecentWorkspaces(limit: number = 10): Promise<IWorkspaceMetadata[]> {
		const workspaces = await this.getWorkspaces();
		return workspaces
			.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
			.slice(0, limit);
	}

	async togglePinWorkspace(id: string): Promise<void> {
		const workspace = await this.getWorkspace(id);

		if (!workspace) {
			throw new Error(`Workspace with id ${id} not found`);
		}

		await this.updateWorkspace(id, { pinned: !workspace.pinned });
	}

	private async _saveWorkspaces(workspaces: IWorkspaceMetadata[]): Promise<void> {
		this.workspacesCache = workspaces;
		const serialized = workspaces.map(w => this._serializeWorkspace(w));
		this.storageService.store(WORKSPACES_STORAGE_KEY, JSON.stringify(serialized), StorageScope.APPLICATION, StorageTarget.MACHINE);
	}

	private async _saveTemplates(templates: IWorkspaceTemplate[]): Promise<void> {
		this.templatesCache = templates;
		this.storageService.store(TEMPLATES_STORAGE_KEY, JSON.stringify(templates), StorageScope.APPLICATION, StorageTarget.MACHINE);
	}

	private async _saveWorkspaceMetadata(metadata: IWorkspaceMetadata): Promise<void> {
		const metadataFile = joinPath(metadata.rootUri, WORKSPACE_METADATA_FILE);
		const content = JSON.stringify(this._serializeWorkspace(metadata), null, '\t');
		await this.fileService.writeFile(metadataFile, VSBuffer.fromString(content));
	}

	private async _getTemplate(templateId: string): Promise<IWorkspaceTemplate | undefined> {
		const templates = await this.getTemplates();
		return templates.find(t => t.id === templateId);
	}

	private async _applyTemplate(template: IWorkspaceTemplate, workspaceRoot: URI, workspaceConfig: IStoredWorkspaceConfiguration): Promise<void> {
		// Create folders
		if (template.folders) {
			for (const folder of template.folders) {
				const folderUri = joinPath(workspaceRoot, folder.path);
				await this.fileService.createFolder(folderUri);

				// Add to workspace config
				workspaceConfig.folders.push({
					name: folder.name,
					path: folder.path
				});
			}
		}

		// Create files
		if (template.files) {
			for (const file of template.files) {
				const fileUri = joinPath(workspaceRoot, file.path);
				await this.fileService.writeFile(fileUri, VSBuffer.fromString(file.content));
			}
		}

		// Apply settings
		if (template.settings) {
			workspaceConfig.settings = { ...workspaceConfig.settings, ...template.settings };
		}

		// Add extensions recommendations
		if (template.extensions) {
			workspaceConfig.extensions = {
				recommendations: template.extensions
			};
		}

		// Add tasks
		if (template.tasks) {
			workspaceConfig.tasks = {
				version: '2.0.0',
				tasks: template.tasks
			};
		}
	}

	private _sanitizeFolderName(name: string): string {
		return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
	}

	private _serializeWorkspace(workspace: IWorkspaceMetadata): IStoredWorkspaceMetadata {
		return {
			...workspace,
			rootUri: workspace.rootUri.toString(),
			workspaceFile: workspace.workspaceFile.toString()
		};
	}

	private _deserializeWorkspace(stored: IStoredWorkspaceMetadata): IWorkspaceMetadata {
		return {
			...stored,
			rootUri: URI.parse(stored.rootUri),
			workspaceFile: URI.parse(stored.workspaceFile)
		};
	}

	private async _registerDefaultTemplates(): Promise<void> {
		// Register some default templates
		const defaultTemplates: IWorkspaceTemplate[] = [
			{
				id: 'empty',
				name: 'Empty Workspace',
				description: 'A blank workspace with no folders or files',
				icon: 'folder',
				folders: [],
				files: []
			},
			{
				id: 'web-app',
				name: 'Web Application',
				description: 'A workspace for web application development',
				icon: 'globe',
				folders: [
					{ name: 'src', path: 'src' },
					{ name: 'public', path: 'public' },
					{ name: 'tests', path: 'tests' }
				],
				files: [
					{ path: 'README.md', content: '# Web Application\n\nYour project description here.' },
					{ path: '.gitignore', content: 'node_modules/\ndist/\n.env\n' }
				],
				settings: {
					'files.exclude': {
						'**/node_modules': true,
						'**/dist': true
					}
				}
			},
			{
				id: 'python-project',
				name: 'Python Project',
				description: 'A workspace for Python development',
				icon: 'snake',
				folders: [
					{ name: 'src', path: 'src' },
					{ name: 'tests', path: 'tests' },
					{ name: 'docs', path: 'docs' }
				],
				files: [
					{ path: 'README.md', content: '# Python Project\n\nYour project description here.' },
					{ path: '.gitignore', content: '__pycache__/\n*.py[cod]\n.venv/\n' },
					{ path: 'requirements.txt', content: '' }
				],
				settings: {
					'python.linting.enabled': true,
					'python.formatting.provider': 'black'
				}
			},
			{
				id: 'data-science',
				name: 'Data Science',
				description: 'A workspace for data science and analysis',
				icon: 'graph',
				folders: [
					{ name: 'data', path: 'data' },
					{ name: 'notebooks', path: 'notebooks' },
					{ name: 'scripts', path: 'scripts' },
					{ name: 'output', path: 'output' }
				],
				files: [
					{ path: 'README.md', content: '# Data Science Project\n\nYour project description here.' },
					{ path: '.gitignore', content: '*.csv\n*.pkl\ndata/\noutput/\n' }
				]
			}
		];

		for (const template of defaultTemplates) {
			await this.registerTemplate(template);
		}
	}
}

// Register the service
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
registerSingleton(IWorkspaceManagerService, WorkspaceManagerService, InstantiationType.Delayed);
