/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useState, useEffect } from 'react';
import { useAccessor, useSettingsState } from '../util/services.js';
import { OnboardingShell } from './OnboardingShell.js';
import { OnboardingWelcome } from './OnboardingWelcome.js';
import { OnboardingProviders } from './OnboardingProviders.js';
import { OnboardingSettings } from './OnboardingSettings.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { ExternalLink } from 'lucide-react';
import './onboarding.css';

export function GridOnboarding() {
	const accessor = useAccessor();
	const gridSettingsService = accessor.get('IGridSettingsService');
	const GridMetricsService = accessor.get('IMetricsService');
	const settingsState = useSettingsState(); // Ensure global state is synced

	// If onboarding is complete, don't verify step or show anything
	if (settingsState.globalSettings.isOnboardingComplete) {
		return null;
	}

	const [step, setStep] = useState(0);

	// Steps:
	// 0: Welcome / Auth
	// 1: Providers (AI)
	// 2: Settings (Theme/Keys)
	// 3: Complete / Getting Started

	const handleComplete = () => {
		gridSettingsService.setGlobalSetting('isOnboardingComplete', true);
		GridMetricsService.capture('Completed Onboarding', {});
		setStep(3);
	};

	const renderStep = () => {
		switch (step) {
			case 0:
				return <OnboardingWelcome onNext={() => setStep(1)} />;
			case 1:
				return <OnboardingProviders onNext={() => setStep(2)} onBack={() => setStep(0)} />;
			case 2:
				// Don't complete yet, go to step 3 (Success Screen)
				return <OnboardingSettings onNext={() => setStep(3)} onBack={() => setStep(1)} />;
			case 3:
				return (
					<div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
						<div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-4">
							<span className="text-3xl">✓</span>
						</div>
						<h1 className="text-4xl font-light text-void-fg-0">You're all set!</h1>
						<p className="text-void-fg-2">GRID is ready to use.</p>
						<button
							// We can't close the editor because this is an overlay.
							// We just need to trigger completion which will hide the component.
							// But wait, handleComplete() sets isOnboardingComplete=true
							// which makes this return null immediately.
							// So step 3 is actually transient or we need a specific "Done" button that sets the flag.
							// Let's change handleComplete logic.
							// We'll move setGlobalSetting to the click here.
							onClick={() => {
								gridSettingsService.setGlobalSetting('isOnboardingComplete', true);
								GridMetricsService.capture('Completed Onboarding', {});
							}}
							className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all"
						>
							Start Coding
						</button>
					</div>
				);
			default:
				return null;
		}
	};


	// ... (other imports)

	// ...

	return (
		<ErrorBoundary>
			<div className="grid-onboarding-container">
				<OnboardingShell
					content={renderStep()}
					hasMaxWidth={true}
				/>
			</div>
		</ErrorBoundary>
	);
}
