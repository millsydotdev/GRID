/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect, useCallback } from 'react';
import { Bot, ChevronDown, Sparkles, Settings2 } from 'lucide-react';
import { useAccessor } from '../util/services.js';

interface CustomAgent {
	id: string;
	name: string;
	description: string;
	icon?: string;
	allowedTools?: string[];
	disabledTools?: string[];
}

interface CustomAgentSelectorProps {
	onAgentChange?: (agentId: string) => void;
	className?: string;
}

export function CustomAgentSelector({ onAgentChange, className = '' }: CustomAgentSelectorProps) {
	const accessor = useAccessor();
	const [agents, setAgents] = useState<CustomAgent[]>([]);
	const [selectedAgentId, setSelectedAgentId] = useState<string>('default');
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	// Load agents from customAgentService
	useEffect(() => {
		const loadAgents = async () => {
			setIsLoading(true);
			try {
				// Get the custom agent service
				const customAgentService = accessor.get('customAgentService' as any);
				if (customAgentService?.getAgents) {
					const loadedAgents = await customAgentService.getAgents();
					setAgents(loadedAgents);
				} else {
					// Fallback: just show default agent
					setAgents([{
						id: 'default',
						name: 'GRID Assistant',
						description: 'The default GRID AI assistant with full capabilities.',
						icon: '🤖',
					}]);
				}
			} catch (e) {
				console.warn('Failed to load custom agents:', e);
				setAgents([{
					id: 'default',
					name: 'GRID Assistant',
					description: 'Default assistant',
					icon: '🤖',
				}]);
			}
			setIsLoading(false);
		};

		loadAgents();
	}, [accessor]);

	const handleAgentSelect = useCallback((agentId: string) => {
		setSelectedAgentId(agentId);
		setIsOpen(false);
		onAgentChange?.(agentId);
	}, [onAgentChange]);

	const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

	// Don't show selector if only default agent
	if (agents.length <= 1 && !isLoading) {
		return null;
	}

	return (
		<div className={`relative ${className}`}>
			{/* Trigger Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded-md hover:bg-[var(--vscode-list-hoverBackground)] transition-colors"
			>
				<span className="text-base">{selectedAgent?.icon || '🤖'}</span>
				<span className="text-[var(--vscode-foreground)] font-medium max-w-[120px] truncate">
					{isLoading ? 'Loading...' : (selectedAgent?.name || 'Select Agent')}
				</span>
				<ChevronDown 
					size={14} 
					className={`text-[var(--vscode-descriptionForeground)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
				/>
			</button>

			{/* Dropdown */}
			{isOpen && (
				<div className="absolute top-full left-0 mt-1 w-64 bg-[var(--vscode-dropdown-background)] border border-[var(--vscode-dropdown-border)] rounded-md shadow-lg z-50 overflow-hidden">
					{/* Header */}
					<div className="px-3 py-2 border-b border-[var(--vscode-widget-border)] bg-[var(--vscode-sideBarSectionHeader-background)]">
						<div className="flex items-center gap-2">
							<Sparkles size={14} className="text-[var(--vscode-symbolIcon-classForeground)]" />
							<span className="text-xs font-semibold text-[var(--vscode-foreground)] uppercase tracking-wide">
								Custom Agents
							</span>
						</div>
					</div>

					{/* Agent List */}
					<div className="max-h-64 overflow-y-auto">
						{agents.map((agent) => (
							<button
								key={agent.id}
								onClick={() => handleAgentSelect(agent.id)}
								className={`w-full px-3 py-2 flex items-start gap-3 hover:bg-[var(--vscode-list-hoverBackground)] transition-colors ${
									selectedAgentId === agent.id ? 'bg-[var(--vscode-list-activeSelectionBackground)]' : ''
								}`}
							>
								<span className="text-lg mt-0.5">{agent.icon || '🤖'}</span>
								<div className="flex-1 text-left">
									<div className="text-sm font-medium text-[var(--vscode-foreground)]">
										{agent.name}
									</div>
									<div className="text-xs text-[var(--vscode-descriptionForeground)] line-clamp-2">
										{agent.description}
									</div>
									{agent.disabledTools && agent.disabledTools.length > 0 && (
										<div className="mt-1 text-[10px] text-[var(--vscode-editorWarning-foreground)]">
											⚠️ {agent.disabledTools.length} tools restricted
										</div>
									)}
								</div>
							</button>
						))}
					</div>

					{/* Footer - Create New */}
					<div className="px-3 py-2 border-t border-[var(--vscode-widget-border)] bg-[var(--vscode-sideBarSectionHeader-background)]">
						<div className="flex items-center gap-2 text-xs text-[var(--vscode-descriptionForeground)]">
							<Settings2 size={12} />
							<span>Add agents in <code>.grid/agents/</code></span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default CustomAgentSelector;
