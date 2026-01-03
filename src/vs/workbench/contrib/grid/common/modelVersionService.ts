/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IGridSettingsService } from './gridSettingsService.js';
import { IRemoteCatalogService } from './remoteCatalogService.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ProviderName, providerNames } from './gridSettingsTypes.js';
import { getProvidersWithCatalog } from './providerRegistry.js';

export interface IModelVersionService {
    readonly _serviceBrand: undefined;
    checkForUpdates(): Promise<void>;
}

export const IModelVersionService = createDecorator<IModelVersionService>('ModelVersionService');

export class ModelVersionService extends Disposable implements IModelVersionService {
    readonly _serviceBrand: undefined;

    private readonly CHECK_INTERVAL = 1000 * 60 * 60 * 24; // Check daily

    constructor(
        @IGridSettingsService private readonly settingsService: IGridSettingsService,
        @IRemoteCatalogService private readonly catalogService: IRemoteCatalogService,
        @ILogService private readonly logService: ILogService
    ) {
        super();
        this._register(this.settingsService.waitForInitState.then(() => {
            this.checkForUpdates();
            setInterval(() => this.checkForUpdates(), this.CHECK_INTERVAL);
        }));
    }

    async checkForUpdates(): Promise<void> {
        this.logService.info('[ModelVersionService] Checking for model updates...');

        // Get providers that support catalog fetching
        // We use the registry to know which ones have APIs, but also check all configured providers
        // to catch local LLMs (Ollama etc) whose URLs might change

        const activeProviders: ProviderName[] = [];

        for (const provider of providerNames) {
            const settings = this.settingsService.state.settingsOfProvider[provider];
            if (settings && settings._didFillInProviderSettings) {
                activeProviders.push(provider);
            }
        }

        for (const provider of activeProviders) {
            try {
                const models = await this.catalogService.fetchCatalog(provider);

                if (models.length > 0) {
                    const modelIds = models.map(m => m.id);

                    // Update settings with discovered models
                    // This uses 'autodetected' type so it doesn't overwrite user custom additions
                    this.settingsService.setAutodetectedModels(provider, modelIds, { source: 'auto-version-service' });

                    this.logService.info(`[ModelVersionService] Updated ${models.length} models for ${provider}`);
                }
            } catch (error) {
                // Log but don't fail the whole update
                this.logService.warn(`[ModelVersionService] Failed to update models for ${provider}:`, error);
            }
        }
    }
}

registerSingleton(IModelVersionService, ModelVersionService, InstantiationType.Eager);
