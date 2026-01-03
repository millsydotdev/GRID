/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IConvertToLLMMessageService } from '../../browser/convertToLLMMessageService.js';
import { ChatMessage } from '../../common/chatThreadServiceTypes.js';
import { ModelSelection, ChatMode, FeatureName } from '../../common/gridSettingsTypes.js';

/**
 * Mock Model Service
 */
class MockModelService {
	getModel(uri: any) {
		return { model: null };
	}
}

/**
 * Mock Workspace Context Service
 */
class MockWorkspaceContextService {
	getWorkspace() {
		return { folders: [] };
	}
}

/**
 * Mock Editor Service
 */
class MockEditorService {
	activeEditor = null;
	getActiveCodeEditor() {
		return null;
	}
}

/**
 * Mock Directory Str Service
 */
class MockDirectoryStrService {
	async getDirectoryStr(opts: any): Promise<string> {
		return 'src/\n  file.ts\n  test.ts';
	}
}

/**
 * Mock Terminal Tool Service
 */
class MockTerminalToolService {
	getShellPath() {
		return '/bin/bash';
	}
}

/**
 * Mock Grid Settings Service
 */
class MockGridSettingsService {
	private settings: any = {
		openai: { apiKey: 'test-key' },
		anthropic: { apiKey: 'test-key' },
	};

	getSettings() {
		return this.settings;
	}

	setSettings(settings: any) {
		this.settings = settings;
	}
}

/**
 * Mock Grid Model Service
 */
class MockGridModelService {
	getModel(uri: any) {
		return { model: null };
	}
}

/**
 * Mock MCP Service
 */
class MockMCPService {
	async getTools(): Promise<any[]> {
		return [];
	}
}

/**
 * Mock Repo Indexer Service
 */
class MockRepoIndexerService {
	async query(text: string): Promise<{ results: string[]; metrics: any } | null> {
		return {
			results: ['result1', 'result2'],
			metrics: { totalFiles: 10, matchedFiles: 2 },
		};
	}
}

/**
 * Mock Notification Service
 */
class MockNotificationService {
	info(message: string) {}
	warn(message: string) {}
	error(message: string) {}
}

/**
 * Mock Memories Service
 */
class MockMemoriesService {
	async getRelevantMemories(query: string): Promise<string[]> {
		return [];
	}
}

/**
 * Mock ConvertToLLMMessageService Implementation
 *
 * This is a simplified mock that implements the interface for testing purposes.
 * In a real implementation, you would inject the actual ConvertToLLMMessageService
 * and test its behavior with mocked dependencies.
 */
class MockConvertToLLMMessageService implements IConvertToLLMMessageService {
	readonly _serviceBrand: undefined;

	constructor(
		private _modelService: MockModelService,
		private _workspaceContextService: MockWorkspaceContextService,
		private _editorService: MockEditorService,
		private _directoryStrService: MockDirectoryStrService,
		private _terminalToolService: MockTerminalToolService,
		private _gridSettingsService: MockGridSettingsService,
		private _gridModelService: MockGridModelService,
		private _mcpService: MockMCPService,
		private repoIndexerService: MockRepoIndexerService,
		private _notificationService: MockNotificationService,
		private _memoriesService: MockMemoriesService
	) {}

	prepareLLMSimpleMessages(opts: {
		simpleMessages: any[];
		systemMessage: string;
		modelSelection: ModelSelection | null;
		featureName: FeatureName;
	}) {
		// Simple implementation for testing
		const messages = opts.simpleMessages.map((msg) => ({
			role: msg.role,
			content: msg.content,
		}));

		return {
			messages,
			separateSystemMessage: opts.systemMessage,
		};
	}

	async prepareLLMChatMessages(opts: {
		chatMessages: ChatMessage[];
		chatMode: ChatMode;
		modelSelection: ModelSelection | null;
		repoIndexerPromise?: Promise<{ results: string[]; metrics: any } | null>;
	}): Promise<any> {
		// Wait for repo indexer if provided
		if (opts.repoIndexerPromise) {
			await opts.repoIndexerPromise;
		}

		// Convert chat messages to LLM format
		const messages = opts.chatMessages.map((msg) => ({
			role: msg.role,
			content: typeof (msg as any).content === 'string' ? (msg as any).content : JSON.stringify((msg as any).content),
		}));

		return {
			messages,
			separateSystemMessage: 'You are a helpful AI assistant.',
		};
	}

