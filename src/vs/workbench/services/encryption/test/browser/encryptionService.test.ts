/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EncryptionService } from '../../browser/encryptionService.js';
import { KnownStorageProvider } from '../../../../../platform/encryption/common/encryptionService.js';

suite('EncryptionService (Browser)', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	let encryptionService: EncryptionService;

	setup(() => {
		encryptionService = new EncryptionService();
	});

	suite('encrypt', () => {
		test('should return plaintext value (no-op encryption)', async () => {
			const plaintext = 'test-value';
			const result = await encryptionService.encrypt(plaintext);
			assert.strictEqual(result, plaintext, 'Browser encryption should return plaintext');
		});

		test('should handle empty string', async () => {
			const result = await encryptionService.encrypt('');
			assert.strictEqual(result, '', 'Should handle empty string');
		});

		test('should handle special characters', async () => {
			const specialChars = 'test!@#$%^&*(){}[]|\\:";\'<>?,./~`';
			const result = await encryptionService.encrypt(specialChars);
			assert.strictEqual(result, specialChars, 'Should handle special characters');
		});

		test('should handle unicode characters', async () => {
			const unicode = '你好世界 🌍 Привет';
			const result = await encryptionService.encrypt(unicode);
			assert.strictEqual(result, unicode, 'Should handle unicode characters');
		});

		test('should handle multiline strings', async () => {
			const multiline = 'line1\nline2\nline3';
			const result = await encryptionService.encrypt(multiline);
			assert.strictEqual(result, multiline, 'Should handle multiline strings');
		});

		test('should handle large strings', async () => {
			const largeString = 'x'.repeat(10000);
			const result = await encryptionService.encrypt(largeString);
			assert.strictEqual(result, largeString, 'Should handle large strings');
		});
	});

	suite('decrypt', () => {
		test('should return plaintext value (no-op decryption)', async () => {
			const plaintext = 'test-value';
			const result = await encryptionService.decrypt(plaintext);
			assert.strictEqual(result, plaintext, 'Browser decryption should return plaintext');
		});

		test('should handle empty string', async () => {
			const result = await encryptionService.decrypt('');
			assert.strictEqual(result, '', 'Should handle empty string');
		});

		test('should handle special characters', async () => {
			const specialChars = 'test!@#$%^&*(){}[]|\\:";\'<>?,./~`';
			const result = await encryptionService.decrypt(specialChars);
			assert.strictEqual(result, specialChars, 'Should handle special characters');
		});

		test('should handle unicode characters', async () => {
			const unicode = '你好世界 🌍 Привет';
			const result = await encryptionService.decrypt(unicode);
			assert.strictEqual(result, unicode, 'Should handle unicode characters');
		});
	});

	suite('encrypt/decrypt round-trip', () => {
		test('should maintain value through encrypt/decrypt cycle', async () => {
			const original = 'test-value';
			const encrypted = await encryptionService.encrypt(original);
			const decrypted = await encryptionService.decrypt(encrypted);
			assert.strictEqual(decrypted, original, 'Value should be preserved through round-trip');
		});

		test('should maintain JSON data through round-trip', async () => {
			const jsonData = JSON.stringify({ key: 'value', nested: { data: 123 } });
			const encrypted = await encryptionService.encrypt(jsonData);
			const decrypted = await encryptionService.decrypt(encrypted);
			assert.strictEqual(decrypted, jsonData, 'JSON data should be preserved');
			assert.deepStrictEqual(JSON.parse(decrypted), JSON.parse(jsonData), 'Parsed JSON should match');
		});
	});

	suite('isEncryptionAvailable', () => {
		test('should return false in browser environment', async () => {
			const result = await encryptionService.isEncryptionAvailable();
			assert.strictEqual(result, false, 'Encryption should not be available in browser');
		});
	});

	suite('getKeyStorageProvider', () => {
		test('should return basicText provider', async () => {
			const result = await encryptionService.getKeyStorageProvider();
			assert.strictEqual(result, KnownStorageProvider.basicText, 'Should return basic_text provider');
		});
	});

	suite('setUsePlainTextEncryption', () => {
		test('should resolve without error (no-op)', async () => {
			await assert.doesNotReject(
				async () => encryptionService.setUsePlainTextEncryption(),
				'Should not reject'
			);
		});
	});
});
