/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

/**
 * GRID Learning Engine - Our own agentic learning system
 * Inspired by but better than ACE (Agentic Context Engine)
 *
 * Features:
 * - Learns from every conversation
 * - Accumulates coding skills and patterns
 * - Reflects on task success/failure
 * - Builds project-specific knowledge
 * - Multiple agent modes (Build, Plan, Explore, Review)
 */

export type AgentMode = 'build' | 'plan' | 'explore' | 'review' | 'debug';

export interface Skill {
	id: string;
	title: string;
	description: string;
	pattern: string;
	context: string[];
	successRate: number;
	timesUsed: number;
	learnedFrom: string; // conversation ID
	createdAt: number;
	lastUsed: number;
	tags: string[];
}

export interface LearningReflection {
	conversationId: string;
	timestamp: number;
	taskDescription: string;
	outcome: 'success' | 'partial' | 'failure';
	toolsUsed: string[];
	filesModified: string[];
	insights: string[];
	skillsApplied: string[];
	newSkillsLearned: Skill[];
	improvementSuggestions: string[];
}

export interface ProjectKnowledge {
	projectPath: string;
	architecture: {
		patterns: string[];
		frameworks: string[];
		buildTools: string[];
		testingFrameworks: string[];
	};
	commonTasks: {
		task: string;
		frequency: number;
		typicalApproach: string;
	}[];
	codebaseInsights: string[];
	bestPractices: string[];
	pitfallsToAvoid: string[];
	lastUpdated: number;
}

export interface AgentModeConfig {
	mode: AgentMode;
	permissions: {
		canEditFiles: boolean;
		canDeleteFiles: boolean;
		canRunCommands: boolean;
		requiresApprovalFor: string[];
	};
	systemPromptAddition: string;
	toolRestrictions?: string[];
}

/**
 * Agent mode configurations
 */
export const AGENT_MODES: Record<AgentMode, AgentModeConfig> = {
	build: {
		mode: 'build',
		permissions: {
			canEditFiles: true,
			canDeleteFiles: false,
			canRunCommands: true,
			requiresApprovalFor: ['deleteFile', 'installPackage', 'gitPush'],
		},
		systemPromptAddition: `You are in BUILD mode. Full access to edit files and run commands.

UNDERSTANDING THE USER:
Users talk casually. "add a button", "make it work", "fix this thing" are all valid requests.
Don't require formal specs - understand what they want from context and their codebase.
Examples: "add dark mode" = implement dark mode toggle
         "make it faster" = optimize performance
         "hook up the api" = integrate with their backend

WHAT YOU DO:
- Implement features efficiently
- Write clean, maintainable code
- Apply patterns from the skillbook
- Match the existing code style
- Test changes work before finishing

Just get things done. Ask for clarification only when truly needed.`,
	},
	plan: {
		mode: 'plan',
		permissions: {
			canEditFiles: false,
			canDeleteFiles: false,
			canRunCommands: false,
			requiresApprovalFor: ['editFile', 'bash', 'deleteFile'],
		},
		systemPromptAddition: `You are in PLAN mode (read-only). You CANNOT edit files or run commands without explicit approval.

UNDERSTANDING THE USER:
Users talk casually - understand intent from informal language like "wanna build", "how do i", "gimme", "maybe use", etc. 
Don't require formal prompts. Interpret meaning from context, not perfect grammar.
Examples: "wanna make a react thing" = they want to build a React project
         "whats a good way to do auth" = asking about authentication approaches
         "idk maybe nextjs?" = considering Next.js, looking for guidance

WHAT YOU DO:
- Understand codebases and explain how things work
- Plan architecture and suggest tech stacks
- Create implementation plans with file changes
- Recommend languages, frameworks, tools, and file formats based on what they're building
- Help them think through scale, team size, tradeoffs

For new projects, INITIALIZE PROJECT RESEARCH by calling the 'start_project_research' tool with the user's intent. This will launch an interactive wizard to gather requirements.
Do NOT suggest manual scaffolding if you can start the research session.
Ask casual clarifying questions if needed - keep it conversational, not formal.`,
	},
	explore: {
		mode: 'explore',
		permissions: {
			canEditFiles: false,
			canDeleteFiles: false,
			canRunCommands: false,
			requiresApprovalFor: ['editFile', 'deleteFile', 'bash'],
		},
		systemPromptAddition: `You are in EXPLORE mode. Read-only - you analyze but don't change anything.

UNDERSTANDING THE USER:
Users talk casually. "whats this do", "where is the X thing", "how does Y work" are all valid questions.
Don't require formal prompts. Understand intent from informal, even fragmented language.

WHAT YOU DO:
- Navigate unfamiliar codebases and explain what you find
- Find specific functions, files, patterns
- Explain how pieces connect together
- Answer questions about the code structure
- Build knowledge about the project for later

Keep explanations clear and conversational. Match the user's tone.`,
	},
	review: {
		mode: 'review',
		permissions: {
			canEditFiles: true,
			canDeleteFiles: false,
			canRunCommands: true,
			requiresApprovalFor: ['deleteFile', 'gitPush'],
		},
		systemPromptAddition: `You are in REVIEW mode. Focus on code quality and improvements.

UNDERSTANDING THE USER:
Casual language is fine. "check this", "looks wrong?", "can we make it better" all work.
Don't require formal prompts - understand what they want from context.

WHAT YOU DO:
- Review code for bugs, performance issues, security problems
- Suggest refactorings and improvements
- Run tests and verify changes
- Apply fixes when asked
- Explain what's wrong and why in plain language

Be direct about issues but not condescending. If something's fine, say so.`,
		toolRestrictions: ['editFile', 'bash', 'grep', 'glob'],
	},
	debug: {
		mode: 'debug',
		permissions: {
			canEditFiles: true,
			canDeleteFiles: false,
			canRunCommands: true,
			requiresApprovalFor: [],
		},
		systemPromptAddition: `You are in DEBUG mode. Find and fix bugs.

UNDERSTANDING THE USER:
"its broken", "doesnt work", "wtf is this error" are all valid ways to describe problems.
Don't require formal bug reports - understand the issue from whatever info they give.

WHAT YOU DO:
- Reproduce the problem
- Isolate what's causing it
- Fix it and verify the fix works
- Add logging or tests if helpful
- Explain what was wrong in simple terms

Be systematic: reproduce → isolate → fix → verify. Keep the user informed.`,
	},
};

