/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { BrowserElevatedFileService } from '../../browser/elevatedFileService.js';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { Schemas } from '../../../../../base/common/network.js';

suite('BrowserElevatedFileService', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	let elevatedFileService: BrowserElevatedFileService;

	setup(() => {
		elevatedFileService = new BrowserElevatedFileService();
	});

	suite('isSupported', () => {
		test('should return false for file:// URIs', () => {
			const fileUri = URI.file('/some/path/file.txt');
			const result = elevatedFileService.isSupported(fileUri);
			assert.strictEqual(result, false, 'Browser should not support elevated file operations');
		});

		test('should return false for http:// URIs', () => {
			const httpUri = URI.parse('http://example.com/file.txt');
			const result = elevatedFileService.isSupported(httpUri);
			assert.strictEqual(result, false);
		});

		test('should return false for https:// URIs', () => {
			const httpsUri = URI.parse('https://example.com/file.txt');
			const result = elevatedFileService.isSupported(httpsUri);
			assert.strictEqual(result, false);
		});

		test('should return false for custom schemes', () => {
			const customUri = URI.parse('vscode-remote://server/path/file.txt');
			const result = elevatedFileService.isSupported(customUri);
			assert.strictEqual(result, false);
		});

		test('should return false for untitled schemes', () => {
			const untitledUri = URI.parse('untitled:Untitled-1');
			const result = elevatedFileService.isSupported(untitledUri);
			assert.strictEqual(result, false);
		});

		test('should return false for vscode-userdata schemes', () => {
			const userDataUri = URI.parse('vscode-userdata:/settings.json');
			const result = elevatedFileService.isSupported(userDataUri);
			assert.strictEqual(result, false);
		});
	});

	suite('writeFileElevated', () => {
		test('should throw error when attempting to write', async () => {
			const uri = URI.file('/some/path/file.txt');
			const content = VSBuffer.fromString('test content');

			await assert.rejects(
				async () => elevatedFileService.writeFileElevated(uri, content),
				/Unsupported/,
				'Should throw unsupported error'
			);
		});

		test('should throw error with VSBufferReadable', async () => {
			const uri = URI.file('/some/path/file.txt');
			const content = VSBuffer.fromString('test content');

			await assert.rejects(
				async () => elevatedFileService.writeFileElevated(uri, content),
				/Unsupported/
			);
		});

		test('should throw error regardless of file scheme', async () => {
			const fileUri = URI.file('/test.txt');
			const httpUri = URI.parse('http://example.com/test.txt');

			await assert.rejects(
				async () => elevatedFileService.writeFileElevated(fileUri, VSBuffer.fromString('test')),
				/Unsupported/
			);

			await assert.rejects(
				async () => elevatedFileService.writeFileElevated(httpUri, VSBuffer.fromString('test')),
				/Unsupported/
			);
		});

		test('should throw error with write options', async () => {
			const uri = URI.file('/test.txt');
			const content = VSBuffer.fromString('test content');
			const options = { overwrite: true, create: true };

			await assert.rejects(
				async () => elevatedFileService.writeFileElevated(uri, content, options),
				/Unsupported/
			);
		});
	});
});
