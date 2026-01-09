/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { WorkspaceManagerService } from '../../browser/workspaceManagerService.js';
import { IWorkspaceMetadata, ICreateWorkspaceOptions, IWorkspaceTemplate } from '../../common/workspaceManager.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { URI } from '../../../../../base/common/uri.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFileSystemProvider.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { IWorkspaceContextService, WorkbenchState, Workspace } from '../../../../../platform/workspace/common/workspace.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IEditorService } from '../../../../../workbench/services/editor/common/editorService.js';
import { IViewsService } from '../../../../../workbench/services/views/common/viewsService.js';
import { IWorkbenchLayoutService } from '../../../layout/browser/layoutService.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';

class MockWorkspaceContextService implements Partial<IWorkspaceContextService> {
	private _workspace: Workspace | undefined;

	getWorkspace(): Workspace {
		return this._workspace || new Workspace('test-id', []);
	}

	getWorkbenchState(): WorkbenchState {
		return this._workspace?.configuration ? WorkbenchState.WORKSPACE : WorkbenchState.EMPTY;
	}

	setWorkspace(workspace: Workspace): void {
		this._workspace = workspace;
	}
}

class MockHostService implements Partial<IHostService> {
	lastOpenedWindow: any;

	async openWindow(arg: any, options?: any): Promise<void> {
		this.lastOpenedWindow = { arg, options };
	}
}

class MockEditorService implements Partial<IEditorService> {
	editors: any[] = [];
	activeEditor: any = undefined;
}

class MockViewsService implements Partial<IViewsService> {}

class MockLayoutService implements Partial<IWorkbenchLayoutService> {
	private _visibleParts = new Map<string, boolean>();
	private _sizes = new Map<string, { width: number; height: number }>();

	isVisible(part: string): boolean {
		return this._visibleParts.get(part) ?? false;
	}

	getSize(part: string): { width: number; height: number } {
		return this._sizes.get(part) ?? { width: 200, height: 200 };
	}

	setVisible(part: string, visible: boolean): void {
		this._visibleParts.set(part, visible);
	}

	setSize(part: string, size: { width: number; height: number }): void {
		this._sizes.set(part, size);
	}
}

