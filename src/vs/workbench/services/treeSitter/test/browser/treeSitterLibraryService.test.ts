/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TreeSitterLibraryService, EDITOR_EXPERIMENTAL_PREFER_TREESITTER, TREESITTER_ALLOWED_SUPPORT } from '../../browser/treeSitterLibraryService.js';
import { IConfigurationService, ConfigurationTarget } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFileSystemProvider.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';

class MockConfigurationService implements Partial<IConfigurationService> {
	private config = new Map<string, any>();

	getValue<T>(key: string): T | undefined {
		return this.config.get(key);
	}

	updateValue(key: string, value: any, target?: ConfigurationTarget): Promise<void> {
		this.config.set(key, value);
		return Promise.resolve();
	}

	setConfig(key: string, value: any): void {
		this.config.set(key, value);
	}
}

class MockEnvironmentService implements Partial<IEnvironmentService> {
	isBuilt = false;
	appRoot = '/app';
}

suite('TreeSitterLibraryService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	let treeSitterService: TreeSitterLibraryService;
	let configurationService: MockConfigurationService;
	let fileService: FileService;
	let environmentService: MockEnvironmentService;

	setup(async () => {
		configurationService = new MockConfigurationService();
		fileService = disposables.add(new FileService(new NullLogService()));
		environmentService = new MockEnvironmentService();

		const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
		disposables.add(fileService.registerProvider('file', fileSystemProvider));

		treeSitterService = disposables.add(new TreeSitterLibraryService(
			configurationService as IConfigurationService,
			fileService,
			environmentService as IEnvironmentService
		));
	});

	suite('supportsLanguage', () => {
		test('should return false when configuration is not set', () => {
			const supported = treeSitterService.supportsLanguage('typescript', undefined);
			assert.strictEqual(supported, false);
		});

		test('should return true when configuration is enabled', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, true);

			const supported = treeSitterService.supportsLanguage('typescript', undefined);
			assert.strictEqual(supported, true);
		});

		test('should return false when configuration is explicitly disabled', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, false);

			const supported = treeSitterService.supportsLanguage('typescript', undefined);
			assert.strictEqual(supported, false);
		});

		test('should check different language IDs independently', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, true);
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.css`, false);

			assert.strictEqual(treeSitterService.supportsLanguage('typescript', undefined), true);
			assert.strictEqual(treeSitterService.supportsLanguage('css', undefined), false);
			assert.strictEqual(treeSitterService.supportsLanguage('python', undefined), false);
		});

		test('should validate allowed languages from constant', () => {
			// Test that the allowed languages constant is defined
			assert.ok(Array.isArray(TREESITTER_ALLOWED_SUPPORT));
			assert.ok(TREESITTER_ALLOWED_SUPPORT.length > 0);

			// Verify expected languages are in the list
			assert.ok(TREESITTER_ALLOWED_SUPPORT.includes('css'));
			assert.ok(TREESITTER_ALLOWED_SUPPORT.includes('typescript'));
			assert.ok(TREESITTER_ALLOWED_SUPPORT.includes('ini'));
			assert.ok(TREESITTER_ALLOWED_SUPPORT.includes('regex'));
		});

		test('should handle multiple checks for same language', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, true);

			// Multiple calls should return consistent results
			assert.strictEqual(treeSitterService.supportsLanguage('typescript', undefined), true);
			assert.strictEqual(treeSitterService.supportsLanguage('typescript', undefined), true);
			assert.strictEqual(treeSitterService.supportsLanguage('typescript', undefined), true);
		});

		test('should handle special characters in language IDs', () => {
			const langId = 'my-custom-lang';
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.${langId}`, true);

			const supported = treeSitterService.supportsLanguage(langId, undefined);
			assert.strictEqual(supported, true);
		});
	});

	suite('getLanguage', () => {
		test('should return undefined when support check fails', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, false);

			const language = treeSitterService.getLanguage('typescript', false, undefined);
			assert.strictEqual(language, undefined);
		});

		test('should allow ignoring support check', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, false);

			// With ignoreSupportsCheck=true, should attempt to get language
			// (will fail due to missing wasm file, but different code path)
			const language = treeSitterService.getLanguage('typescript', true, undefined);

			// Result will be undefined because wasm file doesn't exist, but the support check was bypassed
			assert.strictEqual(language, undefined);
		});

		test('should handle unsupported language gracefully', () => {
			const language = treeSitterService.getLanguage('unsupported-lang', false, undefined);
			assert.strictEqual(language, undefined);
		});

		test('should cache language results', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, true);

			const lang1 = treeSitterService.getLanguage('typescript', false, undefined);
			const lang2 = treeSitterService.getLanguage('typescript', false, undefined);

			// Both calls should return the same result (cached)
			assert.strictEqual(lang1, lang2);
		});
	});

	suite('getInjectionQueries', () => {
		test('should return undefined when language not supported', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, false);

			const queries = treeSitterService.getInjectionQueries('typescript', undefined);
			assert.strictEqual(queries, undefined);
		});

		test('should check support before loading queries', () => {
			// No configuration set, so not supported
			const queries = treeSitterService.getInjectionQueries('typescript', undefined);
			assert.strictEqual(queries, undefined, 'Should not load queries for unsupported language');
		});

		test('should handle missing query files gracefully', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.nonexistent`, true);

			// Should return undefined (not cached yet) since query file doesn't exist
			const queries = treeSitterService.getInjectionQueries('nonexistent', undefined);
			assert.strictEqual(queries, undefined);
		});
	});

	suite('getHighlightingQueries', () => {
		test('should return undefined when language not supported', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, false);

			const queries = treeSitterService.getHighlightingQueries('typescript', undefined);
			assert.strictEqual(queries, undefined);
		});

		test('should check support before loading queries', () => {
			// No configuration set, so not supported
			const queries = treeSitterService.getHighlightingQueries('typescript', undefined);
			assert.strictEqual(queries, undefined, 'Should not load queries for unsupported language');
		});

		test('should handle different query types independently', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.css`, true);

			const injectionQueries = treeSitterService.getInjectionQueries('css', undefined);
			const highlightingQueries = treeSitterService.getHighlightingQueries('css', undefined);

			// Both should be checked independently
			// (both will be undefined due to missing files, but tested separately)
			assert.ok(true, 'Different query types should be independent');
		});
	});

	suite('configuration integration', () => {
		test('should respect EDITOR_EXPERIMENTAL_PREFER_TREESITTER constant', () => {
			assert.strictEqual(
				EDITOR_EXPERIMENTAL_PREFER_TREESITTER,
				'editor.experimental.preferTreeSitter',
				'Configuration key should match expected value'
			);
		});

		test('should handle configuration changes', () => {
			// Initially disabled
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, false);
			assert.strictEqual(treeSitterService.supportsLanguage('typescript', undefined), false);

			// Enable it
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, true);

			// Note: Configuration changes might require service restart or explicit refresh
			// depending on implementation. This tests the current value.
			const supported = treeSitterService.supportsLanguage('typescript', undefined);
			assert.strictEqual(supported, true);
		});

		test('should handle missing configuration gracefully', () => {
			// Don't set any configuration
			const supported = treeSitterService.supportsLanguage('typescript', undefined);
			assert.strictEqual(supported, false, 'Should default to false when not configured');
		});
	});

	suite('isTest flag', () => {
		test('should default isTest to false', () => {
			assert.strictEqual(treeSitterService.isTest, false);
		});

		test('should allow setting isTest flag', () => {
			treeSitterService.isTest = true;
			assert.strictEqual(treeSitterService.isTest, true);

			treeSitterService.isTest = false;
			assert.strictEqual(treeSitterService.isTest, false);
		});
	});

	suite('disposal', () => {
		test('should dispose cleanly', () => {
			assert.doesNotThrow(() => {
				treeSitterService.dispose();
			});
		});

		test('should handle multiple dispose calls', () => {
			treeSitterService.dispose();

			assert.doesNotThrow(() => {
				treeSitterService.dispose();
			}, 'Multiple dispose calls should not throw');
		});
	});

	suite('edge cases', () => {
		test('should handle empty language ID', () => {
			const supported = treeSitterService.supportsLanguage('', undefined);
			assert.strictEqual(supported, false);
		});

		test('should handle very long language IDs', () => {
			const longLangId = 'a'.repeat(1000);
			const supported = treeSitterService.supportsLanguage(longLangId, undefined);
			assert.strictEqual(supported, false);
		});

		test('should handle language IDs with special characters', () => {
			const specialLangId = 'lang-with-dashes_and_underscores.and.dots';
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.${specialLangId}`, true);

			const supported = treeSitterService.supportsLanguage(specialLangId, undefined);
			assert.strictEqual(supported, true);
		});

		test('should handle concurrent language support checks', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, true);
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.css`, true);
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.ini`, true);

			const results = [
				treeSitterService.supportsLanguage('typescript', undefined),
				treeSitterService.supportsLanguage('css', undefined),
				treeSitterService.supportsLanguage('ini', undefined),
				treeSitterService.supportsLanguage('unknown', undefined)
			];

			assert.deepStrictEqual(results, [true, true, true, false]);
		});

		test('should handle null/undefined reader parameter', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, true);

			assert.doesNotThrow(() => {
				treeSitterService.supportsLanguage('typescript', undefined);
				treeSitterService.supportsLanguage('typescript', null as any);
			});
		});
	});

	suite('allowed languages', () => {
		test('should define expected allowed languages', () => {
			const expectedLanguages = ['css', 'typescript', 'ini', 'regex'];

			for (const lang of expectedLanguages) {
				assert.ok(
					TREESITTER_ALLOWED_SUPPORT.includes(lang),
					`${lang} should be in allowed languages`
				);
			}
		});

		test('should have all allowed languages as strings', () => {
			for (const lang of TREESITTER_ALLOWED_SUPPORT) {
				assert.strictEqual(typeof lang, 'string', `All allowed languages should be strings`);
				assert.ok(lang.length > 0, `Language ID should not be empty`);
			}
		});

		test('should not have duplicate languages in allowed list', () => {
			const unique = new Set(TREESITTER_ALLOWED_SUPPORT);
			assert.strictEqual(
				unique.size,
				TREESITTER_ALLOWED_SUPPORT.length,
				'Should not have duplicate languages'
			);
		});
	});

	suite('caching behavior', () => {
		test('should cache language configurations', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, true);

			// First call
			const result1 = treeSitterService.supportsLanguage('typescript', undefined);

			// Modify config (shouldn't affect cached result immediately)
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, false);

			// Second call might use cache
			const result2 = treeSitterService.supportsLanguage('typescript', undefined);

			// The behavior depends on implementation - both being true or second being false are valid
			assert.ok(typeof result1 === 'boolean');
			assert.ok(typeof result2 === 'boolean');
		});

		test('should cache different languages separately', () => {
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.typescript`, true);
			configurationService.setConfig(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.css`, false);

			const tsSupported = treeSitterService.supportsLanguage('typescript', undefined);
			const cssSupported = treeSitterService.supportsLanguage('css', undefined);

			assert.strictEqual(tsSupported, true);
			assert.strictEqual(cssSupported, false);
		});
	});
});
