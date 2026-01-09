/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useState, useEffect } from 'react';
import { useAccessor } from '../util/services.js';
import '../styles.css';

interface AuditLog {
	id: string;
	action: string;
	resource_type: string;
	created_at: string;
	actor: { email: string };
}

const LoaderIcon = () => (
	<svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
	</svg>
);

export const AuditLogsPanel = () => {
	const accessor = useAccessor();
	const [loading, setLoading] = useState(true);
	const [logs, setLogs] = useState<AuditLog[]>([]);
	const [error, setError] = useState('');

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setLoading(true);
		try {
			const result = await accessor.commandService.executeCommand('grid.getAuditLogs') as any;
			if (result && result.logs) {
				setLogs(result.logs);
				setError('');
			} else {
				setLogs([]); // No logs or permission issue treated as empty for now, or show error
			}
		} catch (e) {
			setError('Error loading logs');
		} finally {
			setLoading(false);
		}
	};

	if (loading) return <div className="flex justify-center p-4"><LoaderIcon /></div>;

	return (
		<div className="space-y-2 p-1">
			<div className="flex items-center justify-between px-1 mb-2">
				<h3 className="text-sm font-semibold text-void-fg-1">Audit Logs</h3>
				<button onClick={loadData} className="text-[10px] text-blue-400 hover:underline">Refresh</button>
			</div>

			{logs.length === 0 ? (
				<div className="text-center py-8 text-void-fg-3 text-xs">
					No activity logs found.
				</div>
			) : (
				<div className="space-y-1">
					{logs.map(log => (
						<div key={log.id} className="bg-void-bg-1 border border-void-border-3 rounded-md p-2 hover:border-void-border-4 transition-colors">
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs font-medium text-void-fg-1">{formatAction(log.action)}</span>
								<span className="text-[9px] text-void-fg-3">{new Date(log.created_at).toLocaleDateString()}</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-[10px] text-void-fg-2">{log.actor?.email || 'System'}</span>
								<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-void-bg-3 text-void-fg-2 uppercase">{log.resource_type}</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

function formatAction(action: string) {
	return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}
