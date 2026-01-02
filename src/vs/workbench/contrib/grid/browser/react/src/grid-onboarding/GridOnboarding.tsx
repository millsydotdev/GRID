/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';
import { useAccessor, useIsDark, useSettingsState } from '../util/services.js';
import { Brain, Check, ChevronRight, DollarSign, ExternalLink, Lock, X } from 'lucide-react';
import { displayInfoOfProviderName, ProviderName, providerNames, localProviderNames, featureNames, FeatureName, isFeatureNameDisabled } from '../../../../common/gridSettingsTypes.js';
import { ChatMarkdownRender } from '../markdown/ChatMarkdownRender.js';
import { IGridSettingsService } from '../../../../common/gridSettingsService.js';

type WantToUseOption = 'smart' | 'private' | 'cheap' | 'all';

export function GridOnboarding() {
const accessor = useAccessor()
const gridSettingsService = accessor.get('IGridSettingsService')
const GridMetricsService = accessor.get('IMetricsService')


const GridSettingsState = useSettingsState()

const [pageIndex, setPageIndex] = useState(0)


// page 1 state
const [wantToUseOption, setWantToUseOption] = useState<WantToUseOption>('smart')

// Replace the single selectedProviderName with four separate states
// page 2 state - each tab gets its own state
const [selectedIntelligentProvider, setSelectedIntelligentProvider] = useState<ProviderName>('anthropic');
const [selectedPrivateProvider, setSelectedPrivateProvider] = useState<ProviderName>('ollama');
const [selectedAffordableProvider, setSelectedAffordableProvider] = useState<ProviderName>('gemini');
const [selectedAllProvider, setSelectedAllProvider] = useState<ProviderName>('anthropic');

// Helper function to get the current selected provider based on active tab
const getSelectedProvider = (): ProviderName => {
	switch (wantToUseOption) {
		case 'smart': return selectedIntelligentProvider;
		case 'private': return selectedPrivateProvider;
		case 'cheap': return selectedAffordableProvider;
		case 'all': return selectedAllProvider;
	}
}

// Helper function to set the selected provider for the current tab
const setSelectedProvider = (provider: ProviderName) => {
	switch (wantToUseOption) {
		case 'smart': setSelectedIntelligentProvider(provider); break;
		case 'private': setSelectedPrivateProvider(provider); break;
		case 'cheap': setSelectedAffordableProvider(provider); break;
		case 'all': setSelectedAllProvider(provider); break;
	}
}

const providerNamesOfWantToUseOption: { [wantToUseOption in WantToUseOption]: ProviderName[] } = {
	smart: ['anthropic', 'openAI', 'gemini', 'openRouter'],
	private: ['ollama', 'vLLM', 'openAICompatible', 'lmStudio'],
	cheap: ['gemini', 'deepseek', 'openRouter', 'ollama', 'vLLM'],
	all: providerNames,
}


const selectedProviderName = getSelectedProvider();
const didFillInProviderSettings = selectedProviderName && GridSettingsState.settingsOfProvider[selectedProviderName]._didFillInProviderSettings
const isApiKeyLongEnoughIfApiKeyExists = selectedProviderName && GridSettingsState.settingsOfProvider[selectedProviderName].apiKey ? GridSettingsState.settingsOfProvider[selectedProviderName].apiKey.length > 15 : true
const isAtLeastOneModel = selectedProviderName && GridSettingsState.settingsOfProvider[selectedProviderName].models.length >= 1

const didFillInSelectedProviderSettings = !!(didFillInProviderSettings && isApiKeyLongEnoughIfApiKeyExists && isAtLeastOneModel)

const prevAndNextButtons = <div className="max-w-[600px] w-full mx-auto flex flex-col items-end">
	<div className="flex items-center gap-2">
		<PreviousButton
			onClick={() => { setPageIndex(pageIndex - 1) }}
		/>
		<NextButton
			onClick={() => { setPageIndex(pageIndex + 1) }}
		/>
	</div>
</div>


const lastPagePrevAndNextButtons = <div className="max-w-[600px] w-full mx-auto flex flex-col items-end">
	<div className="flex items-center gap-2">
		<PreviousButton
			onClick={() => { setPageIndex(pageIndex - 1) }}
		/>
		<PrimaryActionButton
			onClick={() => {
				gridSettingsService.setGlobalSetting('isOnboardingComplete', true);
				GridMetricsService.capture('Completed Onboarding', { selectedProviderName, wantToUseOption })
			}}
			ringSize={GridSettingsState.globalSettings.isOnboardingComplete ? 'screen' : undefined}
		>Enter the GRID</PrimaryActionButton>
	</div>
</div>


// cannot be md
const basicDescOfWantToUseOption: { [wantToUseOption in WantToUseOption]: string } = {
	smart: "Models with the best performance on benchmarks.",
	private: "Host on your computer or local network for full data privacy.",
	cheap: "Free and affordable options.",
	all: "",
}

// can be md
const detailedDescOfWantToUseOption: { [wantToUseOption in WantToUseOption]: string } = {
	smart: "Most intelligent and best for agent mode.",
	private: "Private-hosted so your data never leaves your computer or network. [Email us](mailto:founders@Grideditor.com) for help setting up at your company.",
	cheap: "Use great deals like Gemini 2.5 Pro, or self-host a model with Ollama or vLLM for free.",
	all: "",
}

// Modified: initialize separate provider states on initial render instead of watching wantToUseOption changes
useEffect(() => {
	if (selectedIntelligentProvider === undefined) {
		setSelectedIntelligentProvider(providerNamesOfWantToUseOption['smart'][0]);
	}
	if (selectedPrivateProvider === undefined) {
		setSelectedPrivateProvider(providerNamesOfWantToUseOption['private'][0]);
	}
	if (selectedAffordableProvider === undefined) {
		setSelectedAffordableProvider(providerNamesOfWantToUseOption['cheap'][0]);
	}
	if (selectedAllProvider === undefined) {
		setSelectedAllProvider(providerNamesOfWantToUseOption['all'][0]);
	}
}, []);

// reset the page to page 0 if the user redos onboarding
useEffect(() => {
	if (!GridSettingsState.globalSettings.isOnboardingComplete) {
		setPageIndex(0)
	}
}, [setPageIndex, GridSettingsState.globalSettings.isOnboardingComplete])


const contentOfIdx: { [pageIndex: number]: React.ReactNode } = {
	0: <OnboardingPageShell
		content={
			<div className='flex flex-col items-center gap-8'>
				<div className="text-5xl font-light text-center">Welcome to GRID</div>

				{/* Slice of GRID image */}
				<div className='max-w-md w-full h-[30vh] mx-auto flex items-center justify-center'>
					{!isLinux && <GridIcon />}
				</div>


				<FadeIn
					delayMs={1000}
				>
					<PrimaryActionButton
						onClick={() => { setPageIndex(1) }}
					>
						Get Started
					</PrimaryActionButton>
				</FadeIn>

			</div>
		}
	/>,

	1: <OnboardingPageShell hasMaxWidth={false}
		content={
			<AddProvidersPage pageIndex={pageIndex} setPageIndex={setPageIndex} />
		}
	/>,
	2: <OnboardingPageShell

		content={
			<div>
				<div className="text-5xl font-light text-center">Settings and Themes</div>

				<div className="mt-8 text-center flex flex-col items-center gap-4 w-full max-w-md mx-auto">
					<h4 className="text-void-fg-3 mb-4">Transfer your settings from an existing editor?</h4>
					<OneClickSwitchButton className='w-full px-4 py-2' fromEditor="VS Code" />
					<OneClickSwitchButton className='w-full px-4 py-2' fromEditor="Cursor" />
					<OneClickSwitchButton className='w-full px-4 py-2' fromEditor="Windsurf" />
				</div>
			</div>
		}
		bottom={lastPagePrevAndNextButtons}
	/>,
}


return <div key={pageIndex} className="w-full h-[80vh] text-left mx-auto flex flex-col items-center justify-center">
	<ErrorBoundary>
		{contentOfIdx[pageIndex]}
	</ErrorBoundary>
</div>
}
