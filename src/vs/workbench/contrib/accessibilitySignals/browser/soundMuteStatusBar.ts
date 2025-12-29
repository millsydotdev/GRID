/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IStatusbarEntry, IStatusbarService, StatusbarAlignment } from '../../../services/statusbar/browser/statusbar.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';

export class SoundMuteStatusBarContribution extends Disposable implements IWorkbenchContribution {
    static readonly ID = 'workbench.contrib.soundMuteStatusBar';

    constructor(
        @IStatusbarService private readonly statusbarService: IStatusbarService,
        @IConfigurationService private readonly configurationService: IConfigurationService,
    ) {
        super();

        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('accessibility.signals.globalMute')) {
                this.updateStatusBar();
            }
        }));

        this.updateStatusBar();
    }

    private updateStatusBar(): void {
        const isMuted = this.configurationService.getValue<boolean>('accessibility.signals.globalMute');
        const text = isMuted ? '$(mute)' : '$(unmute)'; // Using codicons
        const tooltip = isMuted ? localize('grid.sound.unmute', "Unmute Sounds") : localize('grid.sound.mute', "Mute Sounds");

        const entry: IStatusbarEntry = {
            name: localize('grid.sound.status', "Sound Status"),
            text: text,
            ariaLabel: tooltip,
            tooltip: tooltip,
            command: 'workbench.action.grid.toggleSoundMute',
            kind: 'standard'
        };

        this.statusbarService.addEntry(entry, 'grid.sound.status', StatusbarAlignment.RIGHT, 0);
    }
}
