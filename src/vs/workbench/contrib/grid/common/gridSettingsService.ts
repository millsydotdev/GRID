/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { deepClone } from '../../../../base/common/objects.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IMetricsService } from './metricsService.js';
import { defaultProviderSettings, getModelCapabilities, ModelOverrides } from './modelCapabilities.js';
import { GRID_SETTINGS_STORAGE_KEY } from './storageKeys.js';
import {
	defaultSettingsOfProvider,
	FeatureName,
	ProviderName,
	ModelSelectionOfFeature,
	SettingsOfProvider,
	SettingName,
	providerNames,
	ModelSelection,
	modelSelectionsEqual,
	featureNames,
	GridStatefulModelInfo,
	GlobalSettings,
	GlobalSettingName,
	defaultGlobalSettings,
	ModelSelectionOptions,
	OptionsOfModelSelection,
	ChatMode,
	OverridesOfModel,
	defaultOverridesOfModel,
	MCPUserStateOfName as MCPUserStateOfName,
	MCPUserState,
	DashboardSettings,
	defaultDashboardSettings,
} from './gridSettingsTypes.js';
import { IMcpServersConfiguration } from '../../../../platform/mcp/common/mcpPlatformTypes.js';

// name is the name in the dropdown
export type ModelOption = { name: string; selection: ModelSelection };

type SetSettingOfProviderFn = <S extends SettingName>(
	providerName: ProviderName,
	settingName: S,
	newVal: SettingsOfProvider[ProviderName][S extends keyof SettingsOfProvider[ProviderName] ? S : never]
) => Promise<void>;

type SetModelSelectionOfFeatureFn = <K extends FeatureName>(
	featureName: K,
	newVal: ModelSelectionOfFeature[K]
) => Promise<void>;

type SetGlobalSettingFn = <T extends GlobalSettingName>(settingName: T, newVal: GlobalSettings[T]) => void;

type SetOptionsOfModelSelection = (
	featureName: FeatureName,
	providerName: ProviderName,
	modelName: string,
	newVal: Partial<ModelSelectionOptions>
) => void;

export type GridSettingsState = {
	readonly settingsOfProvider: SettingsOfProvider; // optionsOfProvider
	readonly modelSelectionOfFeature: ModelSelectionOfFeature; // stateOfFeature
	readonly optionsOfModelSelection: OptionsOfModelSelection;
	readonly overridesOfModel: OverridesOfModel;
	readonly globalSettings: GlobalSettings;
	readonly mcpUserStateOfName: MCPUserStateOfName; // user-controlled state of MCP servers
	readonly dashboardSettings: DashboardSettings; // dashboard integration settings
	readonly mcpConfig?: IMcpServersConfiguration; // MCP configuration from dashboard or local

	readonly _modelOptions: ModelOption[]; // computed based on the two above items
};

// type RealGridSettings = Exclude<keyof GridSettingsState, '_modelOptions'>
// type EventProp<T extends RealGridSettings = RealGridSettings> = T extends 'globalSettings' ? [T, keyof GridSettingsState[T]] : T | 'all'

export interface IGridSettingsService {
	readonly _serviceBrand: undefined;
	readonly state: GridSettingsState; // in order to play nicely with react, you should immutably change state
	readonly waitForInitState: Promise<void>;

	onDidChangeState: Event<void>;

	setSettingOfProvider: SetSettingOfProviderFn;
	setModelSelectionOfFeature: SetModelSelectionOfFeatureFn;
	setOptionsOfModelSelection: SetOptionsOfModelSelection;
	setGlobalSetting: SetGlobalSettingFn;
	setDashboardSettings(newSettings: DashboardSettings): Promise<void>;
	// setMCPServerStates: (newStates: MCPServerStates) => Promise<void>;

	// setting to undefined CLEARS it, unlike others:
	setOverridesOfModel(
		providerName: ProviderName,
		modelName: string,
		overrides: Partial<ModelOverrides> | undefined
	): Promise<void>;

