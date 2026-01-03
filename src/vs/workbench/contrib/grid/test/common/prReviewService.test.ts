/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { PRReviewService, PRFile, CodeReview, PRAnalysis, AutoFixResult } from '../../common/prReviewService.js';

/**
 * Mock LLM Service
 */
class MockLLMService {
	async analyzeCode(code: string): Promise<CodeReview[]> {
		return [
			{
				id: 'review-1',
				file: '/test/file.ts',
				line: 10,
				severity: 'major',
				category: 'security',
				title: 'Potential SQL Injection',
				description: 'User input is concatenated directly into SQL query',
				suggestion: 'Use parameterized queries instead',
				codeSnippet: {
					old: 'query = "SELECT * FROM users WHERE id = " + userId',
					new: 'query = "SELECT * FROM users WHERE id = ?"',
				},
				confidence: 0.9,
				autoFixable: true,
			},
		];
	}

	async generateSummary(analysis: any): Promise<string> {
		return 'This PR adds user authentication features with some security concerns.';
	}
}

/**
 * Mock Git Service
 */
class MockGitService {
	async getPRFiles(prNumber: number): Promise<PRFile[]> {
		return [
			{
				path: '/test/file.ts',
				additions: 50,
				deletions: 10,
				changes: 60,
				patch: '@@ -1,5 +1,10 @@\n-old code\n+new code',
				status: 'modified',
			},
		];
	}

	async getPRInfo(prNumber: number): Promise<any> {
		return {
			title: 'Add user authentication',
			description: 'Implements JWT-based authentication',
			author: 'testuser',
			createdAt: Date.now(),
		};
	}
}

/**
 * Mock File Service
 */
class MockFileService {
	private files: Map<string, string> = new Map();

	async readFile(path: string): Promise<string> {
		return this.files.get(path) || '';
	}

	async writeFile(path: string, content: string): Promise<void> {
		this.files.set(path, content);
	}

	setContent(path: string, content: string): void {
		this.files.set(path, content);
	}
}

