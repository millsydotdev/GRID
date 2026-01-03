/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * GRID Project Indexer & Task Tracking System
 *
 * Features:
 * - Automatic project indexing for context
 * - Creates and tracks task.md files
 * - Generates implementationplan.md for projects
 * - Continuous context updates
 * - Approval workflow for plans
 * - Discussion tracking
 */

export interface ProjectIndex {
	projectPath: string;
	indexedAt: number;
	lastUpdated: number;
	files: FileIndexEntry[];
	structure: ProjectStructure;
	dependencies: DependencyMap;
	documentation: DocumentationIndex;
	stats: ProjectStats;
}

export interface FileIndexEntry {
	path: string;
	type: 'source' | 'test' | 'config' | 'doc' | 'asset';
	language?: string;
	size: number;
	lastModified: number;
	symbols: SymbolInfo[];
	dependencies: string[];
	exports: string[];
	imports: string[];
	complexity?: number;
}

export interface SymbolInfo {
	name: string;
	kind: 'class' | 'function' | 'variable' | 'interface' | 'type' | 'enum';
	location: { line: number; column: number };
	signature?: string;
	documentation?: string;
}

export interface ProjectStructure {
	rootPath: string;
	sourceDirectories: string[];
	testDirectories: string[];
	configFiles: string[];
	buildTools: string[];
	framework?: string;
	architecture?: string;
}

export interface DependencyMap {
	production: Record<string, string>;
	development: Record<string, string>;
	peer: Record<string, string>;
}

export interface DocumentationIndex {
	readme?: string;
	guides: string[];
	apiDocs: string[];
	examples: string[];
}

export interface ProjectStats {
	totalFiles: number;
	totalLines: number;
	languages: Record<string, number>;
	testCoverage?: number;
}

export interface TaskDocument {
	id: string;
	projectPath: string;
	filePath: string; // path to task.md
	title: string;
	description: string;
	status: 'draft' | 'in-review' | 'approved' | 'in-progress' | 'completed' | 'blocked';
	priority: 'low' | 'medium' | 'high' | 'critical';
	assignee?: string;
	createdAt: number;
	updatedAt: number;
	approvedAt?: number;
	approvedBy?: string;
	tasks: Task[];
	discussions: Discussion[];
	relatedFiles: string[];
}

export interface Task {
	id: string;
	description: string;
	status: 'todo' | 'in-progress' | 'done' | 'blocked';
	dependencies: string[];
	estimatedTime?: number;
	actualTime?: number;
	notes?: string;
}

export interface Discussion {
	id: string;
	timestamp: number;
	author: 'user' | 'ai';
	content: string;
	type: 'comment' | 'suggestion' | 'question' | 'approval' | 'rejection';
	resolved?: boolean;
}

export interface ImplementationPlan {
	id: string;
	projectPath: string;
	filePath: string; // path to implementationplan.md
	title: string;
	objective: string;
	status: 'draft' | 'under-review' | 'approved' | 'implementing' | 'completed';
	createdAt: number;
	updatedAt: number;
	approvedAt?: number;

	phases: Phase[];
	techStack: TechStack;
	architecture: ArchitectureDecision[];
	riskAssessment: Risk[];
	timeline: Timeline;
	discussions: Discussion[];
	relatedTasks: string[]; // IDs of related TaskDocuments
}

export interface Phase {
	id: string;
	name: string;
	description: string;
	status: 'pending' | 'in-progress' | 'completed';
	steps: Step[];
	dependencies: string[];
	estimatedDuration?: number;
}

export interface Step {
	id: string;
	description: string;
	status: 'todo' | 'in-progress' | 'done';
	filesAffected: string[];
	notes?: string;
}

export interface TechStack {
	languages: string[];
	frameworks: string[];
	libraries: string[];
	tools: string[];
	services: string[];
	// Extended fields for project planning
	packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'cargo' | 'go' | 'maven' | 'gradle';
	buildTool?: string;
	testingStrategy?: string[];
	deploymentTarget?: ('vercel' | 'aws' | 'gcp' | 'azure' | 'docker' | 'kubernetes' | 'local' | 'edge')[];
}

export interface ArchitectureDecision {
	id: string;
	decision: string;
	rationale: string;
	alternatives: string[];
	tradeoffs: string[];
	status: 'proposed' | 'accepted' | 'rejected';
}

