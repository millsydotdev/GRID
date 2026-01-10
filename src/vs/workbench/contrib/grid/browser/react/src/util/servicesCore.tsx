/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { RefreshableProviderName } from '../../../../../../../workbench/contrib/grid/common/gridSettingsTypes.js'
import { IDisposable } from '../../../../../../../base/common/lifecycle.js'
import { GridSettingsState } from '../../../../../../../workbench/contrib/grid/common/gridSettingsService.js'
import { ColorScheme } from '../../../../../../../platform/theme/common/theme.js'
import { RefreshModelStateOfProvider } from '../../../../../../../workbench/contrib/grid/common/refreshModelService.js'

import { ServicesAccessor } from '../../../../../../../editor/browser/editorExtensions.js';
import { IExplorerService } from '../../../../../../../workbench/contrib/files/browser/files.js'
import { IModelService } from '../../../../../../../editor/common/services/model.js';
import { IClipboardService } from '../../../../../../../platform/clipboard/common/clipboardService.js';
import { IContextViewService, IContextMenuService } from '../../../../../../../platform/contextview/browser/contextView.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../../../../platform/hover/browser/hover.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { ILLMMessageService } from '../../../../common/sendLLMMessageService.js';
import { IRefreshModelService } from '../../../../../../../workbench/contrib/grid/common/refreshModelService.js';
import { IGridSettingsService } from '../../../../../../../workbench/contrib/grid/common/gridSettingsService.js';
import { IExtensionTransferService } from '../../../../../../../workbench/contrib/grid/browser/extensionTransferService.js'

import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js'
import { ICodeEditorService } from '../../../../../../../editor/browser/services/codeEditorService.js'
import { ICommandService } from '../../../../../../../platform/commands/common/commands.js'
import { IContextKeyService } from '../../../../../../../platform/contextkey/common/contextkey.js'
import { INotificationService } from '../../../../../../../platform/notification/common/notification.js'
import { IAccessibilityService } from '../../../../../../../platform/accessibility/common/accessibility.js'
import { ILanguageConfigurationService } from '../../../../../../../editor/common/languages/languageConfigurationRegistry.js'
import { ILanguageFeaturesService } from '../../../../../../../editor/common/services/languageFeatures.js'
import { ILanguageDetectionService } from '../../../../../../services/languageDetection/common/languageDetectionWorkerService.js'
import { IKeybindingService } from '../../../../../../../platform/keybinding/common/keybinding.js'
import { IEnvironmentService } from '../../../../../../../platform/environment/common/environment.js'
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js'
import { IPathService } from '../../../../../../../workbench/services/path/common/pathService.js'
import { IMetricsService } from '../../../../../../../workbench/contrib/grid/common/metricsService.js'
import { URI } from '../../../../../../../base/common/uri.js'
import { IChatThreadService, ThreadsState, ThreadStreamState } from '../../../chatThreadService.js'
import { ITerminalToolService } from '../../../terminalToolService.js'
import { ILanguageService } from '../../../../../../../editor/common/languages/language.js'
import { IGridModelService } from '../../../../common/gridModelService.js'
import { IWorkspaceContextService } from '../../../../../../../platform/workspace/common/workspace.js'
import { IGridCommandBarService } from '../../../gridCommandBarService.js'
import { INativeHostService } from '../../../../../../../platform/native/common/native.js';
import { IEditCodeService } from '../../../editCodeServiceInterface.js'
import { IToolsService } from '../../../toolsService.js'
import { IConvertToLLMMessageService } from '../../../convertToLLMMessageService.js'
import { ITerminalService } from '../../../../../terminal/browser/terminal.js'
import { ISearchService } from '../../../../../../services/search/common/search.js'
import { IExtensionManagementService } from '../../../../../../../platform/extensionManagement/common/extensionManagement.js'
import { IMCPService } from '../../../../common/mcpService.js';
import { IStorageService } from '../../../../../../../platform/storage/common/storage.js'
import { IRepoIndexerService } from '../../../repoIndexerService.js'
import { ISecretDetectionService } from '../../../../common/secretDetectionService.js'


