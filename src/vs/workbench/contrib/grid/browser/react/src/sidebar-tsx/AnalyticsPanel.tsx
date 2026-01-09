/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useState, useEffect } from 'react';
import { useAccessor } from '../util/services.js';
import '../styles.css';

const LoaderIcon = () => (
	<svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
	</svg>
);

const ActivityIcon = () => (
	<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
	</svg>
);

export const AnalyticsPanel = () => {
	const accessor = useAccessor();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<{ activityCount: number; period: string } | null>(null);
	const [error, setError] = useState('');

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setLoading(true);
		try {
			const result = await accessor.commandService.executeCommand('grid.getAnalytics');
			if (result) {
				setData(result as any);
				setError('');
			} else {
				setError('Failed to load analytics');
			}
		} catch (e) {
			setError('Error loading data');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-48">
				<LoaderIcon />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 text-center">
				<p className="text-red-400 text-xs">{error}</p>
				<button onClick={loadData} className="mt-2 text-xs text-blue-400 hover:underline">Retry</button>
			</div>
		);
	}

	if (!data) return null;

	return (
		<div className="space-y-4 p-1">
			<h3 className="text-sm font-semibold text-void-fg-1 px-1">Team Overview</h3>

			<div className="grid grid-cols-2 gap-3">
				<div className="bg-void-bg-1 border border-void-border-3 rounded-lg p-3">
					<div className="flex items-center gap-2 text-void-fg-3 mb-2">
						<ActivityIcon />
						<span className="text-[10px] uppercase tracking-wider">Activity</span>
					</div>
					<div className="flex items-end gap-2">
						<span className="text-2xl font-bold text-void-fg-0">{data.activityCount}</span>
						<span className="text-[10px] text-green-400 mb-1.5">Last 30d</span>
					</div>
				</div>

				{/* Placeholder for more stats */}
				<div className="bg-void-bg-1 border border-void-border-3 rounded-lg p-3 opacity-50">
					<div className="flex items-center gap-2 text-void-fg-3 mb-2">
						<span className="text-[10px] uppercase tracking-wider">Members</span>
					</div>
					<div className="flex items-end gap-2">
						<span className="text-2xl font-bold text-void-fg-0">--</span>
					</div>
				</div>
			</div>

			<div className="bg-void-bg-1 border border-void-border-3 rounded-lg p-4">
				<h4 className="text-xs font-semibold text-void-fg-1 mb-3">Activity Trend</h4>
				<div className="h-24 flex items-end justify-between gap-1">
					{/* Fake Chart Bars for visual parity since we don't have trend data yet */}
					{[40, 60, 45, 70, 50, 80, 65, 90, 30, 50].map((h, i) => (
						<div key={i} style={{ height: `${h}%` }} className="flex-1 bg-void-bg-3 hover:bg-blue-500/50 transition-colors rounded-sm" />
					))}
				</div>
			</div>
		</div>
	);
};
