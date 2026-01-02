/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Automated PR Review Service
 *
 * AI-powered code review for pull requests including:
 * - Automated code quality analysis
 * - Security vulnerability detection
 * - Performance suggestions
 * - Best practice recommendations
 * - Automated test suggestions
 */

export interface PRFile {
	path: string;
	additions: number;
	deletions: number;
	changes: number;
	patch: string; // Git diff patch
	status: 'added' | 'modified' | 'removed' | 'renamed';
}

export interface CodeReview {
	id: string;
	file: string;
	line: number;
	severity: 'critical' | 'major' | 'minor' | 'suggestion';
	category: 'security' | 'performance' | 'bug' | 'style' | 'test' | 'documentation';
	title: string;
	description: string;
	suggestion: string;
	codeSnippet: {
		old: string;
		new: string;
	};
	confidence: number; // 0-1
	autoFixable: boolean;
}

export interface PRAnalysis {
	prNumber: number;
	title: string;
	description: string;
	author: string;
	createdAt: number;
	files: PRFile[];
	reviews: CodeReview[];
	summary: {
		totalIssues: number;
		criticalIssues: number;
		majorIssues: number;
		minorIssues: number;
		suggestions: number;
		securityIssues: number;
		performanceIssues: number;
		testCoverage?: number;
		complexity?: number;
	};
	aiSummary: string; // AI-generated summary of changes
	recommendations: string[]; // High-level recommendations
	estimatedReviewTime: number; // minutes
}

export interface AutoFixResult {
	success: boolean;
	reviewId: string;
	appliedChanges: number;
	failedChanges: number;
	errors: string[];
}

export interface IPRReviewService {
	/**
	 * Analyze a pull request
	 */
	analyzePR(prNumber: number): Promise<PRAnalysis>;

	/**
	 * Get detailed review for a specific file
	 */
	reviewFile(filePath: string, patch: string): Promise<CodeReview[]>;

	/**
	 * Apply an automated fix
	 */
	applyFix(review: CodeReview): Promise<boolean>;

	/**
	 * Apply all auto-fixable reviews
	 */
	applyAllFixes(reviews: CodeReview[]): Promise<AutoFixResult>;

	/**
	 * Generate review comment for GitHub
	 */
	generateComment(reviews: CodeReview[]): string;

	/**
	 * Get PR analysis history
	 */
	getHistory(): PRAnalysis[];

	/**
	 * Export review as markdown
	 */
	exportReview(analysis: PRAnalysis): string;
}

export class PRReviewService implements IPRReviewService {
	private analysisHistory: PRAnalysis[] = [];

	constructor(
		private llmService: any,
		private gitService: any,
		private fileService: any
	) {}

	public async analyzePR(prNumber: number): Promise<PRAnalysis> {
		// Fetch PR data from Git
		const pr = await this.gitService.getPullRequest(prNumber);

		// Get file changes
		const files: PRFile[] = await this.gitService.getPRFiles(prNumber);

		// Analyze each file
		const allReviews: CodeReview[] = [];
		for (const file of files) {
			if (file.status !== 'removed') {
				const fileReviews = await this.reviewFile(file.path, file.patch);
				allReviews.push(...fileReviews);
			}
		}

		// Generate AI summary
		const aiSummary = await this.generateAISummary(pr, files, allReviews);

		// Calculate summary stats
		const summary = {
			totalIssues: allReviews.length,
			criticalIssues: allReviews.filter((r) => r.severity === 'critical').length,
			majorIssues: allReviews.filter((r) => r.severity === 'major').length,
			minorIssues: allReviews.filter((r) => r.severity === 'minor').length,
			suggestions: allReviews.filter((r) => r.severity === 'suggestion').length,
			securityIssues: allReviews.filter((r) => r.category === 'security').length,
			performanceIssues: allReviews.filter((r) => r.category === 'performance').length,
			testCoverage: this.calculateTestCoverage(files),
			complexity: this.calculateComplexity(files),
		};

		// Generate recommendations
		const recommendations = this.generateRecommendations(allReviews, files);

		// Estimate review time
		const estimatedReviewTime = this.estimateReviewTime(files, allReviews);

		const analysis: PRAnalysis = {
			prNumber,
			title: pr.title,
			description: pr.description,
			author: pr.author,
			createdAt: pr.createdAt,
			files,
			reviews: allReviews,
			summary,
			aiSummary,
			recommendations,
			estimatedReviewTime,
		};

		// Store in history
		this.analysisHistory.push(analysis);

		return analysis;
	}

