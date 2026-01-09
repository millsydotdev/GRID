/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { Check, Keyboard, Moon, Sun, Laptop, Shield } from 'lucide-react';
import { useAccessor, useSettingsState } from '../util/services.js';

export function OnboardingSettings({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
	const accessor = useAccessor();
	const settingsState = useSettingsState();
	const gridSettingsService = accessor.get('IGridSettingsService');

	const [keymap, setKeymap] = useState<'vscode' | 'cursor' | 'windsurf' | 'jetbrains'>('vscode');
	const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
	const [telemetry, setTelemetry] = useState(true);

	const applySettings = async () => {
		// Here we would apply keybindings/theme via command service
		// For now we persist specific ones if commands exist, or just mock the selection
		// Telemetry is a real setting
		// gridSettingsService.setGlobalSetting('telemetryEnabled', telemetry); // Hypothetical
		onNext();
	};

	return (
		<div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
			<div className="text-center space-y-2">
				<h2 className="text-3xl font-light tracking-tight text-void-fg-0">Personalize Experience</h2>
				<p className="text-void-fg-3">Make GRID feel like home.</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
				{/* Keybindings */}
				<div className="bg-void-bg-1 border border-void-border-2 rounded-xl p-4 flex flex-col gap-4">
					<div className="flex items-center gap-2 text-void-fg-0 font-medium">
						<Keyboard className="w-4 h-4" />
						<h3>Keybindings</h3>
					</div>
					<div className="space-y-2">
						{['vscode', 'cursor', 'windsurf', 'jetbrains'].map((k) => (
							<button
								key={k}
								onClick={() => setKeymap(k as any)}
								className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${keymap === k ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-void-bg-2 text-void-fg-2 hover:bg-void-bg-3 border border-transparent'}`}
							>
								<span className="capitalize">{k === 'vscode' ? 'VS Code' : k}</span>
								{keymap === k && <Check className="w-3 h-3" />}
							</button>
						))}
					</div>
				</div>

				{/* Theme */}
				<div className="bg-void-bg-1 border border-void-border-2 rounded-xl p-4 flex flex-col gap-4">
					<div className="flex items-center gap-2 text-void-fg-0 font-medium">
						<Sun className="w-4 h-4" />
						<h3>Theme</h3>
					</div>
					<div className="space-y-2">
						{[
							{ id: 'dark', label: 'Dark', icon: Moon },
							{ id: 'light', label: 'Light', icon: Sun },
							{ id: 'system', label: 'System', icon: Laptop }
						].map((t) => (
							<button
								key={t.id}
								onClick={() => setTheme(t.id as any)}
								className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${theme === t.id ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-void-bg-2 text-void-fg-2 hover:bg-void-bg-3 border border-transparent'}`}
							>
								<div className="flex items-center gap-2">
									<t.icon className="w-3 h-3" />
									<span>{t.label}</span>
								</div>
								{theme === t.id && <Check className="w-3 h-3" />}
							</button>
						))}
					</div>
				</div>

				{/* Privacy */}
				<div className="bg-void-bg-1 border border-void-border-2 rounded-xl p-4 flex flex-col gap-4">
					<div className="flex items-center gap-2 text-void-fg-0 font-medium">
						<Shield className="w-4 h-4" />
						<h3>Privacy</h3>
					</div>
					<div className="flex-1 flex flex-col justify-between gap-4">
						<p className="text-xs text-void-fg-3 leading-relaxed">
							Help us improve GRID by sending anonymous usage data. We never collect code or PII without consent.
						</p>
						<button
							onClick={() => setTelemetry(!telemetry)}
							className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${telemetry ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-void-bg-2 text-void-fg-2 hover:bg-void-bg-3 border border-transparent'}`}
						>
							<span>Telemetry</span>
							<span className="text-xs">{telemetry ? 'Enabled' : 'Disabled'}</span>
						</button>
					</div>
				</div>
			</div>

			<div className="flex gap-4 pt-8">
				<button
					onClick={onBack}
					className="px-6 py-2 rounded-lg text-void-fg-2 hover:bg-void-bg-2 transition-colors"
				>
					Back
				</button>
				<button
					onClick={applySettings}
					className="px-8 py-2 rounded-lg bg-void-fg-0 text-void-bg-0 font-medium hover:opacity-90 transition-opacity"
				>
					Next
				</button>
			</div>
		</div>
	);
}
