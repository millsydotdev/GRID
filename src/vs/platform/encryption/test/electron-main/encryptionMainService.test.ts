/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { EncryptionMainService } from '../../electron-main/encryptionMainService.js';
import { KnownStorageProvider } from '../../common/encryptionService.js';
import { NullLogService } from '../../../log/common/log.js';

suite('EncryptionMainService', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	let encryptionService: EncryptionMainService;

	setup(() => {
		encryptionService = new EncryptionMainService(new NullLogService());
	});

	suite('isEncryptionAvailable', () => {
		test('should check encryption availability from safeStorage', async () => {
			const result = await encryptionService.isEncryptionAvailable();
			assert.strictEqual(typeof result, 'boolean', 'Should return a boolean value');
		});
	});

	suite('getKeyStorageProvider', () => {
		test('should return a known storage provider', async () => {
			const result = await encryptionService.getKeyStorageProvider();
			assert.ok(result, 'Should return a provider');
			assert.strictEqual(typeof result, 'string', 'Provider should be a string');

			// Verify it's one of the known providers
			const knownProviders = Object.values(KnownStorageProvider);
			assert.ok(knownProviders.includes(result), `Provider should be one of: ${knownProviders.join(', ')}`);
		});

		test('should return platform-specific provider on Windows', async () => {
			// This test will only verify on Windows
			if (process.platform === 'win32') {
				const result = await encryptionService.getKeyStorageProvider();
				assert.strictEqual(result, KnownStorageProvider.dplib, 'Should return dplib on Windows');
			}
		});

		test('should return platform-specific provider on macOS', async () => {
			// This test will only verify on macOS
			if (process.platform === 'darwin') {
				const result = await encryptionService.getKeyStorageProvider();
				assert.strictEqual(result, KnownStorageProvider.keychainAccess, 'Should return keychain_access on macOS');
			}
		});

		test('should return a provider on Linux', async () => {
			// This test will only verify on Linux
			if (process.platform === 'linux') {
				const result = await encryptionService.getKeyStorageProvider();
				assert.ok(result, 'Should return a provider on Linux');
				// Could be gnome_*, kwallet*, or unknown depending on system
				assert.strictEqual(typeof result, 'string', 'Provider should be a string');
			}
		});
	});

	suite('setUsePlainTextEncryption', () => {
		test('should throw error on Windows', async () => {
			if (process.platform === 'win32') {
				await assert.rejects(
					async () => encryptionService.setUsePlainTextEncryption(),
					/Setting plain text encryption is not supported on Windows/,
					'Should throw error on Windows'
				);
			}
		});

		test('should throw error on macOS', async () => {
			if (process.platform === 'darwin') {
				await assert.rejects(
					async () => encryptionService.setUsePlainTextEncryption(),
					/Setting plain text encryption is not supported on macOS/,
					'Should throw error on macOS'
				);
			}
		});

		test('should handle setUsePlainTextEncryption on Linux', async () => {
			// On Linux, this might succeed or fail depending on Electron build
			if (process.platform === 'linux') {
				try {
					await encryptionService.setUsePlainTextEncryption();
					// If it succeeds, that's fine
					assert.ok(true, 'setUsePlainTextEncryption succeeded on Linux');
				} catch (error) {
					// If it fails with expected error, that's also fine
					assert.ok(
						(error as Error).message.includes('not supported'),
						'Should fail with appropriate error message'
					);
				}
			}
		});
	});

	suite('encrypt', () => {
		test('should encrypt a simple string', async () => {
			const plaintext = 'test-value';
			const encrypted = await encryptionService.encrypt(plaintext);

			assert.ok(encrypted, 'Encrypted value should not be null');
			assert.notStrictEqual(encrypted, plaintext, 'Encrypted value should differ from plaintext');
			assert.strictEqual(typeof encrypted, 'string', 'Encrypted value should be a string');

			// Verify it's valid JSON with data property
			const parsed = JSON.parse(encrypted);
			assert.ok(parsed.data, 'Encrypted value should have data property');
		});

		test('should handle empty string', async () => {
			const encrypted = await encryptionService.encrypt('');
			assert.ok(encrypted, 'Should handle empty string');
			const parsed = JSON.parse(encrypted);
			assert.ok(parsed.data !== undefined, 'Should have data property');
		});

		test('should handle special characters', async () => {
			const specialChars = 'test!@#$%^&*(){}[]|\\:";\'<>?,./~`';
			const encrypted = await encryptionService.encrypt(specialChars);
			assert.ok(encrypted, 'Should encrypt special characters');
			const parsed = JSON.parse(encrypted);
			assert.ok(parsed.data, 'Should have data property');
		});

		test('should handle unicode characters', async () => {
			const unicode = '你好世界 🌍 Привет мир';
			const encrypted = await encryptionService.encrypt(unicode);
			assert.ok(encrypted, 'Should encrypt unicode characters');
			const parsed = JSON.parse(encrypted);
			assert.ok(parsed.data, 'Should have data property');
		});

		test('should handle multiline strings', async () => {
			const multiline = 'line1\nline2\nline3\ttab';
			const encrypted = await encryptionService.encrypt(multiline);
			assert.ok(encrypted, 'Should encrypt multiline strings');
			const parsed = JSON.parse(encrypted);
			assert.ok(parsed.data, 'Should have data property');
		});

		test('should handle JSON data', async () => {
			const jsonData = JSON.stringify({ key: 'value', nested: { data: 123, array: [1, 2, 3] } });
			const encrypted = await encryptionService.encrypt(jsonData);
			assert.ok(encrypted, 'Should encrypt JSON data');
			const parsed = JSON.parse(encrypted);
			assert.ok(parsed.data, 'Should have data property');
		});

		test('should handle large strings', async () => {
			const largeString = 'x'.repeat(10000);
			const encrypted = await encryptionService.encrypt(largeString);
			assert.ok(encrypted, 'Should encrypt large strings');
			const parsed = JSON.parse(encrypted);
			assert.ok(parsed.data, 'Should have data property');
		});
	});

	suite('decrypt', () => {
		test('should decrypt an encrypted value', async () => {
			const plaintext = 'test-value';
			const encrypted = await encryptionService.encrypt(plaintext);
			const decrypted = await encryptionService.decrypt(encrypted);

			assert.strictEqual(decrypted, plaintext, 'Decrypted value should match original');
		});

		test('should handle empty string round-trip', async () => {
			const plaintext = '';
			const encrypted = await encryptionService.encrypt(plaintext);
			const decrypted = await encryptionService.decrypt(encrypted);

			assert.strictEqual(decrypted, plaintext, 'Empty string should round-trip correctly');
		});

		test('should throw on invalid JSON', async () => {
			await assert.rejects(
				async () => encryptionService.decrypt('invalid-json'),
				/Unexpected token/,
				'Should throw on invalid JSON'
			);
		});

		test('should throw on missing data property', async () => {
			const invalidEncrypted = JSON.stringify({ notData: 'value' });
			await assert.rejects(
				async () => encryptionService.decrypt(invalidEncrypted),
				/Invalid encrypted value/,
				'Should throw when data property is missing'
			);
		});

		test('should throw on malformed encrypted data', async () => {
			const malformed = JSON.stringify({ data: 'not-a-buffer' });
			await assert.rejects(
				async () => encryptionService.decrypt(malformed),
				'Should throw on malformed encrypted data'
			);
		});
	});

	suite('encrypt/decrypt round-trip', () => {
		test('should maintain value through round-trip', async () => {
			const original = 'test-value-123';
			const encrypted = await encryptionService.encrypt(original);
			const decrypted = await encryptionService.decrypt(encrypted);

			assert.strictEqual(decrypted, original, 'Value should be preserved through round-trip');
		});

		test('should maintain special characters through round-trip', async () => {
			const original = 'test!@#$%^&*(){}[]|\\:";\'<>?,./~`';
			const encrypted = await encryptionService.encrypt(original);
			const decrypted = await encryptionService.decrypt(encrypted);

			assert.strictEqual(decrypted, original, 'Special characters should be preserved');
		});

		test('should maintain unicode through round-trip', async () => {
			const original = '你好世界 🌍 Привет мир مرحبا';
			const encrypted = await encryptionService.encrypt(original);
			const decrypted = await encryptionService.decrypt(encrypted);

			assert.strictEqual(decrypted, original, 'Unicode should be preserved');
		});

		test('should maintain multiline strings through round-trip', async () => {
			const original = 'line1\nline2\r\nline3\ttab';
			const encrypted = await encryptionService.encrypt(original);
			const decrypted = await encryptionService.decrypt(encrypted);

			assert.strictEqual(decrypted, original, 'Multiline strings should be preserved');
		});

		test('should maintain JSON data through round-trip', async () => {
			const jsonData = { key: 'value', nested: { data: 123, array: [1, 2, 3], bool: true, null: null } };
			const original = JSON.stringify(jsonData);
			const encrypted = await encryptionService.encrypt(original);
			const decrypted = await encryptionService.decrypt(encrypted);

			assert.strictEqual(decrypted, original, 'JSON string should be preserved');
			assert.deepStrictEqual(JSON.parse(decrypted), jsonData, 'Parsed JSON should match');
		});

		test('should maintain large strings through round-trip', async () => {
			const original = 'Long text with varied content: ' + 'x'.repeat(5000) + ' end';
			const encrypted = await encryptionService.encrypt(original);
			const decrypted = await encryptionService.decrypt(encrypted);

			assert.strictEqual(decrypted, original, 'Large strings should be preserved');
		});

		test('should handle multiple sequential encryptions', async () => {
			const values = ['value1', 'value2', 'value3', 'value4', 'value5'];
			const encrypted = await Promise.all(values.map(v => encryptionService.encrypt(v)));
			const decrypted = await Promise.all(encrypted.map(e => encryptionService.decrypt(e)));

			assert.deepStrictEqual(decrypted, values, 'All values should be preserved');
		});
	});
});
