/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useState } from 'react';
import '../styles.css';

import { AnalyticsPanel } from './AnalyticsPanel.js';
import { AuditLogsPanel } from './AuditLogsPanel.js';
import { BillingPanel } from './BillingPanel.js';

type DashboardView = 'overview' | 'audit' | 'settings';

export const DashboardPanel = ({ onClose }: { onClose?: () => void }) => {
	const [view, setView] = useState<DashboardView>('overview');

	return (
		<div className="w-full h-full flex flex-col bg-void-bg-2 overflow-auto">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-void-border-2 bg-void-bg-1">
				<div>
					<h2 className="text-sm font-semibold text-void-fg-0">Dashboard</h2>
					<p className="text-[10px] text-void-fg-3">Team Overview</p>
				</div>
				{onClose && (
					<button onClick={onClose} className="text-void-fg-3 hover:text-void-fg-1">×</button>
				)}
			</div>

			{/* Tabs */}
			<div className="px-4 pt-3 pb-0">
				<div className="flex border-b border-void-border-2 gap-4">
					<Tab active={view === 'overview'} onClick={() => setView('overview')}>Overview</Tab>
					<Tab active={view === 'audit'} onClick={() => setView('audit')}>Audit Logs</Tab>
					<Tab active={view === 'settings'} onClick={() => setView('settings')}>Settings</Tab>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 p-3">
				{view === 'overview' && <AnalyticsPanel />}
				{view === 'audit' && <AuditLogsPanel />}
				{view === 'settings' && <BillingPanel />}
			</div>
		</div>
	);
};

const Tab = ({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) => (
	<button
		onClick={onClick}
		className={`pb-2 text-xs font-medium transition-colors border-b-2 ${active
				? 'text-blue-400 border-blue-400'
				: 'text-void-fg-3 border-transparent hover:text-void-fg-1'
			}`}
	>
		{children}
	</button>
);
