/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStatusbarService, StatusbarAlignment, IStatusbarEntry, IStatusbarEntryAccessor } from '../../../services/statusbar/browser/statusbar.js';
import { IWorkspaceManagerService } from '../../../services/workspaceManager/common/workspaceManager.js';
import { IWorkspaceContextManagerService } from '../../../services/workspaceManager/common/workspaceContext.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { QUICK_SWITCH_WORKSPACE_ACTION_ID, WORKSPACE_MANAGER_OPEN_ACTION_ID } from './workspaceManagerPane.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2 } from '../../../common/contributions.js';

/**
 * Status bar contribution that shows the active workspace
 */
export class WorkspaceStatusBarContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.workspaceStatusBar';

	private statusBarEntry: IStatusbarEntryAccessor | undefined;

	constructor(
		@IStatusbarService private readonly statusbarService: IStatusbarService,
		@IWorkspaceManagerService private readonly workspaceManager: IWorkspaceManagerService,
		@IWorkspaceContextManagerService private readonly contextManager: IWorkspaceContextManagerService,
		@ICommandService private readonly commandService: ICommandService
	) {
		super();
		this._register(this.workspaceManager.onDidChangeActiveWorkspace(() => this._updateStatusBar()));
		this._register(this.contextManager.onDidChangePrimaryInstance(() => this._updateStatusBar()));
		this._register(this.contextManager.onDidCreateInstance(() => this._updateStatusBar()));
		this._register(this.contextManager.onDidCloseInstance(() => this._updateStatusBar()));

		this._updateStatusBar();
	}

	private async _updateStatusBar(): Promise<void> {
		const workspace = await this.workspaceManager.getActiveWorkspace();
		const instance = await this.contextManager.getCurrentContext();
		const stats = await this.contextManager.getStatistics();

		if (!workspace) {
			// No workspace active
			if (this.statusBarEntry) {
				this.statusBarEntry.dispose();
				this.statusBarEntry = undefined;
			}
			return;
		}

		const isParallel = instance && instance.isParallelMode;
		const instanceCount = instance ? (await this.contextManager.getInstancesForWorkspace(workspace.id)).length : 1;

		// Build status bar text
		let text = `$(folder) ${workspace.name}`;

		if (isParallel && instanceCount > 1) {
			text += ` (${instanceCount} instances)`;
		}

		if (stats.activeAgents > 0) {
			text += ` $(robot) ${stats.activeAgents}`;
		}

		// Build tooltip
		const tooltip = [
			workspace.name,
			workspace.description,
			isParallel ? `Parallel Mode: ${instanceCount} instances` : undefined,
			stats.activeAgents > 0 ? `${stats.activeAgents} active AI agents` : undefined,
			'',
			'Click to switch workspaces',
			'Right-click for workspace menu'
		].filter(Boolean).join('\n');

		const entry: IStatusbarEntry = {
			name: localize('workspaceIndicator', "Workspace Indicator"),
			text,
			tooltip,
			ariaLabel: `Workspace: ${workspace.name}`,
			command: QUICK_SWITCH_WORKSPACE_ACTION_ID,
			backgroundColor: workspace.color ? { id: 'statusBarItem.workspaceBackground' } : undefined,
			color: workspace.color || undefined,
			showBeak: false
		};

		if (this.statusBarEntry) {
			this.statusBarEntry.update(entry);
		} else {
			this.statusBarEntry = this.statusbarService.addEntry(entry, 'workspaceIndicator', StatusbarAlignment.LEFT, 1);
		}
	}

	override dispose(): void {
		super.dispose();
		if (this.statusBarEntry) {
			this.statusBarEntry.dispose();
		}
	}
}

// Register the contribution
registerWorkbenchContribution2(WorkspaceStatusBarContribution.ID, WorkspaceStatusBarContribution, WorkbenchPhase.BlockRestore);
