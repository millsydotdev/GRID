/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { useSettingsState } from '../util/services.js';
import { providerNames, ProviderName } from '../../../../common/gridSettingsTypes.js'; // Ensure path is correct
import { Check } from 'lucide-react';

export function OnboardingProviders({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
	const settingsState = useSettingsState();
	const [selectedProvider, setSelectedProvider] = useState<ProviderName>('anthropic');
	const [apiKey, setApiKey] = useState('');

	// Ideally we list all providers or categories here.
	// For wizard simplicity, let's offer a curated list or the categories from the original file.
	// "Smart" vs "Private" vs "Cheap"

	const categories = [
		{ id: 'smart', label: 'Smart', desc: 'Best reasoning (Claude, GPT-4)', providers: ['anthropic', 'openAI'] },
		{ id: 'private', label: 'Private', desc: 'Local models (Ollama)', providers: ['ollama', 'vLLM'] },
		{ id: 'cheap', label: 'Affordable', desc: 'Cost effective', providers: ['gemini', 'deepseek'] }
	];

	const [activeCategory, setActiveCategory] = useState('smart');

	return (
		<div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
			<div className="text-center space-y-2">
				<h2 className="text-3xl font-light tracking-tight text-void-fg-0">Select AI Provider</h2>
				<p className="text-void-fg-3">Power your coding assistant.</p>
			</div>

			<div className="w-full flex gap-2 p-1 bg-void-bg-2 rounded-lg">
				{categories.map(c => (
					<button
						key={c.id}
						onClick={() => setActiveCategory(c.id)}
						className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeCategory === c.id ? 'bg-void-bg-0 text-void-fg-0 shadow-sm' : 'text-void-fg-3 hover:text-void-fg-2'}`}
					>
						{c.label}
					</button>
				))}
			</div>

			<div className="w-full bg-void-bg-1 border border-void-border-2 rounded-xl p-6">
				<div className="grid grid-cols-2 gap-4 mb-6">
					{categories.find(c => c.id === activeCategory)?.providers.map((p) => (
						<button
							key={p}
							onClick={() => setSelectedProvider(p as ProviderName)}
							className={`flex flex-col items-start gap-2 p-4 rounded-lg border transition-all ${selectedProvider === p ? 'bg-blue-500/10 border-blue-500/50' : 'bg-void-bg-2 border-void-border-3 hover:bg-void-bg-3'}`}
						>
							<div className="flex items-center justify-between w-full">
								<span className="font-medium capitalize text-void-fg-0">{p}</span>
								{selectedProvider === p && <Check className="w-4 h-4 text-blue-400" />}
							</div>
						</button>
					))}
				</div>

				{/* API Key Input */}
				<div className="space-y-2">
					<label className="text-xs font-medium text-void-fg-2">API Key for <span className="capitalize">{selectedProvider}</span></label>
					<input
						type="password"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						placeholder={`Enter ${selectedProvider} API Key...`}
						className="w-full bg-void-bg-2 border border-void-border-3 rounded-lg px-4 py-2.5 text-sm text-void-fg-1 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
					/>
					<p className="text-[10px] text-void-fg-3">Your key is stored locally and securely.</p>
				</div>
			</div>

			<div className="flex gap-4 pt-4">
				<button
					onClick={onBack}
					className="px-6 py-2 rounded-lg text-void-fg-2 hover:bg-void-bg-2 transition-colors"
				>
					Back
				</button>
				<button
					onClick={onNext}
					className="px-8 py-2 rounded-lg bg-void-fg-0 text-void-bg-0 font-medium hover:opacity-90 transition-opacity"
				>
					Next
				</button>
			</div>
		</div>
	);
}