/**
 * Project Planning Wizard Types
 * These types power the Plan mode's project scaffolding guidance
 */

export type ProjectCategory = 'web' | 'mobile' | 'cli' | 'library' | 'api' | 'desktop' | 'game' | 'ai-ml' | 'data';

export interface FileFormatRecommendation {
	purpose: 'config' | 'data' | 'style' | 'test' | 'doc' | 'schema' | 'state';
	format: string;
	extension: string;
	rationale: string;
	alternatives: string[];
}

export interface ProjectIntent {
	description: string;
	category: ProjectCategory;
	scale: 'prototype' | 'small' | 'medium' | 'large' | 'enterprise';
	teamSize: 'solo' | 'small-team' | 'large-team' | 'enterprise';
	platforms: string[];
	constraints: string[];
	priorities: ('speed' | 'scalability' | 'maintainability' | 'security' | 'cost')[];
}

export interface ProjectTemplate {
	id: string;
	name: string;
	description: string;
	category: ProjectCategory;
	techStack: TechStack;
	recommendedArchitecture: string[];
	fileFormats: FileFormatRecommendation[];
	scaffoldCommands: string[];
	estimatedSetupTime: string;
	difficulty: 'beginner' | 'intermediate' | 'advanced';
	complexity?: number;
}

export interface Risk {
	id: string;
	description: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	mitigation: string;
	status: 'identified' | 'mitigated' | 'accepted';
}

export interface Timeline {
	startDate?: number;
	targetDate?: number;
	milestones: Milestone[];
}

export interface Milestone {
	id: string;
	name: string;
	date: number;
	deliverables: string[];
	status: 'upcoming' | 'in-progress' | 'completed';
}

/**
 * Project Context & Task Tracking Service
 */
export interface IProjectContextService {
	// Project Indexing
	indexProject(projectPath: string): Promise<ProjectIndex>;
	getProjectIndex(projectPath: string): ProjectIndex | undefined;
	updateProjectIndex(projectPath: string): Promise<ProjectIndex>;
	watchProject(projectPath: string): void;
	unwatchProject(projectPath: string): void;

	// Task Management
	createTaskDocument(projectPath: string, title: string): Promise<TaskDocument>;
	getTaskDocument(taskId: string): TaskDocument | undefined;
	updateTaskDocument(taskId: string, updates: Partial<TaskDocument>): Promise<TaskDocument>;
	addTaskToDocument(taskId: string, task: Omit<Task, 'id'>): Promise<Task>;
	updateTaskStatus(taskId: string, taskItemId: string, status: Task['status']): Promise<void>;
	addDiscussion(taskId: string, discussion: Omit<Discussion, 'id' | 'timestamp'>): Promise<Discussion>;
	requestApproval(taskId: string): Promise<void>;
	approveTask(taskId: string): Promise<void>;

	// Implementation Planning
	createImplementationPlan(projectPath: string, objective: string): Promise<ImplementationPlan>;
	getImplementationPlan(planId: string): ImplementationPlan | undefined;
	updateImplementationPlan(planId: string, updates: Partial<ImplementationPlan>): Promise<ImplementationPlan>;
	addPhase(planId: string, phase: Omit<Phase, 'id'>): Promise<Phase>;
	updatePhaseStatus(planId: string, phaseId: string, status: Phase['status']): Promise<void>;
	addArchitectureDecision(planId: string, decision: Omit<ArchitectureDecision, 'id'>): Promise<ArchitectureDecision>;
	requestPlanApproval(planId: string): Promise<void>;
	approvePlan(planId: string): Promise<void>;

	// Context Maintenance
	getProjectContext(projectPath: string): Promise<string>;
	updateContext(projectPath: string): Promise<void>;
	getRelevantContext(query: string, projectPath: string): Promise<string>;

	// Continuous Discussion
	continueDiscussion(documentId: string, documentType: 'task' | 'plan'): Promise<string>;
	generateSuggestions(documentId: string, documentType: 'task' | 'plan'): Promise<string[]>;
}

/**
 * Default implementation
 */
export class ProjectContextService implements IProjectContextService {
	private projectIndexes: Map<string, ProjectIndex> = new Map();
	private taskDocuments: Map<string, TaskDocument> = new Map();
	private implementationPlans: Map<string, ImplementationPlan> = new Map();
	private watchers: Map<string, unknown> = new Map();

