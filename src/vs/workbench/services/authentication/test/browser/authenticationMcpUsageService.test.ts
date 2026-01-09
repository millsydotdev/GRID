/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AuthenticationMcpUsageService, IAuthenticationMcpUsage } from '../../browser/authenticationMcpUsageService.js';
import { TestStorageService, TestProductService } from '../../../../test/common/workbenchTestServices.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { AuthenticationService } from '../../browser/authenticationService.js';
import { AuthenticationAccessService } from '../../browser/authenticationAccessService.js';
import { TestEnvironmentService, TestExtensionService } from '../../../../test/browser/workbenchTestServices.js';
import { IAuthenticationProvider, AuthenticationSessionsChangeEvent } from '../../common/authentication.js';
import { Emitter } from '../../../../../base/common/event.js';
import { timeout } from '../../../../../base/common/async.js';

function createMockProvider(providerId: string, accounts: Array<{ id: string; label: string }> = []): IAuthenticationProvider {
	return {
		id: providerId,
		label: providerId,
		supportsMultipleAccounts: true,
		onDidChangeSessions: new Emitter<AuthenticationSessionsChangeEvent>().event,
		getSessions: async () => accounts.map(acc => ({
			id: acc.id,
			accessToken: 'token',
			account: acc,
			scopes: ['read']
		})),
		createSession: async () => ({
			id: 'session1',
			accessToken: 'token',
			account: { id: 'acc1', label: 'Account 1' },
			scopes: ['read']
		}),
		removeSession: async () => { }
	};
}