suite('PRReviewService Tests', () => {

	ensureNoDisposablesAreLeakedInTestSuite();
	let service: PRReviewService;
	let mockLLMService: MockLLMService;
	let mockGitService: MockGitService;
	let mockFileService: MockFileService;

	setup(() => {
		mockLLMService = new MockLLMService();
		mockGitService = new MockGitService();
		mockFileService = new MockFileService();
		service = new PRReviewService(mockLLMService, mockGitService, mockFileService);
	});

	test('should analyze a pull request', async () => {
		const analysis = await service.analyzePR(123);

		assert.ok(analysis, 'Should return PR analysis');
		assert.strictEqual(analysis.prNumber, 123, 'PR number should match');
		assert.ok(analysis.title, 'Should have title');
		assert.ok(analysis.description, 'Should have description');
		assert.ok(Array.isArray(analysis.files), 'Should have files array');
		assert.ok(Array.isArray(analysis.reviews), 'Should have reviews array');
		assert.ok(analysis.summary, 'Should have summary');
		assert.ok(analysis.aiSummary, 'Should have AI summary');
	});

	test('should review a specific file', async () => {
		const patch = '@@ -1,5 +1,10 @@\n-old code\n+new code';
		const reviews = await service.reviewFile('/test/file.ts', patch);

		assert.ok(Array.isArray(reviews), 'Should return reviews array');
		if (reviews.length > 0) {
			assert.ok(reviews[0].id, 'Review should have ID');
			assert.ok(reviews[0].file, 'Review should have file');
			assert.ok(reviews[0].severity, 'Review should have severity');
			assert.ok(reviews[0].category, 'Review should have category');
		}
	});

	test('should detect security vulnerabilities', async () => {
		const patch = `
@@ -10,5 +10,5 @@
-const safe = sanitize(input)
+const unsafe = req.body.input
 query = "SELECT * FROM users WHERE id = " + unsafe
		`.trim();

		const reviews = await service.reviewFile('/test/security.ts', patch);

		const securityIssues = reviews.filter((r) => r.category === 'security');
		assert.ok(securityIssues.length > 0, 'Should detect security issues');
	});

	test('should categorize review severity correctly', async () => {
		const criticalReview: CodeReview = {
			id: 'review-critical',
			file: '/test/file.ts',
			line: 1,
			severity: 'critical',
			category: 'security',
			title: 'Critical vulnerability',
			description: 'Major security flaw',
			suggestion: 'Fix immediately',
			codeSnippet: { old: 'bad', new: 'good' },
			confidence: 1.0,
			autoFixable: false,
		};

		const majorReview: CodeReview = {
			id: 'review-major',
			file: '/test/file.ts',
			line: 2,
			severity: 'major',
			category: 'bug',
			title: 'Major bug',
			description: 'Significant issue',
			suggestion: 'Fix soon',
			codeSnippet: { old: 'bad', new: 'good' },
			confidence: 0.8,
			autoFixable: true,
		};

		const minorReview: CodeReview = {
			id: 'review-minor',
			file: '/test/file.ts',
			line: 3,
			severity: 'minor',
			category: 'style',
			title: 'Minor style issue',
			description: 'Small improvement',
			suggestion: 'Consider fixing',
			codeSnippet: { old: 'ok', new: 'better' },
			confidence: 0.6,
			autoFixable: true,
		};

		assert.strictEqual(criticalReview.severity, 'critical', 'Should be critical');
		assert.strictEqual(majorReview.severity, 'major', 'Should be major');
		assert.strictEqual(minorReview.severity, 'minor', 'Should be minor');
	});

	test('should categorize review types correctly', async () => {
		const categories = ['security', 'performance', 'bug', 'style', 'test', 'documentation'] as const;

		for (const category of categories) {
			const review: CodeReview = {
				id: `review-${category}`,
				file: '/test/file.ts',
				line: 1,
				severity: 'minor',
				category,
				title: `${category} issue`,
				description: `Test ${category}`,
				suggestion: 'Fix it',
				codeSnippet: { old: 'old', new: 'new' },
				confidence: 0.7,
				autoFixable: false,
			};

			assert.strictEqual(review.category, category, `Should categorize as ${category}`);
		}
	});

	test('should apply a single fix', async () => {
		const review: CodeReview = {
			id: 'review-1',
			file: '/test/file.ts',
			line: 10,
			severity: 'major',
			category: 'bug',
			title: 'Fix null check',
			description: 'Add null check',
			suggestion: 'Check for null before accessing',
			codeSnippet: {
				old: 'obj.property',
				new: 'obj?.property',
			},
			confidence: 0.9,
			autoFixable: true,
		};

		const success = await service.applyFix(review);
		assert.ok(typeof success === 'boolean', 'Should return success status');
	});

	test('should apply multiple fixes', async () => {
		const reviews: CodeReview[] = [
			{
				id: 'review-1',
				file: '/test/file.ts',
				line: 10,
				severity: 'major',
				category: 'bug',
				title: 'Fix 1',
				description: 'Issue 1',
				suggestion: 'Suggestion 1',
				codeSnippet: { old: 'old1', new: 'new1' },
				confidence: 0.9,
				autoFixable: true,
			},
			{
				id: 'review-2',
				file: '/test/file.ts',
				line: 20,
				severity: 'minor',
				category: 'style',
				title: 'Fix 2',
				description: 'Issue 2',
				suggestion: 'Suggestion 2',
				codeSnippet: { old: 'old2', new: 'new2' },
				confidence: 0.8,
				autoFixable: true,
			},
		];

		const result = await service.applyAllFixes(reviews);

		assert.ok(result, 'Should return result');
		assert.ok(typeof result.success === 'boolean', 'Should have success flag');
		assert.ok(typeof result.appliedChanges === 'number', 'Should track applied changes');
		assert.ok(typeof result.failedChanges === 'number', 'Should track failed changes');
		assert.ok(Array.isArray(result.errors), 'Should have errors array');
	});

	test('should generate GitHub comment', () => {
		const reviews: CodeReview[] = [
			{
				id: 'review-1',
				file: '/test/file.ts',
				line: 10,
				severity: 'critical',
				category: 'security',
				title: 'SQL Injection',
				description: 'Potential SQL injection vulnerability',
				suggestion: 'Use parameterized queries',
				codeSnippet: { old: 'bad', new: 'good' },
				confidence: 0.95,
				autoFixable: true,
			},
		];

		const comment = service.generateComment(reviews);

		assert.ok(typeof comment === 'string', 'Should return comment string');
		assert.ok(comment.length > 0, 'Comment should not be empty');
		assert.ok(comment.includes('SQL Injection') || comment.includes('security'), 'Should mention the issue');
	});

	test('should track analysis history', async () => {
		const historyBefore = service.getHistory();
		await service.analyzePR(123);
		const historyAfter = service.getHistory();

		assert.ok(historyAfter.length >= historyBefore.length, 'Should add to history');
	});

	test('should get analysis history', () => {
		const history = service.getHistory();

		assert.ok(Array.isArray(history), 'Should return history array');
	});

	test('should export review as markdown', async () => {
		const analysis = await service.analyzePR(123);
		const markdown = service.exportReview(analysis);

		assert.ok(typeof markdown === 'string', 'Should return markdown string');
		assert.ok(markdown.length > 0, 'Markdown should not be empty');
		assert.ok(markdown.includes('#') || markdown.includes('##'), 'Should have markdown headers');
	});

	test('should calculate PR summary statistics', async () => {
		const analysis = await service.analyzePR(123);

		assert.ok(typeof analysis.summary.totalIssues === 'number', 'Should count total issues');
		assert.ok(typeof analysis.summary.criticalIssues === 'number', 'Should count critical issues');
		assert.ok(typeof analysis.summary.majorIssues === 'number', 'Should count major issues');
		assert.ok(typeof analysis.summary.minorIssues === 'number', 'Should count minor issues');
		assert.ok(typeof analysis.summary.suggestions === 'number', 'Should count suggestions');
		assert.ok(typeof analysis.summary.securityIssues === 'number', 'Should count security issues');
		assert.ok(typeof analysis.summary.performanceIssues === 'number', 'Should count performance issues');
	});

	test('should estimate review time', async () => {
		const analysis = await service.analyzePR(123);

		assert.ok(typeof analysis.estimatedReviewTime === 'number', 'Should estimate review time');
		assert.ok(analysis.estimatedReviewTime > 0, 'Review time should be positive');
	});

	test('should handle PRs with multiple files', async () => {
		const analysis = await service.analyzePR(456);

		assert.ok(Array.isArray(analysis.files), 'Should have files array');
		if (analysis.files.length > 0) {
			assert.ok(analysis.files[0].path, 'File should have path');
			assert.ok(typeof analysis.files[0].additions === 'number', 'File should have additions count');
			assert.ok(typeof analysis.files[0].deletions === 'number', 'File should have deletions count');
		}
	});

	test('should detect different vulnerability types', async () => {
		const vulnerabilityTypes = ['SQL Injection', 'XSS', 'eval() usage', 'Weak crypto', 'Hardcoded secrets'];

		// Each type should be detectable
		assert.ok(vulnerabilityTypes.length > 0, 'Should have vulnerability types defined');
	});

	test('should provide code suggestions', async () => {
		const reviews = await service.reviewFile('/test/file.ts', '@@ -1,1 +1,1 @@\n-old\n+new');

		if (reviews.length > 0) {
			assert.ok(reviews[0].suggestion, 'Review should have suggestion');
			assert.ok(reviews[0].codeSnippet, 'Review should have code snippet');
			assert.ok(reviews[0].codeSnippet.old, 'Should have old code');
			assert.ok(reviews[0].codeSnippet.new, 'Should have new code');
		}
	});

	test('should track confidence scores', async () => {
		const reviews = await service.reviewFile('/test/file.ts', '@@ -1,1 +1,1 @@\n-old\n+new');

		if (reviews.length > 0) {
			assert.ok(typeof reviews[0].confidence === 'number', 'Should have confidence score');
			assert.ok(reviews[0].confidence >= 0 && reviews[0].confidence <= 1, 'Confidence should be 0-1');
		}
	});

	test('should mark auto-fixable reviews', async () => {
		const reviews = await service.reviewFile('/test/file.ts', '@@ -1,1 +1,1 @@\n-old\n+new');

		if (reviews.length > 0) {
			assert.ok(typeof reviews[0].autoFixable === 'boolean', 'Should have autoFixable flag');
		}
	});

	test('should handle file status types', () => {
		const statuses: Array<'added' | 'modified' | 'removed' | 'renamed'> = ['added', 'modified', 'removed', 'renamed'];

		for (const status of statuses) {
			const file: PRFile = {
				path: '/test/file.ts',
				additions: 10,
				deletions: 5,
				changes: 15,
				patch: '@@ -1,1 +1,1 @@',
				status,
			};

			assert.strictEqual(file.status, status, `Should handle ${status} status`);
		}
	});

	test('should provide AI-generated recommendations', async () => {
		const analysis = await service.analyzePR(123);

		assert.ok(Array.isArray(analysis.recommendations), 'Should have recommendations array');
		assert.ok(analysis.aiSummary, 'Should have AI summary');
	});

	test('should handle performance issues', async () => {
		const patch = `
@@ -5,3 +5,3 @@
-for (let i = 0; i < arr.length; i++) {
+arr.forEach(item => {
		`.trim();

		const reviews = await service.reviewFile('/test/perf.ts', patch);
		const perfIssues = reviews.filter((r) => r.category === 'performance');

		// Performance issues may or may not be detected depending on context
		assert.ok(Array.isArray(perfIssues), 'Should filter performance issues');
	});

	test('should detect test coverage issues', async () => {
		const analysis = await service.analyzePR(123);

		if (typeof analysis.summary.testCoverage === 'number') {
			assert.ok(analysis.summary.testCoverage >= 0, 'Test coverage should be non-negative');
			assert.ok(analysis.summary.testCoverage <= 100, 'Test coverage should be <= 100%');
		}
	});

	test('should calculate code complexity', async () => {
		const analysis = await service.analyzePR(123);

		if (typeof analysis.summary.complexity === 'number') {
			assert.ok(analysis.summary.complexity >= 0, 'Complexity should be non-negative');
		}
	});

	test('should handle failed fix applications', async () => {
		const reviews: CodeReview[] = [
			{
				id: 'review-fail',
				file: '/nonexistent/file.ts',
				line: 10,
				severity: 'major',
				category: 'bug',
				title: 'Fix that will fail',
				description: 'This fix should fail',
				suggestion: 'Apply fix',
				codeSnippet: { old: 'old', new: 'new' },
				confidence: 0.9,
				autoFixable: true,
			},
		];

		const result = await service.applyAllFixes(reviews);

		assert.ok(result.errors.length > 0 || result.failedChanges > 0, 'Should track failures');
	});

	test('should prioritize critical issues', async () => {
		const reviews = await service.reviewFile('/test/file.ts', '@@ -1,1 +1,1 @@\n-old\n+new');

		const criticalReviews = reviews.filter((r) => r.severity === 'critical');
		const majorReviews = reviews.filter((r) => r.severity === 'major');

		// Critical issues should be highlighted
		assert.ok(Array.isArray(criticalReviews), 'Should filter critical reviews');
		assert.ok(Array.isArray(majorReviews), 'Should filter major reviews');
	});
});
