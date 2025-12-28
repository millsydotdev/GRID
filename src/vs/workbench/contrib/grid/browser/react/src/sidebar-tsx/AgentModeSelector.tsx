/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useMemo } from 'react';
import { Hammer, Eye, Search, FileCheck, Bug, Zap, Lock, Unlock, Lightbulb, TrendingUp, Award } from 'lucide-react';
import { AgentMode, AGENT_MODES } from '../../../../common/gridLearningEngine.js';

interface AgentModeSelectorProps {
	currentMode: AgentMode;
	onModeChange: (mode: AgentMode) => void;
	showDetails?: boolean;
}

const MODE_ICONS: Record<AgentMode, typeof Hammer> = {
	build: Hammer,
	plan: Eye,
	explore: Search,
	review: FileCheck,
	debug: Bug
};

const MODE_COLORS: Record<AgentMode, string> = {
	build: 'grid-primary',
	plan: 'grid-accent-light',
	explore: 'grid-success',
	review: 'grid-warning',
	debug: 'grid-danger'
};

const MODE_DESCRIPTIONS: Record<AgentMode, string> = {
	build: 'Full access to edit files and run commands. Best for active development.',
	plan: 'Read-only mode. Perfect for exploring unfamiliar codebases and planning architecture.',
	explore: 'Analyze and understand code without making changes. Great for learning.',
	review: 'Focus on code quality, testing, and improvements. Finds bugs and suggests refactorings.',
	debug: 'Systematic bug fixing with logging and verification. No restrictions.'
};

