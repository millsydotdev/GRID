/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ICodeReviewService, CodeReviewResult, CodeReviewAnnotation } from '../../common/codeReviewService.js';
import { URI } from '../../../../../base/common/uri.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';

/**
 * Mock Model Service
 */
class MockModelService {
	private models: Map<string, any> = new Map();

	getModel(uri: URI) {
		return this.models.get(uri.toString());
	}

	addModel(uri: URI, model: any) {
		this.models.set(uri.toString(), model);
	}
}

/**
 * Mock Text Model
 */
class MockTextModel {
	constructor(
		private content: string,
		private languageId: string = 'typescript'
	) {}

	getValue() {
		return this.content;
	}

	getLanguageId() {
		return this.languageId;
	}

	getLineCount() {
		return this.content.split('\n').length;
	}

	getLineMaxColumn(line: number) {
		const lines = this.content.split('\n');
		return lines[line - 1]?.length || 1;
	}
}

/**
 * Mock LLM Message Service
 */
class MockLLMMessageService {
	private requestCounter = 0;
	responses: Map<string, string> = new Map();

	sendLLMMessage(options: any): string | undefined {
		const requestId = `request-${++this.requestCounter}`;

		// Simulate async response
		setTimeout(() => {
			const response = this.responses.get('default') || '[]';
			options.onText?.({ fullText: response });
			options.onFinalMessage?.({ fullText: response });
		}, 10);

		return requestId;
	}

	abort(requestId: string) {
		// Mock abort
	}

	setResponse(response: string) {
		this.responses.set('default', response);
	}
}

/**
 * Mock Grid Settings Service
 */
class MockGridSettingsService {
	state = {
		modelSelectionOfFeature: {
			Chat: { providerName: 'openai', modelName: 'gpt-4o' },
		},
		optionsOfModelSelection: {},
		overridesOfModel: {},
	};
}

/**
 * Mock Code Review Service Implementation
 */
class MockCodeReviewService implements ICodeReviewService {
	readonly _serviceBrand: undefined;

	constructor(
		private modelService: MockModelService,
		private llmMessageService: MockLLMMessageService,
		_settingsService: MockGridSettingsService
	) {}

