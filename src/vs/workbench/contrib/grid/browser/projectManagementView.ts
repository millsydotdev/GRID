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
import { IGridSettingsService } from '../common/gridSettingsService.js';

const DEFAULT_DASHBOARD_URL = 'https://grideditor.com';

export class ProjectManagementView extends ViewPane {
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
        @IHoverService hoverService: IHoverService,
        @IGridSettingsService private readonly gridSettingsService: IGridSettingsService
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

        // Ensure container fills space
        parent.style.height = '100%';
        parent.style.width = '100%';
        parent.style.overflow = 'hidden';

        // Get dashboard URL from settings (supports self-hosted/airgapped)
        const dashboardEndpoint = this.gridSettingsService.state.dashboardSettings?.dashboardEndpoint || DEFAULT_DASHBOARD_URL;

        // Create Iframe
        const iframe = document.createElement('iframe');
        iframe.src = `${dashboardEndpoint}/dashboard/projects`;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.setAttribute('allow', 'clipboard-read; clipboard-write');

        parent.appendChild(iframe);
    }

    protected override layoutBody(height: number, width: number): void {
        super.layoutBody(height, width);
    }
}