	async indexProject(projectPath: string): Promise<ProjectIndex> {
		// Implementation would scan the project directory
		const index: ProjectIndex = {
			projectPath,
			indexedAt: Date.now(),
			lastUpdated: Date.now(),
			files: [],
			structure: {
				rootPath: projectPath,
				sourceDirectories: [],
				testDirectories: [],
				configFiles: [],
				buildTools: [],
			},
			dependencies: {
				production: {},
				development: {},
				peer: {},
			},
			documentation: {
				guides: [],
				apiDocs: [],
				examples: [],
			},
			stats: {
				totalFiles: 0,
				totalLines: 0,
				languages: {},
			},
		};

		this.projectIndexes.set(projectPath, index);
		return index;
	}

	getProjectIndex(projectPath: string): ProjectIndex | undefined {
		return this.projectIndexes.get(projectPath);
	}

	async updateProjectIndex(projectPath: string): Promise<ProjectIndex> {
		// Re-index the project
		return this.indexProject(projectPath);
	}

	watchProject(projectPath: string): void {
		// Set up file watcher for continuous updates
		console.log(`Watching project: ${projectPath}`);
	}

	unwatchProject(projectPath: string): void {
		const watcher = this.watchers.get(projectPath);
		if (watcher) {
			// watcher.dispose();
			this.watchers.delete(projectPath);
		}
	}

	async createTaskDocument(projectPath: string, title: string): Promise<TaskDocument> {
		const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const filePath = `${projectPath}/.grid/tasks/${id}.md`;

		const taskDoc: TaskDocument = {
			id,
			projectPath,
			filePath,
			title,
			description: '',
			status: 'draft',
			priority: 'medium',
			createdAt: Date.now(),
			updatedAt: Date.now(),
			tasks: [],
			discussions: [],
			relatedFiles: [],
		};

		this.taskDocuments.set(id, taskDoc);
		return taskDoc;
	}

	getTaskDocument(taskId: string): TaskDocument | undefined {
		return this.taskDocuments.get(taskId);
	}

	async updateTaskDocument(taskId: string, updates: Partial<TaskDocument>): Promise<TaskDocument> {
		const doc = this.taskDocuments.get(taskId);
		if (!doc) {
			throw new Error(`Task document not found: ${taskId}`);
		}

		const updated = {
			...doc,
			...updates,
			updatedAt: Date.now(),
		};

		this.taskDocuments.set(taskId, updated);
		return updated;
	}

	async addTaskToDocument(taskId: string, task: Omit<Task, 'id'>): Promise<Task> {
		const doc = this.taskDocuments.get(taskId);
		if (!doc) {
			throw new Error(`Task document not found: ${taskId}`);
		}

		const newTask: Task = {
			...task,
			id: `task-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		};

		doc.tasks.push(newTask);
		doc.updatedAt = Date.now();

		return newTask;
	}

	async updateTaskStatus(taskId: string, taskItemId: string, status: Task['status']): Promise<void> {
		const doc = this.taskDocuments.get(taskId);
		if (!doc) {
			throw new Error(`Task document not found: ${taskId}`);
		}

		const task = doc.tasks.find((t) => t.id === taskItemId);
		if (task) {
			task.status = status;
			doc.updatedAt = Date.now();
		}
	}

	async addDiscussion(taskId: string, discussion: Omit<Discussion, 'id' | 'timestamp'>): Promise<Discussion> {
		const doc = this.taskDocuments.get(taskId);
		if (!doc) {
			throw new Error(`Task document not found: ${taskId}`);
		}

		const newDiscussion: Discussion = {
			...discussion,
			id: `discussion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			timestamp: Date.now(),
		};

		doc.discussions.push(newDiscussion);
		doc.updatedAt = Date.now();

		return newDiscussion;
	}

	async requestApproval(taskId: string): Promise<void> {
		const doc = this.taskDocuments.get(taskId);
		if (!doc) {
			throw new Error(`Task document not found: ${taskId}`);
		}

		doc.status = 'in-review';
		doc.updatedAt = Date.now();
	}

	async approveTask(taskId: string): Promise<void> {
		const doc = this.taskDocuments.get(taskId);
		if (!doc) {
			throw new Error(`Task document not found: ${taskId}`);
		}

		doc.status = 'approved';
		doc.approvedAt = Date.now();
		doc.approvedBy = 'user';
		doc.updatedAt = Date.now();
	}

