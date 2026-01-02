/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { parse, ParsedPattern, IExpression } from '../../../../../base/common/glob.js';

/**
 * AI-Powered Auto-Debug Service
 *
 * Automatically detects bugs in code and suggests fixes using AI.
 * Features:
 * - Real-time error detection
 * - AI-powered fix suggestions
 * - One-click fix application
 * - Error pattern learning
 * - Stack trace analysis
 */

export interface DetectedBug {
	id: string;
	filePath: string;
	line: number;
	column: number;
	severity: 'error' | 'warning' | 'info';
	message: string;
	code: string; // Error code (e.g., 'TS2304')
	stackTrace?: string;
	context: {
		beforeCode: string; // Code before the error (10 lines)
		errorCode: string; // The line with the error
		afterCode: string; // Code after the error (10 lines)
	};
	detectedAt: number; // Timestamp
}

export interface BugFix {
	bugId: string;
	confidence: number; // 0-1 score
	description: string;
	explanation: string; // Why this fix works
	codeChange: {
		old: string;
		new: string;
		startLine: number;
		endLine: number;
	};
	additionalChanges?: Array<{
		filePath: string;
		change: {
			old: string;
			new: string;
			startLine: number;
			endLine: number;
		};
	}>;
	estimatedImpact: 'low' | 'medium' | 'high'; // Risk of breaking other code
	relatedErrors?: string[]; // Other bugs this fix resolves
}

export interface ErrorPattern {
	id: string;
	pattern: RegExp;
	description: string;
	commonFix: string;
	learnedFrom: string[]; // Bug IDs this pattern was learned from
	successRate: number; // How often this fix works
}

export interface AutoDebugStats {
	totalBugsDetected: number;
	totalBugsFixed: number;
	averageFixTime: number; // milliseconds
	errorPatterns: ErrorPattern[];
	topErrorCodes: Array<{ code: string; count: number }>;
}

export interface IAutoDebugService {
	/**
	 * Start monitoring a file for errors
	 */
	startMonitoring(filePath: string): void;

	/**
	 * Stop monitoring a file
	 */
	stopMonitoring(filePath: string): void;

	/**
	 * Manually detect bugs in code
	 */
	detectBugs(filePath: string, code: string): Promise<DetectedBug[]>;

	/**
	 * Get AI-generated fix suggestions for a bug
	 */
	getSuggestedFixes(bug: DetectedBug): Promise<BugFix[]>;

	/**
	 * Apply a fix suggestion
	 */
	applyFix(fix: BugFix): Promise<boolean>;

	/**
	 * Learn from applied fixes to improve future suggestions
	 */
	learnFromFix(fix: BugFix, wasSuccessful: boolean): void;

	/**
	 * Get all detected bugs for a file
	 */
	getBugsForFile(filePath: string): DetectedBug[];

	/**
	 * Get debugging statistics
	 */
	getStats(): AutoDebugStats;

	/**
	 * Clear all bugs for a file
	 */
	clearBugsForFile(filePath: string): void;
}

export class AutoDebugService implements IAutoDebugService {
	private monitoredFiles: Set<string> = new Set();
	private detectedBugs: Map<string, DetectedBug[]> = new Map(); // filePath -> bugs
	private errorPatterns: ErrorPattern[] = [];
	private ignorePattern: ParsedPattern | undefined;
	private stats: AutoDebugStats = {
		totalBugsDetected: 0,
		totalBugsFixed: 0,
		averageFixTime: 0,
		errorPatterns: [],
		topErrorCodes: [],
	};

	constructor(
		private llmService: unknown, // Inject LLM service for AI-powered suggestions
		private fileService: unknown, // For reading/writing files
		private diagnosticsService: unknown, // For getting compiler errors
		private workspaceContextService: any // Inject workspace service
	) {
		this.initializeErrorPatterns();
		this.loadGridIgnore();
	}

	private initializeErrorPatterns(): void {
		// Common error patterns with known fixes
		this.errorPatterns = [
			{
				id: 'ts-cannot-find-name',
				pattern: /Cannot find name '(.+?)'/,
				description: 'Variable or function not defined',
				commonFix: 'Import the missing symbol or declare it',
				learnedFrom: [],
				successRate: 0.85,
			},
			{
				id: 'ts-type-mismatch',
				pattern: /Type '(.+?)' is not assignable to type '(.+?)'/,
				description: 'Type mismatch',
				commonFix: 'Convert or cast to the correct type',
				learnedFrom: [],
				successRate: 0.75,
			},
			{
				id: 'ts-missing-return',
				pattern: /Function lacks ending return statement/,
				description: 'Missing return statement',
				commonFix: 'Add return statement or mark as void',
				learnedFrom: [],
				successRate: 0.9,
			},
			{
				id: 'js-undefined-property',
				pattern: /Cannot read property '(.+?)' of undefined/,
				description: 'Accessing property on undefined',
				commonFix: 'Add null check or optional chaining',
				learnedFrom: [],
				successRate: 0.8,
			},
			{
				id: 'async-missing-await',
				pattern: /Did you forget to use 'await'/,
				description: 'Missing await on Promise',
				commonFix: 'Add await keyword',
				learnedFrom: [],
				successRate: 0.95,
			},
		];
	}

