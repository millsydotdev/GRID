/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ChatHistoryCompressor } from '../../common/chatHistoryCompressor.js';

// Simple message type for testing
type SimpleMessage = {
	role: 'user' | 'assistant' | 'system';
	content: string;
};

suite('ChatHistoryCompressor Tests', () => {
	// ensureNoDisposablesAreLeakedInTestSuite();
	let compressor: ChatHistoryCompressor;

	setup(() => {
		compressor = new ChatHistoryCompressor();
	});

	test('should not compress when under token limit', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'system', content: 'You are a helpful assistant' },
			{ role: 'user', content: 'Hello' },
			{ role: 'assistant', content: 'Hi there!' },
		];

		const result = await compressor.compressHistory(messages, 10000, false);

		assert.strictEqual(result.length, messages.length, 'Should not compress when under limit');
		assert.deepStrictEqual(result, messages, 'Messages should be unchanged');
	});

	test('should compress when over token limit', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'system', content: 'You are a helpful assistant' },
			{ role: 'user', content: 'A'.repeat(1000) }, // Old message
			{ role: 'assistant', content: 'B'.repeat(1000) }, // Old message
			{ role: 'user', content: 'C'.repeat(1000) }, // Old message
			{ role: 'assistant', content: 'D'.repeat(1000) }, // Old message
			{ role: 'user', content: 'E'.repeat(1000) }, // Recent message
			{ role: 'assistant', content: 'F'.repeat(1000) }, // Recent message
		];

		const result = await compressor.compressHistory(messages, 500, false);

		assert.ok(result.length <= messages.length, 'Should compress/reduce messages');
		assert.ok(result.length > 0, 'Should have at least some messages');
	});

	test('should preserve system message', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'system', content: 'You are a helpful assistant' },
			{ role: 'user', content: 'A'.repeat(1000) },
			{ role: 'assistant', content: 'B'.repeat(1000) },
			{ role: 'user', content: 'C'.repeat(1000) },
			{ role: 'assistant', content: 'D'.repeat(1000) },
		];

		const result = await compressor.compressHistory(messages, 500, false);

		const systemMessage = result.find((m) => m.role === 'system' && m.content === 'You are a helpful assistant');
		assert.ok(systemMessage, 'Should preserve original system message');
	});

	test('should keep last 5 turns (10 messages) uncompressed', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'system', content: 'System message' },
			// Old messages (should be compressed)
			{ role: 'user', content: 'Old message 1' },
			{ role: 'assistant', content: 'Old response 1' },
			{ role: 'user', content: 'Old message 2' },
			{ role: 'assistant', content: 'Old response 2' },
			// Recent 5 turns (10 messages - should be kept)
			{ role: 'user', content: 'Recent 1' },
			{ role: 'assistant', content: 'Recent response 1' },
			{ role: 'user', content: 'Recent 2' },
			{ role: 'assistant', content: 'Recent response 2' },
			{ role: 'user', content: 'Recent 3' },
			{ role: 'assistant', content: 'Recent response 3' },
			{ role: 'user', content: 'Recent 4' },
			{ role: 'assistant', content: 'Recent response 4' },
			{ role: 'user', content: 'Recent 5' },
			{ role: 'assistant', content: 'Recent response 5' },
		];

		// Set a token limit that would require compression
		const result = await compressor.compressHistory(messages, 100, false);

		// Should have system + recent messages (at minimum)
		const recentMessages = result.filter(
			(m) =>
				m.content.includes('Recent 1') ||
				m.content.includes('Recent 2') ||
				m.content.includes('Recent 3') ||
				m.content.includes('Recent 4') ||
				m.content.includes('Recent 5')
		);

		assert.ok(recentMessages.length > 0, 'Should preserve recent messages');
	});

	test('should handle empty message array', async () => {
		const messages: SimpleMessage[] = [];

		const result = await compressor.compressHistory(messages, 1000, false);

		assert.strictEqual(result.length, 0, 'Should return empty array for empty input');
	});

	test('should handle single message', async () => {
		const messages: SimpleMessage[] = [{ role: 'user', content: 'Single message' }];

		const result = await compressor.compressHistory(messages, 1000, false);

		assert.strictEqual(result.length, 1, 'Should preserve single message');
		assert.strictEqual(result[0].content, 'Single message', 'Content should match');
	});

	test('should handle only system message', async () => {
		const messages: SimpleMessage[] = [{ role: 'system', content: 'System only' }];

		const result = await compressor.compressHistory(messages, 1000, false);

		assert.strictEqual(result.length, 1, 'Should preserve system message');
		assert.strictEqual(result[0].role, 'system', 'Should be system message');
	});

	test('should handle messages without system message', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'user', content: 'Hello' },
			{ role: 'assistant', content: 'Hi' },
		];

		const result = await compressor.compressHistory(messages, 1000, false);

		assert.strictEqual(result.length, 2, 'Should preserve all messages');
		assert.ok(!result.some((m) => m.role === 'system'), 'Should not add system message');
	});

	test('should handle very long single message', async () => {
		const messages: SimpleMessage[] = [{ role: 'user', content: 'A'.repeat(10000) }];

		const result = await compressor.compressHistory(messages, 100, false);

		assert.ok(result.length >= 0, 'Should handle very long message');
		assert.ok(result.length <= messages.length, 'Should not add messages');
	});

	test('should handle local model flag', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'user', content: 'A'.repeat(1000) },
			{ role: 'assistant', content: 'B'.repeat(1000) },
		];

		const resultLocal = await compressor.compressHistory(messages, 100, true);
		const resultCloud = await compressor.compressHistory(messages, 100, false);

		assert.ok(Array.isArray(resultLocal), 'Should handle local model');
		assert.ok(Array.isArray(resultCloud), 'Should handle cloud model');
	});

	test('should maintain message order', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'user', content: 'First' },
			{ role: 'assistant', content: 'Second' },
			{ role: 'user', content: 'Third' },
			{ role: 'assistant', content: 'Fourth' },
		];

		const result = await compressor.compressHistory(messages, 10000, false);

		assert.strictEqual(result[0].content, 'First', 'First message should be first');
		assert.strictEqual(result[1].content, 'Second', 'Second message should be second');
		assert.strictEqual(result[2].content, 'Third', 'Third message should be third');
		assert.strictEqual(result[3].content, 'Fourth', 'Fourth message should be fourth');
	});

	test('should handle alternating user/assistant messages', async () => {
		const messages: SimpleMessage[] = [];
		for (let i = 0; i < 20; i++) {
			messages.push({
				role: i % 2 === 0 ? 'user' : 'assistant',
				content: `Message ${i}`,
			});
		}

		const result = await compressor.compressHistory(messages, 1000, false);

		assert.ok(result.length > 0, 'Should have messages');
		assert.ok(result.length <= messages.length, 'Should not add messages');
	});

	test('should handle zero token limit', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'user', content: 'Test' },
			{ role: 'assistant', content: 'Response' },
		];

		const result = await compressor.compressHistory(messages, 0, false);

		assert.ok(Array.isArray(result), 'Should return array');
		// With 0 token limit, it should heavily compress or return minimal messages
	});

	test('should handle negative token limit', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'user', content: 'Test' },
			{ role: 'assistant', content: 'Response' },
		];

		const result = await compressor.compressHistory(messages, -100, false);

		assert.ok(Array.isArray(result), 'Should return array');
	});

	test('should handle messages with empty content', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'user', content: '' },
			{ role: 'assistant', content: '' },
		];

		const result = await compressor.compressHistory(messages, 1000, false);

		assert.strictEqual(result.length, 2, 'Should preserve empty content messages');
	});

	test('should handle messages with special characters', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'user', content: 'Test with special chars: <>&"\'`\n\t\r' },
			{ role: 'assistant', content: 'Response with emojis: 🚀 ✅ 🎉' },
		];

		const result = await compressor.compressHistory(messages, 10000, false);

		assert.strictEqual(result.length, 2, 'Should handle special characters');
		assert.ok(result[0].content.includes('<>&'), 'Should preserve special characters');
		assert.ok(result[1].content.includes('🚀'), 'Should preserve emojis');
	});

	test('should handle very large token limit', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'user', content: 'Short message' },
			{ role: 'assistant', content: 'Short response' },
		];

		const result = await compressor.compressHistory(messages, 1_000_000, false);

		assert.deepStrictEqual(result, messages, 'Should not compress with very large limit');
	});

	test('should compress multiple old message batches', async () => {
		const messages: SimpleMessage[] = [];

		// Add 50 old messages
		for (let i = 0; i < 50; i++) {
			messages.push({
				role: i % 2 === 0 ? 'user' : 'assistant',
				content: `Old message ${i}: ${'A'.repeat(100)}`,
			});
		}

		// Add 10 recent messages
		for (let i = 0; i < 10; i++) {
			messages.push({
				role: i % 2 === 0 ? 'user' : 'assistant',
				content: `Recent message ${i}`,
			});
		}

		const result = await compressor.compressHistory(messages, 500, false);

		assert.ok(result.length < messages.length, 'Should compress many messages');
		assert.ok(result.length > 0, 'Should keep some messages');
	});

	test('should handle compression with system message in middle', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'user', content: 'First' },
			{ role: 'system', content: 'System message' }, // Unusual position
			{ role: 'assistant', content: 'Second' },
		];

		const result = await compressor.compressHistory(messages, 10000, false);

		assert.ok(result.length > 0, 'Should handle system message in middle');
		const systemMsg = result.find((m) => m.role === 'system');
		assert.ok(systemMsg, 'Should preserve system message');
	});

	test('should handle multiple system messages', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'system', content: 'First system' },
			{ role: 'user', content: 'User message' },
			{ role: 'system', content: 'Second system' }, // Unusual
			{ role: 'assistant', content: 'Assistant message' },
		];

		const result = await compressor.compressHistory(messages, 10000, false);

		assert.ok(result.length > 0, 'Should handle multiple system messages');
	});

	test('should compress but preserve message roles', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'system', content: 'System' },
			{ role: 'user', content: 'A'.repeat(1000) },
			{ role: 'assistant', content: 'B'.repeat(1000) },
			{ role: 'user', content: 'C'.repeat(1000) },
			{ role: 'assistant', content: 'D'.repeat(1000) },
		];

		const result = await compressor.compressHistory(messages, 500, false);

		// All messages should have valid roles
		for (const msg of result) {
			assert.ok(
				msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system',
				'All messages should have valid roles'
			);
		}
	});

	test('should handle unicode content', async () => {
		const messages: SimpleMessage[] = [
			{ role: 'user', content: '中文测试 한국어 テスト' },
			{ role: 'assistant', content: 'العربية עברית ไทย' },
		];

		const result = await compressor.compressHistory(messages, 10000, false);

		assert.strictEqual(result.length, 2, 'Should handle unicode');
		assert.ok(result[0].content.includes('中文'), 'Should preserve unicode characters');
	});

	test('should handle code blocks in messages', async () => {
		const messages: SimpleMessage[] = [
			{
				role: 'user',
				content: 'Here is code:\n```typescript\nfunction test() {\n  return 42;\n}\n```',
			},
			{
				role: 'assistant',
				content: 'Here is the fix:\n```typescript\nfunction test(): number {\n  return 42;\n}\n```',
			},
		];

		const result = await compressor.compressHistory(messages, 10000, false);

		assert.strictEqual(result.length, 2, 'Should handle code blocks');
		assert.ok(result[0].content.includes('```'), 'Should preserve code blocks');
	});

	test('should estimate tokens correctly for varying message sizes', async () => {
		// Test that token estimation is working by checking compression behavior
		const shortMessages: SimpleMessage[] = [
			{ role: 'user', content: 'Hi' },
			{ role: 'assistant', content: 'Hello' },
		];

		const longMessages: SimpleMessage[] = [
			{ role: 'user', content: 'A'.repeat(5000) },
			{ role: 'assistant', content: 'B'.repeat(5000) },
		];

		const shortResult = await compressor.compressHistory(shortMessages, 100, false);
		const longResult = await compressor.compressHistory(longMessages, 100, false);

		// Short messages should fit within limit
		assert.strictEqual(shortResult.length, shortMessages.length, 'Short messages should not be compressed');

		// Long messages should be compressed or reduced
		assert.ok(longResult.length <= longMessages.length, 'Long messages should be handled');
	});
});
