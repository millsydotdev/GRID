/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { BrowserSecretStorageService } from '../../browser/secretStorageService.js';
import { ISecretStorageProvider } from '../../../../../platform/secrets/common/secrets.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { EncryptionService } from '../../../encryption/browser/encryptionService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { TestEnvironmentService } from '../../../../test/browser/workbenchTestServices.js';

suite('BrowserSecretStorageService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	suite('without embedder provider', () => {
		let secretStorageService: BrowserSecretStorageService;
		let storageService: TestStorageService;

		setup(() => {
			storageService = disposables.add(new TestStorageService());
			const encryptionService = new EncryptionService();
			const environmentService = TestEnvironmentService;

			secretStorageService = disposables.add(
				new BrowserSecretStorageService(
					storageService,
					encryptionService,
					environmentService,
					new NullLogService()
				)
			);
		});

		test('should get undefined for non-existent key', async () => {
			const result = await secretStorageService.get('non-existent-key');
			assert.strictEqual(result, undefined, 'Should return undefined for non-existent key');
		});

		test('should set and get a secret', async () => {
			const key = 'test-key';
			const value = 'test-value';

			await secretStorageService.set(key, value);
			const result = await secretStorageService.get(key);

			assert.strictEqual(result, value, 'Should retrieve the stored secret');
		});

		test('should handle empty string value', async () => {
			const key = 'empty-key';
			const value = '';

			await secretStorageService.set(key, value);
			const result = await secretStorageService.get(key);

			assert.strictEqual(result, value, 'Should handle empty string');
		});

		test('should handle special characters in value', async () => {
			const key = 'special-key';
			const value = 'test!@#$%^&*(){}[]|\\:";\'<>?,./~`';

			await secretStorageService.set(key, value);
			const result = await secretStorageService.get(key);

			assert.strictEqual(result, value, 'Should handle special characters');
		});

		test('should handle unicode characters in value', async () => {
			const key = 'unicode-key';
			const value = '你好世界 🌍 Привет мир';

			await secretStorageService.set(key, value);
			const result = await secretStorageService.get(key);

			assert.strictEqual(result, value, 'Should handle unicode characters');
		});

		test('should handle JSON data', async () => {
			const key = 'json-key';
			const jsonData = { key: 'value', nested: { data: 123 } };
			const value = JSON.stringify(jsonData);

			await secretStorageService.set(key, value);
			const result = await secretStorageService.get(key);

			assert.strictEqual(result, value, 'Should handle JSON string');
			assert.deepStrictEqual(JSON.parse(result!), jsonData, 'Parsed JSON should match');
		});

		test('should handle multiline strings', async () => {
			const key = 'multiline-key';
			const value = 'line1\nline2\nline3';

			await secretStorageService.set(key, value);
			const result = await secretStorageService.get(key);

			assert.strictEqual(result, value, 'Should handle multiline strings');
		});

		test('should update existing secret', async () => {
			const key = 'update-key';
			const value1 = 'initial-value';
			const value2 = 'updated-value';

			await secretStorageService.set(key, value1);
			let result = await secretStorageService.get(key);
			assert.strictEqual(result, value1, 'Should store initial value');

			await secretStorageService.set(key, value2);
			result = await secretStorageService.get(key);
			assert.strictEqual(result, value2, 'Should update to new value');
		});

		test('should delete a secret', async () => {
			const key = 'delete-key';
			const value = 'delete-value';

			await secretStorageService.set(key, value);
			let result = await secretStorageService.get(key);
			assert.strictEqual(result, value, 'Should store value');

			await secretStorageService.delete(key);
			result = await secretStorageService.get(key);
			assert.strictEqual(result, undefined, 'Should delete value');
		});

		test('should not throw when deleting non-existent key', async () => {
			await assert.doesNotReject(
				async () => secretStorageService.delete('non-existent'),
				'Should not throw when deleting non-existent key'
			);
		});

		test('should list all secret keys', async () => {
			await secretStorageService.set('key1', 'value1');
			await secretStorageService.set('key2', 'value2');
			await secretStorageService.set('key3', 'value3');

			const keys = await secretStorageService.keys();

			assert.ok(keys.includes('key1'), 'Should include key1');
			assert.ok(keys.includes('key2'), 'Should include key2');
			assert.ok(keys.includes('key3'), 'Should include key3');
			assert.strictEqual(keys.length, 3, 'Should have exactly 3 keys');
		});

		test('should return empty array when no secrets exist', async () => {
			const keys = await secretStorageService.keys();
			assert.deepStrictEqual(keys, [], 'Should return empty array');
		});

		test('should emit event when secret changes', async () => {
			const key = 'event-key';
			const value = 'event-value';

			const changePromise = Event.toPromise(secretStorageService.onDidChangeSecret);

			await secretStorageService.set(key, value);

			const changedKey = await changePromise;
			assert.strictEqual(changedKey, key, 'Should emit event with correct key');
		});

		test('should handle concurrent operations on same key', async () => {
			const key = 'concurrent-key';

			// Queue multiple operations
			const operations = [
				secretStorageService.set(key, 'value1'),
				secretStorageService.set(key, 'value2'),
				secretStorageService.set(key, 'value3')
			];

			await Promise.all(operations);

			const result = await secretStorageService.get(key);
			assert.ok(['value1', 'value2', 'value3'].includes(result!), 'Should have one of the values');
		});

		test('should handle concurrent operations on different keys', async () => {
			const operations = [
				secretStorageService.set('key1', 'value1'),
				secretStorageService.set('key2', 'value2'),
				secretStorageService.set('key3', 'value3')
			];

			await Promise.all(operations);

			const [result1, result2, result3] = await Promise.all([
				secretStorageService.get('key1'),
				secretStorageService.get('key2'),
				secretStorageService.get('key3')
			]);

			assert.strictEqual(result1, 'value1');
			assert.strictEqual(result2, 'value2');
			assert.strictEqual(result3, 'value3');
		});

		test('should have in-memory type in browser', () => {
			assert.strictEqual(secretStorageService.type, 'in-memory', 'Should use in-memory storage in browser');
		});

		test('should handle multiple get operations without set', async () => {
			const key = 'get-only-key';

			const [result1, result2, result3] = await Promise.all([
				secretStorageService.get(key),
				secretStorageService.get(key),
				secretStorageService.get(key)
			]);

			assert.strictEqual(result1, undefined);
			assert.strictEqual(result2, undefined);
			assert.strictEqual(result3, undefined);
		});
	});

	suite('with embedder provider', () => {
		let secretStorageService: BrowserSecretStorageService;
		let mockProvider: ISecretStorageProvider;
		let providerStorage: Map<string, string>;

		setup(() => {
			providerStorage = new Map();

			mockProvider = {
				type: 'persisted',
				get: async (key: string) => providerStorage.get(key),
				set: async (key: string, value: string) => { providerStorage.set(key, value); },
				delete: async (key: string) => { providerStorage.delete(key); },
				keys: async () => Array.from(providerStorage.keys())
			};

			const storageService = disposables.add(new TestStorageService());
			const encryptionService = new EncryptionService();
			const environmentService = {
				...TestEnvironmentService,
				options: {
					secretStorageProvider: mockProvider
				}
			};

			secretStorageService = disposables.add(
				new BrowserSecretStorageService(
					storageService,
					encryptionService,
					environmentService,
					new NullLogService()
				)
			);
		});

		test('should use embedder provider for get', async () => {
			const key = 'embedder-key';
			const value = 'embedder-value';

			providerStorage.set(key, value);

			const result = await secretStorageService.get(key);
			assert.strictEqual(result, value, 'Should get value from embedder provider');
		});

		test('should use embedder provider for set', async () => {
			const key = 'embedder-set-key';
			const value = 'embedder-set-value';

			await secretStorageService.set(key, value);

			assert.strictEqual(providerStorage.get(key), value, 'Should set value in embedder provider');
		});

		test('should use embedder provider for delete', async () => {
			const key = 'embedder-delete-key';
			const value = 'embedder-delete-value';

			providerStorage.set(key, value);
			assert.ok(providerStorage.has(key), 'Key should exist initially');

			await secretStorageService.delete(key);

			assert.strictEqual(providerStorage.has(key), false, 'Key should be deleted');
		});

		test('should use embedder provider for keys', async () => {
			providerStorage.set('key1', 'value1');
			providerStorage.set('key2', 'value2');

			const keys = await secretStorageService.keys();

			assert.ok(keys.includes('key1'));
			assert.ok(keys.includes('key2'));
		});

		test('should emit event when using embedder provider set', async () => {
			const key = 'embedder-event-key';
			const value = 'embedder-event-value';

			const changePromise = Event.toPromise(secretStorageService.onDidChangeSecret);

			await secretStorageService.set(key, value);

			const changedKey = await changePromise;
			assert.strictEqual(changedKey, key, 'Should emit event with correct key');
		});

		test('should emit event when using embedder provider delete', async () => {
			const key = 'embedder-delete-event-key';
			const value = 'embedder-delete-event-value';

			providerStorage.set(key, value);

			const changePromise = Event.toPromise(secretStorageService.onDidChangeSecret);

			await secretStorageService.delete(key);

			const changedKey = await changePromise;
			assert.strictEqual(changedKey, key, 'Should emit event with correct key');
		});

		test('should have persisted type with embedder provider', () => {
			assert.strictEqual(secretStorageService.type, 'persisted', 'Should use persisted type with embedder provider');
		});

		test('should handle sequential operations through embedder sequencer', async () => {
			const key = 'sequential-key';

			await secretStorageService.set(key, 'value1');
			await secretStorageService.set(key, 'value2');
			await secretStorageService.set(key, 'value3');

			const result = await secretStorageService.get(key);
			assert.strictEqual(result, 'value3', 'Should have final value');
		});

		test('should throw when keys() not supported by provider', async () => {
			const providerWithoutKeys: ISecretStorageProvider = {
				type: 'persisted',
				get: async (key: string) => providerStorage.get(key),
				set: async (key: string, value: string) => { providerStorage.set(key, value); },
				delete: async (key: string) => { providerStorage.delete(key); }
				// keys method not provided
			};

			const storageService = disposables.add(new TestStorageService());
			const encryptionService = new EncryptionService();
			const environmentService = {
				...TestEnvironmentService,
				options: {
					secretStorageProvider: providerWithoutKeys
				}
			};

			const service = disposables.add(
				new BrowserSecretStorageService(
					storageService,
					encryptionService,
					environmentService,
					new NullLogService()
				)
			);

			await assert.rejects(
				async () => service.keys(),
				/does not support keys/,
				'Should throw when keys() not supported'
			);
		});
	});
});