	public async reviewFile(filePath: string, patch: string): Promise<CodeReview[]> {
		const reviews: CodeReview[] = [];

		// Parse patch to get changed lines
		const changes = this.parsePatch(patch);

		// Run static analysis
		const staticReviews = await this.runStaticAnalysis(filePath, changes);
		reviews.push(...staticReviews);

		// Run AI review
		const aiReviews = await this.runAIReview(filePath, changes);
		reviews.push(...aiReviews);

		// Check security
		const securityReviews = await this.checkSecurity(filePath, changes);
		reviews.push(...securityReviews);

		// Check performance
		const performanceReviews = await this.checkPerformance(filePath, changes);
		reviews.push(...performanceReviews);

		return reviews;
	}

	public async applyFix(review: CodeReview): Promise<boolean> {
		if (!review.autoFixable) {
			return false;
		}

		try {
			// Read file
			const content = await this.fileService.readFile(review.file);
			const lines = content.split('\n');

			// Apply fix (replace old code with new code)
			const lineIndex = review.line - 1;
			if (review.codeSnippet.old === lines[lineIndex]?.trim()) {
				lines[lineIndex] = review.codeSnippet.new;

				// Write back
				await this.fileService.writeFile(review.file, lines.join('\n'));
				return true;
			}

			return false;
		} catch (error) {
			console.error('Failed to apply fix:', error);
			return false;
		}
	}

	public async applyAllFixes(reviews: CodeReview[]): Promise<AutoFixResult> {
		const fixable = reviews.filter((r) => r.autoFixable);
		let applied = 0;
		let failed = 0;
		const errors: string[] = [];

		for (const review of fixable) {
			const success = await this.applyFix(review);
			if (success) {
				applied++;
			} else {
				failed++;
				errors.push(`Failed to fix: ${review.title} in ${review.file}:${review.line}`);
			}
		}

		return {
			success: failed === 0,
			reviewId: 'batch',
			appliedChanges: applied,
			failedChanges: failed,
			errors,
		};
	}

	public generateComment(reviews: CodeReview[]): string {
		const grouped = this.groupReviewsByCategory(reviews);
		let comment = '## 🤖 AI Code Review\n\n';

		// Summary
		const critical = reviews.filter((r) => r.severity === 'critical').length;
		const major = reviews.filter((r) => r.severity === 'major').length;
		const minor = reviews.filter((r) => r.severity === 'minor').length;

		comment += '### Summary\n\n';
		comment += `- 🔴 **${critical}** critical issues\n`;
		comment += `- 🟡 **${major}** major issues\n`;
		comment += `- 🔵 **${minor}** minor issues\n\n`;

		// Grouped reviews
		for (const [category, categoryReviews] of Object.entries(grouped)) {
			if (categoryReviews.length === 0) {continue;}

			comment += `### ${this.getCategoryEmoji(category as any)} ${this.getCategoryTitle(category as any)}\n\n`;

			for (const review of categoryReviews.slice(0, 5)) {
				// Limit to 5 per category
				comment += `**${review.title}** (${review.file}:${review.line})\n`;
				comment += `${review.description}\n\n`;
				if (review.suggestion) {
					comment += `💡 **Suggestion:** ${review.suggestion}\n\n`;
				}
				if (review.codeSnippet.new) {
					comment += '```diff\n';
					comment += `- ${review.codeSnippet.old}\n`;
					comment += `+ ${review.codeSnippet.new}\n`;
					comment += '```\n\n';
				}
				comment += '---\n\n';
			}
		}

		return comment;
	}

	public getHistory(): PRAnalysis[] {
		return this.analysisHistory;
	}

