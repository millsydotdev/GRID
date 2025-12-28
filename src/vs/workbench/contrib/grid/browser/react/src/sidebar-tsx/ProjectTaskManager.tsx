/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useMemo } from 'react';
import { FileText, CheckCircle2, Clock, MessageCircle, ThumbsUp, AlertCircle, ChevronDown, ChevronRight, Plus, Edit3, Trash2, Send } from 'lucide-react';

interface Task {
	id: string;
	description: string;
	status: 'todo' | 'in-progress' | 'done' | 'blocked';
	notes?: string;
}

interface Discussion {
	id: string;
	timestamp: number;
	author: 'user' | 'ai';
	content: string;
	type: 'comment' | 'suggestion' | 'question' | 'approval';
}

interface TaskDocument {
	id: string;
	title: string;
	status: 'draft' | 'in-review' | 'approved' | 'in-progress' | 'completed';
	tasks: Task[];
	discussions: Discussion[];
	updatedAt: number;
}

interface ImplementationPlan {
	id: string;
	title: string;
	objective: string;
	status: 'draft' | 'under-review' | 'approved' | 'implementing' | 'completed';
	phases: Phase[];
	discussions: Discussion[];
	updatedAt: number;
}

interface Phase {
	id: string;
	name: string;
	description: string;
	status: 'pending' | 'in-progress' | 'completed';
	steps: Step[];
}

interface Step {
	id: string;
	description: string;
	status: 'todo' | 'in-progress' | 'done';
	filesAffected: string[];
}

