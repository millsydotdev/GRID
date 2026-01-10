/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { UserDataSyncEnablementService } from '../../browser/userDataSyncEnablementService.js';
import { SyncResource } from '../../../../../platform/userDataSync/common/userDataSync.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../environment/browser/environmentService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';

class MockBrowserWorkbenchEnvironmentService implements Partial<IBrowserWorkbenchEnvironmentService> {
	options: any = {
		settingsSyncOptions: {
			extensionsSyncStateVersion: undefined
		}
	};

	setExtensionsSyncStateVersion(version: string | undefined): void {
		if (!this.options.settingsSyncOptions) {
			this.options.settingsSyncOptions = {};
		}
		this.options.settingsSyncOptions.extensionsSyncStateVersion = version;
	}
}

suite('UserDataSyncEnablementService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	let userDataSyncEnablementService: UserDataSyncEnablementService;
	let environmentService: MockBrowserWorkbenchEnvironmentService;
	let storageService: TestStorageService;

	setup(() => {
		environmentService = new MockBrowserWorkbenchEnvironmentService();
		storageService = disposables.add(new TestStorageService());

		userDataSyncEnablementService = disposables.add(new UserDataSyncEnablementService(
			storageService,
			environmentService as IBrowserWorkbenchEnvironmentService
		));
	});

	suite('getResourceSyncStateVersion', () => {
		test('should return undefined when no version is set', () => {
			const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, undefined);
		});

		test('should return version for Extensions resource when set', () => {
			environmentService.setExtensionsSyncStateVersion('1.2.3');

			const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, '1.2.3');
		});

		test('should return undefined for non-Extensions resources', () => {
			environmentService.setExtensionsSyncStateVersion('1.2.3');

			const settingsVersion = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Settings);
			const keybindingsVersion = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Keybindings);
			const snippetsVersion = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Snippets);
			const globalStateVersion = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.GlobalState);

			assert.strictEqual(settingsVersion, undefined);
			assert.strictEqual(keybindingsVersion, undefined);
			assert.strictEqual(snippetsVersion, undefined);
			assert.strictEqual(globalStateVersion, undefined);
		});

		test('should handle version changes', () => {
			environmentService.setExtensionsSyncStateVersion('1.0.0');
			let version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, '1.0.0');

			environmentService.setExtensionsSyncStateVersion('2.0.0');
			version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, '2.0.0');
		});

		test('should handle version being unset', () => {
			environmentService.setExtensionsSyncStateVersion('1.0.0');
			let version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, '1.0.0');

			environmentService.setExtensionsSyncStateVersion(undefined);
			version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, undefined);
		});

		test('should handle empty string version', () => {
			environmentService.setExtensionsSyncStateVersion('');

			const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, '');
		});

		test('should handle special version strings', () => {
			const specialVersions = [
				'v1.2.3',
				'1.2.3-beta',
				'1.2.3-rc.1',
				'latest',
				'0.0.0',
				'999.999.999'
			];

			for (const specialVersion of specialVersions) {
				environmentService.setExtensionsSyncStateVersion(specialVersion);
				const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
				assert.strictEqual(version, specialVersion, `Should handle version: ${specialVersion}`);
			}
		});

		test('should handle version with metadata', () => {
			environmentService.setExtensionsSyncStateVersion('1.2.3+build.123');

			const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, '1.2.3+build.123');
		});
	});

	suite('sync resources', () => {
		test('should handle all sync resource types', () => {
			const resources = [
				SyncResource.Settings,
				SyncResource.Keybindings,
				SyncResource.Snippets,
				SyncResource.Extensions,
				SyncResource.GlobalState
			];

			environmentService.setExtensionsSyncStateVersion('1.0.0');

			for (const resource of resources) {
				const version = userDataSyncEnablementService.getResourceSyncStateVersion(resource);

				if (resource === SyncResource.Extensions) {
					assert.strictEqual(version, '1.0.0', 'Extensions should have version');
				} else {
					assert.strictEqual(version, undefined, `${resource} should not have version`);
				}
			}
		});

		test('should not confuse different resources', () => {
			environmentService.setExtensionsSyncStateVersion('extension-version');

			// Only Extensions should return the version
			assert.strictEqual(
				userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions),
				'extension-version'
			);

			// All others should return undefined
			assert.strictEqual(
				userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Settings),
				undefined
			);
		});
	});

	suite('environment service integration', () => {
		test('should handle missing settingsSyncOptions', () => {
			environmentService.options = {};

			const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, undefined);
		});

		test('should handle null settingsSyncOptions', () => {
			environmentService.options = { settingsSyncOptions: null };

			const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, undefined);
		});

		test('should handle missing options entirely', () => {
			environmentService.options = undefined;

			const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, undefined);
		});

		test('should work with properly structured options', () => {
			environmentService.options = {
				settingsSyncOptions: {
					extensionsSyncStateVersion: '1.2.3'
				}
			};

			const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, '1.2.3');
		});
	});

	suite('disposal', () => {
		test('should dispose cleanly', () => {
			assert.doesNotThrow(() => {
				userDataSyncEnablementService.dispose();
			});
		});

		test('should handle multiple dispose calls', () => {
			userDataSyncEnablementService.dispose();

			assert.doesNotThrow(() => {
				userDataSyncEnablementService.dispose();
			}, 'Multiple dispose calls should not throw');
		});

		test('should still return version after disposal', () => {
			environmentService.setExtensionsSyncStateVersion('1.0.0');

			userDataSyncEnablementService.dispose();

			// Should still be able to get version even after disposal
			const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, '1.0.0');
		});
	});

	suite('edge cases', () => {
		test('should handle rapid version changes', () => {
			for (let i = 0; i < 100; i++) {
				environmentService.setExtensionsSyncStateVersion(`${i}.0.0`);
				const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
				assert.strictEqual(version, `${i}.0.0`);
			}
		});

		test('should handle very long version strings', () => {
			const longVersion = '1.2.3-' + 'a'.repeat(1000);
			environmentService.setExtensionsSyncStateVersion(longVersion);

			const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, longVersion);
		});

		test('should handle special characters in version', () => {
			const specialVersion = '1.2.3-alpha+build.2024.01.10@special';
			environmentService.setExtensionsSyncStateVersion(specialVersion);

			const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, specialVersion);
		});

		test('should handle unicode in version strings', () => {
			const unicodeVersion = '1.2.3-你好-🚀';
			environmentService.setExtensionsSyncStateVersion(unicodeVersion);

			const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, unicodeVersion);
		});

		test('should handle concurrent resource queries', () => {
			environmentService.setExtensionsSyncStateVersion('concurrent-test');

			const results = [
				userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions),
				userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Settings),
				userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions),
				userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Keybindings),
				userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions)
			];

			assert.deepStrictEqual(results, [
				'concurrent-test',
				undefined,
				'concurrent-test',
				undefined,
				'concurrent-test'
			]);
		});
	});

	suite('workbenchEnvironmentService accessor', () => {
		test('should provide access to workbench environment service', () => {
			// The workbenchEnvironmentService getter should be accessible
			// This is a protected method but we can verify it exists by using the service
			environmentService.setExtensionsSyncStateVersion('test');

			const version = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);
			assert.strictEqual(version, 'test', 'Should use workbench environment service');
		});

		test('should maintain reference to environment service across calls', () => {
			environmentService.setExtensionsSyncStateVersion('v1');
			const version1 = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);

			environmentService.setExtensionsSyncStateVersion('v2');
			const version2 = userDataSyncEnablementService.getResourceSyncStateVersion(SyncResource.Extensions);

			assert.strictEqual(version1, 'v1');
			assert.strictEqual(version2, 'v2');
		});
	});
});