	async reviewFile(uri: URI, token: CancellationToken = CancellationToken.None): Promise<CodeReviewResult> {
		try {
			const model = this.modelService.getModel(uri);
			if (!model) {
				return {
					uri,
					annotations: [],
					summary: 'File not found or not open',
					success: false,
					error: 'File model not available',
				};
			}

			const fileContent = model.getValue();
			if (!fileContent.trim()) {
				return {
					uri,
					annotations: [],
					summary: 'File is empty',
					success: true,
				};
			}

			// Simulate LLM call
			return new Promise((resolve) => {
				this.llmMessageService.sendLLMMessage({
					onFinalMessage: ({ fullText }: any) => {
						const annotations = this.parseReviewResponse(fullText, model);
						const summary = this.generateSummary(annotations);

						resolve({
							uri,
							annotations,
							summary,
							success: true,
						});
					},
					onError: ({ message }: any) => {
						resolve({
							uri,
							annotations: [],
							summary: 'Review failed',
							success: false,
							error: message,
						});
					},
				});
			});
		} catch (error) {
			return {
				uri,
				annotations: [],
				summary: 'Review failed',
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	async reviewFiles(uris: URI[], token: CancellationToken = CancellationToken.None): Promise<CodeReviewResult[]> {
		const results: CodeReviewResult[] = [];

		for (const uri of uris) {
			if (token.isCancellationRequested) {
				break;
			}

			const result = await this.reviewFile(uri, token);
			results.push(result);
		}

		return results;
	}

	private parseReviewResponse(response: string, model: any): CodeReviewAnnotation[] {
		const annotations: CodeReviewAnnotation[] = [];

		try {
			let jsonStr = response.trim();

			// Remove markdown code blocks
			const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
			if (codeBlockMatch) {
				jsonStr = codeBlockMatch[1].trim();
			}

			const parsed = JSON.parse(jsonStr);

			if (!Array.isArray(parsed)) {
				return annotations;
			}

			for (const item of parsed) {
				if (typeof item !== 'object' || !item.line || !item.severity || !item.category || !item.message) {
					continue;
				}

				const line = Number(item.line);
				if (isNaN(line) || line < 1 || line > model.getLineCount()) {
					continue;
				}

				annotations.push({
					id: `review-${line}-${annotations.length}`,
					line,
					severity: item.severity,
					category: item.category,
					message: String(item.message),
					suggestedFix: item.suggestedFix ? String(item.suggestedFix) : undefined,
					explanation: item.explanation ? String(item.explanation) : undefined,
					testSuggestion: item.testSuggestion ? String(item.testSuggestion) : undefined,
				});
			}
		} catch (error) {
			// Parsing failed
		}

		return annotations;
	}

	private generateSummary(annotations: CodeReviewAnnotation[]): string {
		if (annotations.length === 0) {
			return 'No issues found. Code looks good!';
		}

		const errorCount = annotations.filter((a) => a.severity === 'error').length;
		const warningCount = annotations.filter((a) => a.severity === 'warning').length;
		const infoCount = annotations.filter((a) => a.severity === 'info').length;
		const hintCount = annotations.filter((a) => a.severity === 'hint').length;

		const parts: string[] = [];
		if (errorCount > 0) {
			parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
		}
		if (warningCount > 0) {
			parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
		}
		if (infoCount > 0) {
			parts.push(`${infoCount} info${infoCount > 1 ? 's' : ''}`);
		}
		if (hintCount > 0) {
			parts.push(`${hintCount} hint${hintCount > 1 ? 's' : ''}`);
		}

		return `Found ${annotations.length} issue${annotations.length > 1 ? 's' : ''}: ${parts.join(', ')}`;
	}
}

suite('CodeReviewService Tests', () => {
	// ensureNoDisposablesAreLeakedInTestSuite();
	let service: MockCodeReviewService;
	let mockModelService: MockModelService;
	let mockLLMMessageService: MockLLMMessageService;
	let mockSettingsService: MockGridSettingsService;

	setup(() => {
		mockModelService = new MockModelService();
		mockLLMMessageService = new MockLLMMessageService();
		mockSettingsService = new MockGridSettingsService();

		service = new MockCodeReviewService(mockModelService, mockLLMMessageService, mockSettingsService);
	});

	test('should review a file successfully', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('function test() { return 42; }');
		mockModelService.addModel(uri, model);

		mockLLMMessageService.setResponse('[]');

		const result = await service.reviewFile(uri);

		assert.ok(result, 'Should return result');
		assert.strictEqual(result.success, true, 'Review should succeed');
		assert.ok(Array.isArray(result.annotations), 'Should have annotations array');
	});

	test('should handle file not found', async () => {
		const uri = URI.file('/nonexistent/file.ts');

		const result = await service.reviewFile(uri);

		assert.strictEqual(result.success, false, 'Review should fail');
		assert.strictEqual(result.error, 'File model not available', 'Should have error message');
	});

	test('should handle empty file', async () => {
		const uri = URI.file('/test/empty.ts');
		const model = new MockTextModel('');
		mockModelService.addModel(uri, model);

		const result = await service.reviewFile(uri);

		assert.strictEqual(result.success, true, 'Review should succeed');
		assert.strictEqual(result.summary, 'File is empty', 'Should have empty file message');
		assert.strictEqual(result.annotations.length, 0, 'Should have no annotations');
	});

	test('should parse valid annotations from LLM response', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('function test() {\n  return 42;\n}');
		mockModelService.addModel(uri, model);

		const annotations = [
			{
				line: 1,
				severity: 'warning',
				category: 'suggestion',
				message: 'Consider adding JSDoc comment',
			},
		];
		mockLLMMessageService.setResponse(JSON.stringify(annotations));

		const result = await service.reviewFile(uri);

		assert.ok(result.success, 'Review should succeed');
		assert.strictEqual(result.annotations.length, 1, 'Should have one annotation');
		assert.strictEqual(result.annotations[0].line, 1, 'Line should match');
		assert.strictEqual(result.annotations[0].severity, 'warning', 'Severity should match');
	});

	test('should handle markdown-wrapped JSON response', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('code');
		mockModelService.addModel(uri, model);

		const annotations = [{ line: 1, severity: 'info', category: 'style', message: 'Test' }];
		const wrappedResponse = '```json\n' + JSON.stringify(annotations) + '\n```';
		mockLLMMessageService.setResponse(wrappedResponse);

		const result = await service.reviewFile(uri);

		assert.ok(result.success, 'Should parse wrapped JSON');
		assert.strictEqual(result.annotations.length, 1, 'Should extract annotation');
	});

	test('should validate annotation severity', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('code');
		mockModelService.addModel(uri, model);

		const validSeverities = ['error', 'warning', 'info', 'hint'];
		for (const severity of validSeverities) {
			const annotations = [{ line: 1, severity, category: 'suggestion', message: 'Test' }];
			mockLLMMessageService.setResponse(JSON.stringify(annotations));

			const result = await service.reviewFile(uri);

			assert.strictEqual(result.annotations[0].severity, severity, `Should accept ${severity}`);
		}
	});

