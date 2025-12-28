/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { GitPullRequest, AlertTriangle, Shield, Zap, Bug, Palette, CheckSquare, FileText, Download, X, Sparkles, CheckCircle } from 'lucide-react';

interface CodeReview {
	id: string;
	file: string;
	line: number;
	severity: 'critical' | 'major' | 'minor' | 'suggestion';
	category: 'security' | 'performance' | 'bug' | 'style' | 'test' | 'documentation';
	title: string;
	description: string;
	suggestion: string;
	codeSnippet: { old: string; new: string };
	confidence: number;
	autoFixable: boolean;
}

interface PRAnalysis {
	prNumber: number;
	title: string;
	files: number;
	reviews: CodeReview[];
	summary: {
		totalIssues: number;
		criticalIssues: number;
		majorIssues: number;
		minorIssues: number;
		securityIssues: number;
		performanceIssues: number;
	};
	aiSummary: string;
	recommendations: string[];
}

interface Props {
	onClose: () => void;
}

export const PRReviewPanel = ({ onClose }: Props) => {
	const [prNumber, setPrNumber] = useState('');
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysis, setAnalysis] = useState<PRAnalysis | null>(null);
	const [selectedReview, setSelectedReview] = useState<CodeReview | null>(null);
	const [filterCategory, setFilterCategory] = useState<string>('all');

	const analyzePR = async () => {
		if (!prNumber) return;

		setIsAnalyzing(true);
		// Simulate AI analysis
		setTimeout(() => {
			setAnalysis({
				prNumber: parseInt(prNumber),
				title: 'Add user authentication feature',
				files: 12,
				reviews: [
					{
						id: '1',
						file: '/src/auth/login.ts',
						line: 42,
						severity: 'critical',
						category: 'security',
						title: 'SQL Injection vulnerability detected',
						description: 'Direct string concatenation in SQL query allows SQL injection attacks',
						suggestion: 'Use parameterized queries with prepared statements',
						codeSnippet: {
							old: 'const query = "SELECT * FROM users WHERE email = \'" + email + "\'";',
							new: 'const query = db.prepare("SELECT * FROM users WHERE email = ?").bind(email);'
						},
						confidence: 0.95,
						autoFixable: true
					},
					{
						id: '2',
						file: '/src/auth/password.ts',
						line: 28,
						severity: 'critical',
						category: 'security',
						title: 'Weak password hashing algorithm',
						description: 'Using MD5 for password hashing is insecure. Use bcrypt or argon2 instead',
						suggestion: 'Replace MD5 with bcrypt for password hashing',
						codeSnippet: {
							old: 'const hash = md5(password);',
							new: 'const hash = await bcrypt.hash(password, 10);'
						},
						confidence: 0.98,
						autoFixable: true
					},
					{
						id: '3',
						file: '/src/components/UserList.tsx',
						line: 156,
						severity: 'major',
						category: 'performance',
						title: 'Inefficient loop with repeated array operations',
						description: 'Using push() in a loop is less efficient than using map()',
						suggestion: 'Refactor to use array.map() for better performance',
						codeSnippet: {
							old: 'users.forEach(u => results.push(u.name));',
							new: 'const results = users.map(u => u.name);'
						},
						confidence: 0.85,
						autoFixable: true
					},
					{
						id: '4',
						file: '/src/utils/validation.ts',
						line: 73,
						severity: 'minor',
						category: 'bug',
						title: 'Potential null reference error',
						description: 'email.trim() will throw if email is null or undefined',
						suggestion: 'Add null check or use optional chaining',
						codeSnippet: {
							old: 'return email.trim().toLowerCase();',
							new: 'return email?.trim().toLowerCase() ?? "";'
						},
						confidence: 0.80,
						autoFixable: true
					}
				],
				summary: {
					totalIssues: 4,
					criticalIssues: 2,
					majorIssues: 1,
					minorIssues: 1,
					securityIssues: 2,
					performanceIssues: 1
				},
				aiSummary: 'This PR implements user authentication with login/signup functionality. However, there are critical security issues that must be addressed before merging, particularly around SQL injection and password hashing.',
				recommendations: [
					'Fix critical security vulnerabilities immediately',
					'Add unit tests for authentication logic',
					'Consider adding rate limiting for login attempts'
				]
			});
			setIsAnalyzing(false);
		}, 2000);
	};

	const getCategoryIcon = (category: CodeReview['category']) => {
		const icons = {
			security: Shield,
			performance: Zap,
			bug: Bug,
			style: Palette,
			test: CheckSquare,
			documentation: FileText
		};
		return icons[category] || Bug;
	};

	const getSeverityColor = (severity: CodeReview['severity']) => {
		const colors = {
			critical: 'grid-text-red-500 grid-bg-red-500/10 grid-border-red-500/30',
			major: 'grid-text-orange-500 grid-bg-orange-500/10 grid-border-orange-500/30',
			minor: 'grid-text-yellow-500 grid-bg-yellow-500/10 grid-border-yellow-500/30',
			suggestion: 'grid-text-blue-500 grid-bg-blue-500/10 grid-border-blue-500/30'
		};
		return colors[severity];
	};

	const filteredReviews = analysis?.reviews.filter(r =>
		filterCategory === 'all' || r.category === filterCategory
	) || [];

	return (
		<div className="grid-fixed grid-inset-0 grid-bg-black/70 grid-backdrop-blur-sm grid-z-50 grid-flex grid-items-center grid-justify-center grid-p-6">
			<div className="grid-bg-grid-bg-0 grid-rounded-2xl grid-shadow-2xl grid-shadow-grid-primary/10 grid-border grid-border-grid-border-2 grid-max-w-6xl grid-w-full grid-max-h-[90vh] grid-overflow-hidden grid-flex grid-flex-col">
				{/* Header */}
				<div className="grid-flex grid-items-center grid-justify-between grid-px-6 grid-py-4 grid-border-b grid-border-grid-border-2 grid-bg-gradient-to-r grid-from-grid-bg-1 grid-to-grid-bg-0">
					<div className="grid-flex grid-items-center grid-gap-3">
						<div className="grid-w-10 grid-h-10 grid-rounded-xl grid-bg-gradient-to-br grid-from-grid-primary grid-to-grid-secondary grid-flex grid-items-center grid-justify-center grid-shadow-lg">
							<GitPullRequest className="grid-w-5 grid-h-5 grid-text-white" strokeWidth={2.5} />
						</div>
						<div>
							<h2 className="grid-text-xl grid-font-bold grid-text-grid-fg-0">AI PR Review</h2>
							<p className="grid-text-xs grid-text-grid-fg-3">Automated code review with AI suggestions</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="grid-px-4 grid-py-2 grid-bg-grid-bg-2 hover:grid-bg-grid-bg-3 grid-border grid-border-grid-border-2 hover:grid-border-grid-primary/40 grid-rounded-xl grid-text-sm grid-font-medium grid-text-grid-fg-1 hover:grid-text-grid-fg-0 grid-transition-all grid-shadow-sm hover:grid-shadow-md"
					>
						<X className="grid-w-4 grid-h-4" />
					</button>
				</div>

				{/* Content */}
				<div className="grid-flex-1 grid-overflow-hidden">
					{!analysis ? (
						/* PR Input */
						<div className="grid-flex grid-items-center grid-justify-center grid-h-full grid-p-8">
							<div className="grid-w-full grid-max-w-md grid-space-y-6">
								<div className="grid-text-center grid-mb-8">
									<div className="grid-w-20 grid-h-20 grid-mx-auto grid-mb-4 grid-rounded-2xl grid-bg-gradient-to-br grid-from-grid-primary/20 grid-to-grid-secondary/20 grid-flex grid-items-center grid-justify-center">
										<Sparkles className="grid-w-10 grid-h-10 grid-text-grid-primary" />
									</div>
									<h3 className="grid-text-2xl grid-font-bold grid-text-grid-fg-0 grid-mb-2">Analyze Pull Request</h3>
									<p className="grid-text-sm grid-text-grid-fg-2">Get AI-powered code review insights</p>
								</div>

								<div>
									<label className="grid-block grid-text-sm grid-font-medium grid-text-grid-fg-1 grid-mb-2">
										PR Number
									</label>
									<input
										type="text"
										value={prNumber}
										onChange={(e) => setPrNumber(e.target.value)}
										placeholder="e.g., 123"
										className="grid-w-full grid-px-4 grid-py-3 grid-bg-grid-bg-1 grid-border grid-border-grid-border-2 focus:grid-border-grid-primary grid-rounded-xl grid-text-sm grid-text-grid-fg-0 grid-outline-none grid-transition-all"
										onKeyPress={(e) => e.key === 'Enter' && analyzePR()}
										disabled={isAnalyzing}
									/>
								</div>

								<button
									onClick={analyzePR}
									disabled={isAnalyzing || !prNumber}
									className="grid-w-full grid-px-6 grid-py-3 grid-bg-gradient-to-r grid-from-grid-primary grid-to-grid-secondary hover:grid-from-grid-primary-bright hover:grid-to-grid-primary grid-text-white grid-font-semibold grid-rounded-xl grid-transition-all grid-shadow-lg grid-shadow-grid-primary/30 hover:grid-shadow-xl hover:grid-shadow-grid-primary/40 disabled:grid-opacity-50 disabled:grid-cursor-not-allowed grid-flex grid-items-center grid-justify-center grid-gap-2"
								>
									{isAnalyzing ? (
										<>
											<div className="grid-animate-spin grid-w-5 grid-h-5 grid-border-2 grid-border-white grid-border-t-transparent grid-rounded-full" />
											Analyzing PR...
										</>
									) : (
										<>
											<Sparkles className="grid-w-5 grid-h-5" />
											Analyze PR
										</>
									)}
								</button>
							</div>
						</div>
					) : (
						/* Analysis Results */
						<div className="grid-flex grid-h-full">
							{/* Reviews List */}
							<div className="grid-w-2/5 grid-border-r grid-border-grid-border-2 grid-overflow-y-auto grid-p-4">
								{/* Summary Stats */}
								<div className="grid-mb-4 grid-p-4 grid-rounded-xl grid-bg-gradient-to-br grid-from-grid-bg-1 grid-to-grid-bg-0 grid-border grid-border-grid-border-2">
									<h3 className="grid-text-sm grid-font-bold grid-text-grid-fg-0 grid-mb-3">PR #{analysis.prNumber}: {analysis.title}</h3>
									<div className="grid-grid grid-grid-cols-2 grid-gap-3 grid-mb-3">
										<div className="grid-p-2 grid-rounded-lg grid-bg-red-500/10 grid-border grid-border-red-500/20">
											<p className="grid-text-2xl grid-font-bold grid-text-red-400">{analysis.summary.criticalIssues}</p>
											<p className="grid-text-xs grid-text-grid-fg-3">Critical</p>
										</div>
										<div className="grid-p-2 grid-rounded-lg grid-bg-orange-500/10 grid-border grid-border-orange-500/20">
											<p className="grid-text-2xl grid-font-bold grid-text-orange-400">{analysis.summary.majorIssues}</p>
											<p className="grid-text-xs grid-text-grid-fg-3">Major</p>
										</div>
									</div>
									<p className="grid-text-xs grid-text-grid-fg-2">{analysis.aiSummary}</p>
								</div>

								{/* Category Filter */}
								<div className="grid-flex grid-flex-wrap grid-gap-2 grid-mb-3">
									{['all', 'security', 'performance', 'bug'].map(cat => (
										<button
											key={cat}
											onClick={() => setFilterCategory(cat)}
											className={`grid-px-3 grid-py-1.5 grid-rounded-lg grid-text-xs grid-font-medium grid-transition-all ${filterCategory === cat
												? 'grid-bg-grid-primary grid-text-white'
												: 'grid-bg-grid-bg-2 grid-text-grid-fg-2 hover:grid-bg-grid-bg-3'
												}`}
										>
											{cat.charAt(0).toUpperCase() + cat.slice(1)}
										</button>
									))}
								</div>

								{/* Reviews */}
								<div className="grid-space-y-2">
									{filteredReviews.map(review => {
										const Icon = getCategoryIcon(review.category);
										return (
											<div
												key={review.id}
												onClick={() => setSelectedReview(review)}
												className={`grid-p-3 grid-rounded-xl grid-border grid-cursor-pointer grid-transition-all ${selectedReview?.id === review.id
													? 'grid-border-grid-primary grid-bg-grid-primary/10 grid-shadow-lg'
													: 'grid-border-grid-border-2 hover:grid-border-grid-primary/40 grid-bg-grid-bg-1 hover:grid-bg-grid-bg-2'
													}`}
											>
												<div className="grid-flex grid-items-start grid-gap-3">
													<Icon className="grid-w-4 grid-h-4 grid-text-grid-primary grid-mt-0.5" />
													<div className="grid-flex-1 grid-min-w-0">
														<div className="grid-flex grid-items-center grid-gap-2 grid-mb-1">
															<span className={`grid-px-2 grid-py-0.5 grid-rounded-full grid-text-[10px] grid-font-medium grid-border ${getSeverityColor(review.severity)}`}>
																{review.severity.toUpperCase()}
															</span>
															{review.autoFixable && (
																<span className="grid-px-2 grid-py-0.5 grid-rounded-full grid-bg-green-500/10 grid-border grid-border-green-500/30 grid-text-[10px] grid-font-medium grid-text-green-400">
																	AUTO-FIX
																</span>
															)}
														</div>
														<p className="grid-text-sm grid-font-semibold grid-text-grid-fg-0 grid-mb-1 grid-line-clamp-2">
															{review.title}
														</p>
														<p className="grid-text-xs grid-text-grid-fg-3 grid-truncate">
															{review.file}:{review.line}
														</p>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* Review Details */}
							<div className="grid-flex-1 grid-overflow-y-auto grid-p-6">
								{!selectedReview ? (
									<div className="grid-flex grid-flex-col grid-items-center grid-justify-center grid-h-full grid-text-grid-fg-3">
										<CheckCircle className="grid-w-16 grid-h-16 grid-mb-4 grid-text-grid-primary" />
										<p className="grid-text-lg grid-font-medium">Select a review to see details</p>
									</div>
								) : (
									<div className="grid-space-y-6">
										{/* Review Header */}
										<div className="grid-p-5 grid-rounded-xl grid-bg-grid-bg-1 grid-border grid-border-grid-border-2">
											<div className="grid-flex grid-items-start grid-justify-between grid-mb-3">
												<div className="grid-flex-1">
													<div className="grid-flex grid-items-center grid-gap-2 grid-mb-2">
														<span className={`grid-px-3 grid-py-1 grid-rounded-full grid-text-xs grid-font-medium grid-border ${getSeverityColor(selectedReview.severity)}`}>
															{selectedReview.severity.toUpperCase()}
														</span>
														<span className="grid-px-3 grid-py-1 grid-rounded-full grid-bg-grid-bg-0 grid-text-xs grid-font-medium grid-text-grid-fg-1">
															{selectedReview.category.toUpperCase()}
														</span>
														<span className="grid-px-3 grid-py-1 grid-rounded-full grid-bg-green-500/10 grid-border grid-border-green-500/30 grid-text-xs grid-font-medium grid-text-green-400">
															{(selectedReview.confidence * 100).toFixed(0)}% Confidence
														</span>
													</div>
													<h3 className="grid-text-xl grid-font-bold grid-text-grid-fg-0">{selectedReview.title}</h3>
												</div>
											</div>

											<div className="grid-space-y-2 grid-text-sm">
												<div>
													<span className="grid-text-grid-fg-3">File:</span>
													<span className="grid-ml-2 grid-font-mono grid-text-grid-fg-1">{selectedReview.file}:{selectedReview.line}</span>
												</div>
												<div>
													<span className="grid-text-grid-fg-3">Description:</span>
													<p className="grid-mt-1 grid-text-grid-fg-1">{selectedReview.description}</p>
												</div>
											</div>
										</div>

										{/* Code Diff */}
										<div>
											<h4 className="grid-text-sm grid-font-bold grid-text-grid-fg-0 grid-mb-2 grid-flex grid-items-center grid-gap-2">
												<FileText className="grid-w-4 grid-h-4 grid-text-grid-primary" />
												Code Changes
											</h4>
											<div className="grid-rounded-xl grid-overflow-hidden grid-border grid-border-grid-border-2">
												<div className="grid-p-3 grid-bg-red-900/20 grid-border-b grid-border-grid-border-2">
													<pre className="grid-text-xs grid-font-mono grid-text-red-300 grid-whitespace-pre-wrap">- {selectedReview.codeSnippet.old}</pre>
												</div>
												<div className="grid-p-3 grid-bg-green-900/20">
													<pre className="grid-text-xs grid-font-mono grid-text-green-300 grid-whitespace-pre-wrap">+ {selectedReview.codeSnippet.new}</pre>
												</div>
											</div>
										</div>

										{/* Suggestion */}
										<div className="grid-p-4 grid-rounded-xl grid-bg-blue-500/10 grid-border grid-border-blue-500/30">
											<h4 className="grid-text-sm grid-font-bold grid-text-blue-400 grid-mb-2">💡 Suggested Fix</h4>
											<p className="grid-text-sm grid-text-grid-fg-1">{selectedReview.suggestion}</p>
										</div>

										{/* Actions */}
										{selectedReview.autoFixable && (
											<div className="grid-flex grid-gap-3">
												<button className="grid-flex-1 grid-px-6 grid-py-3 grid-bg-gradient-to-r grid-from-grid-primary grid-to-grid-secondary hover:grid-from-grid-primary-bright grid-text-white grid-font-semibold grid-rounded-xl grid-transition-all grid-shadow-lg grid-shadow-grid-primary/30 hover:grid-shadow-xl grid-flex grid-items-center grid-justify-center grid-gap-2">
													<CheckCircle className="grid-w-5 grid-h-5" />
													Apply Fix
												</button>
												<button className="grid-px-6 grid-py-3 grid-bg-grid-bg-2 hover:grid-bg-grid-bg-3 grid-border grid-border-grid-border-2 hover:grid-border-grid-primary/40 grid-rounded-xl grid-font-semibold grid-text-grid-fg-1 hover:grid-text-grid-fg-0 grid-transition-all">
													Dismiss
												</button>
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				{analysis && (
					<div className="grid-border-t grid-border-grid-border-2 grid-px-6 grid-py-3 grid-bg-grid-bg-1 grid-flex grid-items-center grid-justify-between">
						<div className="grid-text-xs grid-text-grid-fg-3">
							{analysis.summary.totalIssues} issues found in {analysis.files} files
						</div>
						<div className="grid-flex grid-gap-2">
							<button className="grid-px-4 grid-py-2 grid-bg-grid-bg-2 hover:grid-bg-grid-bg-3 grid-border grid-border-grid-border-2 hover:grid-border-grid-primary/40 grid-rounded-lg grid-text-xs grid-font-medium grid-text-grid-fg-1 hover:grid-text-grid-fg-0 grid-transition-all grid-flex grid-items-center grid-gap-2">
								<Download className="grid-w-3.5 grid-h-3.5" />
								Export
							</button>
							<button
								onClick={() => setAnalysis(null)}
								className="grid-px-4 grid-py-2 grid-bg-grid-primary hover:grid-bg-grid-primary-bright grid-text-white grid-rounded-lg grid-text-xs grid-font-medium grid-transition-all"
							>
								Analyze Another PR
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