/**
 * GRID Learning Engine Service Interface
 */
export interface IGRIDLearningEngine {
	// Agent Mode Management
	getCurrentMode(): AgentMode;
	setMode(mode: AgentMode): void;
	getModeConfig(mode: AgentMode): AgentModeConfig;

	// Skill Management
	getSkills(): Skill[];
	addSkill(skill: Omit<Skill, 'id' | 'createdAt' | 'timesUsed' | 'lastUsed'>): Skill;
	updateSkillUsage(skillId: string): void;
	findRelevantSkills(context: string): Skill[];
	getTopSkills(limit?: number): Skill[];

	// Learning & Reflection
	recordReflection(reflection: LearningReflection): void;
	getReflections(conversationId?: string): LearningReflection[];
	analyzeConversation(conversationId: string): Promise<LearningReflection>;

	// Project Knowledge
	getProjectKnowledge(projectPath: string): ProjectKnowledge | undefined;
	updateProjectKnowledge(knowledge: Partial<ProjectKnowledge> & { projectPath: string }): void;
	learnFromCodebase(projectPath: string): Promise<ProjectKnowledge>;

	// Learning Insights
	getInsights(): string[];
	getSuggestedImprovements(): string[];
	getSuccessPatterns(): string[];

	// Tool Usage Tracking (for learning from agent loops)
	recordToolUsage(toolName: string, success: boolean, context?: string): void;

	// User Feedback (👍/👎 on responses)
	recordUserFeedback(responseId: string, rating: 'positive' | 'negative', agentMode: AgentMode): void;
	getFeedbackStats(): { positive: number; negative: number; byMode: Record<AgentMode, { positive: number; negative: number }> };
}

/**
 * Default implementation of GRID Learning Engine
 */
export class GRIDLearningEngine implements IGRIDLearningEngine {
	private currentMode: AgentMode = 'build';
	private skills: Map<string, Skill> = new Map();
	private reflections: LearningReflection[] = [];
	private projectKnowledge: Map<string, ProjectKnowledge> = new Map();
	private toolUsageStats: Map<string, { success: number; failure: number }> = new Map();
	private userFeedback: { positive: number; negative: number; byMode: Record<AgentMode, { positive: number; negative: number }> } = {
		positive: 0,
		negative: 0,
		byMode: {
			build: { positive: 0, negative: 0 },
			plan: { positive: 0, negative: 0 },
			explore: { positive: 0, negative: 0 },
			review: { positive: 0, negative: 0 },
			debug: { positive: 0, negative: 0 },
		},
	};


