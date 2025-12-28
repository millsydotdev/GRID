/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from 'react';
import { Bug, Zap, CheckCircle, AlertCircle, Info, TrendingUp, X, Code, Sparkles } from 'lucide-react';

interface DetectedBug {
	id: string;
	filePath: string;
	line: number;
	column: number;
	severity: 'error' | 'warning' | 'info';
	message: string;
	code: string;
	stackTrace?: string;
	context: {
		beforeCode: string;
		errorCode: string;
		afterCode: string;
	};
	detectedAt: number;
}

interface BugFix {
	bugId: string;
	confidence: number;
	description: string;
	explanation: string;
	codeChange: {
		old: string;
		new: string;
		startLine: number;
		endLine: number;
	};
	estimatedImpact: 'low' | 'medium' | 'high';
}

interface AutoDebugStats {
	totalBugsDetected: number;
	totalBugsFixed: number;
	averageFixTime: number;
	topErrorCodes: Array<{ code: string; count: number }>;
}

interface Props {
	onClose: () => void;
}

export const AutoDebugPanel = ({ onClose }: Props) => {
	const [bugs, setBugs] = useState<DetectedBug[]>([]);
	const [selectedBug, setSelectedBug] = useState<DetectedBug | null>(null);
	const [suggestedFixes, setSuggestedFixes] = useState<BugFix[]>([]);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [stats, setStats] = useState<AutoDebugStats>({
		totalBugsDetected: 0,
		totalBugsFixed: 0,
		averageFixTime: 0,
		topErrorCodes: []
	});
	const [activeTab, setActiveTab] = useState<'bugs' | 'stats'>('bugs');

	// Mock data for demonstration
	useEffect(() => {
		// Simulate loading bugs
		setTimeout(() => {
			setBugs([
				{
					id: '1',
					filePath: '/src/components/App.tsx',
					line: 42,
					column: 15,
					severity: 'error',
					message: "Property 'map' does not exist on type 'undefined'",
					code: 'TS2339',
					context: {
						beforeCode: 'const users = userData;\n',
						errorCode: 'return users.map(user => <UserCard key={user.id} user={user} />);',
						afterCode: '\n}\n'
					},
					detectedAt: Date.now() - 60000
				},
				{
					id: '2',
					filePath: '/src/utils/api.ts',
					line: 28,
					column: 8,
					severity: 'warning',
					message: "Async function lacks 'await' expression",
					code: 'TS1998',
					context: {
						beforeCode: 'export async function fetchData() {\n',
						errorCode: '  return fetch("/api/data").then(res => res.json());',
						afterCode: '\n}\n'
					},
					detectedAt: Date.now() - 120000
				},
				{
					id: '3',
					filePath: '/src/hooks/useAuth.ts',
					line: 15,
					column: 22,
					severity: 'error',
					message: "Argument of type 'string | undefined' is not assignable to parameter of type 'string'",
					code: 'TS2345',
					context: {
						beforeCode: 'const token = localStorage.getItem("token");\n',
						errorCode: 'setAuthToken(token);',
						afterCode: '\nif (token) {\n'
					},
					detectedAt: Date.now() - 180000
				}
			]);

			setStats({
				totalBugsDetected: 127,
				totalBugsFixed: 98,
				averageFixTime: 2300,
				topErrorCodes: [
					{ code: 'TS2339', count: 23 },
					{ code: 'TS2345', count: 18 },
					{ code: 'TS1998', count: 15 },
					{ code: 'TS2322', count: 12 },
					{ code: 'TS2304', count: 10 }
				]
			});
		}, 500);
	}, []);

	const handleAnalyzeBug = async (bug: DetectedBug) => {
		setSelectedBug(bug);
		setIsAnalyzing(true);
		setSuggestedFixes([]);

		// Simulate AI analysis
		setTimeout(() => {
			const mockFixes: BugFix[] = [
				{
					bugId: bug.id,
					confidence: 0.92,
					description: 'Add optional chaining to prevent undefined access',
					explanation: 'Using optional chaining (?.) ensures the code won\'t throw an error if userData is undefined',
					codeChange: {
						old: bug.context.errorCode,
						new: 'return users?.map(user => <UserCard key={user.id} user={user} />) || [];',
						startLine: bug.line,
						endLine: bug.line
					},
					estimatedImpact: 'low'
				},
				{
					bugId: bug.id,
					confidence: 0.85,
					description: 'Add null check before mapping',
					explanation: 'Explicitly check if users exists before calling map()',
					codeChange: {
						old: bug.context.errorCode,
						new: 'if (!users) return [];\nreturn users.map(user => <UserCard key={user.id} user={user} />);',
						startLine: bug.line,
						endLine: bug.line
					},
					estimatedImpact: 'low'
				}
			];

			setSuggestedFixes(mockFixes);
			setIsAnalyzing(false);
		}, 2000);
	};

	const handleApplyFix = async (fix: BugFix) => {
		// Apply the fix
		console.log('Applying fix:', fix);

		// Remove the bug from the list
		setBugs(prev => prev.filter(b => b.id !== fix.bugId));
		setSelectedBug(null);
		setSuggestedFixes([]);

		// Update stats
		setStats(prev => ({
			...prev,
			totalBugsFixed: prev.totalBugsFixed + 1
		}));
	};

	const getSeverityIcon = (severity: DetectedBug['severity']) => {
		switch (severity) {
			case 'error':
				return <AlertCircle className="grid-w-4 grid-h-4 grid-text-red-500" />;
			case 'warning':
				return <AlertCircle className="grid-w-4 grid-h-4 grid-text-yellow-500" />;
			case 'info':
				return <Info className="grid-w-4 grid-h-4 grid-text-blue-500" />;
		}
	};

	const getImpactColor = (impact: BugFix['estimatedImpact']) => {
		switch (impact) {
			case 'low':
				return 'grid-text-green-400';
			case 'medium':
				return 'grid-text-yellow-400';
			case 'high':
				return 'grid-text-red-400';
		}
	};

	return (
		<div className="grid-fixed grid-inset-0 grid-bg-black/70 grid-backdrop-blur-sm grid-z-50 grid-flex grid-items-center grid-justify-center grid-p-6">
			<div className="grid-bg-grid-bg-0 grid-rounded-2xl grid-shadow-2xl grid-shadow-grid-primary/10 grid-border grid-border-grid-border-2 grid-max-w-6xl grid-w-full grid-max-h-[90vh] grid-overflow-hidden grid-flex grid-flex-col">
				{/* Header */}
				<div className="grid-flex grid-items-center grid-justify-between grid-px-6 grid-py-4 grid-border-b grid-border-grid-border-2 grid-bg-gradient-to-r grid-from-grid-bg-1 grid-to-grid-bg-0">
					<div className="grid-flex grid-items-center grid-gap-3">
						<div className="grid-w-10 grid-h-10 grid-rounded-xl grid-bg-gradient-to-br grid-from-grid-primary grid-to-grid-secondary grid-flex grid-items-center grid-justify-center grid-shadow-lg">
							<Bug className="grid-w-5 grid-h-5 grid-text-white" strokeWidth={2.5} />
						</div>
						<div>
							<h2 className="grid-text-xl grid-font-bold grid-text-grid-fg-0">AI Auto-Debug</h2>
							<p className="grid-text-xs grid-text-grid-fg-3">Automatic bug detection and AI-powered fixes</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="grid-px-4 grid-py-2 grid-bg-grid-bg-2 hover:grid-bg-grid-bg-3 grid-border grid-border-grid-border-2 hover:grid-border-grid-primary/40 grid-rounded-xl grid-text-sm grid-font-medium grid-text-grid-fg-1 hover:grid-text-grid-fg-0 grid-transition-all grid-shadow-sm hover:grid-shadow-md"
					>
						<X className="grid-w-4 grid-h-4" />
					</button>
				</div>

				{/* Tabs */}
				<div className="grid-flex grid-border-b grid-border-grid-border-2 grid-bg-grid-bg-1">
					<button
						onClick={() => setActiveTab('bugs')}
						className={`grid-px-6 grid-py-3 grid-text-sm grid-font-medium grid-transition-all ${activeTab === 'bugs'
							? 'grid-text-grid-primary grid-border-b-2 grid-border-grid-primary grid-bg-grid-bg-0'
							: 'grid-text-grid-fg-2 hover:grid-text-grid-fg-1'
							}`}
					>
						<div className="grid-flex grid-items-center grid-gap-2">
							<Bug className="grid-w-4 grid-h-4" />
							<span>Detected Bugs ({bugs.length})</span>
						</div>
					</button>
					<button
						onClick={() => setActiveTab('stats')}
						className={`grid-px-6 grid-py-3 grid-text-sm grid-font-medium grid-transition-all ${activeTab === 'stats'
							? 'grid-text-grid-primary grid-border-b-2 grid-border-grid-primary grid-bg-grid-bg-0'
							: 'grid-text-grid-fg-2 hover:grid-text-grid-fg-1'
							}`}
					>
						<div className="grid-flex grid-items-center grid-gap-2">
							<TrendingUp className="grid-w-4 grid-h-4" />
							<span>Statistics</span>
						</div>
					</button>
				</div>

				{/* Content */}
				<div className="grid-flex-1 grid-overflow-hidden grid-flex">
					{activeTab === 'bugs' && (
						<>
							{/* Bug List */}
							<div className="grid-w-1/3 grid-border-r grid-border-grid-border-2 grid-overflow-y-auto grid-p-4 grid-space-y-2">
								{bugs.length === 0 ? (
									<div className="grid-flex grid-flex-col grid-items-center grid-justify-center grid-h-full grid-text-grid-fg-3">
										<CheckCircle className="grid-w-12 grid-h-12 grid-mb-3 grid-text-green-500" />
										<p className="grid-text-sm grid-font-medium">No bugs detected!</p>
										<p className="grid-text-xs grid-mt-1">Your code is looking good 🎉</p>
									</div>
								) : (
									bugs.map(bug => (
										<div
											key={bug.id}
											onClick={() => handleAnalyzeBug(bug)}
											className={`grid-p-4 grid-rounded-xl grid-border grid-cursor-pointer grid-transition-all ${selectedBug?.id === bug.id
												? 'grid-border-grid-primary grid-bg-grid-primary/10 grid-shadow-lg'
												: 'grid-border-grid-border-2 hover:grid-border-grid-primary/40 grid-bg-grid-bg-1 hover:grid-bg-grid-bg-2'
												}`}
										>
											<div className="grid-flex grid-items-start grid-gap-3">
												{getSeverityIcon(bug.severity)}
												<div className="grid-flex-1 grid-min-w-0">
													<div className="grid-flex grid-items-center grid-gap-2 grid-mb-1">
														<span className="grid-text-xs grid-font-mono grid-px-2 grid-py-0.5 grid-rounded grid-bg-grid-bg-3 grid-text-grid-fg-2">
															{bug.code}
														</span>
														<span className="grid-text-xs grid-text-grid-fg-3">
															Line {bug.line}
														</span>
													</div>
													<p className="grid-text-sm grid-font-medium grid-text-grid-fg-0 grid-mb-1 grid-line-clamp-2">
														{bug.message}
													</p>
													<p className="grid-text-xs grid-text-grid-fg-3 grid-truncate">
														{bug.filePath}
													</p>
												</div>
											</div>
										</div>
									))
								)}
							</div>

							{/* Fix Suggestions */}
							<div className="grid-flex-1 grid-overflow-y-auto grid-p-6">
								{!selectedBug ? (
									<div className="grid-flex grid-flex-col grid-items-center grid-justify-center grid-h-full grid-text-grid-fg-3">
										<Sparkles className="grid-w-16 grid-h-16 grid-mb-4 grid-text-grid-primary" />
										<p className="grid-text-lg grid-font-medium">Select a bug to see AI-powered fixes</p>
										<p className="grid-text-sm grid-mt-2">Click on any bug from the list to get started</p>
									</div>
								) : isAnalyzing ? (
									<div className="grid-flex grid-flex-col grid-items-center grid-justify-center grid-h-full">
										<div className="grid-animate-spin grid-w-12 grid-h-12 grid-border-4 grid-border-grid-primary grid-border-t-transparent grid-rounded-full grid-mb-4" />
										<p className="grid-text-sm grid-text-grid-fg-2">Analyzing bug with AI...</p>
									</div>
								) : (
									<div className="grid-space-y-6">
										{/* Bug Details */}
										<div className="grid-p-4 grid-rounded-xl grid-bg-grid-bg-1 grid-border grid-border-grid-border-2">
											<div className="grid-flex grid-items-center grid-gap-2 grid-mb-3">
												{getSeverityIcon(selectedBug.severity)}
												<h3 className="grid-text-lg grid-font-bold grid-text-grid-fg-0">Bug Details</h3>
											</div>
											<div className="grid-space-y-2 grid-text-sm">
												<div>
													<span className="grid-text-grid-fg-3">Error Code:</span>
													<span className="grid-ml-2 grid-font-mono grid-text-grid-fg-1">{selectedBug.code}</span>
												</div>
												<div>
													<span className="grid-text-grid-fg-3">Location:</span>
													<span className="grid-ml-2 grid-text-grid-fg-1">{selectedBug.filePath}:{selectedBug.line}:{selectedBug.column}</span>
												</div>
												<div>
													<span className="grid-text-grid-fg-3">Message:</span>
													<p className="grid-mt-1 grid-text-grid-fg-1">{selectedBug.message}</p>
												</div>
											</div>

											{/* Code Context */}
											<div className="grid-mt-4">
												<p className="grid-text-xs grid-font-medium grid-text-grid-fg-3 grid-mb-2">Code Context:</p>
												<pre className="grid-p-3 grid-rounded-lg grid-bg-grid-bg-0 grid-text-xs grid-font-mono grid-overflow-x-auto">
													<code className="grid-text-grid-fg-2">{selectedBug.context.beforeCode}</code>
													<code className="grid-block grid-bg-red-500/20 grid-text-red-300 grid-px-1">{selectedBug.context.errorCode}</code>
													<code className="grid-text-grid-fg-2">{selectedBug.context.afterCode}</code>
												</pre>
											</div>
										</div>

										{/* Suggested Fixes */}
										<div>
											<h3 className="grid-text-lg grid-font-bold grid-text-grid-fg-0 grid-mb-3 grid-flex grid-items-center grid-gap-2">
												<Zap className="grid-w-5 grid-h-5 grid-text-grid-primary" />
												Suggested Fixes ({suggestedFixes.length})
											</h3>
											<div className="grid-space-y-4">
												{suggestedFixes.map((fix, index) => (
													<div key={index} className="grid-p-5 grid-rounded-xl grid-border grid-border-grid-border-2 grid-bg-grid-bg-1 hover:grid-border-grid-primary/40 grid-transition-all grid-shadow-sm hover:grid-shadow-md">
														{/* Fix Header */}
														<div className="grid-flex grid-items-start grid-justify-between grid-mb-3">
															<div className="grid-flex-1">
																<div className="grid-flex grid-items-center grid-gap-3 grid-mb-2">
																	<div className="grid-flex grid-items-center grid-gap-2 grid-px-3 grid-py-1 grid-rounded-full grid-bg-green-500/10 grid-border grid-border-green-500/30">
																		<span className="grid-text-xs grid-font-medium grid-text-green-400">
																			{(fix.confidence * 100).toFixed(0)}% Confidence
																		</span>
																	</div>
																	<div className={`grid-px-3 grid-py-1 grid-rounded-full grid-border ${fix.estimatedImpact === 'low' ? 'grid-bg-green-500/10 grid-border-green-500/30' :
																		fix.estimatedImpact === 'medium' ? 'grid-bg-yellow-500/10 grid-border-yellow-500/30' :
																			'grid-bg-red-500/10 grid-border-red-500/30'
																		}`}>
																		<span className={`grid-text-xs grid-font-medium ${getImpactColor(fix.estimatedImpact)}`}>
																			{fix.estimatedImpact.toUpperCase()} Impact
																		</span>
																	</div>
																</div>
																<h4 className="grid-text-base grid-font-semibold grid-text-grid-fg-0 grid-mb-1">
																	{fix.description}
																</h4>
																<p className="grid-text-sm grid-text-grid-fg-2">
																	{fix.explanation}
																</p>
															</div>
														</div>

														{/* Code Diff */}
														<div className="grid-mb-4">
															<p className="grid-text-xs grid-font-medium grid-text-grid-fg-3 grid-mb-2 grid-flex grid-items-center grid-gap-2">
																<Code className="grid-w-3 grid-h-3" />
																Code Changes:
															</p>
															<div className="grid-rounded-lg grid-overflow-hidden grid-border grid-border-grid-border-2">
																<div className="grid-p-2 grid-bg-red-900/20">
																	<p className="grid-text-xs grid-text-red-400 grid-font-mono grid-whitespace-pre-wrap">- {fix.codeChange.old}</p>
																</div>
																<div className="grid-p-2 grid-bg-green-900/20">
																	<p className="grid-text-xs grid-text-green-400 grid-font-mono grid-whitespace-pre-wrap">+ {fix.codeChange.new}</p>
																</div>
															</div>
														</div>

														{/* Apply Button */}
														<button
															onClick={() => handleApplyFix(fix)}
															className="grid-w-full grid-px-4 grid-py-2.5 grid-bg-gradient-to-r grid-from-grid-primary grid-to-grid-secondary hover:grid-from-grid-primary-bright hover:grid-to-grid-primary grid-text-white grid-font-semibold grid-rounded-xl grid-transition-all grid-shadow-lg grid-shadow-grid-primary/30 hover:grid-shadow-xl hover:grid-shadow-grid-primary/40 grid-flex grid-items-center grid-justify-center grid-gap-2"
														>
															<Zap className="grid-w-4 grid-h-4" />
															Apply This Fix
														</button>
													</div>
												))}
											</div>
										</div>
									</div>
								)}
							</div>
						</>
					)}

					{activeTab === 'stats' && (
						<div className="grid-flex-1 grid-overflow-y-auto grid-p-6 grid-space-y-6">
							{/* Summary Cards */}
							<div className="grid-grid grid-grid-cols-3 grid-gap-4">
								<div className="grid-p-5 grid-rounded-xl grid-bg-gradient-to-br grid-from-grid-bg-1 grid-to-grid-bg-0 grid-border grid-border-grid-border-2 grid-shadow-lg">
									<div className="grid-flex grid-items-center grid-gap-3 grid-mb-2">
										<Bug className="grid-w-8 grid-h-8 grid-text-grid-primary" />
										<div>
											<p className="grid-text-2xl grid-font-bold grid-text-grid-fg-0">{stats.totalBugsDetected}</p>
											<p className="grid-text-xs grid-text-grid-fg-3">Total Detected</p>
										</div>
									</div>
								</div>

								<div className="grid-p-5 grid-rounded-xl grid-bg-gradient-to-br grid-from-grid-bg-1 grid-to-grid-bg-0 grid-border grid-border-grid-border-2 grid-shadow-lg">
									<div className="grid-flex grid-items-center grid-gap-3 grid-mb-2">
										<CheckCircle className="grid-w-8 grid-h-8 grid-text-green-500" />
										<div>
											<p className="grid-text-2xl grid-font-bold grid-text-grid-fg-0">{stats.totalBugsFixed}</p>
											<p className="grid-text-xs grid-text-grid-fg-3">Bugs Fixed</p>
										</div>
									</div>
								</div>

								<div className="grid-p-5 grid-rounded-xl grid-bg-gradient-to-br grid-from-grid-bg-1 grid-to-grid-bg-0 grid-border grid-border-grid-border-2 grid-shadow-lg">
									<div className="grid-flex grid-items-center grid-gap-3 grid-mb-2">
										<Zap className="grid-w-8 grid-h-8 grid-text-yellow-500" />
										<div>
											<p className="grid-text-2xl grid-font-bold grid-text-grid-fg-0">{(stats.averageFixTime / 1000).toFixed(1)}s</p>
											<p className="grid-text-xs grid-text-grid-fg-3">Avg Fix Time</p>
										</div>
									</div>
								</div>
							</div>

							{/* Top Error Codes */}
							<div className="grid-p-6 grid-rounded-xl grid-bg-grid-bg-1 grid-border grid-border-grid-border-2 grid-shadow-lg">
								<h3 className="grid-text-lg grid-font-bold grid-text-grid-fg-0 grid-mb-4 grid-flex grid-items-center grid-gap-2">
									<TrendingUp className="grid-w-5 grid-h-5 grid-text-grid-primary" />
									Most Common Errors
								</h3>
								<div className="grid-space-y-3">
									{stats.topErrorCodes.map((error, index) => {
										const maxCount = stats.topErrorCodes[0].count;
										const percentage = (error.count / maxCount) * 100;

										return (
											<div key={error.code}>
												<div className="grid-flex grid-items-center grid-justify-between grid-mb-1.5">
													<div className="grid-flex grid-items-center grid-gap-3">
														<span className="grid-text-sm grid-font-mono grid-font-semibold grid-text-grid-fg-0">
															#{index + 1}
														</span>
														<span className="grid-px-3 grid-py-1 grid-rounded-full grid-bg-grid-bg-0 grid-text-sm grid-font-mono grid-font-medium grid-text-grid-fg-1">
															{error.code}
														</span>
													</div>
													<span className="grid-text-sm grid-font-semibold grid-text-grid-fg-0">
														{error.count} occurrences
													</span>
												</div>
												<div className="grid-w-full grid-h-2 grid-bg-grid-bg-0 grid-rounded-full grid-overflow-hidden">
													<div
														className="grid-h-full grid-bg-gradient-to-r grid-from-grid-primary grid-to-grid-secondary grid-rounded-full grid-transition-all"
														style={{ width: `${percentage}%` }}
													/>
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* Success Rate */}
							<div className="grid-p-6 grid-rounded-xl grid-bg-gradient-to-br grid-from-green-500/10 grid-to-grid-bg-1 grid-border grid-border-green-500/30 grid-shadow-lg">
								<h3 className="grid-text-lg grid-font-bold grid-text-grid-fg-0 grid-mb-3">Fix Success Rate</h3>
								<div className="grid-flex grid-items-center grid-gap-4">
									<div className="grid-relative grid-w-24 grid-h-24">
										<svg className="grid-transform grid--rotate-90" width="96" height="96">
											<circle
												cx="48"
												cy="48"
												r="40"
												stroke="currentColor"
												strokeWidth="8"
												fill="none"
												className="grid-text-grid-bg-0"
											/>
											<circle
												cx="48"
												cy="48"
												r="40"
												stroke="currentColor"
												strokeWidth="8"
												fill="none"
												strokeDasharray={`${2 * Math.PI * 40}`}
												strokeDashoffset={`${2 * Math.PI * 40 * (1 - (stats.totalBugsFixed / stats.totalBugsDetected))}`}
												className="grid-text-green-500 grid-transition-all"
											/>
										</svg>
										<div className="grid-absolute grid-inset-0 grid-flex grid-items-center grid-justify-center">
											<span className="grid-text-xl grid-font-bold grid-text-green-400">
												{((stats.totalBugsFixed / stats.totalBugsDetected) * 100).toFixed(0)}%
											</span>
										</div>
									</div>
									<div className="grid-flex-1">
										<p className="grid-text-sm grid-text-grid-fg-1 grid-mb-2">
											Successfully fixed <span className="grid-font-bold grid-text-green-400">{stats.totalBugsFixed}</span> out of <span className="grid-font-bold">{stats.totalBugsDetected}</span> detected bugs
										</p>
										<p className="grid-text-xs grid-text-grid-fg-3">
											The AI is constantly learning from your fixes to improve accuracy over time
										</p>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
