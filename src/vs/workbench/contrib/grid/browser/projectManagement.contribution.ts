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
} from '../../../common/views.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import * as nls from '../../../../nls.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Orientation } from '../../../../base/browser/ui/sash/sash.js';
import { ProjectManagementView } from './projectManagementView.js';

export const PM_VIEW_CONTAINER_ID = 'workbench.view.grid.pm';
export const PM_VIEW_ID = 'workbench.view.grid.pm.board';

const viewContainerRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
const container = viewContainerRegistry.registerViewContainer(
    {
        id: PM_VIEW_CONTAINER_ID,
        title: nls.localize2('gridProjectManagement', 'Projects'),
        ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
            PM_VIEW_CONTAINER_ID,
            {
                mergeViewWithContainerWhenSingleView: true,
                orientation: Orientation.HORIZONTAL,
            },
        ]),
        hideIfEmpty: false,
        order: 3,
        icon: Codicon.project,
    },
    ViewContainerLocation.Sidebar,
    { isDefault: false }
);

const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
viewsRegistry.registerViews(
    [
        {
            id: PM_VIEW_ID,
            hideByDefault: false,
            name: nls.localize2('gridPmBoard', 'Board'),
            ctorDescriptor: new SyncDescriptor(ProjectManagementView),
            canToggleVisibility: true,
            canMoveView: true,
            weight: 100,
            order: 1,
        },
    ],
    container
);