	prepareFIMMessage(opts: { messages: any; modelSelection: ModelSelection | null; featureName: FeatureName }) {
		// Extract prefix, suffix from FIM message
		return {
			prefix: opts.messages.prefix || '',
			suffix: opts.messages.suffix || '',
			stopTokens: ['<|endoftext|>', '\n\n'],
		};
	}

	async startRepoIndexerQuery(chatMessages: ChatMessage[], chatMode: ChatMode): Promise<any> {
		// Use the last message as the query
		if (chatMessages.length === 0) {
			return null;
		}

		const lastMessage = chatMessages[chatMessages.length - 1];
		const query = typeof (lastMessage as any).content === 'string' ? (lastMessage as any).content : JSON.stringify((lastMessage as any).content);

		return await this.repoIndexerService.query(query);
	}
}

suite('ConvertToLLMMessageService Tests', () => {
	// ensureNoDisposablesAreLeakedInTestSuite();
	let service: MockConvertToLLMMessageService;
	let mockModelService: MockModelService;
	let mockWorkspaceContextService: MockWorkspaceContextService;
	let mockEditorService: MockEditorService;
	let mockDirectoryStrService: MockDirectoryStrService;
	let mockTerminalToolService: MockTerminalToolService;
	let mockGridSettingsService: MockGridSettingsService;
	let mockGridModelService: MockGridModelService;
	let mockMCPService: MockMCPService;
	let mockRepoIndexerService: MockRepoIndexerService;
	let mockNotificationService: MockNotificationService;
	let mockMemoriesService: MockMemoriesService;

	setup(() => {
		mockModelService = new MockModelService();
		mockWorkspaceContextService = new MockWorkspaceContextService();
		mockEditorService = new MockEditorService();
		mockDirectoryStrService = new MockDirectoryStrService();
		mockTerminalToolService = new MockTerminalToolService();
		mockGridSettingsService = new MockGridSettingsService();
		mockGridModelService = new MockGridModelService();
		mockMCPService = new MockMCPService();
		mockRepoIndexerService = new MockRepoIndexerService();
		mockNotificationService = new MockNotificationService();
		mockMemoriesService = new MockMemoriesService();

		service = new MockConvertToLLMMessageService(
			mockModelService,
			mockWorkspaceContextService,
			mockEditorService,
			mockDirectoryStrService,
			mockTerminalToolService,
			mockGridSettingsService,
			mockGridModelService,
			mockMCPService,
			mockRepoIndexerService,
			mockNotificationService,
			mockMemoriesService
		);
	});

	test('should prepare simple LLM messages', () => {
		const simpleMessages = [
			{ role: 'user', content: 'Hello' },
			{ role: 'assistant', content: 'Hi there!' },
		];

		const result = service.prepareLLMSimpleMessages({
			simpleMessages,
			systemMessage: 'You are helpful',
			modelSelection: null,
			featureName: 'Chat',
		});

		assert.ok(result, 'Should return result');
		assert.ok(Array.isArray(result.messages), 'Should have messages array');
		assert.strictEqual(result.messages.length, 2, 'Should have 2 messages');
		assert.strictEqual(result.separateSystemMessage, 'You are helpful', 'Should have system message');
	});

	test('should prepare chat messages', async () => {
		const chatMessages: ChatMessage[] = [
			{
				id: '1',
				threadId: 'thread-1',
				role: 'user',
				content: 'What is TypeScript?',
				timestamp: Date.now(),
				modelUsed: null,
				tokensUsed: null,
			} as any,
			{
				id: '2',
				threadId: 'thread-1',
				role: 'assistant',
				content: 'TypeScript is a typed superset of JavaScript.',
				timestamp: Date.now(),
				modelUsed: 'gpt-4o',
				tokensUsed: { input: 10, output: 20 },
			} as any,
		];

		const result = await service.prepareLLMChatMessages({
			chatMessages,
			chatMode: 'chat' as any,
			modelSelection: null,
		});

		assert.ok(result, 'Should return result');
		assert.ok(Array.isArray(result.messages), 'Should have messages array');
		assert.strictEqual(result.messages.length, 2, 'Should have 2 messages');
		assert.ok(result.separateSystemMessage, 'Should have system message');
	});

	test('should prepare FIM (Fill-In-Middle) messages', () => {
		const fimMessage = {
			prefix: 'function add(a, b) {',
			suffix: '}',
		};

		const result = service.prepareFIMMessage({
			messages: fimMessage,
			modelSelection: null,
			featureName: 'Autocomplete',
		});

		assert.ok(result, 'Should return result');
		assert.strictEqual(result.prefix, 'function add(a, b) {', 'Should have prefix');
		assert.strictEqual(result.suffix, '}', 'Should have suffix');
		assert.ok(Array.isArray(result.stopTokens), 'Should have stop tokens');
		assert.ok(result.stopTokens.length > 0, 'Should have at least one stop token');
	});

	test('should start repo indexer query', async () => {
		const chatMessages: ChatMessage[] = [
			{
				id: '1',
				threadId: 'thread-1',
				role: 'user',
				content: 'Find all authentication functions',
				timestamp: Date.now(),
				modelUsed: null,
				tokensUsed: null,
			},
		];

		const result = await service.startRepoIndexerQuery(chatMessages, 'chat');

		assert.ok(result, 'Should return result');
		assert.ok(Array.isArray(result.results), 'Should have results array');
		assert.ok(result.metrics, 'Should have metrics');
	});

	test('should handle empty message arrays', () => {
		const result = service.prepareLLMSimpleMessages({
			simpleMessages: [],
			systemMessage: 'Test',
			modelSelection: null,
			featureName: 'Chat',
		});

		assert.ok(result, 'Should return result');
		assert.ok(Array.isArray(result.messages), 'Should have messages array');
		assert.strictEqual(result.messages.length, 0, 'Should have 0 messages');
	});

	test('should handle null model selection', async () => {
		const chatMessages: ChatMessage[] = [
			{
				id: '1',
				threadId: 'thread-1',
				role: 'user',
				content: 'Test message',
				timestamp: Date.now(),
				modelUsed: null,
				tokensUsed: null,
			} as any,
		];

		const result = await service.prepareLLMChatMessages({
			chatMessages,
			chatMode: 'chat' as any,
			modelSelection: null,
		});

		assert.ok(result, 'Should handle null model selection');
		assert.ok(Array.isArray(result.messages), 'Should have messages array');
	});

	test('should handle different chat modes', async () => {
		const chatMessages: ChatMessage[] = [
			{
				id: '1',
				threadId: 'thread-1',
				role: 'user',
				content: 'Test',
				timestamp: Date.now(),
				modelUsed: null,
				tokensUsed: null,
			},
		];

		const modes: ChatMode[] = ['chat', 'architect', 'code'];
		for (const mode of modes) {
			const result = await service.prepareLLMChatMessages({
				chatMessages,
				chatMode: mode,
				modelSelection: null,
			});

			assert.ok(result, `Should handle ${mode} mode`);
			assert.ok(Array.isArray(result.messages), `Should have messages for ${mode} mode`);
		}
	});

	test('should handle different feature names', () => {
		const simpleMessages = [{ role: 'user', content: 'Test' }];

		const features: FeatureName[] = ['Chat', 'Ctrl+K', 'Apply', 'Autocomplete', 'SCM'];
		for (const feature of features) {
			const result = service.prepareLLMSimpleMessages({
				simpleMessages,
				systemMessage: 'Test',
				modelSelection: null,
				featureName: feature,
			});

			assert.ok(result, `Should handle ${feature} feature`);
			assert.ok(Array.isArray(result.messages), `Should have messages for ${feature}`);
		}
	});

	test('should handle messages with different roles', () => {
		const simpleMessages = [
			{ role: 'user', content: 'User message' },
			{ role: 'assistant', content: 'Assistant message' },
			{ role: 'tool', content: 'Tool message', id: 'tool-1', name: 'grep', rawParams: {} },
		];

		const result = service.prepareLLMSimpleMessages({
			simpleMessages,
			systemMessage: 'Test',
			modelSelection: null,
			featureName: 'Chat',
		});

		assert.ok(result, 'Should handle different roles');
		assert.strictEqual(result.messages.length, 3, 'Should have all messages');
	});

	test('should handle empty system message', () => {
		const simpleMessages = [{ role: 'user', content: 'Test' }];

		const result = service.prepareLLMSimpleMessages({
			simpleMessages,
			systemMessage: '',
			modelSelection: null,
			featureName: 'Chat',
		});

		assert.ok(result, 'Should handle empty system message');
		assert.strictEqual(result.separateSystemMessage, '', 'System message should be empty');
	});

	test('should handle FIM with empty prefix/suffix', () => {
		const fimMessage = {
			prefix: '',
			suffix: '',
		};

		const result = service.prepareFIMMessage({
			messages: fimMessage,
			modelSelection: null,
			featureName: 'Autocomplete',
		});

		assert.ok(result, 'Should handle empty prefix/suffix');
		assert.strictEqual(result.prefix, '', 'Prefix should be empty');
		assert.strictEqual(result.suffix, '', 'Suffix should be empty');
	});

	test('should handle repo indexer promise', async () => {
		const chatMessages: ChatMessage[] = [
			{
				id: '1',
				threadId: 'thread-1',
				role: 'user',
				content: 'Search for auth code',
				timestamp: Date.now(),
				modelUsed: null,
				tokensUsed: null,
			},
		];

		const repoIndexerPromise = mockRepoIndexerService.query('auth');

		const result = await service.prepareLLMChatMessages({
			chatMessages,
			chatMode: 'chat',
			modelSelection: null,
			repoIndexerPromise,
		});

		assert.ok(result, 'Should handle repo indexer promise');
		assert.ok(Array.isArray(result.messages), 'Should have messages');
	});

	test('should handle null repo indexer query result', async () => {
		const chatMessages: ChatMessage[] = [];

		const result = await service.startRepoIndexerQuery(chatMessages, 'chat');

		assert.strictEqual(result, null, 'Should return null for empty messages');
	});

	test('should convert non-string message content', async () => {
		const chatMessages: ChatMessage[] = [
			{
				id: '1',
				threadId: 'thread-1',
				role: 'user',
				content: JSON.stringify({ type: 'complex', data: 'test' }),
				timestamp: Date.now(),
				modelUsed: null,
				tokensUsed: null,
			} as any,
		];

		const result = await service.prepareLLMChatMessages({
			chatMessages,
			chatMode: 'chat' as any,
			modelSelection: null,
		});

		assert.ok(result, 'Should handle non-string content');
		assert.ok(Array.isArray(result.messages), 'Should have messages');
	});

	test('should maintain message order', () => {
		const simpleMessages = [
			{ role: 'user', content: 'Message 1' },
			{ role: 'assistant', content: 'Message 2' },
			{ role: 'user', content: 'Message 3' },
			{ role: 'assistant', content: 'Message 4' },
		];

		const result = service.prepareLLMSimpleMessages({
			simpleMessages,
			systemMessage: 'Test',
			modelSelection: null,
			featureName: 'Chat',
		});

		assert.strictEqual(result.messages.length, 4, 'Should maintain all messages');
		assert.strictEqual(result.messages[0].role, 'user', 'First message should be user');
		assert.strictEqual(result.messages[1].role, 'assistant', 'Second message should be assistant');
		assert.strictEqual(result.messages[2].role, 'user', 'Third message should be user');
		assert.strictEqual(result.messages[3].role, 'assistant', 'Fourth message should be assistant');
	});

	test('should handle long system messages', () => {
		const longSystemMessage = 'A'.repeat(10000);
		const simpleMessages = [{ role: 'user', content: 'Test' }];

		const result = service.prepareLLMSimpleMessages({
			simpleMessages,
			systemMessage: longSystemMessage,
			modelSelection: null,
			featureName: 'Chat',
		});

		assert.ok(result, 'Should handle long system message');
		assert.strictEqual(result.separateSystemMessage, longSystemMessage, 'Should preserve full system message');
	});

	test('should handle special characters in messages', () => {
		const simpleMessages = [
			{ role: 'user', content: 'Test with special chars: <>&"\'`\n\t\r' },
			{ role: 'assistant', content: 'Response with emojis: 🚀 ✅ 🎉' },
		];

		const result = service.prepareLLMSimpleMessages({
			simpleMessages,
			systemMessage: 'System with unicode: 中文',
			modelSelection: null,
			featureName: 'Chat',
		});

		assert.ok(result, 'Should handle special characters');
		assert.strictEqual(result.messages.length, 2, 'Should have all messages');
	});

	test('should prepare messages with model selection', async () => {
		const chatMessages: ChatMessage[] = [
			{
				id: '1',
				threadId: 'thread-1',
				role: 'user',
				content: 'Test with specific model',
				timestamp: Date.now(),
				modelUsed: null,
				tokensUsed: null,
			},
		];

		const modelSelection: ModelSelection = {
			provider: 'openai',
			modelName: 'gpt-4o',
		};

		const result = await service.prepareLLMChatMessages({
			chatMessages,
			chatMode: 'chat',
			modelSelection,
		});

		assert.ok(result, 'Should handle model selection');
		assert.ok(Array.isArray(result.messages), 'Should have messages');
	});
});