	public exportReview(analysis: PRAnalysis): string {
		let markdown = `# PR Review: ${analysis.title}\n\n`;
		markdown += `**Author:** ${analysis.author}\n`;
		markdown += `**Created:** ${new Date(analysis.createdAt).toLocaleString()}\n`;
		markdown += `**Files Changed:** ${analysis.files.length}\n\n`;

		markdown += `## Summary\n\n`;
		markdown += `${analysis.aiSummary}\n\n`;

		markdown += `## Statistics\n\n`;
		markdown += `- Total Issues: ${analysis.summary.totalIssues}\n`;
		markdown += `- Critical: ${analysis.summary.criticalIssues}\n`;
		markdown += `- Major: ${analysis.summary.majorIssues}\n`;
		markdown += `- Minor: ${analysis.summary.minorIssues}\n`;
		markdown += `- Security Issues: ${analysis.summary.securityIssues}\n`;
		markdown += `- Performance Issues: ${analysis.summary.performanceIssues}\n\n`;

		if (analysis.recommendations.length > 0) {
			markdown += `## Recommendations\n\n`;
			analysis.recommendations.forEach((rec) => {
				markdown += `- ${rec}\n`;
			});
			markdown += '\n';
		}

		markdown += `## Detailed Reviews\n\n`;
		const grouped = this.groupReviewsByFile(analysis.reviews);
		for (const [file, reviews] of Object.entries(grouped)) {
			markdown += `### ${file}\n\n`;
			reviews.forEach((review) => {
				markdown += `#### ${review.title} (Line ${review.line})\n\n`;
				markdown += `**Severity:** ${review.severity} | **Category:** ${review.category}\n\n`;
				markdown += `${review.description}\n\n`;
				if (review.suggestion) {
					markdown += `**Suggestion:** ${review.suggestion}\n\n`;
				}
			});
		}

		return markdown;
	}

	// Private helper methods

	private async generateAISummary(pr: any, files: PRFile[], reviews: CodeReview[]): Promise<string> {
		const prompt = `
Analyze this pull request and provide a concise summary:

**Title:** ${pr.title}
**Description:** ${pr.description}
**Files Changed:** ${files.length}
**Total Changes:** +${files.reduce((sum, f) => sum + f.additions, 0)} -${files.reduce((sum, f) => sum + f.deletions, 0)}

**Issues Found:** ${reviews.length}
- Critical: ${reviews.filter((r) => r.severity === 'critical').length}
- Security: ${reviews.filter((r) => r.category === 'security').length}
- Performance: ${reviews.filter((r) => r.category === 'performance').length}

Provide a 2-3 sentence summary of what this PR does and any concerns.
`;

		const response = await this.llmService.sendMessage({
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.3,
			maxTokens: 200,
		});

		return response.content;
	}

	private parsePatch(patch: string): Array<{ line: number; content: string; type: 'add' | 'remove' }> {
		const changes: Array<{ line: number; content: string; type: 'add' | 'remove' }> = [];
		const lines = patch.split('\n');
		let currentLine = 0;

		for (const line of lines) {
			if (line.startsWith('@@')) {
				// Parse line number from diff header
				const match = line.match(/\+(\d+)/);
				if (match) {
					currentLine = parseInt(match[1], 10);
				}
			} else if (line.startsWith('+') && !line.startsWith('+++')) {
				changes.push({ line: currentLine, content: line.slice(1), type: 'add' });
				currentLine++;
			} else if (line.startsWith('-') && !line.startsWith('---')) {
				changes.push({ line: currentLine, content: line.slice(1), type: 'remove' });
			} else {
				currentLine++;
			}
		}

		return changes;
	}

	private async runStaticAnalysis(filePath: string, changes: any[]): Promise<CodeReview[]> {
		// Run linters/static analysis tools
		// This would integrate with ESLint, TSLint, etc.
		return [];
	}

	private async runAIReview(filePath: string, changes: any[]): Promise<CodeReview[]> {
		// Use AI to review code changes
		const reviews: CodeReview[] = [];

		for (const change of changes.filter((c) => c.type === 'add')) {
			const review = await this.analyzeCodeLine(filePath, change.line, change.content);
			if (review) {
				reviews.push(review);
			}
		}

		return reviews;
	}

	private async analyzeCodeLine(filePath: string, line: number, code: string): Promise<CodeReview | null> {
		// AI analysis of individual code line
		// Returns null if no issues found
		return null;
	}