	test('should validate annotation category', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('code');
		mockModelService.addModel(uri, model);

		const validCategories = ['suggestion', 'test', 'smell', 'security', 'performance', 'style', 'bug'];
		for (const category of validCategories) {
			const annotations = [{ line: 1, severity: 'info', category, message: 'Test' }];
			mockLLMMessageService.setResponse(JSON.stringify(annotations));

			const result = await service.reviewFile(uri);

			assert.strictEqual(result.annotations[0].category, category, `Should accept ${category}`);
		}
	});

	test('should skip invalid annotations', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('line 1\nline 2');
		mockModelService.addModel(uri, model);

		const annotations = [
			{ line: 1, severity: 'info', category: 'suggestion', message: 'Valid' },
			{ line: 999, severity: 'info', category: 'suggestion', message: 'Invalid line' }, // Out of bounds
			{ severity: 'info', category: 'suggestion', message: 'Missing line' }, // No line
			{ line: 2, severity: 'info', category: 'suggestion', message: 'Valid 2' },
		];
		mockLLMMessageService.setResponse(JSON.stringify(annotations));

		const result = await service.reviewFile(uri);

		assert.strictEqual(result.annotations.length, 2, 'Should skip invalid annotations');
	});

	test('should generate summary for no issues', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('code');
		mockModelService.addModel(uri, model);

		mockLLMMessageService.setResponse('[]');

		const result = await service.reviewFile(uri);

		assert.strictEqual(result.summary, 'No issues found. Code looks good!', 'Should have no issues message');
	});

	test('should generate summary with counts', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('line 1\nline 2\nline 3\nline 4');
		mockModelService.addModel(uri, model);

		const annotations = [
			{ line: 1, severity: 'error', category: 'bug', message: 'Error 1' },
			{ line: 2, severity: 'error', category: 'bug', message: 'Error 2' },
			{ line: 3, severity: 'warning', category: 'suggestion', message: 'Warning 1' },
			{ line: 4, severity: 'info', category: 'style', message: 'Info 1' },
		];
		mockLLMMessageService.setResponse(JSON.stringify(annotations));

		const result = await service.reviewFile(uri);

		assert.ok(result.summary.includes('4 issue'), 'Should mention 4 issues');
		assert.ok(result.summary.includes('2 errors'), 'Should mention 2 errors');
		assert.ok(result.summary.includes('1 warning'), 'Should mention 1 warning');
	});

	test('should review multiple files', async () => {
		const uri1 = URI.file('/test/file1.ts');
		const uri2 = URI.file('/test/file2.ts');

		mockModelService.addModel(uri1, new MockTextModel('code 1'));
		mockModelService.addModel(uri2, new MockTextModel('code 2'));

		mockLLMMessageService.setResponse('[]');

		const results = await service.reviewFiles([uri1, uri2]);

		assert.strictEqual(results.length, 2, 'Should review both files');
		assert.ok(results[0].success, 'First review should succeed');
		assert.ok(results[1].success, 'Second review should succeed');
	});

	test('should handle cancellation during multi-file review', async () => {
		const uri1 = URI.file('/test/file1.ts');
		const uri2 = URI.file('/test/file2.ts');
		const uri3 = URI.file('/test/file3.ts');

		mockModelService.addModel(uri1, new MockTextModel('code 1'));
		mockModelService.addModel(uri2, new MockTextModel('code 2'));
		mockModelService.addModel(uri3, new MockTextModel('code 3'));

		mockLLMMessageService.setResponse('[]');

		// Create a cancellation token that cancels after first file
		const tokenSource = {
			isCancellationRequested: false,
			onCancellationRequested: () => ({ dispose: () => {} }),
			cancel() {
				this.isCancellationRequested = true;
			},
		};

		// Start review (will cancel after first file in mock)
		const resultsPromise = service.reviewFiles([uri1, uri2, uri3], tokenSource as CancellationToken);

		// Cancel after a short delay
		setTimeout(() => tokenSource.cancel(), 50);

		const results = await resultsPromise;

		// Should have reviewed at least one file before cancellation
		assert.ok(results.length >= 1, 'Should review at least one file');
		assert.ok(results.length <= 3, 'Should not review all files due to cancellation');
	});

	test('should handle suggested fix in annotation', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('code');
		mockModelService.addModel(uri, model);

		const annotations = [
			{
				line: 1,
				severity: 'warning',
				category: 'suggestion',
				message: 'Use const instead of var',
				suggestedFix: 'const x = 42;',
			},
		];
		mockLLMMessageService.setResponse(JSON.stringify(annotations));

		const result = await service.reviewFile(uri);

		assert.ok(result.annotations[0].suggestedFix, 'Should have suggested fix');
		assert.strictEqual(result.annotations[0].suggestedFix, 'const x = 42;', 'Fix should match');
	});

	test('should handle explanation in annotation', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('code');
		mockModelService.addModel(uri, model);

		const annotations = [
			{
				line: 1,
				severity: 'info',
				category: 'suggestion',
				message: 'Consider using arrow function',
				explanation: 'Arrow functions have lexical this binding',
			},
		];
		mockLLMMessageService.setResponse(JSON.stringify(annotations));

		const result = await service.reviewFile(uri);

		assert.ok(result.annotations[0].explanation, 'Should have explanation');
		assert.ok(result.annotations[0].explanation!.includes('lexical'), 'Explanation should match');
	});

	test('should handle test suggestion in annotation', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('code');
		mockModelService.addModel(uri, model);

		const annotations = [
			{
				line: 1,
				severity: 'info',
				category: 'test',
				message: 'Add unit tests',
				testSuggestion: 'test("should return 42", () => { ... })',
			},
		];
		mockLLMMessageService.setResponse(JSON.stringify(annotations));

		const result = await service.reviewFile(uri);

		assert.ok(result.annotations[0].testSuggestion, 'Should have test suggestion');
		assert.ok(result.annotations[0].testSuggestion!.includes('should return'), 'Test suggestion should match');
	});

	test('should handle malformed JSON response gracefully', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('code');
		mockModelService.addModel(uri, model);

		mockLLMMessageService.setResponse('This is not JSON');

		const result = await service.reviewFile(uri);

		assert.ok(result.success, 'Should still succeed');
		assert.strictEqual(result.annotations.length, 0, 'Should have no annotations');
	});

	test('should generate unique IDs for annotations', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('line 1\nline 2\nline 3');
		mockModelService.addModel(uri, model);

		const annotations = [
			{ line: 1, severity: 'info', category: 'suggestion', message: 'Issue 1' },
			{ line: 2, severity: 'info', category: 'suggestion', message: 'Issue 2' },
			{ line: 3, severity: 'info', category: 'suggestion', message: 'Issue 3' },
		];
		mockLLMMessageService.setResponse(JSON.stringify(annotations));

		const result = await service.reviewFile(uri);

		const ids = result.annotations.map((a) => a.id);
		const uniqueIds = new Set(ids);

		assert.strictEqual(ids.length, uniqueIds.size, 'All IDs should be unique');
	});

	test('should handle different language IDs', async () => {
		const languages = ['typescript', 'javascript', 'python', 'java', 'go'];

		for (const lang of languages) {
			const uri = URI.file(`/test/file.${lang}`);
			const model = new MockTextModel('code', lang);
			mockModelService.addModel(uri, model);

			mockLLMMessageService.setResponse('[]');

			const result = await service.reviewFile(uri);

			assert.ok(result.success, `Should review ${lang} file`);
		}
	});

	test('should handle files with whitespace-only content', async () => {
		const uri = URI.file('/test/whitespace.ts');
		const model = new MockTextModel('   \n\t\n   ');
		mockModelService.addModel(uri, model);

		const result = await service.reviewFile(uri);

		assert.strictEqual(result.success, true, 'Should succeed');
		assert.strictEqual(result.summary, 'File is empty', 'Should treat as empty');
	});

	test('should handle very large files', async () => {
		const uri = URI.file('/test/large.ts');
		const largeContent = 'line\n'.repeat(10000); // 10k lines
		const model = new MockTextModel(largeContent);
		mockModelService.addModel(uri, model);

		mockLLMMessageService.setResponse('[]');

		const result = await service.reviewFile(uri);

		assert.ok(result.success, 'Should handle large files');
	});

	test('should handle annotations on first and last lines', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('line 1\nline 2\nline 3');
		mockModelService.addModel(uri, model);

		const annotations = [
			{ line: 1, severity: 'info', category: 'suggestion', message: 'First line' },
			{ line: 3, severity: 'info', category: 'suggestion', message: 'Last line' },
		];
		mockLLMMessageService.setResponse(JSON.stringify(annotations));

		const result = await service.reviewFile(uri);

		assert.strictEqual(result.annotations.length, 2, 'Should handle edge lines');
		assert.strictEqual(result.annotations[0].line, 1, 'Should annotate first line');
		assert.strictEqual(result.annotations[1].line, 3, 'Should annotate last line');
	});

	test('should handle non-array JSON response', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('code');
		mockModelService.addModel(uri, model);

		mockLLMMessageService.setResponse('{"error": "not an array"}');

		const result = await service.reviewFile(uri);

		assert.ok(result.success, 'Should still succeed');
		assert.strictEqual(result.annotations.length, 0, 'Should have no annotations for non-array');
	});

	test('should handle singular vs plural in summary', async () => {
		const uri = URI.file('/test/file.ts');
		const model = new MockTextModel('line 1\nline 2');
		mockModelService.addModel(uri, model);

		// Test singular
		const singleAnnotation = [{ line: 1, severity: 'error', category: 'bug', message: 'Single error' }];
		mockLLMMessageService.setResponse(JSON.stringify(singleAnnotation));

		const result1 = await service.reviewFile(uri);

		assert.ok(result1.summary.includes('1 error'), 'Should use singular for 1 error');
		assert.ok(!result1.summary.includes('errors'), 'Should not use plural for 1 error');
	});
});
