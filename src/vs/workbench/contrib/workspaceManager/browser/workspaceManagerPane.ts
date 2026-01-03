/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import * as nls from '../../../../nls.js';
import { EditorExtensions } from '../../../common/editor.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorGroup, IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Dimension } from '../../../../base/browser/dom.js';
import { EditorPaneDescriptor, IEditorPaneRegistry } from '../../../browser/editor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { URI } from '../../../../base/common/uri.js';
// TODO: React component not built yet
// import { mountWorkspaceManager } from './react/out/workspace-manager-tsx/index.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IWorkspaceManagerService } from '../../../services/workspaceManager/common/workspaceManager.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';

class WorkspaceManagerInput extends EditorInput {
	static readonly ID: string = 'workbench.input.workspaceManager';

	static readonly RESOURCE = URI.from({
		scheme: 'workspace-manager',
		path: 'manager'
	});
	readonly resource = WorkspaceManagerInput.RESOURCE;

	constructor() {
		super();
	}

	override get typeId(): string {
		return WorkspaceManagerInput.ID;
	}

	override getName(): string {
		return nls.localize('workspaceManagerInputName', 'Workspace Manager');
	}

	override getIcon() {
		return Codicon.folder;
	}
}

class WorkspaceManagerPane extends EditorPane {
	static readonly ID = 'workbench.pane.workspaceManager';

	constructor(
		group: IEditorGroup,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService
	) {
		super(WorkspaceManagerPane.ID, group, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		parent.style.height = '100%';
		parent.style.width = '100%';

		const managerElt = document.createElement('div');
		managerElt.style.height = '100%';
		managerElt.style.width = '100%';

		parent.appendChild(managerElt);

		// TODO: Mount React component when available
		// this.instantiationService.invokeFunction(accessor => {
		// 	const disposeFn = mountWorkspaceManager(managerElt, accessor)?.dispose;
		// 	this._register(toDisposable(() => disposeFn?.()));
		// });

		// Temporary placeholder
		managerElt.innerHTML = '<div style="padding: 20px;">Workspace Manager UI - Coming Soon</div>';
	}

	layout(dimension: Dimension): void {
		// Layout handled by React component
	}

	override get minimumWidth() { return 700; }
}

// Register Workspace Manager pane
Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
	EditorPaneDescriptor.create(WorkspaceManagerPane, WorkspaceManagerPane.ID, nls.localize('WorkspaceManagerPane', "Workspace Manager")),
	[new SyncDescriptor(WorkspaceManagerInput)]
);

// Toggle Workspace Manager action
export const WORKSPACE_MANAGER_TOGGLE_ACTION_ID = 'workbench.action.toggleWorkspaceManager';
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: WORKSPACE_MANAGER_TOGGLE_ACTION_ID,
			title: nls.localize2('workspaceManager', "Workspaces: Toggle Workspace Manager"),
			icon: Codicon.folder,
			menu: [
				{
					id: MenuId.LayoutControlMenuSubmenu,
					group: '1_workspace',
				}
			],
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const editorService = accessor.get(IEditorService);
		const editorGroupService = accessor.get(IEditorGroupsService);
		const instantiationService = accessor.get(IInstantiationService);

		// Check if already open
		const openEditors = editorService.findEditors(WorkspaceManagerInput.RESOURCE);
		if (openEditors.length !== 0) {
			const openEditor = openEditors[0].editor;
			const isCurrentlyOpen = editorService.activeEditor?.resource?.fsPath === openEditor.resource?.fsPath;
			if (isCurrentlyOpen) {
				await editorService.closeEditors(openEditors);
			} else {
				await editorGroupService.activeGroup.openEditor(openEditor);
			}
			return;
		}

		// Open new
		const input = instantiationService.createInstance(WorkspaceManagerInput);
		await editorGroupService.activeGroup.openEditor(input);
	}
});