suite('WorkspaceManagerService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	let workspaceManagerService: WorkspaceManagerService;
	let storageService: TestStorageService;
	let fileService: FileService;
	let contextService: MockWorkspaceContextService;
	let hostService: MockHostService;
	let editorService: MockEditorService;
	let viewsService: MockViewsService;
	let layoutService: MockLayoutService;

	setup(async () => {
		storageService = disposables.add(new TestStorageService());
		fileService = disposables.add(new FileService(new NullLogService()));

		const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
		disposables.add(fileService.registerProvider('file', fileSystemProvider));

		contextService = new MockWorkspaceContextService();
		hostService = new MockHostService();
		editorService = new MockEditorService();
		viewsService = new MockViewsService();
		layoutService = new MockLayoutService();

		workspaceManagerService = disposables.add(new WorkspaceManagerService(
			storageService,
			fileService,
			contextService as IWorkspaceContextService,
			hostService as IHostService,
			editorService as IEditorService,
			viewsService as IViewsService,
			layoutService as IWorkbenchLayoutService
		));
	});

	suite('getWorkspaces', () => {
		test('should return empty array initially', async () => {
			const workspaces = await workspaceManagerService.getWorkspaces();
			assert.strictEqual(workspaces.length, 0);
		});

		test('should cache results', async () => {
			const workspaces1 = await workspaceManagerService.getWorkspaces();
			const workspaces2 = await workspaceManagerService.getWorkspaces();

			assert.strictEqual(workspaces1, workspaces2, 'Should return same cached instance');
		});

		test('should handle corrupted storage data', async () => {
			// Corrupt the storage
			storageService.store('workspaceManager.workspaces', 'invalid-json', -1, 0);

			const workspaces = await workspaceManagerService.getWorkspaces();
			assert.deepStrictEqual(workspaces, []);
		});
	});

	suite('createWorkspace', () => {
		test('should create a new workspace', async () => {
			const options: ICreateWorkspaceOptions = {
				name: 'Test Workspace',
				description: 'A test workspace',
				parentDirectory: URI.file('/workspaces')
			};

			const workspace = await workspaceManagerService.createWorkspace(options);

			assert.ok(workspace.id);
			assert.strictEqual(workspace.name, 'Test Workspace');
			assert.strictEqual(workspace.description, 'A test workspace');
			assert.ok(workspace.createdAt > 0);
			assert.strictEqual(workspace.createdAt, workspace.lastAccessedAt);
			assert.strictEqual(workspace.createdAt, workspace.lastModifiedAt);
		});

		test('should sanitize folder name', async () => {
			const options: ICreateWorkspaceOptions = {
				name: 'Test Workspace!@#$%',
				parentDirectory: URI.file('/workspaces')
			};

			const workspace = await workspaceManagerService.createWorkspace(options);

			// The sanitized folder name should be in the path
			assert.ok(workspace.rootUri.path.includes('test-workspace'));
		});

		test('should create workspace with tags', async () => {
			const options: ICreateWorkspaceOptions = {
				name: 'Tagged Workspace',
				parentDirectory: URI.file('/workspaces'),
				tags: ['dev', 'personal', 'project']
			};

			const workspace = await workspaceManagerService.createWorkspace(options);

			assert.deepStrictEqual(workspace.tags, ['dev', 'personal', 'project']);
		});

		test('should create workspace with color and icon', async () => {
			const options: ICreateWorkspaceOptions = {
				name: 'Styled Workspace',
				parentDirectory: URI.file('/workspaces'),
				color: '#FF0000',
				icon: 'rocket'
			};

			const workspace = await workspaceManagerService.createWorkspace(options);

			assert.strictEqual(workspace.color, '#FF0000');
			assert.strictEqual(workspace.icon, 'rocket');
		});

		test('should emit onDidAddWorkspaces event', async () => {
			const eventPromise = Event.toPromise(workspaceManagerService.onDidAddWorkspaces);

			const options: ICreateWorkspaceOptions = {
				name: 'Event Test',
				parentDirectory: URI.file('/workspaces')
			};

			const workspace = await workspaceManagerService.createWorkspace(options);

			const event = await eventPromise;
			assert.strictEqual(event.workspaces.length, 1);
			assert.strictEqual(event.workspaces[0].id, workspace.id);
		});

		test('should add workspace to registry', async () => {
			const options: ICreateWorkspaceOptions = {
				name: 'Registry Test',
				parentDirectory: URI.file('/workspaces')
			};

			await workspaceManagerService.createWorkspace(options);

			const workspaces = await workspaceManagerService.getWorkspaces();
			assert.strictEqual(workspaces.length, 1);
		});

		test('should create workspace file with .code-workspace extension', async () => {
			const options: ICreateWorkspaceOptions = {
				name: 'File Test',
				parentDirectory: URI.file('/workspaces')
			};

			const workspace = await workspaceManagerService.createWorkspace(options);

			assert.ok(workspace.workspaceFile.path.endsWith('.code-workspace'));
		});

		test('should handle special characters in workspace name', async () => {
			const options: ICreateWorkspaceOptions = {
				name: 'Test & Project (2024)',
				parentDirectory: URI.file('/workspaces')
			};

			const workspace = await workspaceManagerService.createWorkspace(options);

			assert.strictEqual(workspace.name, 'Test & Project (2024)');
		});

		test('should create workspace with initial folders', async () => {
			const options: ICreateWorkspaceOptions = {
				name: 'Multi-folder Workspace',
				parentDirectory: URI.file('/workspaces'),
				folders: [
					URI.file('/projects/project1'),
					URI.file('/projects/project2')
				]
			};

			const workspace = await workspaceManagerService.createWorkspace(options);

			// Verify workspace file was created
			const exists = await fileService.exists(workspace.workspaceFile);
			assert.ok(exists, 'Workspace file should exist');
		});
	});

	suite('getWorkspace', () => {
		test('should retrieve workspace by ID', async () => {
			const created = await workspaceManagerService.createWorkspace({
				name: 'Find Me',
				parentDirectory: URI.file('/workspaces')
			});

			const found = await workspaceManagerService.getWorkspace(created.id);

			assert.ok(found);
			assert.strictEqual(found.id, created.id);
			assert.strictEqual(found.name, 'Find Me');
		});

		test('should return undefined for non-existent ID', async () => {
			const found = await workspaceManagerService.getWorkspace('non-existent-id');
			assert.strictEqual(found, undefined);
		});
	});

	suite('updateWorkspace', () => {
		test('should update workspace metadata', async () => {
			const workspace = await workspaceManagerService.createWorkspace({
				name: 'Original Name',
				description: 'Original description',
				parentDirectory: URI.file('/workspaces')
			});

			const updated = await workspaceManagerService.updateWorkspace(workspace.id, {
				name: 'Updated Name',
				description: 'Updated description'
			});

			assert.strictEqual(updated.name, 'Updated Name');
			assert.strictEqual(updated.description, 'Updated description');
			assert.ok(updated.lastModifiedAt > workspace.lastModifiedAt);
		});

		test('should throw when updating non-existent workspace', async () => {
			await assert.rejects(
				async () => workspaceManagerService.updateWorkspace('non-existent', { name: 'New Name' }),
				/not found/
			);
		});

		test('should emit onDidUpdateWorkspace event', async () => {
			const workspace = await workspaceManagerService.createWorkspace({
				name: 'Update Test',
				parentDirectory: URI.file('/workspaces')
			});

			const eventPromise = Event.toPromise(workspaceManagerService.onDidUpdateWorkspace);

			await workspaceManagerService.updateWorkspace(workspace.id, { name: 'Updated' });

			const event = await eventPromise;
			assert.strictEqual(event.workspace.name, 'Updated');
		});

		test('should update tags', async () => {
			const workspace = await workspaceManagerService.createWorkspace({
				name: 'Tag Test',
				parentDirectory: URI.file('/workspaces'),
				tags: ['old']
			});

			const updated = await workspaceManagerService.updateWorkspace(workspace.id, {
				tags: ['new', 'updated']
			});

			assert.deepStrictEqual(updated.tags, ['new', 'updated']);
		});

		test('should update color and icon', async () => {
			const workspace = await workspaceManagerService.createWorkspace({
				name: 'Style Test',
				parentDirectory: URI.file('/workspaces')
			});

			const updated = await workspaceManagerService.updateWorkspace(workspace.id, {
				color: '#00FF00',
				icon: 'star'
			});

			assert.strictEqual(updated.color, '#00FF00');
			assert.strictEqual(updated.icon, 'star');
		});

		test('should preserve unmodified fields', async () => {
			const workspace = await workspaceManagerService.createWorkspace({
				name: 'Preserve Test',
				description: 'Keep this',
				parentDirectory: URI.file('/workspaces'),
				tags: ['keep']
			});

			const updated = await workspaceManagerService.updateWorkspace(workspace.id, {
				name: 'New Name'
			});

			assert.strictEqual(updated.name, 'New Name');
			assert.strictEqual(updated.description, 'Keep this');
			assert.deepStrictEqual(updated.tags, ['keep']);
		});
	});

	suite('deleteWorkspace', () => {
		test('should delete workspace from registry', async () => {
			const workspace = await workspaceManagerService.createWorkspace({
				name: 'Delete Me',
				parentDirectory: URI.file('/workspaces')
			});

			await workspaceManagerService.deleteWorkspace(workspace.id, false);

			const found = await workspaceManagerService.getWorkspace(workspace.id);
			assert.strictEqual(found, undefined);
		});

		test('should throw when deleting non-existent workspace', async () => {
			await assert.rejects(
				async () => workspaceManagerService.deleteWorkspace('non-existent'),
				/not found/
			);
		});

		test('should emit onDidRemoveWorkspaces event', async () => {
			const workspace = await workspaceManagerService.createWorkspace({
				name: 'Remove Test',
				parentDirectory: URI.file('/workspaces')
			});

			const eventPromise = Event.toPromise(workspaceManagerService.onDidRemoveWorkspaces);

			await workspaceManagerService.deleteWorkspace(workspace.id);

			const event = await eventPromise;
			assert.deepStrictEqual(event.workspaceIds, [workspace.id]);
		});

		test('should delete files when deleteFiles is true', async () => {
			const workspace = await workspaceManagerService.createWorkspace({
				name: 'Delete Files Test',
				parentDirectory: URI.file('/workspaces')
			});

			// Verify directory exists
			let exists = await fileService.exists(workspace.rootUri);
			assert.ok(exists);

			await workspaceManagerService.deleteWorkspace(workspace.id, true);

			// Verify directory was deleted
			exists = await fileService.exists(workspace.rootUri);
			assert.strictEqual(exists, false);
		});

		test('should not delete files when deleteFiles is false', async () => {
			const workspace = await workspaceManagerService.createWorkspace({
				name: 'Keep Files Test',
				parentDirectory: URI.file('/workspaces')
			});

			// Verify directory exists
			let exists = await fileService.exists(workspace.rootUri);
			assert.ok(exists);

			await workspaceManagerService.deleteWorkspace(workspace.id, false);

			// Verify directory still exists
			exists = await fileService.exists(workspace.rootUri);
			assert.ok(exists);
		});
	});

	suite('searchWorkspaces', () => {
		test('should find workspaces by name', async () => {
			await workspaceManagerService.createWorkspace({
				name: 'Project Alpha',
				parentDirectory: URI.file('/workspaces')
			});
			await workspaceManagerService.createWorkspace({
				name: 'Project Beta',
				parentDirectory: URI.file('/workspaces')
			});
			await workspaceManagerService.createWorkspace({
				name: 'Something Else',
				parentDirectory: URI.file('/workspaces')
			});

			const results = await workspaceManagerService.searchWorkspaces('project');

			assert.strictEqual(results.length, 2);
			assert.ok(results.some(w => w.name === 'Project Alpha'));
			assert.ok(results.some(w => w.name === 'Project Beta'));
		});

		test('should find workspaces by description', async () => {
			await workspaceManagerService.createWorkspace({
				name: 'Test 1',
				description: 'Contains important keyword',
				parentDirectory: URI.file('/workspaces')
			});
			await workspaceManagerService.createWorkspace({
				name: 'Test 2',
				description: 'Something else',
				parentDirectory: URI.file('/workspaces')
			});

			const results = await workspaceManagerService.searchWorkspaces('important');

			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].name, 'Test 1');
		});

		test('should find workspaces by tags', async () => {
			await workspaceManagerService.createWorkspace({
				name: 'Tagged 1',
				tags: ['nodejs', 'backend'],
				parentDirectory: URI.file('/workspaces')
			});
			await workspaceManagerService.createWorkspace({
				name: 'Tagged 2',
				tags: ['python', 'backend'],
				parentDirectory: URI.file('/workspaces')
			});

			const results = await workspaceManagerService.searchWorkspaces('nodejs');

			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].name, 'Tagged 1');
		});

		test('should be case-insensitive', async () => {
			await workspaceManagerService.createWorkspace({
				name: 'CamelCase Project',
				parentDirectory: URI.file('/workspaces')
			});

			const results = await workspaceManagerService.searchWorkspaces('camelcase');

			assert.strictEqual(results.length, 1);
		});

		test('should return empty array for no matches', async () => {
			await workspaceManagerService.createWorkspace({
				name: 'Something',
				parentDirectory: URI.file('/workspaces')
			});

			const results = await workspaceManagerService.searchWorkspaces('nonexistent');

			assert.deepStrictEqual(results, []);
		});
	});

	suite('getRecentWorkspaces', () => {
		test('should return workspaces sorted by last accessed time', async () => {
			const ws1 = await workspaceManagerService.createWorkspace({
				name: 'First',
				parentDirectory: URI.file('/workspaces')
			});

			const ws2 = await workspaceManagerService.createWorkspace({
				name: 'Second',
				parentDirectory: URI.file('/workspaces')
			});

			// Update access time of first workspace
			await workspaceManagerService.updateWorkspace(ws1.id, {
				lastAccessedAt: Date.now() + 1000
			});

			const recent = await workspaceManagerService.getRecentWorkspaces();

			assert.strictEqual(recent.length, 2);
			assert.strictEqual(recent[0].name, 'First');
			assert.strictEqual(recent[1].name, 'Second');
		});

		test('should limit results', async () => {
			for (let i = 0; i < 15; i++) {
				await workspaceManagerService.createWorkspace({
					name: `Workspace ${i}`,
					parentDirectory: URI.file('/workspaces')
				});
			}

			const recent = await workspaceManagerService.getRecentWorkspaces(5);

			assert.strictEqual(recent.length, 5);
		});

		test('should default to 10 workspaces', async () => {
			for (let i = 0; i < 15; i++) {
				await workspaceManagerService.createWorkspace({
					name: `Workspace ${i}`,
					parentDirectory: URI.file('/workspaces')
				});
			}

			const recent = await workspaceManagerService.getRecentWorkspaces();

			assert.strictEqual(recent.length, 10);
		});
	});

	suite('togglePinWorkspace', () => {
		test('should pin unpinned workspace', async () => {
			const workspace = await workspaceManagerService.createWorkspace({
				name: 'Pin Test',
				parentDirectory: URI.file('/workspaces')
			});

			assert.strictEqual(workspace.pinned, false);

			await workspaceManagerService.togglePinWorkspace(workspace.id);

			const updated = await workspaceManagerService.getWorkspace(workspace.id);
			assert.strictEqual(updated?.pinned, true);
		});

		test('should unpin pinned workspace', async () => {
			const workspace = await workspaceManagerService.createWorkspace({
				name: 'Unpin Test',
				parentDirectory: URI.file('/workspaces')
			});

			await workspaceManagerService.togglePinWorkspace(workspace.id);
			await workspaceManagerService.togglePinWorkspace(workspace.id);

			const updated = await workspaceManagerService.getWorkspace(workspace.id);
			assert.strictEqual(updated?.pinned, false);
		});

		test('should throw for non-existent workspace', async () => {
			await assert.rejects(
				async () => workspaceManagerService.togglePinWorkspace('non-existent'),
				/not found/
			);
		});
	});

	suite('templates', () => {
		test('should register a template', async () => {
			const template: IWorkspaceTemplate = {
				id: 'custom-template',
				name: 'Custom Template',
				description: 'A custom workspace template'
			};

			await workspaceManagerService.registerTemplate(template);

			const templates = await workspaceManagerService.getTemplates();
			assert.ok(templates.some(t => t.id === 'custom-template'));
		});

		test('should update existing template', async () => {
			const template: IWorkspaceTemplate = {
				id: 'update-template',
				name: 'Original Name'
			};

			await workspaceManagerService.registerTemplate(template);

			const updated: IWorkspaceTemplate = {
				id: 'update-template',
				name: 'Updated Name'
			};

			await workspaceManagerService.registerTemplate(updated);

			const templates = await workspaceManagerService.getTemplates();
			const found = templates.find(t => t.id === 'update-template');
			assert.strictEqual(found?.name, 'Updated Name');
		});

		test('should unregister template', async () => {
			const template: IWorkspaceTemplate = {
				id: 'remove-template',
				name: 'Remove Me'
			};

			await workspaceManagerService.registerTemplate(template);
			await workspaceManagerService.unregisterTemplate('remove-template');

			const templates = await workspaceManagerService.getTemplates();
			assert.ok(!templates.some(t => t.id === 'remove-template'));
		});

		test('should have default templates registered', async () => {
			const templates = await workspaceManagerService.getTemplates();

			assert.ok(templates.length > 0, 'Should have default templates');
			assert.ok(templates.some(t => t.id === 'empty'));
			assert.ok(templates.some(t => t.id === 'web-app'));
			assert.ok(templates.some(t => t.id === 'python-project'));
			assert.ok(templates.some(t => t.id === 'data-science'));
		});
	});

	suite('export/import', () => {
		test('should export workspace', async () => {
			const workspace = await workspaceManagerService.createWorkspace({
				name: 'Export Test',
				description: 'Test export',
				parentDirectory: URI.file('/workspaces')
			});

			const exportPath = URI.file('/exports/workspace.json');
			await workspaceManagerService.exportWorkspace(workspace.id, exportPath);

			const exists = await fileService.exists(exportPath);
			assert.ok(exists, 'Export file should exist');

			const content = await fileService.readFile(exportPath);
			const exported = JSON.parse(content.value.toString());
			assert.strictEqual(exported.metadata.name, 'Export Test');
		});

		test('should import workspace', async () => {
			const sourceWorkspace = await workspaceManagerService.createWorkspace({
				name: 'Source Workspace',
				description: 'For import test',
				parentDirectory: URI.file('/workspaces'),
				color: '#FF0000',
				tags: ['imported']
			});

			const exportPath = URI.file('/exports/import-test.json');
			await workspaceManagerService.exportWorkspace(sourceWorkspace.id, exportPath);

			const imported = await workspaceManagerService.importWorkspace(
				exportPath,
				URI.file('/imports')
			);

			assert.strictEqual(imported.name, 'Source Workspace');
			assert.strictEqual(imported.description, 'For import test');
			assert.strictEqual(imported.color, '#FF0000');
			assert.deepStrictEqual(imported.tags, ['imported']);
		});
	});
});
