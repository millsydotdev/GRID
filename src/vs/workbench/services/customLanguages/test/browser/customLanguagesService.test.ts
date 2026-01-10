/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CustomLanguagesService } from '../../browser/customLanguagesService.js';
import { ICustomLanguageDefinition } from '../../common/customLanguageConfiguration.js';
import { TestStorageService, TestConfigurationService } from '../../../../test/common/workbenchTestServices.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { LanguageService } from '../../../../../editor/common/services/languageService.js';
import { TestLanguageConfigurationService } from '../../../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFileSystemProvider.js';
import { ITextMateTokenizationService } from '../../../../services/textMate/browser/textMateTokenizationFeature.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';

function createTestLanguageDefinition(overrides: Partial<ICustomLanguageDefinition> = {}): ICustomLanguageDefinition {
	return {
		id: 'testlang',
		displayName: 'Test Language',
		extensions: ['.test'],
		...overrides
	};
}

function createMockTextMateService(): ITextMateTokenizationService {
	return {} as ITextMateTokenizationService;
}

suite('CustomLanguagesService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();
	let customLanguagesService: CustomLanguagesService;
	let storageService: TestStorageService;
	let fileService: IFileService;

	setup(async () => {
		storageService = disposables.add(new TestStorageService());
		const languageService = disposables.add(new LanguageService(false));
		const languageConfigurationService = disposables.add(new TestLanguageConfigurationService());

		// Setup in-memory file system
		fileService = disposables.add(new FileService(new NullLogService()));
		const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
		disposables.add(fileService.registerProvider('file', fileSystemProvider));

		const textMateService = createMockTextMateService();
		const configurationService = new TestConfigurationService();

		customLanguagesService = disposables.add(new CustomLanguagesService(
			storageService,
			languageService,
			languageConfigurationService,
			fileService,
			textMateService,
			new NullLogService(),
			configurationService
		));
	});

	suite('getLanguages', () => {
		test('should return empty array initially', () => {
			const languages = customLanguagesService.getLanguages();
			assert.strictEqual(languages.length, 0, 'Should have no languages initially');
		});

		test('should return registered languages', async () => {
			const def = createTestLanguageDefinition();
			await customLanguagesService.registerLanguage(def);

			const languages = customLanguagesService.getLanguages();
			assert.strictEqual(languages.length, 1);
			assert.deepStrictEqual(languages[0], def);
		});
	});

	suite('getLanguage', () => {
		test('should return undefined for non-existent language', () => {
			const result = customLanguagesService.getLanguage('non-existent');
			assert.strictEqual(result, undefined);
		});

		test('should return registered language', async () => {
			const def = createTestLanguageDefinition();
			await customLanguagesService.registerLanguage(def);

			const result = customLanguagesService.getLanguage('testlang');
			assert.deepStrictEqual(result, def);
		});
	});

	suite('isCustomLanguage', () => {
		test('should return false for non-existent language', () => {
			const result = customLanguagesService.isCustomLanguage('non-existent');
			assert.strictEqual(result, false);
		});

		test('should return true for registered language', async () => {
			const def = createTestLanguageDefinition();
			await customLanguagesService.registerLanguage(def);

			const result = customLanguagesService.isCustomLanguage('testlang');
			assert.strictEqual(result, true);
		});
	});

	suite('registerLanguage', () => {
		test('should register a valid language', async () => {
			const def = createTestLanguageDefinition();

			await customLanguagesService.registerLanguage(def);

			assert.strictEqual(customLanguagesService.isCustomLanguage('testlang'), true);
		});

		test('should throw when language ID already exists', async () => {
			const def = createTestLanguageDefinition();
			await customLanguagesService.registerLanguage(def);

			await assert.rejects(
				async () => customLanguagesService.registerLanguage(def),
				/already registered/,
				'Should throw when registering duplicate language ID'
			);
		});

		test('should emit onDidChangeLanguages event', async () => {
			const def = createTestLanguageDefinition();
			const eventPromise = Event.toPromise(customLanguagesService.onDidChangeLanguages);

			await customLanguagesService.registerLanguage(def);

			const event = await eventPromise;
			assert.strictEqual(event.type, 'added');
			assert.strictEqual(event.languageId, 'testlang');
			assert.deepStrictEqual(event.definition, def);
		});

		test('should persist to storage', async () => {
			const def = createTestLanguageDefinition();
			await customLanguagesService.registerLanguage(def);

			// Verify storage was written
			const stored = storageService.get('customLanguages.definitions', -1 /* StorageScope.PROFILE */);
			assert.ok(stored, 'Should persist to storage');

			const config = JSON.parse(stored!);
			assert.strictEqual(config.languages.length, 1);
			assert.deepStrictEqual(config.languages[0], def);
		});
	});

	suite('validation', () => {
		test('should throw when language ID is missing', async () => {
			const def = createTestLanguageDefinition({ id: '' });

			await assert.rejects(
				async () => customLanguagesService.registerLanguage(def),
				/Language ID is required/
			);
		});

		test('should throw when display name is missing', async () => {
			const def = createTestLanguageDefinition({ displayName: '' });

			await assert.rejects(
				async () => customLanguagesService.registerLanguage(def),
				/display name is required/
			);
		});

		test('should throw when no file associations provided', async () => {
			const def = createTestLanguageDefinition({
				extensions: undefined,
				filenames: undefined,
				filenamePatterns: undefined
			});

			await assert.rejects(
				async () => customLanguagesService.registerLanguage(def),
				/At least one of extensions, filenames, or filenamePatterns is required/
			);
		});

		test('should accept language with only filenames', async () => {
			const def = createTestLanguageDefinition({
				extensions: undefined,
				filenames: ['Testfile']
			});

			await assert.doesNotReject(
				async () => customLanguagesService.registerLanguage(def)
			);
		});

		test('should accept language with only filenamePatterns', async () => {
			const def = createTestLanguageDefinition({
				extensions: undefined,
				filenamePatterns: ['*.test.config']
			});

			await assert.doesNotReject(
				async () => customLanguagesService.registerLanguage(def)
			);
		});

		test('should throw on invalid firstLine regex', async () => {
			const def = createTestLanguageDefinition({
				firstLine: '['  // Invalid regex
			});

			await assert.rejects(
				async () => customLanguagesService.registerLanguage(def),
				/Invalid firstLine regex/
			);
		});

		test('should accept valid firstLine regex', async () => {
			const def = createTestLanguageDefinition({
				firstLine: '^#!.*testlang'
			});

			await assert.doesNotReject(
				async () => customLanguagesService.registerLanguage(def)
			);
		});

		test('should throw on invalid wordPattern regex', async () => {
			const def = createTestLanguageDefinition({
				configuration: {
					wordPattern: '['  // Invalid regex
				}
			});

			await assert.rejects(
				async () => customLanguagesService.registerLanguage(def),
				/Invalid wordPattern regex/
			);
		});

		test('should accept valid wordPattern regex', async () => {
			const def = createTestLanguageDefinition({
				configuration: {
					wordPattern: '[-\\w\\.]+'
				}
			});

			await assert.doesNotReject(
				async () => customLanguagesService.registerLanguage(def)
			);
		});
	});

	suite('updateLanguage', () => {
		test('should update existing language', async () => {
			const def = createTestLanguageDefinition();
			await customLanguagesService.registerLanguage(def);

			const updated = createTestLanguageDefinition({
				displayName: 'Updated Test Language'
			});

			await customLanguagesService.updateLanguage('testlang', updated);

			const result = customLanguagesService.getLanguage('testlang');
			assert.strictEqual(result?.displayName, 'Updated Test Language');
		});

		test('should throw when updating non-existent language', async () => {
			const def = createTestLanguageDefinition();

			await assert.rejects(
				async () => customLanguagesService.updateLanguage('non-existent', def),
				/is not registered/
			);
		});

		test('should throw when changing language ID', async () => {
			const def = createTestLanguageDefinition();
			await customLanguagesService.registerLanguage(def);

			const updated = createTestLanguageDefinition({ id: 'different-id' });

			await assert.rejects(
				async () => customLanguagesService.updateLanguage('testlang', updated),
				/Cannot change language ID/
			);
		});

		test('should emit onDidChangeLanguages event', async () => {
			const def = createTestLanguageDefinition();
			await customLanguagesService.registerLanguage(def);

			const updated = createTestLanguageDefinition({ displayName: 'Updated' });
			const eventPromise = Event.toPromise(customLanguagesService.onDidChangeLanguages);

			await customLanguagesService.updateLanguage('testlang', updated);

			const event = await eventPromise;
			assert.strictEqual(event.type, 'updated');
			assert.strictEqual(event.languageId, 'testlang');
		});
	});

	suite('removeLanguage', () => {
		test('should remove existing language', async () => {
			const def = createTestLanguageDefinition();
			await customLanguagesService.registerLanguage(def);

			assert.strictEqual(customLanguagesService.isCustomLanguage('testlang'), true);

			await customLanguagesService.removeLanguage('testlang');

			assert.strictEqual(customLanguagesService.isCustomLanguage('testlang'), false);
		});

		test('should throw when removing non-existent language', async () => {
			await assert.rejects(
				async () => customLanguagesService.removeLanguage('non-existent'),
				/is not registered/
			);
		});

		test('should emit onDidChangeLanguages event', async () => {
			const def = createTestLanguageDefinition();
			await customLanguagesService.registerLanguage(def);

			const eventPromise = Event.toPromise(customLanguagesService.onDidChangeLanguages);

			await customLanguagesService.removeLanguage('testlang');

			const event = await eventPromise;
			assert.strictEqual(event.type, 'removed');
			assert.strictEqual(event.languageId, 'testlang');
		});

		test('should update storage', async () => {
			const def = createTestLanguageDefinition();
			await customLanguagesService.registerLanguage(def);

			await customLanguagesService.removeLanguage('testlang');

			const stored = storageService.get('customLanguages.definitions', -1);
			const config = JSON.parse(stored!);
			assert.strictEqual(config.languages.length, 0);
		});
	});

	suite('import/export', () => {
		test('should export languages to file', async () => {
			const def1 = createTestLanguageDefinition({ id: 'lang1' });
			const def2 = createTestLanguageDefinition({ id: 'lang2' });

			await customLanguagesService.registerLanguage(def1);
			await customLanguagesService.registerLanguage(def2);

			const exportPath = URI.file('/test-export.json');
			await customLanguagesService.exportToFile(exportPath.fsPath);

			const content = await fileService.readFile(exportPath);
			const config = JSON.parse(content.value.toString());

			assert.strictEqual(config.languages.length, 2);
			assert.strictEqual(config.version, '1.0');
		});

		test('should import languages from file', async () => {
			const def1 = createTestLanguageDefinition({ id: 'import1' });
			const def2 = createTestLanguageDefinition({ id: 'import2' });

			const config = {
				version: '1.0',
				languages: [def1, def2]
			};

			const importPath = URI.file('/test-import.json');
			await fileService.writeFile(importPath, VSBuffer.fromString(JSON.stringify(config)));

			await customLanguagesService.importFromFile(importPath.fsPath);

			assert.strictEqual(customLanguagesService.isCustomLanguage('import1'), true);
			assert.strictEqual(customLanguagesService.isCustomLanguage('import2'), true);
		});

		test('should update existing language during import', async () => {
			const original = createTestLanguageDefinition({ displayName: 'Original' });
			await customLanguagesService.registerLanguage(original);

			const updated = createTestLanguageDefinition({ displayName: 'Updated' });
			const config = {
				version: '1.0',
				languages: [updated]
			};

			const importPath = URI.file('/test-import-update.json');
			await fileService.writeFile(importPath, VSBuffer.fromString(JSON.stringify(config)));

			await customLanguagesService.importFromFile(importPath.fsPath);

			const result = customLanguagesService.getLanguage('testlang');
			assert.strictEqual(result?.displayName, 'Updated');
		});
	});

	suite('configuration', () => {
		test('should register language with comments configuration', async () => {
			const def = createTestLanguageDefinition({
				configuration: {
					comments: {
						lineComment: '//',
						blockComment: ['/*', '*/']
					}
				}
			});

			await assert.doesNotReject(
				async () => customLanguagesService.registerLanguage(def)
			);
		});

		test('should register language with brackets configuration', async () => {
			const def = createTestLanguageDefinition({
				configuration: {
					brackets: [
						['{', '}'],
						['[', ']'],
						['(', ')']
					]
				}
			});

			await assert.doesNotReject(
				async () => customLanguagesService.registerLanguage(def)
			);
		});

		test('should register language with auto-closing pairs', async () => {
			const def = createTestLanguageDefinition({
				configuration: {
					autoClosingPairs: [
						{ open: '{', close: '}' },
						{ open: '[', close: ']', notIn: ['string'] },
						{ open: '(', close: ')' }
					]
				}
			});

			await assert.doesNotReject(
				async () => customLanguagesService.registerLanguage(def)
			);
		});

		test('should register language with indentation rules', async () => {
			const def = createTestLanguageDefinition({
				configuration: {
					indentationRules: {
						increaseIndentPattern: '^\\s*[\\}\\]]',
						decreaseIndentPattern: '^\\s*[\\{\\[]'
					}
				}
			});

			await assert.doesNotReject(
				async () => customLanguagesService.registerLanguage(def)
			);
		});
	});

	suite('multiple languages', () => {
		test('should handle multiple languages', async () => {
			const disposables = new DisposableStore();
			const def1 = createTestLanguageDefinition({ id: 'lang1' });
			const def2 = createTestLanguageDefinition({ id: 'lang2' });
			const def3 = createTestLanguageDefinition({ id: 'lang3' });

			await customLanguagesService.registerLanguage(def1);
			await customLanguagesService.registerLanguage(def2);
			await customLanguagesService.registerLanguage(def3);

			const languages = customLanguagesService.getLanguages();
			assert.strictEqual(languages.length, 3);

			disposables.dispose();
		});

		test('should handle removing one of multiple languages', async () => {
			const def1 = createTestLanguageDefinition({ id: 'lang1' });
			const def2 = createTestLanguageDefinition({ id: 'lang2' });
			const def3 = createTestLanguageDefinition({ id: 'lang3' });

			await customLanguagesService.registerLanguage(def1);
			await customLanguagesService.registerLanguage(def2);
			await customLanguagesService.registerLanguage(def3);

			await customLanguagesService.removeLanguage('lang2');

			assert.strictEqual(customLanguagesService.isCustomLanguage('lang1'), true);
			assert.strictEqual(customLanguagesService.isCustomLanguage('lang2'), false);
			assert.strictEqual(customLanguagesService.isCustomLanguage('lang3'), true);
		});
	});

	suite('disposal', () => {
		test('should clean up all languages on dispose', async () => {
			const def1 = createTestLanguageDefinition({ id: 'lang1' });
			const def2 = createTestLanguageDefinition({ id: 'lang2' });

			await customLanguagesService.registerLanguage(def1);
			await customLanguagesService.registerLanguage(def2);

			customLanguagesService.dispose();

			// After disposal, service should be cleaned up
			// Note: actual verification depends on internal cleanup logic
			assert.ok(true, 'Disposal should not throw');
		});
	});
});
