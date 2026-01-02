/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IViewPaneOptions, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { mountComposer } from './react/out/composer/index.js';

export class ComposerPane extends ViewPane {
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
            const disposeFn: (() => void) | undefined = mountComposer(parent, accessor)?.dispose;
            this._register(toDisposable(() => disposeFn?.()));
        });
    }

    protected override layoutBody(height: number, width: number): void {
        super.layoutBody(height, width);
        this.element.style.height = `${height}px`;
        this.element.style.width = `${width}px`;
    }
}