	dangerousSetState(newState: GridSettingsState): Promise<void>;
	resetState(): Promise<void>;

	setAutodetectedModels(providerName: ProviderName, modelNames: string[], logging: object): void;
	toggleModelHidden(providerName: ProviderName, modelName: string): void;
	addModel(providerName: ProviderName, modelName: string): void;
	deleteModel(providerName: ProviderName, modelName: string): boolean;

	addMCPUserStateOfNames(userStateOfName: MCPUserStateOfName): Promise<void>;
	removeMCPUserStateOfNames(serverNames: string[]): Promise<void>;
	setMCPServerState(serverName: string, state: MCPUserState): Promise<void>;
}

const _modelsWithSwappedInNewModels = (options: {
	existingModels: GridStatefulModelInfo[];
	models: string[];
	type: 'autodetected' | 'default';
}) => {
	const { existingModels, models, type } = options;

	const existingModelsMap: Record<string, GridStatefulModelInfo> = {};
	for (const existingModel of existingModels) {
		existingModelsMap[existingModel.modelName] = existingModel;
	}

	const newDefaultModels = models.map((modelName, i) => ({
		modelName,
		type,
		isHidden: !!existingModelsMap[modelName]?.isHidden,
	}));

	return [
		...newDefaultModels, // swap out all the models of this type for the new models of this type
		...existingModels.filter((m) => {
			const keep = m.type !== type;
			return keep;
		}),
	];
};

export const modelFilterOfFeatureName: {
	[featureName in FeatureName]: {
		filter: (o: ModelSelection, opts: { chatMode: ChatMode; overridesOfModel: OverridesOfModel }) => boolean;
		emptyMessage: null | { message: string; priority: 'always' | 'fallback' };
	};
} = {
	Autocomplete: {
		filter: (o, opts) => {
			// Skip "auto" option - it's not a real model
			if (o.providerName === 'auto' && o.modelName === 'auto') {return false;}
			return getModelCapabilities(o.providerName, o.modelName, opts.overridesOfModel).supportsFIM;
		},
		emptyMessage: { message: 'No models support FIM', priority: 'always' },
	},
	Chat: {
		filter: (o) => {
			// Always allow "Auto" option
			if (o.providerName === 'auto' && o.modelName === 'auto') {return true;}
			// For other models, check capabilities
			return true;
		},
		emptyMessage: null,
	},
	'Ctrl+K': { filter: (o) => true, emptyMessage: null },
	Apply: { filter: (o) => true, emptyMessage: null },
	SCM: { filter: (o) => true, emptyMessage: null },
};

const _stateWithMergedDefaultModels = (state: GridSettingsState): GridSettingsState => {
	let newSettingsOfProvider = state.settingsOfProvider;

	// recompute default models
	for (const providerName of providerNames) {
		const defaultModels = defaultSettingsOfProvider[providerName]?.models ?? [];
		const currentModels = newSettingsOfProvider[providerName]?.models ?? [];
		const defaultModelNames = defaultModels.map((m) => m.modelName);
		const newModels = _modelsWithSwappedInNewModels({
			existingModels: currentModels,
			models: defaultModelNames,
			type: 'default',
		});
		newSettingsOfProvider = {
			...newSettingsOfProvider,
			[providerName]: {
				...newSettingsOfProvider[providerName],
				models: newModels,
			},
		};
	}
	return {
		...state,
		settingsOfProvider: newSettingsOfProvider,
	};
};