	private async loadGridIgnore(): Promise<void> {
		try {
			if (!this.workspaceContextService) return;
			const workspace = (this.workspaceContextService as any).getWorkspace();
			if (!workspace.folders.length) return;

			const rootPath = workspace.folders[0].uri.fsPath || workspace.folders[0].uri.path;
			const sep = rootPath.includes('\\') ? '\\' : '/';
			const ignorePath = rootPath.endsWith(sep) ? `${rootPath}.gridignore` : `${rootPath}${sep}.gridignore`;

			try {
				const content = await (this.fileService as any).readFile(ignorePath);
				const expression: IExpression = {};
				content.split('\n').forEach((line: string) => {
					const trimmed = line.trim();
					if (trimmed && !trimmed.startsWith('#')) {
						expression[trimmed] = true;
					}
				});
				this.ignorePattern = parse(expression);

				// Cleanup currently monitored files
				this.monitoredFiles.forEach((file) => {
					if (this.isIgnored(file)) {
						this.stopMonitoring(file);
					}
				});
			} catch (e) {
				// .gridignore likely doesn't exist, which is fine
			}
		} catch (e) {
			console.error('Error loading .gridignore:', e);
		}
	}

	private isIgnored(filePath: string): boolean {
		return this.ignorePattern ? this.ignorePattern(filePath) : false;
	}

	public startMonitoring(filePath: string): void {
		if (this.isIgnored(filePath)) return;
		this.monitoredFiles.add(filePath);
		// Set up file watcher and diagnostic listener
		this.setupFileWatcher(filePath);
	}

	public stopMonitoring(filePath: string): void {
		this.monitoredFiles.delete(filePath);
	}

	public async detectBugs(filePath: string, code: string): Promise<DetectedBug[]> {
		if (this.isIgnored(filePath)) return [];

		// Get compiler/linter errors
		const diagnostics: any[] = await this.diagnosticsService.getDiagnostics(filePath);

		const bugs: DetectedBug[] = diagnostics.map((diag: any) => {
			const lines = code.split('\n');
			const startLine = diag.range.start.line;

			return {
				id: `${filePath}:${startLine}:${diag.code}:${Date.now()}`,
				filePath,
				line: startLine,
				column: diag.range.start.character,
				severity: diag.severity === 1 ? 'error' : diag.severity === 2 ? 'warning' : 'info',
				message: diag.message,
				code: diag.code?.toString() || 'unknown',
				stackTrace: undefined,
				context: {
					beforeCode: lines.slice(Math.max(0, startLine - 10), startLine).join('\n'),
					errorCode: lines[startLine] || '',
					afterCode: lines.slice(startLine + 1, Math.min(lines.length, startLine + 11)).join('\n'),
				},
				detectedAt: Date.now(),
			};
		});

		// Store bugs
		this.detectedBugs.set(filePath, bugs);
		this.stats.totalBugsDetected += bugs.length;
		this.updateTopErrorCodes(bugs);

		return bugs;
	}

	public async getSuggestedFixes(bug: DetectedBug): Promise<BugFix[]> {
		// Check if we have a known pattern
		const knownPattern = this.findMatchingPattern(bug);

		// Generate AI-powered fix suggestions
		const aiPrompt = this.buildFixPrompt(bug, knownPattern);
		const aiResponse: any = await this.llmService.sendMessage({
			messages: [
				{
					role: 'system',
					content: 'You are an expert debugging assistant. Analyze bugs and suggest precise fixes with code examples.',
				},
				{
					role: 'user',
					content: aiPrompt,
				},
			],
			temperature: 0.3, // Low temperature for consistent fixes
			maxTokens: 1000,
		});

		// Parse AI response into fix suggestions
		const fixes = this.parseFixSuggestions(aiResponse, bug);

		return fixes;
	}

	public async applyFix(fix: BugFix): Promise<boolean> {
		const startTime = Date.now();

		try {
			const bug = this.findBugById(fix.bugId);
			if (!bug) return false;

			// Read current file content
			const content: string = await this.fileService.readFile(bug.filePath);
			const lines = content.split('\n');

			// Apply main code change
			const { startLine, endLine, new: newCode } = fix.codeChange;
			lines.splice(startLine, endLine - startLine + 1, newCode);

			// Write back to file
			await this.fileService.writeFile(bug.filePath, lines.join('\n'));

			// Apply additional changes if any
			if (fix.additionalChanges) {
				for (const change of fix.additionalChanges) {
					await this.applyAdditionalChange(change);
				}
			}

			// Update stats
			this.stats.totalBugsFixed++;
			const fixTime = Date.now() - startTime;
			this.stats.averageFixTime =
				(this.stats.averageFixTime * (this.stats.totalBugsFixed - 1) + fixTime) / this.stats.totalBugsFixed;

			// Remove fixed bug
			this.removeBug(bug.id);

			return true;
		} catch (error) {
			// Fix application failed - return false to indicate failure
			return false;
		}
	}