export const AgentModeSelector = ({ currentMode, onModeChange, showDetails = true }: AgentModeSelectorProps) => {
	const [isExpanded, setIsExpanded] = useState(false);

	const config = AGENT_MODES[currentMode];

	return (
		<div className="grid-w-full grid-px-4 grid-py-3 grid-bg-grid-bg-0 grid-border-b grid-border-grid-border-2">
			<div className="grid-flex grid-items-center grid-justify-between grid-mb-2">
				<div className="grid-flex grid-items-center grid-gap-2">
					<Zap className="grid-w-4 grid-h-4 grid-text-grid-primary" />
					<h3 className="grid-text-xs grid-font-bold grid-text-grid-fg-0 grid-uppercase grid-tracking-wider">
						Agent Mode
					</h3>
				</div>
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="grid-text-xs grid-text-grid-fg-3 hover:grid-text-grid-fg-1 grid-transition-colors"
				>
					{isExpanded ? 'Collapse' : 'Expand'}
				</button>
			</div>

			{/* Mode Pills */}
			<div className="grid-flex grid-gap-2 grid-flex-wrap">
				{(Object.keys(MODE_ICONS) as AgentMode[]).map(mode => {
					const Icon = MODE_ICONS[mode];
					const isActive = mode === currentMode;
					const colorClass = MODE_COLORS[mode];

					return (
						<button
							key={mode}
							onClick={() => onModeChange(mode)}
							className={`grid-px-3 grid-py-1.5 grid-rounded-lg grid-flex grid-items-center grid-gap-2 grid-text-xs grid-font-semibold grid-transition-all grid-border ${
								isActive
									? `grid-bg-${colorClass}/20 grid-text-${colorClass} grid-border-${colorClass}/50 grid-shadow-sm grid-shadow-${colorClass}/20`
									: 'grid-bg-grid-bg-2 grid-text-grid-fg-2 hover:grid-text-grid-fg-0 grid-border-grid-border-2 hover:grid-border-grid-border-1'
							}`}
							title={MODE_DESCRIPTIONS[mode]}
						>
							<Icon className="grid-w-3.5 grid-h-3.5" />
							<span className="grid-capitalize">{mode}</span>
							{isActive && <span className="grid-w-1.5 grid-h-1.5 grid-rounded-full grid-bg-current grid-animate-pulse"></span>}
						</button>
					);
				})}
			</div>

			{/* Expanded Details */}
			{isExpanded && showDetails && (
				<div className="grid-mt-3 grid-p-3 grid-bg-grid-bg-2 grid-rounded-lg grid-border grid-border-grid-border-2 grid-space-y-3">
					<div>
						<h4 className="grid-text-xs grid-font-bold grid-text-grid-fg-0 grid-mb-1.5">Current Mode: {currentMode.toUpperCase()}</h4>
						<p className="grid-text-xs grid-text-grid-fg-3 grid-leading-relaxed">{MODE_DESCRIPTIONS[currentMode]}</p>
					</div>

					<div>
						<h5 className="grid-text-xs grid-font-semibold grid-text-grid-fg-1 grid-mb-2 grid-flex grid-items-center grid-gap-1.5">
							{config.permissions.canEditFiles ? <Unlock className="grid-w-3 grid-h-3 grid-text-grid-success" /> : <Lock className="grid-w-3 grid-h-3 grid-text-grid-danger" />}
							Permissions
						</h5>
						<div className="grid-space-y-1.5 grid-text-xs">
							<div className={`grid-flex grid-items-center grid-gap-2 ${config.permissions.canEditFiles ? 'grid-text-grid-success' : 'grid-text-grid-danger'}`}>
								<div className={`grid-w-1.5 grid-h-1.5 grid-rounded-full ${config.permissions.canEditFiles ? 'grid-bg-grid-success' : 'grid-bg-grid-danger'}`}></div>
								<span>Edit files: {config.permissions.canEditFiles ? 'Allowed' : 'Denied'}</span>
							</div>
							<div className={`grid-flex grid-items-center grid-gap-2 ${config.permissions.canRunCommands ? 'grid-text-grid-success' : 'grid-text-grid-danger'}`}>
								<div className={`grid-w-1.5 grid-h-1.5 grid-rounded-full ${config.permissions.canRunCommands ? 'grid-bg-grid-success' : 'grid-bg-grid-danger'}`}></div>
								<span>Run commands: {config.permissions.canRunCommands ? 'Allowed' : 'Denied'}</span>
							</div>
							<div className={`grid-flex grid-items-center grid-gap-2 ${config.permissions.canDeleteFiles ? 'grid-text-grid-success' : 'grid-text-grid-danger'}`}>
								<div className={`grid-w-1.5 grid-h-1.5 grid-rounded-full ${config.permissions.canDeleteFiles ? 'grid-bg-grid-success' : 'grid-bg-grid-danger'}`}></div>
								<span>Delete files: {config.permissions.canDeleteFiles ? 'Allowed' : 'Denied'}</span>
							</div>
						</div>
					</div>

					{config.permissions.requiresApprovalFor.length > 0 && (
						<div>
							<h5 className="grid-text-xs grid-font-semibold grid-text-grid-fg-1 grid-mb-1.5">Requires Approval</h5>
							<div className="grid-flex grid-flex-wrap grid-gap-1.5">
								{config.permissions.requiresApprovalFor.map(action => (
									<span
										key={action}
										className="grid-px-2 grid-py-0.5 grid-bg-grid-warning-soft grid-text-grid-warning grid-rounded grid-text-[10px] grid-font-medium grid-border grid-border-grid-warning/30"
									>
										{action}
									</span>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

interface LearningInsightsPanelProps {
	insights: string[];
	topSkills: { title: string; successRate: number; timesUsed: number }[];
	successPatterns: string[];
}

export const LearningInsightsPanel = ({ insights, topSkills, successPatterns }: LearningInsightsPanelProps) => {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className="grid-w-full grid-px-4 grid-py-3 grid-bg-grid-bg-0 grid-border-b grid-border-grid-border-2">
			<div className="grid-flex grid-items-center grid-justify-between grid-mb-2">
				<div className="grid-flex grid-items-center grid-gap-2">
					<Lightbulb className="grid-w-4 grid-h-4 grid-text-grid-warning" />
					<h3 className="grid-text-xs grid-font-bold grid-text-grid-fg-0 grid-uppercase grid-tracking-wider">
						Learning Insights
					</h3>
				</div>
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="grid-text-xs grid-text-grid-fg-3 hover:grid-text-grid-fg-1 grid-transition-colors"
				>
					{isExpanded ? 'Hide' : 'Show'}
				</button>
			</div>

			{isExpanded && (
				<div className="grid-space-y-3">
					{/* Quick Stats */}
					<div className="grid-grid grid-grid-cols-3 grid-gap-2">
						<div className="grid-p-2 grid-bg-grid-bg-2 grid-rounded-lg grid-border grid-border-grid-border-2">
							<div className="grid-text-xs grid-text-grid-fg-3 grid-mb-0.5">Insights</div>
							<div className="grid-text-lg grid-font-bold grid-text-grid-fg-0">{insights.length}</div>
						</div>
						<div className="grid-p-2 grid-bg-grid-bg-2 grid-rounded-lg grid-border grid-border-grid-border-2">
							<div className="grid-text-xs grid-text-grid-fg-3 grid-mb-0.5">Skills</div>
							<div className="grid-text-lg grid-font-bold grid-text-grid-fg-0">{topSkills.length}</div>
						</div>
						<div className="grid-p-2 grid-bg-grid-bg-2 grid-rounded-lg grid-border grid-border-grid-border-2">
							<div className="grid-text-xs grid-text-grid-fg-3 grid-mb-0.5">Patterns</div>
							<div className="grid-text-lg grid-font-bold grid-text-grid-fg-0">{successPatterns.length}</div>
						</div>
					</div>

					{/* Top Skills */}
					{topSkills.length > 0 && (
						<div>
							<h4 className="grid-text-xs grid-font-semibold grid-text-grid-fg-1 grid-mb-2 grid-flex grid-items-center grid-gap-1.5">
								<Award className="grid-w-3 grid-h-3 grid-text-grid-primary" />
								Top Skills
							</h4>
							<div className="grid-space-y-1.5">
								{topSkills.slice(0, 3).map((skill, idx) => (
									<div
										key={idx}
										className="grid-p-2 grid-bg-grid-bg-2 grid-rounded-lg grid-border grid-border-grid-border-2 grid-flex grid-items-center grid-justify-between"
									>
										<div>
											<div className="grid-text-xs grid-font-medium grid-text-grid-fg-0">{skill.title}</div>
											<div className="grid-text-[10px] grid-text-grid-fg-3">Used {skill.timesUsed} times</div>
										</div>
										<div className="grid-text-xs grid-font-bold grid-text-grid-primary">{Math.round(skill.successRate * 100)}%</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Recent Insights */}
					{insights.length > 0 && (
						<div>
							<h4 className="grid-text-xs grid-font-semibold grid-text-grid-fg-1 grid-mb-2 grid-flex grid-items-center grid-gap-1.5">
								<TrendingUp className="grid-w-3 grid-h-3 grid-text-grid-success" />
								Recent Insights
							</h4>
							<div className="grid-space-y-1.5">
								{insights.slice(0, 3).map((insight, idx) => (
									<div
										key={idx}
										className="grid-p-2 grid-bg-grid-bg-2 grid-rounded-lg grid-border grid-border-grid-border-2 grid-text-xs grid-text-grid-fg-2"
									>
										{insight}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
