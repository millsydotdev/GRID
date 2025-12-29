/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';

export class ToggleSoundMuteAction extends Action2 {
    static readonly ID = 'workbench.action.grid.toggleSoundMute';

    constructor() {
        super({
            id: ToggleSoundMuteAction.ID,
            title: { value: localize('grid.toggleSoundMute', "Toggle Sound Mute"), original: 'Toggle Sound Mute' },
            f1: true
        });
    }

    run(accessor: ServicesAccessor): void {
        const configurationService = accessor.get(IConfigurationService);
        const currentSync = configurationService.getValue<boolean>('accessibility.signals.globalMute');
        configurationService.updateValue('accessibility.signals.globalMute', !currentSync);
    }
}
