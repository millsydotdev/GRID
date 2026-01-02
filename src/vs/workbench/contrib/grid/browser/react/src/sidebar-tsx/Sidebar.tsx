/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { useIsDark } from '../util/services.js';
import '../styles.css';

import { SidebarChat } from './SidebarChat.js';
import ErrorBoundary from './ErrorBoundary.js';
import { AgentManagerEnhanced } from './AgentManager.js';
import { ProjectTaskManager } from './ProjectTaskManager.js';

type GridSidebarView = 'chat' | 'agents' | 'projects';

export const Sidebar = ({ className }: { className: string }) => {
	const isDark = useIsDark();
	const [activeView, setActiveView] = useState<GridSidebarView>('chat');

	return (
		<div
			className={`@@void-scope ${isDark ? 'dark' : ''}`}
			style={{ width: '100%', height: '100%' }}
		>
			<div
				className={`
				w-full h-full
				bg-void-bg-2
				text-void-fg-1
			`}
			>
				{/* GRID panel header tabs */}
				<div className="w-full border-b border-void-border-2 bg-void-bg-1 flex items-center justify-between px-3 py-2 text-xs">
					<div className="flex gap-1">
						<GridTab
							active={activeView === 'chat'}
							label="Chat"
							onClick={() => setActiveView('chat')}
						/>
						<GridTab
							active={activeView === 'agents'}
							label="Agents"
							onClick={() => setActiveView('agents')}
						/>
						<GridTab
							active={activeView === 'projects'}
							label="Projects"
							onClick={() => setActiveView('projects')}
						/>
					</div>
					<span className="text-[10px] text-void-fg-3 uppercase tracking-[0.18em]">
						GRID CHAT
					</span>
				</div>

				<div className="w-full h-[calc(100%-32px)]">
					<ErrorBoundary>
						{activeView === 'chat' && <SidebarChat />}
						{activeView === 'agents' && (
							<AgentManagerEnhanced onClose={() => setActiveView('chat')} />
						)}
						{activeView === 'projects' && <ProjectTaskManager />}
					</ErrorBoundary>
				</div>
			</div>
		</div>
	);
};

const GridTab = ({
	active,
	label,
	onClick,
}: {
	active: boolean;
	label: string;
	onClick: () => void;
}) => (
	<button
		type="button"
		onClick={onClick}
		className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${active
				? 'bg-void-bg-3 text-void-fg-0'
				: 'text-void-fg-3 hover:text-void-fg-1 hover:bg-void-bg-3/60'
			}`}
	>
		{label}
	</button>
);