// normally to do this you'd use a useEffect that calls .onDidChangeState(), but useEffect mounts too late and misses initial state changes

// even if React hasn't mounted yet, the variables are always updated to the latest state.
// React listens by adding a setState function to these listeners.

export let chatThreadsState: ThreadsState
export const chatThreadsStateListeners: Set<(s: ThreadsState) => void> = new Set()

export let chatThreadsStreamState: ThreadStreamState
export const chatThreadsStreamStateListeners: Set<(threadId: string) => void> = new Set()

export let settingsState: GridSettingsState
export const settingsStateListeners: Set<(s: GridSettingsState) => void> = new Set()

export let refreshModelState: RefreshModelStateOfProvider
export const refreshModelStateListeners: Set<(s: RefreshModelStateOfProvider) => void> = new Set()
export const refreshModelProviderListeners: Set<(p: RefreshableProviderName, s: RefreshModelStateOfProvider) => void> = new Set()

export let colorThemeState: ColorScheme
export const colorThemeStateListeners: Set<(s: ColorScheme) => void> = new Set()

export const ctrlKZoneStreamingStateListeners: Set<(diffareaid: number, s: boolean) => void> = new Set()
export const commandBarURIStateListeners: Set<(uri: URI) => void> = new Set();
export const activeURIListeners: Set<(uri: URI | null) => void> = new Set();

export const mcpListeners: Set<() => void> = new Set()


// must call this before you can use any of the hooks below
// this should only be called ONCE! this is the only place you don't need to dispose onDidChange. If you use state.onDidChange anywhere else, make sure to dispose it!
export const _registerServices = (accessor: ServicesAccessor) => {

	const disposables: IDisposable[] = []

	_registerAccessor(accessor)

	const stateServices = {
		chatThreadsStateService: accessor.get(IChatThreadService),
		settingsStateService: accessor.get(IGridSettingsService),
		refreshModelService: accessor.get(IRefreshModelService),
		themeService: accessor.get(IThemeService),
		editCodeService: accessor.get(IEditCodeService),
		gridCommandBarService: accessor.get(IGridCommandBarService),
		modelService: accessor.get(IModelService),
		mcpService: accessor.get(IMCPService),
	}

	const { settingsStateService, chatThreadsStateService, refreshModelService, themeService, editCodeService, gridCommandBarService, modelService, mcpService } = stateServices




	chatThreadsState = chatThreadsStateService.state
	disposables.push(
		chatThreadsStateService.onDidChangeCurrentThread(() => {
			chatThreadsState = chatThreadsStateService.state
			chatThreadsStateListeners.forEach(l => l(chatThreadsState))
		})
	)

	// same service, different state
	chatThreadsStreamState = chatThreadsStateService.streamState
	disposables.push(
		chatThreadsStateService.onDidChangeStreamState(({ threadId }) => {
			chatThreadsStreamState = chatThreadsStateService.streamState
			chatThreadsStreamStateListeners.forEach(l => l(threadId))
		})
	)

	settingsState = settingsStateService.state
	disposables.push(
		settingsStateService.onDidChangeState(() => {
			settingsState = settingsStateService.state
			settingsStateListeners.forEach(l => l(settingsState))
		})
	)

	refreshModelState = refreshModelService.state
	disposables.push(
		refreshModelService.onDidChangeState((providerName) => {
			refreshModelState = refreshModelService.state
			refreshModelStateListeners.forEach(l => l(refreshModelState))
			refreshModelProviderListeners.forEach(l => l(providerName, refreshModelState)) // no state
		})
	)

	colorThemeState = themeService.getColorTheme().type
	disposables.push(
		themeService.onDidColorThemeChange(({ type }) => {
			colorThemeState = type
			colorThemeStateListeners.forEach(l => l(colorThemeState))
		})
	)

	// no state
	disposables.push(
		editCodeService.onDidChangeStreamingInCtrlKZone(({ diffareaid }) => {
			const isStreaming = editCodeService.isCtrlKZoneStreaming({ diffareaid })
			ctrlKZoneStreamingStateListeners.forEach(l => l(diffareaid, isStreaming))
		})
	)

	disposables.push(
		gridCommandBarService.onDidChangeState(({ uri }) => {
			commandBarURIStateListeners.forEach(l => l(uri));
		})
	)

	disposables.push(
		gridCommandBarService.onDidChangeActiveURI(({ uri }) => {
			activeURIListeners.forEach(l => l(uri));
		})
	)

	disposables.push(
		mcpService.onDidChangeState(() => {
			mcpListeners.forEach(l => l())
		})
	)


	return disposables
}