	public learnFromFix(fix: BugFix, wasSuccessful: boolean): void {
		// Update pattern success rates
		const bug = this.findBugById(fix.bugId);
		if (!bug) return;

		const pattern = this.findMatchingPattern(bug);
		if (pattern) {
			// Update success rate
			const totalLearned = pattern.learnedFrom.length;
			const currentSuccesses = pattern.successRate * totalLearned;
			pattern.learnedFrom.push(bug.id);
			pattern.successRate = (currentSuccesses + (wasSuccessful ? 1 : 0)) / (totalLearned + 1);
		} else if (wasSuccessful) {
			// Create new pattern from successful fix
			this.createPatternFromFix(bug, fix);
		}
	}

	public getBugsForFile(filePath: string): DetectedBug[] {
		return this.detectedBugs.get(filePath) || [];
	}

	public getStats(): AutoDebugStats {
		return {
			...this.stats,
			errorPatterns: this.errorPatterns,
		};
	}

	public clearBugsForFile(filePath: string): void {
		this.detectedBugs.delete(filePath);
	}

	// Private helper methods

	private setupFileWatcher(filePath: string): void {
		// Implementation would hook into VS Code's file system watcher
		// and diagnostic change events
	}

	private findMatchingPattern(bug: DetectedBug): ErrorPattern | undefined {
		return this.errorPatterns.find((pattern) => pattern.pattern.test(bug.message));
	}

	private buildFixPrompt(bug: DetectedBug, knownPattern?: ErrorPattern): string {
		return `
Analyze this ${bug.severity} in ${bug.filePath} at line ${bug.line}:

**Error Message:** ${bug.message}
**Error Code:** ${bug.code}

**Code Context:**
\`\`\`
${bug.context.beforeCode}
>>> ${bug.context.errorCode} // ERROR HERE
${bug.context.afterCode}
\`\`\`

${knownPattern ? `**Known Pattern:** ${knownPattern.description}\n**Common Fix:** ${knownPattern.commonFix}\n**Success Rate:** ${(knownPattern.successRate * 100).toFixed(0)}%\n` : ''}

Please provide:
1. **Root Cause:** What's causing this error?
2. **Suggested Fix:** Exact code to fix it
3. **Confidence:** How confident are you (0-100%)?
4. **Impact:** Risk of breaking other code (low/medium/high)
5. **Explanation:** Why this fix works

Format your response as JSON:
{
  "confidence": 85,
  "description": "Brief description",
  "explanation": "Detailed explanation",
  "codeChange": {
    "old": "current code",
    "new": "fixed code",
    "startLine": ${bug.line},
    "endLine": ${bug.line}
  },
  "estimatedImpact": "low"
}
`;
	}

	private parseFixSuggestions(aiResponse: string, bug: DetectedBug): BugFix[] {
		try {
			// Extract JSON from AI response
			const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				throw new Error('No valid JSON in AI response');
			}

			const parsedFix = JSON.parse(jsonMatch[0]);

			return [
				{
					bugId: bug.id,
					confidence: parsedFix.confidence / 100,
					description: parsedFix.description,
					explanation: parsedFix.explanation,
					codeChange: parsedFix.codeChange,
					estimatedImpact: parsedFix.estimatedImpact,
					relatedErrors: parsedFix.relatedErrors,
				},
			];
		} catch (error) {
			// Failed to parse AI response - return empty array
			return [];
		}
	}

	private findBugById(bugId: string): DetectedBug | undefined {
		for (const bugs of this.detectedBugs.values()) {
			const bug = bugs.find((b) => b.id === bugId);
			if (bug) return bug;
		}
		return undefined;
	}

	private removeBug(bugId: string): void {
		for (const [filePath, bugs] of this.detectedBugs.entries()) {
			const filtered = bugs.filter((b) => b.id !== bugId);
			if (filtered.length < bugs.length) {
				this.detectedBugs.set(filePath, filtered);
				break;
			}
		}
	}

	private async applyAdditionalChange(change: any): Promise<void> {
		const content: string = await this.fileService.readFile(change.filePath);
		const lines = content.split('\n');
		const { startLine, endLine, new: newCode } = change.change;
		lines.splice(startLine, endLine - startLine + 1, newCode);
		await this.fileService.writeFile(change.filePath, lines.join('\n'));
	}

	private updateTopErrorCodes(bugs: DetectedBug[]): void {
		const codeCounts = new Map<string, number>();
		bugs.forEach((bug) => {
			codeCounts.set(bug.code, (codeCounts.get(bug.code) || 0) + 1);
		});

		this.stats.topErrorCodes = Array.from(codeCounts.entries())
			.map(([code, count]) => ({ code, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);
	}

	private createPatternFromFix(bug: DetectedBug, fix: BugFix): void {
		// Create a new error pattern from a successful fix
		const pattern: ErrorPattern = {
			id: `learned-${Date.now()}`,
			pattern: new RegExp(bug.message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), // Escape special chars
			description: fix.description,
			commonFix: fix.explanation,
			learnedFrom: [bug.id],
			successRate: 1.0,
		};

		this.errorPatterns.push(pattern);
	}
}