	async createImplementationPlan(projectPath: string, objective: string): Promise<ImplementationPlan> {
		const id = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const filePath = `${projectPath}/.grid/plans/${id}.md`;

		const plan: ImplementationPlan = {
			id,
			projectPath,
			filePath,
			title: objective,
			objective,
			status: 'draft',
			createdAt: Date.now(),
			updatedAt: Date.now(),
			phases: [],
			techStack: {
				languages: [],
				frameworks: [],
				libraries: [],
				tools: [],
				services: [],
			},
			architecture: [],
			riskAssessment: [],
			timeline: {
				milestones: [],
			},
			discussions: [],
			relatedTasks: [],
		};

		this.implementationPlans.set(id, plan);
		return plan;
	}

	getImplementationPlan(planId: string): ImplementationPlan | undefined {
		return this.implementationPlans.get(planId);
	}

	async updateImplementationPlan(planId: string, updates: Partial<ImplementationPlan>): Promise<ImplementationPlan> {
		const plan = this.implementationPlans.get(planId);
		if (!plan) {
			throw new Error(`Implementation plan not found: ${planId}`);
		}

		const updated = {
			...plan,
			...updates,
			updatedAt: Date.now(),
		};

		this.implementationPlans.set(planId, updated);
		return updated;
	}

	async addPhase(planId: string, phase: Omit<Phase, 'id'>): Promise<Phase> {
		const plan = this.implementationPlans.get(planId);
		if (!plan) {
			throw new Error(`Implementation plan not found: ${planId}`);
		}

		const newPhase: Phase = {
			...phase,
			id: `phase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		};

		plan.phases.push(newPhase);
		plan.updatedAt = Date.now();

		return newPhase;
	}

	async updatePhaseStatus(planId: string, phaseId: string, status: Phase['status']): Promise<void> {
		const plan = this.implementationPlans.get(planId);
		if (!plan) {
			throw new Error(`Implementation plan not found: ${planId}`);
		}

		const phase = plan.phases.find((p) => p.id === phaseId);
		if (phase) {
			phase.status = status;
			plan.updatedAt = Date.now();
		}
	}

	async addArchitectureDecision(
		planId: string,
		decision: Omit<ArchitectureDecision, 'id'>
	): Promise<ArchitectureDecision> {
		const plan = this.implementationPlans.get(planId);
		if (!plan) {
			throw new Error(`Implementation plan not found: ${planId}`);
		}

		const newDecision: ArchitectureDecision = {
			...decision,
			id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		};

		plan.architecture.push(newDecision);
		plan.updatedAt = Date.now();

		return newDecision;
	}

	async requestPlanApproval(planId: string): Promise<void> {
		const plan = this.implementationPlans.get(planId);
		if (!plan) {
			throw new Error(`Implementation plan not found: ${planId}`);
		}

		plan.status = 'under-review';
		plan.updatedAt = Date.now();
	}

	async approvePlan(planId: string): Promise<void> {
		const plan = this.implementationPlans.get(planId);
		if (!plan) {
			throw new Error(`Implementation plan not found: ${planId}`);
		}

		plan.status = 'approved';
		plan.approvedAt = Date.now();
		plan.updatedAt = Date.now();
	}

	async getProjectContext(projectPath: string): Promise<string> {
		const index = this.projectIndexes.get(projectPath);
		if (!index) {
			await this.indexProject(projectPath);
		}

		// Generate context summary
		return `Project Context for ${projectPath}:\n- Files: ${index?.stats.totalFiles || 0}\n- Languages: ${Object.keys(index?.stats.languages || {}).join(', ')}`;
	}

	async updateContext(projectPath: string): Promise<void> {
		await this.updateProjectIndex(projectPath);
	}

	async getRelevantContext(query: string, projectPath: string): Promise<string> {
		// Search indexed content for relevant context
		return `Relevant context for: ${query}`;
	}

	async continueDiscussion(documentId: string, documentType: 'task' | 'plan'): Promise<string> {
		// Generate next discussion point based on current state
		return `Continuing discussion for ${documentType} ${documentId}...`;
	}

	async generateSuggestions(documentId: string, documentType: 'task' | 'plan'): Promise<string[]> {
		// Generate AI suggestions for improvement
		return [
			'Consider breaking this into smaller tasks',
			'Add unit tests for critical functionality',
			'Document API endpoints',
		];
	}
}

/**
 * Singleton instance
 */
export const projectContextService = new ProjectContextService();