const getReactAccessor = (accessor: ServicesAccessor) => {
	// Extract all services synchronously in a single pass
	// This must complete before the accessor becomes invalid
	// (which happens when invokeFunction returns)
	try {
		const reactAccessor = {
			IModelService: accessor.get(IModelService),
			IClipboardService: accessor.get(IClipboardService),
			IContextViewService: accessor.get(IContextViewService),
			IContextMenuService: accessor.get(IContextMenuService),
			IFileService: accessor.get(IFileService),
			IHoverService: accessor.get(IHoverService),
			IThemeService: accessor.get(IThemeService),
			ILLMMessageService: accessor.get(ILLMMessageService),
			IRefreshModelService: accessor.get(IRefreshModelService),
			IGridSettingsService: accessor.get(IGridSettingsService),
			IEditCodeService: accessor.get(IEditCodeService),
			IChatThreadService: accessor.get(IChatThreadService),

			IInstantiationService: accessor.get(IInstantiationService),
			ICodeEditorService: accessor.get(ICodeEditorService),
			ICommandService: accessor.get(ICommandService),
			IContextKeyService: accessor.get(IContextKeyService),
			INotificationService: accessor.get(INotificationService),
			IAccessibilityService: accessor.get(IAccessibilityService),
			ILanguageConfigurationService: accessor.get(ILanguageConfigurationService),
			ILanguageDetectionService: accessor.get(ILanguageDetectionService),
			ILanguageFeaturesService: accessor.get(ILanguageFeaturesService),
			IKeybindingService: accessor.get(IKeybindingService),
			ISearchService: accessor.get(ISearchService),

			IExplorerService: accessor.get(IExplorerService),
			IEnvironmentService: accessor.get(IEnvironmentService),
			IConfigurationService: accessor.get(IConfigurationService),
			IPathService: accessor.get(IPathService),
			IMetricsService: accessor.get(IMetricsService),
			ITerminalToolService: accessor.get(ITerminalToolService),
			ILanguageService: accessor.get(ILanguageService),
			IGridModelService: accessor.get(IGridModelService),
			IWorkspaceContextService: accessor.get(IWorkspaceContextService),

			IGridCommandBarService: accessor.get(IGridCommandBarService),
			INativeHostService: accessor.get(INativeHostService),
			IToolsService: accessor.get(IToolsService),
			IConvertToLLMMessageService: accessor.get(IConvertToLLMMessageService),
			ITerminalService: accessor.get(ITerminalService),
			IExtensionManagementService: accessor.get(IExtensionManagementService),
			IExtensionTransferService: accessor.get(IExtensionTransferService),
			IMCPService: accessor.get(IMCPService),
			IRepoIndexerService: accessor.get(IRepoIndexerService),
			ISecretDetectionService: accessor.get(ISecretDetectionService),

			IStorageService: accessor.get(IStorageService),

		} as const
		return reactAccessor
	} catch (error) {
		console.error('[ReactServices] Failed to extract services from accessor:', error);
		throw error;
	}
}

export type ReactAccessor = ReturnType<typeof getReactAccessor>


let reactAccessor_: ReactAccessor | null = null
const _registerAccessor = (accessor: ServicesAccessor) => {
	const reactAccessor = getReactAccessor(accessor)
	reactAccessor_ = reactAccessor
}

// -- services --
export const useAccessor = () => {
	if (!reactAccessor_) {
		throw new Error(`⚠️ GRID useAccessor was called before _registerServices!`)
	}

	return { get: <S extends keyof ReactAccessor,>(service: S): ReactAccessor[S] => reactAccessor_![service] }
}