// Open Workspace Manager action
export const WORKSPACE_MANAGER_OPEN_ACTION_ID = 'workbench.action.openWorkspaceManager';
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: WORKSPACE_MANAGER_OPEN_ACTION_ID,
			title: nls.localize2('openWorkspaceManager', "Workspaces: Open Workspace Manager"),
			icon: Codicon.folder,
			f1: true,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const editorService = accessor.get(IEditorService);
		const instantiationService = accessor.get(IInstantiationService);

		// Close all instances if found
		const openEditors = editorService.findEditors(WorkspaceManagerInput.RESOURCE);
		if (openEditors.length > 0) {
			await editorService.closeEditors(openEditors);
		}

		// Open new
		const input = instantiationService.createInstance(WorkspaceManagerInput);
		await editorService.openEditor(input);
	}
});

// Create new workspace action
export const CREATE_WORKSPACE_ACTION_ID = 'workbench.action.createWorkspace';
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: CREATE_WORKSPACE_ACTION_ID,
			title: nls.localize2('createWorkspace', "Workspaces: Create New Workspace"),
			icon: Codicon.add,
			f1: true,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService);

		// Open workspace manager, which has the create dialog
		await commandService.executeCommand(WORKSPACE_MANAGER_OPEN_ACTION_ID);
	}
});

// Quick workspace switcher action
export const QUICK_SWITCH_WORKSPACE_ACTION_ID = 'workbench.action.quickSwitchWorkspace';
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: QUICK_SWITCH_WORKSPACE_ACTION_ID,
			title: nls.localize2('quickSwitchWorkspace', "Workspaces: Quick Switch Workspace"),
			icon: Codicon.folder,
			f1: true,
			keybinding: {
				weight: 200,
				primary: 0, // No default keybinding, users can set their own
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const quickInputService = accessor.get(IQuickInputService);
		const workspaceManager = accessor.get(IWorkspaceManagerService);

		const workspaces = await workspaceManager.getWorkspaces();

		const items = workspaces.map(ws => ({
			label: ws.name,
			description: ws.description,
			detail: ws.rootUri.fsPath,
			workspace: ws,
			iconClass: ws.pinned ? 'codicon-pinned' : undefined,
			alwaysShow: ws.pinned
		}));

		// Sort: pinned first, then by last accessed
		items.sort((a, b) => {
			if (a.workspace.pinned && !b.workspace.pinned) {return -1;}
			if (!a.workspace.pinned && b.workspace.pinned) {return 1;}
			return b.workspace.lastAccessedAt - a.workspace.lastAccessedAt;
		});

		const selected = await quickInputService.pick(items, {
			placeHolder: nls.localize('selectWorkspace', "Select a workspace to open"),
			matchOnDescription: true,
			matchOnDetail: true
		});

		if (selected) {
			await workspaceManager.switchWorkspace(selected.workspace.id);
		}
	}
});

// Recent workspaces action
export const SHOW_RECENT_WORKSPACES_ACTION_ID = 'workbench.action.showRecentWorkspaces';
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SHOW_RECENT_WORKSPACES_ACTION_ID,
			title: nls.localize2('showRecentWorkspaces', "Workspaces: Show Recent Workspaces"),
			icon: Codicon.history,
			f1: true,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const quickInputService = accessor.get(IQuickInputService);
		const workspaceManager = accessor.get(IWorkspaceManagerService);

		const recentWorkspaces = await workspaceManager.getRecentWorkspaces(10);

		const items = recentWorkspaces.map(ws => ({
			label: ws.name,
			description: ws.description,
			detail: ws.rootUri.fsPath,
			workspace: ws
		}));

		const selected = await quickInputService.pick(items, {
			placeHolder: nls.localize('selectRecentWorkspace', "Select a recent workspace to open"),
			matchOnDescription: true,
			matchOnDetail: true
		});

		if (selected) {
			await workspaceManager.switchWorkspace(selected.workspace.id);
		}
	}
});