	constructor() {
		this.initializeDefaultSkills();
	}

	private initializeDefaultSkills(): void {
		// Add some starter skills
		this.addSkill({
			title: 'Fix TypeScript Errors',
			description: 'Systematic approach to resolving TypeScript compilation errors',
			pattern: 'Read error → Locate source → Fix type → Verify build',
			context: ['typescript', 'compilation', 'errors'],
			successRate: 0.9,
			tags: ['typescript', 'debugging', 'build'],
			learnedFrom: 'initial',
		});

		this.addSkill({
			title: 'React Component Creation',
			description: 'Best practices for creating new React components',
			pattern: 'Define props interface → Create functional component → Add hooks if needed → Export',
			context: ['react', 'components', 'typescript'],
			successRate: 0.95,
			tags: ['react', 'frontend', 'components'],
			learnedFrom: 'initial',
		});

		this.addSkill({
			title: 'Git Workflow',
			description: 'Proper git commit and push workflow',
			pattern: 'Stage changes → Review diff → Write clear commit message → Push to branch',
			context: ['git', 'version-control'],
			successRate: 1.0,
			tags: ['git', 'workflow', 'best-practices'],
			learnedFrom: 'initial',
		});
	}

	getCurrentMode(): AgentMode {
		return this.currentMode;
	}

	setMode(mode: AgentMode): void {
		this.currentMode = mode;
	}

	getModeConfig(mode: AgentMode): AgentModeConfig {
		return AGENT_MODES[mode];
	}

	getSkills(): Skill[] {
		return Array.from(this.skills.values()).sort((a, b) => b.successRate - a.successRate);
	}