suite('AuthenticationMcpUsageService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	let usageService: AuthenticationMcpUsageService;
	let storageService: TestStorageService;
	let authenticationService: AuthenticationService;

	setup(() => {
		storageService = disposables.add(new TestStorageService());
		const authAccessService = disposables.add(
			new AuthenticationAccessService(storageService, TestProductService)
		);
		authenticationService = disposables.add(
			new AuthenticationService(
				new TestExtensionService(),
				authAccessService,
				TestEnvironmentService,
				new NullLogService()
			)
		);

		usageService = disposables.add(
			new AuthenticationMcpUsageService(
				storageService,
				authenticationService,
				new NullLogService(),
				TestProductService
			)
		);
	});

	suite('initialization', () => {
		test('should initialize without errors', () => {
			assert.ok(usageService, 'Service should be created');
		});

		test('should initialize cache from registered providers', async () => {
			const provider = createMockProvider('test-provider', [
				{ id: 'acc1', label: 'Account 1' }
			]);

			authenticationService.registerAuthenticationProvider('test-provider', provider);

			// Add a usage before initializing cache
			usageService.addAccountUsage('test-provider', 'Account 1', ['read'], 'mcp-server-1', 'MCP Server 1');

			await usageService.initializeUsageCache();

			const hasUsed = await usageService.hasUsedAuth('mcp-server-1');
			assert.strictEqual(hasUsed, true, 'Should recognize MCP server from cache');
		});
	});

	suite('addAccountUsage', () => {
		test('should add a new usage', () => {
			usageService.addAccountUsage('provider1', 'account1', ['read', 'write'], 'mcp-server-1', 'Test MCP Server');

			const usages = usageService.readAccountUsages('provider1', 'account1');
			assert.strictEqual(usages.length, 1);
			assert.strictEqual(usages[0].mcpServerId, 'mcp-server-1');
			assert.strictEqual(usages[0].mcpServerName, 'Test MCP Server');
			assert.deepStrictEqual(usages[0].scopes, ['read', 'write']);
			assert.ok(usages[0].lastUsed > 0);
		});

		test('should update existing usage', async () => {
			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'Test MCP Server');

			const firstUsages = usageService.readAccountUsages('provider1', 'account1');
			const firstTimestamp = firstUsages[0].lastUsed;

			// Wait a bit to ensure timestamp changes
			await timeout(10);

			usageService.addAccountUsage('provider1', 'account1', ['read', 'write'], 'mcp-server-1', 'Updated MCP Server');

			const usages = usageService.readAccountUsages('provider1', 'account1');
			assert.strictEqual(usages.length, 1, 'Should not create duplicate entry');
			assert.strictEqual(usages[0].mcpServerName, 'Updated MCP Server');
			assert.deepStrictEqual(usages[0].scopes, ['read', 'write']);
			assert.ok(usages[0].lastUsed > firstTimestamp, 'Timestamp should be updated');
		});

		test('should handle multiple MCP servers for same account', () => {
			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'MCP Server 1');
			usageService.addAccountUsage('provider1', 'account1', ['write'], 'mcp-server-2', 'MCP Server 2');
			usageService.addAccountUsage('provider1', 'account1', ['admin'], 'mcp-server-3', 'MCP Server 3');

			const usages = usageService.readAccountUsages('provider1', 'account1');
			assert.strictEqual(usages.length, 3);

			const serverIds = usages.map(u => u.mcpServerId);
			assert.ok(serverIds.includes('mcp-server-1'));
			assert.ok(serverIds.includes('mcp-server-2'));
			assert.ok(serverIds.includes('mcp-server-3'));
		});

		test('should handle multiple accounts for same provider', () => {
			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'MCP Server 1');
			usageService.addAccountUsage('provider1', 'account2', ['write'], 'mcp-server-2', 'MCP Server 2');

			const usages1 = usageService.readAccountUsages('provider1', 'account1');
			const usages2 = usageService.readAccountUsages('provider1', 'account2');

			assert.strictEqual(usages1.length, 1);
			assert.strictEqual(usages2.length, 1);
			assert.strictEqual(usages1[0].mcpServerId, 'mcp-server-1');
			assert.strictEqual(usages2[0].mcpServerId, 'mcp-server-2');
		});

		test('should handle empty scopes array', () => {
			usageService.addAccountUsage('provider1', 'account1', [], 'mcp-server-1', 'Test MCP Server');

			const usages = usageService.readAccountUsages('provider1', 'account1');
			assert.strictEqual(usages.length, 1);
			assert.deepStrictEqual(usages[0].scopes, []);
		});

		test('should persist to storage', () => {
			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'Test MCP Server');

			const stored = storageService.get('provider1-account1-mcpserver-usages', -1 /* StorageScope.APPLICATION */);
			assert.ok(stored, 'Should persist to storage');

			const usages: IAuthenticationMcpUsage[] = JSON.parse(stored!);
			assert.strictEqual(usages.length, 1);
			assert.strictEqual(usages[0].mcpServerId, 'mcp-server-1');
		});
	});

	suite('readAccountUsages', () => {
		test('should return empty array for non-existent account', () => {
			const usages = usageService.readAccountUsages('provider1', 'non-existent');
			assert.deepStrictEqual(usages, []);
		});

		test('should return stored usages', () => {
			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'Test MCP Server');
			usageService.addAccountUsage('provider1', 'account1', ['write'], 'mcp-server-2', 'Another Server');

			const usages = usageService.readAccountUsages('provider1', 'account1');
			assert.strictEqual(usages.length, 2);
		});

		test('should handle corrupted storage data', () => {
			// Manually corrupt the storage
			storageService.store('provider1-account1-mcpserver-usages', 'invalid-json', -1, 0);

			const usages = usageService.readAccountUsages('provider1', 'account1');
			assert.deepStrictEqual(usages, [], 'Should return empty array for corrupted data');
		});

		test('should handle special characters in provider and account names', () => {
			const providerId = 'provider-with-dashes';
			const accountName = 'account@example.com';

			usageService.addAccountUsage(providerId, accountName, ['read'], 'mcp-server-1', 'Test');

			const usages = usageService.readAccountUsages(providerId, accountName);
			assert.strictEqual(usages.length, 1);
		});
	});

	suite('removeAccountUsage', () => {
		test('should remove all usages for an account', () => {
			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'Server 1');
			usageService.addAccountUsage('provider1', 'account1', ['write'], 'mcp-server-2', 'Server 2');

			let usages = usageService.readAccountUsages('provider1', 'account1');
			assert.strictEqual(usages.length, 2);

			usageService.removeAccountUsage('provider1', 'account1');

			usages = usageService.readAccountUsages('provider1', 'account1');
			assert.deepStrictEqual(usages, []);
		});

		test('should not affect other accounts', () => {
			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'Server 1');
			usageService.addAccountUsage('provider1', 'account2', ['write'], 'mcp-server-2', 'Server 2');

			usageService.removeAccountUsage('provider1', 'account1');

			const usages1 = usageService.readAccountUsages('provider1', 'account1');
			const usages2 = usageService.readAccountUsages('provider1', 'account2');

			assert.deepStrictEqual(usages1, []);
			assert.strictEqual(usages2.length, 1);
		});

		test('should not throw when removing non-existent account', () => {
			assert.doesNotThrow(() => {
				usageService.removeAccountUsage('provider1', 'non-existent');
			});
		});

		test('should clear from storage', () => {
			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'Server 1');

			let stored = storageService.get('provider1-account1-mcpserver-usages', -1);
			assert.ok(stored);

			usageService.removeAccountUsage('provider1', 'account1');

			stored = storageService.get('provider1-account1-mcpserver-usages', -1);
			assert.strictEqual(stored, undefined);
		});
	});

	suite('hasUsedAuth', () => {
		test('should return false for MCP server that has not used auth', async () => {
			const hasUsed = await usageService.hasUsedAuth('non-existent-server');
			assert.strictEqual(hasUsed, false);
		});

		test('should return true after adding usage', async () => {
			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'Server 1');

			const hasUsed = await usageService.hasUsedAuth('mcp-server-1');
			assert.strictEqual(hasUsed, true);
		});

		test('should track multiple MCP servers', async () => {
			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'Server 1');
			usageService.addAccountUsage('provider1', 'account1', ['write'], 'mcp-server-2', 'Server 2');

			const hasUsed1 = await usageService.hasUsedAuth('mcp-server-1');
			const hasUsed2 = await usageService.hasUsedAuth('mcp-server-2');
			const hasUsed3 = await usageService.hasUsedAuth('mcp-server-3');

			assert.strictEqual(hasUsed1, true);
			assert.strictEqual(hasUsed2, true);
			assert.strictEqual(hasUsed3, false);
		});

		test('should wait for queue to be idle', async () => {
			const provider = createMockProvider('test-provider', [
				{ id: 'acc1', label: 'Account 1' }
			]);

			authenticationService.registerAuthenticationProvider('test-provider', provider);
			usageService.addAccountUsage('test-provider', 'Account 1', ['read'], 'mcp-server-1', 'Server 1');

			// Initialize cache (which queues operations)
			const cachePromise = usageService.initializeUsageCache();

			// hasUsedAuth should wait for queue
			const hasUsed = await usageService.hasUsedAuth('mcp-server-1');

			await cachePromise;

			assert.strictEqual(hasUsed, true);
		});
	});

	suite('concurrent operations', () => {
		test('should handle concurrent addAccountUsage calls', async () => {
			const operations = [
				() => usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'Server 1'),
				() => usageService.addAccountUsage('provider1', 'account1', ['write'], 'mcp-server-2', 'Server 2'),
				() => usageService.addAccountUsage('provider1', 'account1', ['admin'], 'mcp-server-3', 'Server 3')
			];

			operations.forEach(op => op());

			// Wait a bit for operations to complete
			await timeout(50);

			const usages = usageService.readAccountUsages('provider1', 'account1');
			assert.strictEqual(usages.length, 3);
		});

		test('should handle concurrent reads', () => {
			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'Server 1');

			const results = [
				usageService.readAccountUsages('provider1', 'account1'),
				usageService.readAccountUsages('provider1', 'account1'),
				usageService.readAccountUsages('provider1', 'account1')
			];

			results.forEach(usages => {
				assert.strictEqual(usages.length, 1);
			});
		});
	});

	suite('timestamp tracking', () => {
		test('should track lastUsed timestamp', () => {
			const beforeAdd = Date.now();
			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'Server 1');
			const afterAdd = Date.now();

			const usages = usageService.readAccountUsages('provider1', 'account1');
			assert.ok(usages[0].lastUsed >= beforeAdd);
			assert.ok(usages[0].lastUsed <= afterAdd);
		});

		test('should update timestamp on subsequent usage', async () => {
			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'Server 1');

			const firstUsages = usageService.readAccountUsages('provider1', 'account1');
			const firstTimestamp = firstUsages[0].lastUsed;

			await timeout(10);

			usageService.addAccountUsage('provider1', 'account1', ['read'], 'mcp-server-1', 'Server 1');

			const secondUsages = usageService.readAccountUsages('provider1', 'account1');
			assert.ok(secondUsages[0].lastUsed > firstTimestamp);
		});
	});
});
