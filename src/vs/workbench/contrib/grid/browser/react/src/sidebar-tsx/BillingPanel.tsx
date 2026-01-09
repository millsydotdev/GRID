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

export const BillingPanel = () => {
	const accessor = useAccessor();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<any>(null);

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setLoading(true);
		try {
			const result = await accessor.commandService.executeCommand('grid.getOrganizationData');
			if (result) {
				setData(result);
			}
		} catch (e) {
			console.error(e);
		} finally {
			setLoading(false);
		}
	};

	if (loading) return <div className="flex justify-center p-4"><LoaderIcon /></div>;

	if (!data || !data.organization) {
		return (
			<div className="p-4 text-center text-void-fg-3 text-xs">
				Unable to load organization data.
			</div>
		);
	}

	const { organization, role, usage } = data;
	// organization is an array from the select query usually, so take first
	const org = Array.isArray(organization) ? organization[0] : organization;
	const cost = (usage?.total_cost_cents || 0) / 100;

	return (
		<div className="space-y-4 p-1">
			<div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg p-4">
				<h3 className="text-sm font-bold text-void-fg-0 mb-1">{org?.name || 'Organization'}</h3>
				<p className="text-xs text-void-fg-2 mb-3 capitalize">Plan: {org?.billing_plan || 'Pro'}</p>

				<div className="flex items-center gap-2">
					<span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-void-bg-3 text-void-fg-1`}>
						{role}
					</span>
				</div>
			</div>

			<div className="bg-void-bg-1 border border-void-border-3 rounded-lg p-4">
				<h4 className="text-xs font-semibold text-void-fg-1 mb-2">Usage This Month</h4>
				<div className="flex items-baseline gap-1">
					<span className="text-2xl font-bold text-void-fg-0">${cost.toFixed(2)}</span>
					<span className="text-xs text-void-fg-3">USD</span>
				</div>
				<div className="mt-2 w-full bg-void-bg-3 h-1.5 rounded-full overflow-hidden">
					<div className="bg-blue-500 h-full rounded-full" style={{ width: '15%' }}></div>
				</div>
				<p className="mt-1 text-[10px] text-void-fg-3 text-right">Updated daily</p>
			</div>
		</div>
	);
};
