/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
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
import { mountApiClient } from './react/out/api-client-tsx/index.js';
import { Orientation } from '../../../../base/browser/ui/sash/sash.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { Codicon } from '../../../../base/common/codicons.js';

// ---------- Define viewpane ----------

class ApiClientViewPane extends ViewPane {
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

        this.instantiationService.invokeFunction((accessor) => {
            // mount react
            const disposeFn: (() => void) | undefined = mountApiClient(parent, accessor)?.dispose;
            this._register(toDisposable(() => disposeFn?.()));
        });
    }

    protected override layoutBody(height: number, width: number): void {
        super.layoutBody(height, width);
        this.element.style.height = `${height}px`;
        this.element.style.width = `${width}px`;
    }
}

// ---------- Register viewpane ----------

export const GRID_API_VIEW_CONTAINER_ID = 'workbench.view.grid.api';
export const GRID_API_VIEW_ID = 'workbench.view.grid.api.client';

// Register view container
const viewContainerRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
const container = viewContainerRegistry.registerViewContainer(
    {
        id: GRID_API_VIEW_CONTAINER_ID,
        title: nls.localize2('gridApiClientContainer', 'API Client'),
        ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
            GRID_API_VIEW_CONTAINER_ID,
            {
                mergeViewWithContainerWhenSingleView: true,
                orientation: Orientation.HORIZONTAL,
            },
        ]),
        hideIfEmpty: false,
        order: 2, // explicit order
        icon: Codicon.server,
    },
    ViewContainerLocation.Sidebar,
    { isDefault: false }
);

const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
viewsRegistry.registerViews(
    [
        {
            id: GRID_API_VIEW_ID,
            hideByDefault: false,
            name: nls.localize2('gridApiClient', 'Collections'),
            ctorDescriptor: new SyncDescriptor(ApiClientViewPane),
            canToggleVisibility: true,
            canMoveView: true,
            weight: 100,
            order: 1,
        },
    ],
    container
);