const _validatedModelState = (state: Omit<GridSettingsState, '_modelOptions'>): GridSettingsState => {
	let newSettingsOfProvider = state.settingsOfProvider;

	// recompute _didFillInProviderSettings
	for (const providerName of providerNames) {
		const settingsAtProvider = newSettingsOfProvider[providerName];

		const didFillInProviderSettings = Object.keys(defaultProviderSettings[providerName]).every(
			(key) => !!settingsAtProvider[key as keyof typeof settingsAtProvider]
		);

		if (didFillInProviderSettings === settingsAtProvider._didFillInProviderSettings) {continue;}

		newSettingsOfProvider = {
			...newSettingsOfProvider,
			[providerName]: {
				...settingsAtProvider,
				_didFillInProviderSettings: didFillInProviderSettings,
			},
		};
	}

	// update model options
	const newModelOptions: ModelOption[] = [];
	// Add "Auto" option first (only for Chat feature)
	// Note: 'auto' is a special ModelSelection value for automatic routing
	const autoOption: ModelOption = { name: 'Auto', selection: { providerName: 'auto', modelName: 'auto' } };
	newModelOptions.push(autoOption);

	for (const providerName of providerNames) {
		const providerTitle = providerName; // displayInfoOfProviderName(providerName).title.toLowerCase() // looks better lowercase, best practice to not use raw providerName
		if (!newSettingsOfProvider[providerName]._didFillInProviderSettings) {continue;} // if disabled, don't display model options
		for (const { modelName, isHidden } of newSettingsOfProvider[providerName].models) {
			if (isHidden) {continue;}
			newModelOptions.push({ name: `${modelName} (${providerTitle})`, selection: { providerName, modelName } });
		}
	}

	// now that model options are updated, make sure the selection is valid
	// if the user-selected model is no longer in the list, update the selection for each feature that needs it to something relevant (the 0th model available, or null)
	let newModelSelectionOfFeature = state.modelSelectionOfFeature;
	for (const featureName of featureNames) {
		const { filter } = modelFilterOfFeatureName[featureName];
		const filterOpts = { chatMode: state.globalSettings.chatMode, overridesOfModel: state.overridesOfModel };
		// For Chat feature, include "Auto" option; for others, filter it out
		const allOptionsForFeature =
			featureName === 'Chat'
				? newModelOptions
				: newModelOptions.filter((o) => !(o.selection.providerName === 'auto' && o.selection.modelName === 'auto'));
		const modelOptionsForThisFeature = allOptionsForFeature.filter((o) => filter(o.selection, filterOpts));

		const modelSelectionAtFeature = newModelSelectionOfFeature[featureName];
		const selnIdx =
			modelSelectionAtFeature === null
				? -1
				: modelOptionsForThisFeature.findIndex((m) => modelSelectionsEqual(m.selection, modelSelectionAtFeature));

		if (selnIdx !== -1) {continue;} // no longer in list, so update to 1st in list or null

		newModelSelectionOfFeature = {
			...newModelSelectionOfFeature,
			[featureName]: modelOptionsForThisFeature.length === 0 ? null : modelOptionsForThisFeature[0].selection,
		};
	}

	const newState = {
		...state,
		settingsOfProvider: newSettingsOfProvider,
		modelSelectionOfFeature: newModelSelectionOfFeature,
		overridesOfModel: state.overridesOfModel,
		_modelOptions: newModelOptions,
	} satisfies GridSettingsState;

	return newState;
};

const defaultState = () => {
	const d: GridSettingsState = {
		settingsOfProvider: deepClone(defaultSettingsOfProvider),
		modelSelectionOfFeature: { Chat: null, 'Ctrl+K': null, Autocomplete: null, Apply: null, SCM: null },
		globalSettings: deepClone(defaultGlobalSettings),
		optionsOfModelSelection: { Chat: {}, 'Ctrl+K': {}, Autocomplete: {}, Apply: {}, SCM: {} },
		overridesOfModel: deepClone(defaultOverridesOfModel),
		_modelOptions: [], // computed later
		mcpUserStateOfName: {},
		dashboardSettings: deepClone(defaultDashboardSettings),
		mcpConfig: undefined,
	};
	return d;
};

