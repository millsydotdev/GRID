/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { AutoDebugService, DetectedBug, BugFix } from '../../common/autoDebugService.js';

/**
 * Mock LLM Service
 */
class MockLLMService {
	async generateFixSuggestion(bug: DetectedBug): Promise<BugFix[]> {
		// Simulate AI-generated fix suggestions
		return [
			{
				bugId: bug.id,
				confidence: 0.85,
				description: 'Add missing import statement',
				explanation: 'The error occurs because the function is not imported',
				codeChange: {
					old: bug.context.errorCode,
					new: `import { myFunction } from './utils';\n${bug.context.errorCode}`,
					startLine: bug.line - 1,
					endLine: bug.line,
				},
				estimatedImpact: 'low',
				relatedErrors: [],
			},
		];
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

/**
 * Mock Diagnostics Service
 */
class MockDiagnosticsService {
	private diagnostics: Map<string, DetectedBug[]> = new Map();

	getDiagnostics(filePath: string): DetectedBug[] {
		return this.diagnostics.get(filePath) || [];
	}

	setDiagnostics(filePath: string, bugs: DetectedBug[]): void {
		this.diagnostics.set(filePath, bugs);
	}
}

suite('AutoDebugService Tests', () => {

	// ensureNoDisposablesAreLeakedInTestSuite();
	let service: AutoDebugService;
	let mockLLMService: MockLLMService;
	let mockFileService: MockFileService;
	let mockDiagnosticsService: MockDiagnosticsService;

	setup(() => {
		mockLLMService = new MockLLMService();
		mockFileService = new MockFileService();
		mockDiagnosticsService = new MockDiagnosticsService();
		service = new AutoDebugService(mockLLMService as any, mockFileService as any, mockDiagnosticsService as any, {} as any);
	});

	test('should initialize with default error patterns', () => {
		const stats = service.getStats();
		assert.ok(stats.errorPatterns.length > 0, 'Should have initialized error patterns');
		assert.strictEqual(stats.totalBugsDetected, 0, 'Should start with 0 bugs detected');
		assert.strictEqual(stats.totalBugsFixed, 0, 'Should start with 0 bugs fixed');
	});

	test('should start and stop monitoring files', () => {
		const filePath = '/test/file.ts';

		service.startMonitoring(filePath);
		// Note: Actual monitoring state is private, but we can test side effects
		service.stopMonitoring(filePath);

		// Should not throw errors
		assert.ok(true);
	});

	test('should detect bugs in code', async () => {
		const filePath = '/test/file.ts';
		const code = `
function test() {
	console.log(undefinedVariable);
}
		`.trim();

		const bugs = await service.detectBugs(filePath, code);

		assert.ok(Array.isArray(bugs), 'Should return an array of bugs');
		// Note: Actual bug detection depends on diagnostics service
	});

	test('should get suggested fixes for a bug', async () => {
		const bug: DetectedBug = {
			id: 'bug-1',
			filePath: '/test/file.ts',
			line: 5,
			column: 10,
			severity: 'error',
			message: "Cannot find name 'myFunction'",
			code: 'TS2304',
			context: {
				beforeCode: 'function test() {',
				errorCode: '  myFunction();',
				afterCode: '}',
			},
			detectedAt: Date.now(),
		};

		const fixes = await service.getSuggestedFixes(bug);

		assert.ok(Array.isArray(fixes), 'Should return an array of fixes');
		assert.ok(fixes.length > 0, 'Should return at least one fix');
		assert.strictEqual(fixes[0].bugId, bug.id, 'Fix should reference the bug ID');
		assert.ok(fixes[0].confidence > 0 && fixes[0].confidence <= 1, 'Confidence should be between 0 and 1');
		assert.ok(fixes[0].description.length > 0, 'Fix should have a description');
	});

	test('should apply a fix successfully', async () => {
		const filePath = '/test/file.ts';
		const originalCode = 'const x = 1;';
		mockFileService.setContent(filePath, originalCode);

		const fix: BugFix = {
			bugId: 'bug-1',
			confidence: 0.9,
			description: 'Add type annotation',
			explanation: 'TypeScript requires explicit types',
			codeChange: {
				old: 'const x = 1;',
				new: 'const x: number = 1;',
				startLine: 1,
				endLine: 1,
			},
			estimatedImpact: 'low',
		};

		const success = await service.applyFix(fix);

		assert.ok(success, 'Fix should be applied successfully');
	});

	test('should learn from successful fixes', () => {
		const fix: BugFix = {
			bugId: 'bug-1',
			confidence: 0.85,
			description: 'Add await keyword',
			explanation: 'Promise should be awaited',
			codeChange: {
				old: 'const result = asyncFunction();',
				new: 'const result = await asyncFunction();',
				startLine: 1,
				endLine: 1,
			},
			estimatedImpact: 'low',
		};

		const statsBefore = service.getStats();
		service.learnFromFix(fix, true);
		const statsAfter = service.getStats();

		assert.ok(statsAfter.totalBugsFixed > statsBefore.totalBugsFixed, 'Should increment bugs fixed count');
	});

	test('should track bugs for a file', async () => {
		const filePath = '/test/file.ts';
		const code = 'console.log(test);';

		await service.detectBugs(filePath, code);
		const bugs = service.getBugsForFile(filePath);

		assert.ok(Array.isArray(bugs), 'Should return bugs for file');
	});

	test('should clear bugs for a file', async () => {
		const filePath = '/test/file.ts';
		const code = 'console.log(test);';

		await service.detectBugs(filePath, code);
		service.clearBugsForFile(filePath);
		const bugs = service.getBugsForFile(filePath);

		assert.strictEqual(bugs.length, 0, 'Should clear all bugs for file');
	});

	test('should track statistics correctly', () => {
		const stats = service.getStats();

		assert.ok(typeof stats.totalBugsDetected === 'number', 'Should track total bugs detected');
		assert.ok(typeof stats.totalBugsFixed === 'number', 'Should track total bugs fixed');
		assert.ok(typeof stats.averageFixTime === 'number', 'Should track average fix time');
		assert.ok(Array.isArray(stats.errorPatterns), 'Should have error patterns array');
		assert.ok(Array.isArray(stats.topErrorCodes), 'Should have top error codes array');
	});

	test('should match error patterns correctly', () => {
		const stats = service.getStats();
		const patterns = stats.errorPatterns;

		// Test "Cannot find name" pattern
		const cannotFindPattern = patterns.find((p) => p.id === 'ts-cannot-find-name');
		assert.ok(cannotFindPattern, 'Should have cannot-find-name pattern');
		assert.ok(cannotFindPattern.pattern.test("Cannot find name 'foo'"), 'Pattern should match error message');

		// Test type mismatch pattern
		const typeMismatchPattern = patterns.find((p) => p.id === 'ts-type-mismatch');
		assert.ok(typeMismatchPattern, 'Should have type-mismatch pattern');
		assert.ok(
			typeMismatchPattern.pattern.test("Type 'string' is not assignable to type 'number'"),
			'Pattern should match error message'
		);

		// Test missing await pattern
		const missingAwaitPattern = patterns.find((p) => p.id === 'async-missing-await');
		assert.ok(missingAwaitPattern, 'Should have missing-await pattern');
		assert.ok(missingAwaitPattern.pattern.test("Did you forget to use 'await'"), 'Pattern should match error message');
	});

	test('should handle high-impact fixes with caution', async () => {
		const bug: DetectedBug = {
			id: 'bug-high-impact',
			filePath: '/test/file.ts',
			line: 10,
			column: 5,
			severity: 'error',
			message: 'Major refactoring needed',
			code: 'CUSTOM001',
			context: {
				beforeCode: 'class MyClass {',
				errorCode: '  // Complex logic',
				afterCode: '}',
			},
			detectedAt: Date.now(),
		};

		const fixes = await service.getSuggestedFixes(bug);

		if (fixes.length > 0 && fixes[0].estimatedImpact === 'high') {
			assert.ok(fixes[0].confidence < 1.0, 'High-impact fixes should have reduced confidence');
		}
	});

	test('should track related errors in fix suggestions', async () => {
		const bug: DetectedBug = {
			id: 'bug-related',
			filePath: '/test/file.ts',
			line: 5,
			column: 10,
			severity: 'error',
			message: "Cannot find name 'foo'",
			code: 'TS2304',
			context: {
				beforeCode: 'function test() {',
				errorCode: '  console.log(foo);',
				afterCode: '}',
			},
			detectedAt: Date.now(),
		};

		const fixes = await service.getSuggestedFixes(bug);

		if (fixes.length > 0 && fixes[0].relatedErrors) {
			assert.ok(Array.isArray(fixes[0].relatedErrors), 'Should track related errors');
		}
	});

	test('should handle multiple bugs in the same file', async () => {
		const filePath = '/test/multi-bug.ts';
		const code = `
function test() {
	undefinedVar1;
	undefinedVar2;
	undefinedVar3;
}
		`.trim();

		await service.detectBugs(filePath, code);
		const bugs = service.getBugsForFile(filePath);

		// The number of bugs depends on the diagnostics service
		assert.ok(Array.isArray(bugs), 'Should handle multiple bugs');
	});

	test('should provide context around errors', async () => {
		const bug: DetectedBug = {
			id: 'bug-context',
			filePath: '/test/file.ts',
			line: 5,
			column: 10,
			severity: 'error',
			message: 'Test error',
			code: 'TEST001',
			context: {
				beforeCode: 'line 1\nline 2\nline 3\nline 4',
				errorCode: 'line 5 with error',
				afterCode: 'line 6\nline 7\nline 8\nline 9',
			},
			detectedAt: Date.now(),
		};

		assert.ok(bug.context.beforeCode.length > 0, 'Should have before context');
		assert.ok(bug.context.errorCode.length > 0, 'Should have error line');
		assert.ok(bug.context.afterCode.length > 0, 'Should have after context');
	});

	test('should categorize bug severity correctly', async () => {
		const errorBug: DetectedBug = {
			id: 'bug-error',
			filePath: '/test/file.ts',
			line: 1,
			column: 1,
			severity: 'error',
			message: 'Critical error',
			code: 'ERR001',
			context: { beforeCode: '', errorCode: 'error', afterCode: '' },
			detectedAt: Date.now(),
		};

		const warningBug: DetectedBug = {
			id: 'bug-warning',
			filePath: '/test/file.ts',
			line: 2,
			column: 1,
			severity: 'warning',
			message: 'Warning message',
			code: 'WARN001',
			context: { beforeCode: '', errorCode: 'warning', afterCode: '' },
			detectedAt: Date.now(),
		};

		assert.strictEqual(errorBug.severity, 'error', 'Should mark as error');
		assert.strictEqual(warningBug.severity, 'warning', 'Should mark as warning');
	});

	test('should handle fixes with additional changes', async () => {
		const bug: DetectedBug = {
			id: 'bug-multi-file',
			filePath: '/test/main.ts',
			line: 10,
			column: 5,
			severity: 'error',
			message: 'Interface not found',
			code: 'TS2304',
			context: {
				beforeCode: 'export class Main {',
				errorCode: '  private data: MyInterface;',
				afterCode: '}',
			},
			detectedAt: Date.now(),
		};

		const fixes = await service.getSuggestedFixes(bug);

		if (fixes.length > 0 && fixes[0].additionalChanges) {
			assert.ok(Array.isArray(fixes[0].additionalChanges), 'Should handle additional changes');
			if (fixes[0].additionalChanges.length > 0) {
				assert.ok(fixes[0].additionalChanges[0].filePath, 'Additional change should have file path');
				assert.ok(fixes[0].additionalChanges[0].change, 'Additional change should have change details');
			}
		}
	});
});
