/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from '../../../../platform/registry/common/platform.js';
import {
    Extensions as ViewContainerExtensions,
    IViewContainersRegistry,
    ViewContainerLocation,
    IViewsRegistry,
    Extensions as ViewExtensions,
    IViewDescriptorService,
} from '../../../common/views.js';

import * as nls from '../../../../nls.js';

import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';

import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';

import { IViewPaneOptions, ViewPane } from '../../../browser/parts/views/viewPane.js';

import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { mountGridStudio } from './react/out/sidebar-tsx/index.js';

import { Orientation } from '../../../../base/browser/ui/sash/sash.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { FileAccess } from '../../../../base/common/network.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';

// ---------- Define Grid Studio viewpane ----------

class GridStudioViewPane extends ViewPane {
    constructor(
        options: IViewPaneOptions,
        @IInstantiationService instantiationService: IInstantiationService,
        @IViewDescriptorService viewDescriptorService: IViewDescriptorService,
        @IConfigurationService configurationService: IConfigurationService,
        @IContextKeyService contextKeyService: IContextKeyService,
        @IThemeService themeService: IThemeService,
        @IContextMenuService contextMenuService: IContextMenuService,
        @IKeybindingService keybindingService: IKeybindingService,
        @IOpenerService openerService: IOpenerService,
        @ITelemetryService telemetryService: ITelemetryService,
        @IHoverService hoverService: IHoverService
    ) {
        super(
            options,
            keybindingService,
            contextMenuService,
            configurationService,
            contextKeyService,
            viewDescriptorService,
            instantiationService,
            openerService,
            themeService,
            hoverService
        );
    }

    protected override renderBody(parent: HTMLElement): void {
        super.renderBody(parent);
        parent.style.userSelect = 'text';

        // Mount GRID Studio React component
        this.instantiationService.invokeFunction((accessor) => {
            const disposeFn: (() => void) | undefined = mountGridStudio(parent, accessor)?.dispose;
            this._register(toDisposable(() => disposeFn?.()));
        });
    }

    protected override layoutBody(height: number, width: number): void {
        super.layoutBody(height, width);
        this.element.style.height = `${height}px`;
        this.element.style.width = `${width}px`;
    }
}

// ---------- Register GRID Studio viewpane ----------

// Register icon for GRID Studio
const gridStudioIcon = registerIcon('grid-studio-icon', Codicon.window, nls.localize('gridStudioIcon', 'View icon of the GRID Studio view.'));

export const GRID_STUDIO_VIEW_CONTAINER_ID = 'workbench.view.gridStudio';
export const GRID_STUDIO_VIEW_ID = GRID_STUDIO_VIEW_CONTAINER_ID;

// Register view container (appears BEFORE GRID Chat with order: 0)
const viewContainerRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
const studioContainer = viewContainerRegistry.registerViewContainer(
    {
        id: GRID_STUDIO_VIEW_CONTAINER_ID,
        title: nls.localize2('gridStudioContainer', 'GRID Studio'),
        ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
            GRID_STUDIO_VIEW_CONTAINER_ID,
            {
                mergeViewWithContainerWhenSingleView: true,
                orientation: Orientation.HORIZONTAL,
            },
        ]),
        hideIfEmpty: false,
        order: 0, // Before GRID Chat (order: 1)
        rejectAddedViews: true,
        icon: gridStudioIcon,
    },
    ViewContainerLocation.AuxiliaryBar,
    { doNotRegisterOpenCommand: true, isDefault: false }
);

// Register view inside the container
const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
viewsRegistry.registerViews(
    [
        {
            id: GRID_STUDIO_VIEW_ID,
            hideByDefault: true, // Start hidden, user opens when needed
            containerIcon: gridStudioIcon,
            name: nls.localize2('gridStudio', 'GRID Studio'),
            ctorDescriptor: new SyncDescriptor(GridStudioViewPane),
            canToggleVisibility: true,
            canMoveView: false,
            weight: 80,
            order: 0,
        },
    ],
    studioContainer
);

// Open GRID Studio action
export const GRID_STUDIO_OPEN_ACTION_ID = 'grid.studio.open';
registerAction2(
    class extends Action2 {
        constructor() {
            super({
                id: GRID_STUDIO_OPEN_ACTION_ID,
                title: nls.localize2('gridStudioOpen', 'GRID: Open Studio'),
                f1: true,
            });
        }
        run(accessor: ServicesAccessor): void {
            const viewsService = accessor.get(IViewsService);
            viewsService.openViewContainer(GRID_STUDIO_VIEW_CONTAINER_ID);
        }
    }
);