	private async checkSecurity(filePath: string, changes: any[]): Promise<CodeReview[]> {
		const reviews: CodeReview[] = [];

		for (const change of changes.filter((c) => c.type === 'add')) {
			// Check for common security issues
			if (change.content.includes('eval(')) {
				reviews.push({
					id: `sec-${Date.now()}`,
					file: filePath,
					line: change.line,
					severity: 'critical',
					category: 'security',
					title: 'Use of eval() detected',
					description: 'eval() can execute arbitrary code and is a security risk',
					suggestion: 'Avoid using eval(). Consider using JSON.parse() or Function constructor with proper validation.',
					codeSnippet: {
						old: change.content,
						new: change.content.replace('eval(', 'JSON.parse('),
					},
					confidence: 0.95,
					autoFixable: false,
				});
			}

			// SQL injection check
			if (change.content.match(/query\s*=\s*["`'].*\+/)) {
				reviews.push({
					id: `sec-${Date.now()}`,
					file: filePath,
					line: change.line,
					severity: 'critical',
					category: 'security',
					title: 'Potential SQL injection vulnerability',
					description: 'String concatenation in SQL queries can lead to SQL injection',
					suggestion: 'Use parameterized queries or prepared statements',
					codeSnippet: {
						old: change.content,
						new: 'Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])',
					},
					confidence: 0.85,
					autoFixable: false,
				});
			}
		}

		return reviews;
	}

	private async checkPerformance(filePath: string, changes: any[]): Promise<CodeReview[]> {
		const reviews: CodeReview[] = [];

		for (const change of changes.filter((c) => c.type === 'add')) {
			// Check for performance issues
			if (change.content.includes('for') && change.content.includes('.push(')) {
				reviews.push({
					id: `perf-${Date.now()}`,
					file: filePath,
					line: change.line,
					severity: 'minor',
					category: 'performance',
					title: 'Consider using array map instead of push in loop',
					description: 'Using map is more functional and often clearer',
					suggestion: 'Use array.map() for transformations',
					codeSnippet: {
						old: change.content,
						new: 'const result = array.map(item => transform(item))',
					},
					confidence: 0.7,
					autoFixable: false,
				});
			}
		}

		return reviews;
	}

	private calculateTestCoverage(files: PRFile[]): number {
		const testFiles = files.filter((f) => f.path.includes('.test.') || f.path.includes('.spec.'));
		return testFiles.length / Math.max(files.length, 1);
	}

	private calculateComplexity(files: PRFile[]): number {
		// Simplified complexity calculation
		return files.reduce((sum, f) => sum + f.changes, 0);
	}

	private generateRecommendations(reviews: CodeReview[], files: PRFile[]): string[] {
		const recommendations: string[] = [];

		if (reviews.filter((r) => r.category === 'test').length === 0 && files.length > 3) {
			recommendations.push('Consider adding unit tests for the new functionality');
		}

		if (reviews.filter((r) => r.category === 'security').length > 0) {
			recommendations.push('Address security issues before merging');
		}

		if (reviews.filter((r) => r.severity === 'critical').length > 0) {
			recommendations.push('Fix all critical issues before requesting review');
		}

		return recommendations;
	}

	private estimateReviewTime(files: PRFile[], reviews: CodeReview[]): number {
		// Estimate in minutes
		const baseTime = 5; // 5 min base
		const fileTime = files.length * 2; // 2 min per file
		const issueTime = reviews.length * 1; // 1 min per issue
		return baseTime + fileTime + issueTime;
	}

	private groupReviewsByCategory(reviews: CodeReview[]): Record<string, CodeReview[]> {
		const grouped: Record<string, CodeReview[]> = {
			security: [],
			performance: [],
			bug: [],
			style: [],
			test: [],
			documentation: [],
		};

		reviews.forEach((review) => {
			grouped[review.category].push(review);
		});

		return grouped;
	}

	private groupReviewsByFile(reviews: CodeReview[]): Record<string, CodeReview[]> {
		const grouped: Record<string, CodeReview[]> = {};

		reviews.forEach((review) => {
			if (!grouped[review.file]) {
				grouped[review.file] = [];
			}
			grouped[review.file].push(review);
		});

		return grouped;
	}

	private getCategoryEmoji(category: CodeReview['category']): string {
		const emojis = {
			security: '🔒',
			performance: '⚡',
			bug: '🐛',
			style: '🎨',
			test: '✅',
			documentation: '📝',
		};
		return emojis[category] || '💡';
	}

	private getCategoryTitle(category: CodeReview['category']): string {
		const titles = {
			security: 'Security',
			performance: 'Performance',
			bug: 'Potential Bugs',
			style: 'Code Style',
			test: 'Testing',
			documentation: 'Documentation',
		};
		return titles[category] || 'Other';
	}
}
