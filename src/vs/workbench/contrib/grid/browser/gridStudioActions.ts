/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { KeybindingWeight } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { GRID_STUDIO_OPEN_ACTION_ID, GRID_STUDIO_VIEW_CONTAINER_ID } from './gridStudioPane.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { localize2 } from '../../../../nls.js';

// Open GRID Studio (Ctrl+Shift+B) - B for Builder/Browser
export const GRID_STUDIO_TOGGLE_ACTION_ID = 'grid.studio.toggle';

registerAction2(class extends Action2 {
    constructor() {
        super({
            id: GRID_STUDIO_TOGGLE_ACTION_ID,
            title: localize2('toggleGridStudio', 'GRID: Toggle Studio'),
            f1: true,
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyB,
                weight: KeybindingWeight.GRIDExtension
            }
        });
    }

    async run(accessor: ServicesAccessor): Promise<void> {
        const viewsService = accessor.get(IViewsService);

        const isVisible = viewsService.isViewContainerVisible(GRID_STUDIO_VIEW_CONTAINER_ID);

        if (isVisible) {
            viewsService.closeViewContainer(GRID_STUDIO_VIEW_CONTAINER_ID);
        } else {
            viewsService.openViewContainer(GRID_STUDIO_VIEW_CONTAINER_ID);
        }
    }
});
