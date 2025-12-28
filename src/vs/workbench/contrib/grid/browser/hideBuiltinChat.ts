/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import {
	IWorkbenchContribution,
	registerWorkbenchContribution2,
	WorkbenchPhase,
} from '../../../common/contributions.js';
import {
	Extensions as ViewExtensions,
	IViewContainersRegistry,
	IViewsRegistry,
	ViewContainer,
} from '../../../common/views.js';
import { AGENT_SESSIONS_VIEWLET_ID } from '../../chat/common/constants.js';
import { CHAT_SIDEBAR_PANEL_ID } from '../../chat/browser/chatViewPane.js';

/**
 * Removes the upstream "Agent Sessions" chat surface so only GRID's chat remains.
 */
class HideBuiltinChatContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.hideBuiltinChat';

	private readonly viewContainers = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry);
	private readonly viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
	private readonly hiddenIds = new Set([AGENT_SESSIONS_VIEWLET_ID, CHAT_SIDEBAR_PANEL_ID]);

	constructor() {
		super();
		this.removeDefaultChat();

		this._register(
			this.viewContainers.onDidRegister(({ viewContainer }) => {
				if (this.hiddenIds.has(viewContainer.id)) {
					this.removeContainer(viewContainer);
				}
			})
		);
	}

	private removeDefaultChat(): void {
		for (const id of this.hiddenIds) {
			const container = this.viewContainers.get(id);
			if (container) {
				this.removeContainer(container);
			}
		}
	}

	private removeContainer(container: ViewContainer): void {
		const views = this.viewsRegistry.getViews(container);
		if (views.length) {
			this.viewsRegistry.deregisterViews(views, container);
		}
		this.viewContainers.deregisterViewContainer(container);
	}
}

registerWorkbenchContribution2(
	HideBuiltinChatContribution.ID,
	HideBuiltinChatContribution,
	WorkbenchPhase.AfterRestored
);
