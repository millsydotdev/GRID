/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import {
	IWorkbenchContribution,
	registerWorkbenchContribution2,
	WorkbenchPhase,
} from '../../../../workbench/common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import {
	IConfigurationRegistry,
	Extensions as ConfigurationExtensions,
	ConfigurationScope,
} from '../../../../platform/configuration/common/configurationRegistry.js';
import { localize } from '../../../../nls.js';

export class GridGlobalSettingsConfigurationContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.gridGlobalSettingsConfiguration';

	constructor() {
		super();

		const registry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);

		registry.registerConfiguration({
			id: 'grid.global',
			title: localize('grid.global.title', 'GRID Global Settings'),
			type: 'object',
			properties: {
				'grid.global.localFirstAI': {
					type: 'boolean',
					default: false,
					description: localize(
						'grid.global.localFirstAI',
						'Prefer local models (Ollama, vLLM, LM Studio, localhost endpoints) over cloud models when possible. Cloud models will be used as fallback if local models are unavailable or insufficient.'
					),
					scope: ConfigurationScope.APPLICATION,
				},
			},
		});
	}
}

// Register the contribution to be initialized early
registerWorkbenchContribution2(
	GridGlobalSettingsConfigurationContribution.ID,
	GridGlobalSettingsConfigurationContribution,
	WorkbenchPhase.BlockRestore
);