	addSkill(skillData: Omit<Skill, 'id' | 'createdAt' | 'timesUsed' | 'lastUsed'>): Skill {
		const skill: Skill = {
			...skillData,
			id: `skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			createdAt: Date.now(),
			timesUsed: 0,
			lastUsed: 0,
		};
		this.skills.set(skill.id, skill);
		return skill;
	}

	updateSkillUsage(skillId: string): void {
		const skill = this.skills.get(skillId);
		if (skill) {
			skill.timesUsed++;
			skill.lastUsed = Date.now();
			this.skills.set(skillId, skill);
		}
	}

	findRelevantSkills(context: string): Skill[] {
		const contextLower = context.toLowerCase();
		return this.getSkills().filter(
			(skill) =>
				skill.context.some((ctx) => contextLower.includes(ctx.toLowerCase())) ||
				skill.tags.some((tag) => contextLower.includes(tag.toLowerCase())) ||
				skill.title.toLowerCase().includes(contextLower) ||
				skill.description.toLowerCase().includes(contextLower)
		);
	}

	getTopSkills(limit: number = 10): Skill[] {
		return this.getSkills()
			.sort((a, b) => b.timesUsed * b.successRate - a.timesUsed * a.successRate)
			.slice(0, limit);
	}

	recordReflection(reflection: LearningReflection): void {
		this.reflections.push(reflection);

		// Learn new skills from successful outcomes
		if (reflection.outcome === 'success' && reflection.newSkillsLearned.length > 0) {
			reflection.newSkillsLearned.forEach((skill) => {
				this.addSkill(skill);
			});
		}
	}

	getReflections(conversationId?: string): LearningReflection[] {
		if (conversationId) {
			return this.reflections.filter((r) => r.conversationId === conversationId);
		}
		return [...this.reflections];
	}

	async analyzeConversation(conversationId: string): Promise<LearningReflection> {
		// This would analyze the conversation and extract learnings
		// For now, return a placeholder
		const reflection: LearningReflection = {
			conversationId,
			timestamp: Date.now(),
			taskDescription: 'Analyzed conversation',
			outcome: 'success',
			toolsUsed: [],
			filesModified: [],
			insights: [],
			skillsApplied: [],
			newSkillsLearned: [],
			improvementSuggestions: [],
		};

		this.recordReflection(reflection);
		return reflection;
	}

	getProjectKnowledge(projectPath: string): ProjectKnowledge | undefined {
		return this.projectKnowledge.get(projectPath);
	}

	updateProjectKnowledge(knowledge: Partial<ProjectKnowledge> & { projectPath: string }): void {
		const existing = this.projectKnowledge.get(knowledge.projectPath) || {
			projectPath: knowledge.projectPath,
			architecture: {
				patterns: [],
				frameworks: [],
				buildTools: [],
				testingFrameworks: [],
			},
			commonTasks: [],
			codebaseInsights: [],
			bestPractices: [],
			pitfallsToAvoid: [],
			lastUpdated: Date.now(),
		};

		const updated = {
			...existing,
			...knowledge,
			lastUpdated: Date.now(),
		};

		this.projectKnowledge.set(knowledge.projectPath, updated);
	}

	async learnFromCodebase(projectPath: string): Promise<ProjectKnowledge> {
		// This would analyze the codebase and build knowledge
		// For now, return a basic structure
		const knowledge: ProjectKnowledge = {
			projectPath,
			architecture: {
				patterns: ['MVC', 'Component-based'],
				frameworks: ['React', 'TypeScript'],
				buildTools: ['npm', 'webpack'],
				testingFrameworks: ['Jest'],
			},
			commonTasks: [],
			codebaseInsights: [],
			bestPractices: [],
			pitfallsToAvoid: [],
			lastUpdated: Date.now(),
		};

		this.updateProjectKnowledge(knowledge);
		return knowledge;
	}

	getInsights(): string[] {
		const insights: string[] = [];

		// Analyze reflections for patterns
		const successfulReflections = this.reflections.filter((r) => r.outcome === 'success');
		const failedReflections = this.reflections.filter((r) => r.outcome === 'failure');

		if (successfulReflections.length > 0) {
			insights.push(`Successfully completed ${successfulReflections.length} tasks`);
		}

		if (failedReflections.length > 0) {
			insights.push(`${failedReflections.length} tasks had issues - review for improvement`);
		}

		// Top skills
		const topSkills = this.getTopSkills(3);
		if (topSkills.length > 0) {
			insights.push(`Most effective skills: ${topSkills.map((s) => s.title).join(', ')}`);
		}

		return insights;
	}

	getSuggestedImprovements(): string[] {
		// Analyze patterns
		const allSuggestions = this.reflections.flatMap((r) => r.improvementSuggestions);
		const uniqueSuggestions = [...new Set(allSuggestions)];

		return uniqueSuggestions.slice(0, 10);
	}

	getSuccessPatterns(): string[] {
		const successfulReflections = this.reflections.filter((r) => r.outcome === 'success');
		const toolsUsed = successfulReflections.flatMap((r) => r.toolsUsed);
		const toolCounts = toolsUsed.reduce(
			(acc, tool) => {
				acc[tool] = (acc[tool] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		return Object.entries(toolCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([tool, count]) => `${tool}: used ${count} times successfully`);
	}

	recordToolUsage(toolName: string, success: boolean, _context?: string): void {
		const stats = this.toolUsageStats.get(toolName) || { success: 0, failure: 0 };
		if (success) {
			stats.success++;
		} else {
			stats.failure++;
		}
		this.toolUsageStats.set(toolName, stats);

		// If tool has high success rate, consider creating/updating a skill
		const total = stats.success + stats.failure;
		if (total >= 5) {
			const successRate = stats.success / total;
			const existingSkill = this.getSkills().find(s => s.title.toLowerCase().includes(toolName.toLowerCase()));
			if (existingSkill) {
				existingSkill.successRate = successRate;
				existingSkill.timesUsed = total;
				existingSkill.lastUsed = Date.now();
			}
		}
	}

	recordUserFeedback(responseId: string, rating: 'positive' | 'negative', agentMode: AgentMode): void {
		if (rating === 'positive') {
			this.userFeedback.positive++;
			this.userFeedback.byMode[agentMode].positive++;
		} else {
			this.userFeedback.negative++;
			this.userFeedback.byMode[agentMode].negative++;
		}
		// TODO: Log to telemetry for staff dashboard
		console.log(`[LearningEngine] Feedback recorded: ${rating} for ${agentMode} mode (response: ${responseId})`);
	}

	getFeedbackStats(): { positive: number; negative: number; byMode: Record<AgentMode, { positive: number; negative: number }> } {
		return { ...this.userFeedback };
	}
}

/**
 * Singleton instance
 */
export const gridLearningEngine = new GRIDLearningEngine();
