import React, { useState, useEffect } from 'react';

interface AutocompleteStatistics {
	totalRequests: number;
	cachedResponses: number;
	reusedGenerators: number;
	averageResponseTime: number;
	bracketMatchesPrevented: number;
}

interface Feature {
	name: string;
	enabled: boolean;
	description: string;
}

export const AutocompletePanel: React.FC = () => {
	const [statistics, setStatistics] = useState<AutocompleteStatistics>({
		totalRequests: 0,
		cachedResponses: 0,
		reusedGenerators: 0,
		averageResponseTime: 0,
		bracketMatchesPrevented: 0,
	});

	const [features, setFeatures] = useState<Feature[]>([
		{
			name: 'Smart Code Chunking',
			enabled: true,
			description: 'Intelligently chunks code for better context',
		},
		{
			name: 'Generator Reuse',
			enabled: true,
			description: 'Reuses API requests when typing ahead',
		},
		{
			name: 'Context Ranking',
			enabled: true,
			description: '5-signal ranking for better suggestions',
		},
		{
			name: 'Bracket Matching',
			enabled: true,
			description: 'Prevents unmatched bracket suggestions',
		},
		{
			name: 'Import Definitions',
			enabled: true,
			description: 'Import-aware autocomplete context',
		},
		{
			name: 'LRU Caching',
			enabled: true,
			description: 'Caches expensive computations',
		},
		{
			name: 'Request Debouncing',
			enabled: true,
			description: 'Reduces API calls during typing',
		},
	]);

	// Mock data update (in production, would come from service)
	useEffect(() => {
		const interval = setInterval(() => {
			setStatistics(prev => ({
				...prev,
				totalRequests: prev.totalRequests + Math.floor(Math.random() * 3),
				reusedGenerators: prev.reusedGenerators + (Math.random() > 0.7 ? 1 : 0),
			}));
		}, 5000);

		return () => clearInterval(interval);
	}, []);

	const cacheHitRate = statistics.totalRequests > 0
		? ((statistics.reusedGenerators / statistics.totalRequests) * 100).toFixed(1)
		: '0.0';

	const toggleFeature = (index: number) => {
		setFeatures(prev => prev.map((f, i) =>
			i === index ? { ...f, enabled: !f.enabled } : f
		));
	};

	return (
		<div style={{ padding: '20px', fontFamily: 'system-ui' }}>
			<h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
				Enhanced Autocomplete
			</h2>

			{/* Statistics */}
			<div style={{ marginBottom: '30px' }}>
				<h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#888' }}>
					STATISTICS
				</h3>

				<div style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: '12px',
					marginBottom: '12px'
				}}>
					<StatCard
						label="Total Requests"
						value={statistics.totalRequests.toString()}
						color="#4CAF50"
					/>
					<StatCard
						label="Generator Reuses"
						value={statistics.reusedGenerators.toString()}
						color="#2196F3"
					/>
					<StatCard
						label="Cache Hit Rate"
						value={`${cacheHitRate}%`}
						color="#FF9800"
					/>
					<StatCard
						label="Avg Response"
						value={`${statistics.averageResponseTime.toFixed(0)}ms`}
						color="#9C27B0"
					/>
				</div>

				<div style={{
					padding: '12px',
					background: 'rgba(255, 152, 0, 0.1)',
					borderRadius: '6px',
					border: '1px solid rgba(255, 152, 0, 0.3)',
				}}>
					<div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
						Performance Improvement
					</div>
					<div style={{ fontSize: '20px', fontWeight: 600, color: '#FF9800' }}>
						{statistics.reusedGenerators > 0 ? `↓ ${((statistics.reusedGenerators / Math.max(statistics.totalRequests, 1)) * 100).toFixed(0)}%` : '—'}
						<span style={{ fontSize: '12px', fontWeight: 400, marginLeft: '8px', color: '#888' }}>
							API calls saved
						</span>
					</div>
				</div>
			</div>

			{/* Features */}
			<div>
				<h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#888' }}>
					FEATURES
				</h3>

				<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
					{features.map((feature, index) => (
						<FeatureCard
							key={feature.name}
							feature={feature}
							onToggle={() => toggleFeature(index)}
						/>
					))}
				</div>
			</div>

			{/* Actions */}
			<div style={{ marginTop: '24px', display: 'flex', gap: '8px' }}>
				<Button onClick={() => setStatistics({
					totalRequests: 0,
					cachedResponses: 0,
					reusedGenerators: 0,
					averageResponseTime: 0,
					bracketMatchesPrevented: 0,
				})}>
					Clear Statistics
				</Button>
				<Button onClick={() => alert('Cache cleared!')}>
					Clear Cache
				</Button>
			</div>
		</div>
	);
};

const StatCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
	<div style={{
		padding: '12px',
		background: 'rgba(255, 255, 255, 0.05)',
		borderRadius: '6px',
		border: '1px solid rgba(255, 255, 255, 0.1)',
	}}>
		<div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
			{label}
		</div>
		<div style={{ fontSize: '20px', fontWeight: 600, color }}>
			{value}
		</div>
	</div>
);

const FeatureCard: React.FC<{ feature: Feature; onToggle: () => void }> = ({ feature, onToggle }) => (
	<div style={{
		padding: '12px',
		background: feature.enabled ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.05)',
		borderRadius: '6px',
		border: `1px solid ${feature.enabled ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
		cursor: 'pointer',
		transition: 'all 0.2s',
	}}
	onClick={onToggle}
	>
		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
			<div style={{ fontSize: '14px', fontWeight: 500 }}>
				{feature.name}
			</div>
			<div style={{
				width: '40px',
				height: '20px',
				background: feature.enabled ? '#4CAF50' : '#666',
				borderRadius: '10px',
				position: 'relative',
				transition: 'background 0.2s',
			}}>
				<div style={{
					width: '16px',
					height: '16px',
					background: 'white',
					borderRadius: '50%',
					position: 'absolute',
					top: '2px',
					left: feature.enabled ? '22px' : '2px',
					transition: 'left 0.2s',
				}} />
			</div>
		</div>
		<div style={{ fontSize: '12px', color: '#888' }}>
			{feature.description}
		</div>
	</div>
);

const Button: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
	<button
		onClick={onClick}
		style={{
			flex: 1,
			padding: '10px 16px',
			background: 'rgba(33, 150, 243, 0.2)',
			border: '1px solid rgba(33, 150, 243, 0.4)',
			borderRadius: '6px',
			color: '#2196F3',
			fontSize: '13px',
			fontWeight: 500,
			cursor: 'pointer',
			transition: 'all 0.2s',
		}}
		onMouseEnter={(e) => {
			e.currentTarget.style.background = 'rgba(33, 150, 243, 0.3)';
		}}
		onMouseLeave={(e) => {
			e.currentTarget.style.background = 'rgba(33, 150, 243, 0.2)';
		}}
	>
		{children}
	</button>
);