export const IGridSettingsService = createDecorator<IGridSettingsService>('GridSettingsService');
class GridSettingsService extends Disposable implements IGridSettingsService {
	_serviceBrand: undefined;

	private readonly _onDidChangeState = new Emitter<void>();
	readonly onDidChangeState: Event<void> = this._onDidChangeState.event; // this is primarily for use in react, so react can listen + update on state changes

	state: GridSettingsState;

	private readonly _resolver: () => void;
	waitForInitState: Promise<void>; // await this if you need a valid state initially

	constructor(
		@IStorageService private readonly _storageService: IStorageService,
		@IEncryptionService private readonly _encryptionService: IEncryptionService,
		@IMetricsService private readonly _metricsService: IMetricsService,
		@IConfigurationService private readonly _configurationService: IConfigurationService
		// could have used this, but it's clearer the way it is (+ slightly different eg StorageTarget.USER)
		// @ISecretStorageService private readonly _secretStorageService: ISecretStorageService,
	) {
		super();

		// at the start, we haven't read the partial config yet, but we need to set state to something
		this.state = defaultState();
		let resolver: () => void = () => {};
		this.waitForInitState = new Promise((res, rej) => (resolver = res));
		this._resolver = resolver;

		// Subscribe to VS Code configuration changes for localFirstAI
		// This ensures state stays in sync when user changes the setting in VS Code Settings UI
		this._register(
			this._configurationService.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration('grid.global.localFirstAI')) {
					const configValue = this._configurationService.getValue<boolean>('grid.global.localFirstAI') ?? false;
					// Update state if it differs from current value
					if (this.state.globalSettings.localFirstAI !== configValue) {
						const newState: GridSettingsState = {
							...this.state,
							globalSettings: {
								...this.state.globalSettings,
								localFirstAI: configValue,
							},
						};
						this.state = _validatedModelState(newState);
						// Don't write to storage - VS Code config is the source of truth
						this._onDidChangeState.fire();
					}
				}
			})
		);

		this.readAndInitializeState();
	}

	dangerousSetState = async (newState: GridSettingsState) => {
		this.state = _validatedModelState(newState);
		await this._storeState();
		this._onDidChangeState.fire();
		this._onUpdate_syncApplyToChat();
		this._onUpdate_syncSCMToChat();
	};
	async resetState() {
		await this.dangerousSetState(defaultState());
	}

	async readAndInitializeState() {
		let readS: GridSettingsState;
		try {
			readS = await this._readState();
			// 1.0.3 addition, remove when enough users have had this code run
			if (readS.globalSettings.includeToolLintErrors === undefined) {readS.globalSettings.includeToolLintErrors = true;}

			// autoapprove is now an obj not a boolean (1.2.5)
			if (typeof readS.globalSettings.autoApprove === 'boolean') {readS.globalSettings.autoApprove = {};}

			// 1.3.5 add source control feature
			if (readS.modelSelectionOfFeature && !readS.modelSelectionOfFeature['SCM']) {
				readS.modelSelectionOfFeature['SCM'] = deepClone(readS.modelSelectionOfFeature['Chat']);
				readS.optionsOfModelSelection['SCM'] = deepClone(readS.optionsOfModelSelection['Chat']);
			}
			// add disableSystemMessage feature
			if (readS.globalSettings.disableSystemMessage === undefined) {readS.globalSettings.disableSystemMessage = false;}

			// add autoAcceptLLMChanges feature
			if (readS.globalSettings.autoAcceptLLMChanges === undefined) {readS.globalSettings.autoAcceptLLMChanges = false;}
		} catch (e) {
			readS = defaultState();
		}

		// the stored data structure might be outdated, so we need to update it here
		try {
			readS = {
				...defaultState(),
				...readS,
				// no idea why this was here, seems like a bug
				// ...defaultSettingsOfProvider,
				// ...readS.settingsOfProvider,
			};

			for (const providerName of providerNames) {
				// Merge default and read settings for each provider
				const defaultSettings = defaultSettingsOfProvider[providerName];
				const readSettings = readS.settingsOfProvider[providerName];
				readS.settingsOfProvider[providerName] = {
					...defaultSettings,
					...readSettings,
				} as typeof defaultSettings;

				// conversion from 1.0.3 to 1.2.5 (can remove this when enough people update)
				for (const m of readS.settingsOfProvider[providerName].models) {
					if (!m.type) {
						const old = m as { isAutodetected?: boolean; isDefault?: boolean };
						if (old.isAutodetected) {m.type = 'autodetected';}
						else if (old.isDefault) {m.type = 'default';}
						else {m.type = 'custom';}
					}
				}

				// remove when enough people have had it run (default is now {})
				if (providerName === 'openAICompatible' && !readS.settingsOfProvider[providerName].headersJSON) {
					readS.settingsOfProvider[providerName].headersJSON = '{}';
				}
			}
		} catch (e) {
			readS = defaultState();
		}

		this.state = readS;
		this.state = _stateWithMergedDefaultModels(this.state);
		this.state = _validatedModelState(this.state);

		// Override localFirstAI from VS Code configuration (source of truth)
		// This ensures VS Code Settings UI controls the behavior
		const configLocalFirstAI = this._configurationService.getValue<boolean>('grid.global.localFirstAI');
		if (configLocalFirstAI !== undefined) {
			this.state.globalSettings.localFirstAI = configLocalFirstAI;
		}

		this._resolver();
		this._onDidChangeState.fire();
	}

	private async _readState(): Promise<GridSettingsState> {
		const encryptedState = this._storageService.get(GRID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);

		if (!encryptedState) {return defaultState();}

		const stateStr = await this._encryptionService.decrypt(encryptedState);
		const state = JSON.parse(stateStr);
		return state;
	}

	private async _storeState() {
		const state = this.state;
		const encryptedState = await this._encryptionService.encrypt(JSON.stringify(state));
		this._storageService.store(GRID_SETTINGS_STORAGE_KEY, encryptedState, StorageScope.APPLICATION, StorageTarget.USER);
	}

	setSettingOfProvider: SetSettingOfProviderFn = async (providerName, settingName, newVal) => {
		const newModelSelectionOfFeature = this.state.modelSelectionOfFeature;

		const newOptionsOfModelSelection = this.state.optionsOfModelSelection;

		const newSettingsOfProvider: SettingsOfProvider = {
			...this.state.settingsOfProvider,
			[providerName]: {
				...this.state.settingsOfProvider[providerName],
				[settingName]: newVal,
			},
		};

		const newGlobalSettings = this.state.globalSettings;
		const newOverridesOfModel = this.state.overridesOfModel;
		const newMCPUserStateOfName = this.state.mcpUserStateOfName;

		const newState = {
			modelSelectionOfFeature: newModelSelectionOfFeature,
			optionsOfModelSelection: newOptionsOfModelSelection,
			settingsOfProvider: newSettingsOfProvider,
			globalSettings: newGlobalSettings,
			overridesOfModel: newOverridesOfModel,
			mcpUserStateOfName: newMCPUserStateOfName,
			dashboardSettings: this.state.dashboardSettings,
		};

		this.state = _validatedModelState(newState);

		await this._storeState();
		this._onDidChangeState.fire();
	};

	private _onUpdate_syncApplyToChat() {
		// if sync is turned on, sync (call this whenever Chat model or !!sync changes)
		this.setModelSelectionOfFeature('Apply', deepClone(this.state.modelSelectionOfFeature['Chat']));
	}

	private _onUpdate_syncSCMToChat() {
		this.setModelSelectionOfFeature('SCM', deepClone(this.state.modelSelectionOfFeature['Chat']));
	}

	setGlobalSetting: SetGlobalSettingFn = async (settingName, newVal) => {
		// Special handling for localFirstAI: write to VS Code config (source of truth)
		// This ensures consistency if internal UI ever exposes this setting
		if (settingName === 'localFirstAI') {
			await this._configurationService.updateValue('grid.global.localFirstAI', newVal);
			// State will be updated via config change listener, so return early
			return;
		}

		const newState: GridSettingsState = {
			...this.state,
			globalSettings: {
				...this.state.globalSettings,
				[settingName]: newVal,
			},
		};
		this.state = _validatedModelState(newState);
		await this._storeState();
		this._onDidChangeState.fire();

		// hooks
		if (this.state.globalSettings.syncApplyToChat) {this._onUpdate_syncApplyToChat();}
		if (this.state.globalSettings.syncSCMToChat) {this._onUpdate_syncSCMToChat();}
	};

	setModelSelectionOfFeature: SetModelSelectionOfFeatureFn = async (featureName, newVal) => {
		const newState: GridSettingsState = {
			...this.state,
			modelSelectionOfFeature: {
				...this.state.modelSelectionOfFeature,
				[featureName]: newVal,
			},
		};

		this.state = _validatedModelState(newState);

		await this._storeState();
		this._onDidChangeState.fire();

		// hooks
		if (featureName === 'Chat') {
			// When Chat model changes, update synced features
			this._onUpdate_syncApplyToChat();
			this._onUpdate_syncSCMToChat();
		}
	};

	setOptionsOfModelSelection = async (
		featureName: FeatureName,
		providerName: ProviderName,
		modelName: string,
		newVal: Partial<ModelSelectionOptions>
	) => {
		const newState: GridSettingsState = {
			...this.state,
			optionsOfModelSelection: {
				...this.state.optionsOfModelSelection,
				[featureName]: {
					...this.state.optionsOfModelSelection[featureName],
					[providerName]: {
						...this.state.optionsOfModelSelection[featureName][providerName],
						[modelName]: {
							...this.state.optionsOfModelSelection[featureName][providerName]?.[modelName],
							...newVal,
						},
					},
				},
			},
		};
		this.state = _validatedModelState(newState);

		await this._storeState();
		this._onDidChangeState.fire();
	};

	setOverridesOfModel = async (
		providerName: ProviderName,
		modelName: string,
		overrides: Partial<ModelOverrides> | undefined
	) => {
		const newState: GridSettingsState = {
			...this.state,
			overridesOfModel: {
				...this.state.overridesOfModel,
				[providerName]: {
					...this.state.overridesOfModel[providerName],
					[modelName]:
						overrides === undefined
							? undefined
							: {
									...this.state.overridesOfModel[providerName][modelName],
									...overrides,
								},
				},
			},
		};

		this.state = _validatedModelState(newState);
		await this._storeState();
		this._onDidChangeState.fire();

		this._metricsService.capture('Update Model Overrides', { providerName, modelName, overrides });
	};

	setDashboardSettings = async (newSettings: DashboardSettings) => {
		const newState: GridSettingsState = {
			...this.state,
			dashboardSettings: newSettings,
		};

		this.state = _validatedModelState(newState);
		await this._storeState();
		this._onDidChangeState.fire();

		this._metricsService.capture('Update Dashboard Settings', {
			tier: newSettings.tier,
			configSource: newSettings.configSource,
			hasApiKey: !!newSettings.dashboardApiKey,
		});
	};

	setAutodetectedModels(providerName: ProviderName, autodetectedModelNames: string[], logging: object) {
		const { models } = this.state.settingsOfProvider[providerName];
		const oldModelNames = models.map((m) => m.modelName);

		const newModels = _modelsWithSwappedInNewModels({
			existingModels: models,
			models: autodetectedModelNames,
			type: 'autodetected',
		});
		this.setSettingOfProvider(providerName, 'models', newModels);

		// if the models changed, log it
		const new_names = newModels.map((m) => m.modelName);
		if (
			!(oldModelNames.length === new_names.length && oldModelNames.every((_, i) => oldModelNames[i] === new_names[i]))
		) {
			this._metricsService.capture('Autodetect Models', { providerName, newModels: newModels, ...logging });
		}
	}
	toggleModelHidden(providerName: ProviderName, modelName: string) {
		const { models } = this.state.settingsOfProvider[providerName];
		const modelIdx = models.findIndex((m) => m.modelName === modelName);
		if (modelIdx === -1) {return;}
		const newIsHidden = !models[modelIdx].isHidden;
		const newModels: GridStatefulModelInfo[] = [
			...models.slice(0, modelIdx),
			{ ...models[modelIdx], isHidden: newIsHidden },
			...models.slice(modelIdx + 1, Infinity),
		];
		this.setSettingOfProvider(providerName, 'models', newModels);

		this._metricsService.capture('Toggle Model Hidden', { providerName, modelName, newIsHidden });
	}
	addModel(providerName: ProviderName, modelName: string) {
		const { models } = this.state.settingsOfProvider[providerName];
		const existingIdx = models.findIndex((m) => m.modelName === modelName);
		if (existingIdx !== -1) {return;} // if exists, do nothing
		const newModels = [...models, { modelName, type: 'custom', isHidden: false } as const];
		this.setSettingOfProvider(providerName, 'models', newModels);

		this._metricsService.capture('Add Model', { providerName, modelName });
	}
	deleteModel(providerName: ProviderName, modelName: string): boolean {
		const { models } = this.state.settingsOfProvider[providerName];
		const delIdx = models.findIndex((m) => m.modelName === modelName);
		if (delIdx === -1) {return false;}
		const newModels = [
			...models.slice(0, delIdx), // delete the idx
			...models.slice(delIdx + 1, Infinity),
		];
		this.setSettingOfProvider(providerName, 'models', newModels);

		this._metricsService.capture('Delete Model', { providerName, modelName });

		return true;
	}

	// MCP Server State
	private _setMCPUserStateOfName = async (newStates: MCPUserStateOfName) => {
		const newState: GridSettingsState = {
			...this.state,
			mcpUserStateOfName: {
				...this.state.mcpUserStateOfName,
				...newStates,
			},
		};
		this.state = _validatedModelState(newState);
		await this._storeState();
		this._onDidChangeState.fire();
		this._metricsService.capture('Set MCP Server States', { newStates });
	};

	addMCPUserStateOfNames = async (newMCPStates: MCPUserStateOfName) => {
		const { mcpUserStateOfName: mcpServerStates } = this.state;
		const newMCPServerStates = {
			...mcpServerStates,
			...newMCPStates,
		};
		await this._setMCPUserStateOfName(newMCPServerStates);
		this._metricsService.capture('Add MCP Servers', { servers: Object.keys(newMCPStates).join(', ') });
	};

	removeMCPUserStateOfNames = async (serverNames: string[]) => {
		const { mcpUserStateOfName: mcpServerStates } = this.state;
		const newMCPServerStates = {
			...mcpServerStates,
		};
		serverNames.forEach((serverName) => {
			if (serverName in newMCPServerStates) {
				delete newMCPServerStates[serverName];
			}
		});
		await this._setMCPUserStateOfName(newMCPServerStates);
		this._metricsService.capture('Remove MCP Servers', { servers: serverNames.join(', ') });
	};

	setMCPServerState = async (serverName: string, state: MCPUserState) => {
		const { mcpUserStateOfName } = this.state;
		const newMCPServerStates = {
			...mcpUserStateOfName,
			[serverName]: state,
		};
		await this._setMCPUserStateOfName(newMCPServerStates);
		this._metricsService.capture('Update MCP Server State', { serverName, state });
	};
}

registerSingleton(IGridSettingsService, GridSettingsService, InstantiationType.Eager);