export const ProjectTaskManager = () => {
	const [activeTab, setActiveTab] = useState<'tasks' | 'plans'>('tasks');
	const [selectedDoc, setSelectedDoc] = useState<TaskDocument | ImplementationPlan | null>(null);
	const [discussionInput, setDiscussionInput] = useState('');

	// Mock data - would come from projectContextService
	const tasks: TaskDocument[] = [
		{
			id: 'task-1',
			title: 'Implement User Authentication',
			status: 'in-progress',
			tasks: [
				{ id: '1', description: 'Create login page UI', status: 'done' },
				{ id: '2', description: 'Set up JWT authentication', status: 'in-progress' },
				{ id: '3', description: 'Add password reset flow', status: 'todo' }
			],
			discussions: [
				{
					id: 'd1',
					timestamp: Date.now() - 3600000,
					author: 'ai',
					content: 'I suggest using bcrypt for password hashing and implementing rate limiting on login attempts.',
					type: 'suggestion'
				}
			],
			updatedAt: Date.now() - 1800000
		}
	];

	const plans: ImplementationPlan[] = [
		{
			id: 'plan-1',
			title: 'E-commerce Platform MVP',
			objective: 'Build a basic e-commerce platform with product listing, cart, and checkout',
			status: 'under-review',
			phases: [
				{
					id: 'p1',
					name: 'Phase 1: Core Infrastructure',
					description: 'Set up database, API, and basic authentication',
					status: 'completed',
					steps: [
						{ id: 's1', description: 'Database schema design', status: 'done', filesAffected: ['db/schema.sql'] },
						{ id: 's2', description: 'API routes setup', status: 'done', filesAffected: ['api/routes.ts'] }
					]
				},
				{
					id: 'p2',
					name: 'Phase 2: Product Management',
					description: 'Product CRUD, categories, and search',
					status: 'in-progress',
					steps: [
						{ id: 's3', description: 'Product listing page', status: 'in-progress', filesAffected: ['components/ProductList.tsx'] },
						{ id: 's4', description: 'Product search', status: 'todo', filesAffected: ['api/search.ts'] }
					]
				}
			],
			discussions: [],
			updatedAt: Date.now() - 7200000
		}
	];

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'completed':
			case 'done':
			case 'approved':
				return 'grid-success';
			case 'in-progress':
			case 'implementing':
				return 'grid-primary';
			case 'blocked':
			case 'draft':
				return 'grid-warning';
			case 'in-review':
			case 'under-review':
				return 'grid-info';
			default:
				return 'grid-fg-3';
		}
	};

	const handleSendDiscussion = () => {
		if (!discussionInput.trim()) return;
		// Would call projectContextService.addDiscussion
		console.log('Adding discussion:', discussionInput);
		setDiscussionInput('');
	};

	return (
		<div className="grid-w-full grid-h-full grid-flex grid-flex-col grid-bg-grid-bg-1">
			{/* Header */}
			<div className="grid-px-4 grid-py-3 grid-border-b grid-border-grid-border-2 grid-bg-grid-bg-0">
				<h2 className="grid-text-sm grid-font-bold grid-text-grid-fg-0 grid-flex grid-items-center grid-gap-2">
					<FileText className="grid-w-4 grid-h-4 grid-text-grid-primary" />
					Project Tracker
				</h2>
				<p className="grid-text-xs grid-text-grid-fg-3 grid-mt-1">
					Tasks &amp; Implementation Plans
				</p>
			</div>

			{/* Tabs */}
			<div className="grid-flex grid-border-b grid-border-grid-border-2 grid-bg-grid-bg-0">
				<button
					onClick={() => setActiveTab('tasks')}
					className={`grid-flex-1 grid-px-4 grid-py-2 grid-text-xs grid-font-semibold grid-transition-all ${
						activeTab === 'tasks'
							? 'grid-text-grid-primary grid-border-b-2 grid-border-grid-primary grid-bg-grid-primary-soft'
							: 'grid-text-grid-fg-3 hover:grid-text-grid-fg-1 hover:grid-bg-grid-bg-2'
					}`}
				>
					<span>Tasks ({tasks.length})</span>
				</button>
				<button
					onClick={() => setActiveTab('plans')}
					className={`grid-flex-1 grid-px-4 grid-py-2 grid-text-xs grid-font-semibold grid-transition-all ${
						activeTab === 'plans'
							? 'grid-text-grid-primary grid-border-b-2 grid-border-grid-primary grid-bg-grid-primary-soft'
							: 'grid-text-grid-fg-3 hover:grid-text-grid-fg-1 hover:grid-bg-grid-bg-2'
					}`}
				>
					<span>Plans ({plans.length})</span>
				</button>
			</div>

			{/* Content */}
			<div className="grid-flex-1 grid-overflow-auto grid-p-4">
				{activeTab === 'tasks' && (
					<div className="grid-space-y-3">
						{tasks.map(task => (
							<TaskCard
								key={task.id}
								task={task}
								onClick={() => setSelectedDoc(task)}
								isSelected={selectedDoc?.id === task.id}
							/>
						))}
						<button className="grid-w-full grid-p-4 grid-border-2 grid-border-dashed grid-border-grid-border-2 hover:grid-border-grid-primary grid-rounded-xl grid-flex grid-items-center grid-justify-center grid-gap-2 grid-text-sm grid-text-grid-fg-3 hover:grid-text-grid-primary grid-transition-all">
							<Plus className="grid-w-4 grid-h-4" />
							New Task
						</button>
					</div>
				)}

				{activeTab === 'plans' && (
					<div className="grid-space-y-3">
						{plans.map(plan => (
							<PlanCard
								key={plan.id}
								plan={plan}
								onClick={() => setSelectedDoc(plan)}
								isSelected={selectedDoc?.id === plan.id}
							/>
						))}
						<button className="grid-w-full grid-p-4 grid-border-2 grid-border-dashed grid-border-grid-border-2 hover:grid-border-grid-primary grid-rounded-xl grid-flex grid-items-center grid-justify-center grid-gap-2 grid-text-sm grid-text-grid-fg-3 hover:grid-text-grid-primary grid-transition-all">
							<Plus className="grid-w-4 grid-h-4" />
							New Implementation Plan
						</button>
					</div>
				)}
			</div>

			{/* Detail Panel (when document selected) */}
			{selectedDoc && (
				<div className="grid-border-t grid-border-grid-border-2 grid-bg-grid-bg-0 grid-p-4 grid-max-h-[40%] grid-overflow-auto">
					<div className="grid-flex grid-items-center grid-justify-between grid-mb-3">
						<h3 className="grid-text-sm grid-font-bold grid-text-grid-fg-0">{selectedDoc.title}</h3>
						<div className="grid-flex grid-items-center grid-gap-2">
							<span className={`grid-px-2 grid-py-1 grid-rounded grid-text-xs grid-font-medium grid-text-${getStatusColor(selectedDoc.status)}`}>
								{selectedDoc.status}
							</span>
							<button className="grid-px-3 grid-py-1 grid-bg-grid-primary hover:grid-bg-grid-primary-bright grid-rounded-lg grid-text-xs grid-font-semibold grid-text-white grid-transition-all grid-flex grid-items-center grid-gap-1">
								<ThumbsUp className="grid-w-3 grid-h-3" />
								Approve
							</button>
						</div>
					</div>

					{/* Discussions */}
					<div className="grid-space-y-2 grid-mb-3">
						{selectedDoc.discussions.map(disc => (
							<div
								key={disc.id}
								className={`grid-p-3 grid-rounded-lg ${
									disc.author === 'ai'
										? 'grid-bg-grid-primary-soft grid-border grid-border-grid-primary/30'
										: 'grid-bg-grid-bg-2'
								}`}
							>
								<div className="grid-flex grid-items-center grid-gap-2 grid-mb-1">
									<span className="grid-text-xs grid-font-semibold grid-text-grid-fg-0">
										{disc.author === 'ai' ? '🤖 GRID AI' : '👤 You'}
									</span>
									<span className="grid-text-xs grid-text-grid-fg-3">
										{new Date(disc.timestamp).toLocaleTimeString()}
									</span>
								</div>
								<p className="grid-text-xs grid-text-grid-fg-1">{disc.content}</p>
							</div>
						))}
					</div>

					{/* Discussion Input */}
					<div className="grid-flex grid-gap-2">
						<input
							type="text"
							value={discussionInput}
							onChange={(e) => setDiscussionInput(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && handleSendDiscussion()}
							placeholder="Add a comment or question..."
							className="grid-flex-1 grid-px-3 grid-py-2 grid-bg-grid-bg-2 grid-border grid-border-grid-border-2 grid-rounded-lg grid-text-xs grid-text-grid-fg-1 placeholder:grid-text-grid-fg-3 focus:grid-outline-none focus:grid-border-grid-primary focus:grid-ring-2 focus:grid-ring-grid-primary/20"
						/>
						<button
							onClick={handleSendDiscussion}
							className="grid-px-3 grid-py-2 grid-bg-grid-primary hover:grid-bg-grid-primary-bright grid-rounded-lg grid-text-white grid-transition-all"
						>
							<Send className="grid-w-4 grid-h-4" />
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

const TaskCard = ({ task, onClick, isSelected }: { task: TaskDocument; onClick: () => void; isSelected: boolean }) => {
	const completedTasks = task.tasks.filter(t => t.status === 'done').length;
	const progress = (completedTasks / task.tasks.length) * 100;

	return (
		<div
			onClick={onClick}
			className={`grid-p-4 grid-rounded-xl grid-border grid-cursor-pointer grid-transition-all ${
				isSelected
					? 'grid-border-grid-primary grid-bg-grid-primary-soft grid-shadow-md'
					: 'grid-border-grid-border-2 grid-bg-grid-bg-2/40 hover:grid-bg-grid-bg-2 hover:grid-border-grid-border-1'
			}`}
		>
			<div className="grid-flex grid-items-start grid-justify-between grid-mb-2">
				<div className="grid-flex-1">
					<h3 className="grid-text-sm grid-font-semibold grid-text-grid-fg-0 grid-mb-1">{task.title}</h3>
					<div className="grid-flex grid-items-center grid-gap-2 grid-text-xs grid-text-grid-fg-3">
						<span>{completedTasks}/{task.tasks.length} complete</span>
						<span>•</span>
						<span>{task.discussions.length} discussions</span>
					</div>
				</div>
				<StatusBadge status={task.status} />
			</div>

			{/* Progress Bar */}
			<div className="grid-w-full grid-h-1.5 grid-bg-grid-bg-3 grid-rounded-full grid-overflow-hidden">
				<div
					className="grid-h-full grid-bg-grid-primary grid-transition-all"
					style={{ width: `${progress}%` }}
				/>
			</div>
		</div>
	);
};

const PlanCard = ({ plan, onClick, isSelected }: { plan: ImplementationPlan; onClick: () => void; isSelected: boolean }) => {
	const completedPhases = plan.phases.filter(p => p.status === 'completed').length;

	return (
		<div
			onClick={onClick}
			className={`grid-p-4 grid-rounded-xl grid-border grid-cursor-pointer grid-transition-all ${
				isSelected
					? 'grid-border-grid-primary grid-bg-grid-primary-soft grid-shadow-md'
					: 'grid-border-grid-border-2 grid-bg-grid-bg-2/40 hover:grid-bg-grid-bg-2 hover:grid-border-grid-border-1'
			}`}
		>
			<div className="grid-flex grid-items-start grid-justify-between grid-mb-2">
				<div className="grid-flex-1">
					<h3 className="grid-text-sm grid-font-semibold grid-text-grid-fg-0 grid-mb-1">{plan.title}</h3>
					<p className="grid-text-xs grid-text-grid-fg-3 grid-mb-2">{plan.objective}</p>
					<div className="grid-flex grid-items-center grid-gap-2 grid-text-xs grid-text-grid-fg-3">
						<span>{completedPhases}/{plan.phases.length} phases complete</span>
					</div>
				</div>
				<StatusBadge status={plan.status} />
			</div>

			{/* Phases Preview */}
			<div className="grid-space-y-1 grid-mt-3">
				{plan.phases.slice(0, 2).map(phase => (
					<div key={phase.id} className="grid-flex grid-items-center grid-gap-2 grid-text-xs">
						{phase.status === 'completed' ? (
							<CheckCircle2 className="grid-w-3 grid-h-3 grid-text-grid-success" />
						) : phase.status === 'in-progress' ? (
							<Clock className="grid-w-3 grid-h-3 grid-text-grid-primary grid-animate-pulse" />
						) : (
							<div className="grid-w-3 grid-h-3 grid-rounded-full grid-border grid-border-grid-fg-4" />
						)}
						<span className="grid-text-grid-fg-2">{phase.name}</span>
					</div>
				))}
				{plan.phases.length > 2 && (
					<span className="grid-text-xs grid-text-grid-fg-3">+{plan.phases.length - 2} more phases</span>
				)}
			</div>
		</div>
	);
};

const StatusBadge = ({ status }: { status: string }) => {
	const getColor = () => {
		switch (status) {
			case 'completed':
			case 'approved':
				return 'grid-bg-grid-success-soft grid-text-grid-success grid-border-grid-success/30';
			case 'in-progress':
			case 'implementing':
				return 'grid-bg-grid-primary-soft grid-text-grid-primary grid-border-grid-primary/30';
			case 'in-review':
			case 'under-review':
				return 'grid-bg-grid-info-soft grid-text-grid-info grid-border-grid-info/30';
			default:
				return 'grid-bg-grid-warning-soft grid-text-grid-warning grid-border-grid-warning/30';
		}
	};

	return (
		<span className={`grid-px-2 grid-py-1 grid-rounded grid-text-[10px] grid-font-bold grid-uppercase grid-tracking-wide grid-border ${getColor()}`}>
			{status.replace('-', ' ')}
		</span>
	);
};
