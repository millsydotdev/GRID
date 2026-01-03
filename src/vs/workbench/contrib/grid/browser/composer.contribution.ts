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
import { Codicon } from '../../../../base/common/codicons.js';
import { Orientation } from '../../../../base/browser/ui/sash/sash.js';
import { ComposerPane } from './composerPane.js';

export const COMPOSER_VIEW_CONTAINER_ID = 'workbench.view.grid.composer';
export const COMPOSER_VIEW_ID = 'workbench.view.grid.composer.pane';

const viewContainerRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
const container = viewContainerRegistry.registerViewContainer(
    {
        id: COMPOSER_VIEW_CONTAINER_ID,
        title: nls.localize2('gridComposer', 'Composer'),
        ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
            COMPOSER_VIEW_CONTAINER_ID,
            {
                mergeViewWithContainerWhenSingleView: true,
                orientation: Orientation.HORIZONTAL,
            },
        ]),
        hideIfEmpty: false,
        order: 4,
        icon: Codicon.wand, // Magic wand for AI Composer
    },
    ViewContainerLocation.Sidebar,
    { isDefault: false }
);

const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
viewsRegistry.registerViews(
    [
        {
            id: COMPOSER_VIEW_ID,
            hideByDefault: false,
            name: nls.localize2('gridComposerPane', 'Composer'),
            ctorDescriptor: new SyncDescriptor(ComposerPane),
            canToggleVisibility: true,
            canMoveView: true,
            weight: 100,
            order: 1,
        },
    ],
    container
);
