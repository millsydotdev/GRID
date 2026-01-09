/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { WorkbenchMcpGalleryManifestService } from '../../electron-browser/mcpGalleryManifestService.js';
import { IMcpGalleryManifest, McpGalleryManifestStatus, McpGalleryResourceType } from '../../../../../platform/mcp/common/mcpGalleryManifest.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IRequestService, IRequestContext } from '../../../../../platform/request/common/request.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { IConfigurationService, ConfigurationTarget } from '../../../../../platform/configuration/common/configuration.js';
import { IRemoteAgentService } from '../../../remote/common/remoteAgentService.js';
import { ISharedProcessService } from '../../../../../platform/ipc/electron-browser/services.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { timeout } from '../../../../../base/common/async.js';

class MockProductService implements Partial<IProductService> {
	mcpGallery: any = {
		serviceUrl: 'https://mcp.example.com',
		itemWebUrl: 'https://mcp.example.com/items/{name}',
		publisherUrl: 'https://mcp.example.com/publishers/{publisher}',
		supportUrl: 'https://mcp.example.com/support',
		privacyPolicyUrl: 'https://mcp.example.com/privacy',
		termsOfServiceUrl: 'https://mcp.example.com/terms',
		reportUrl: 'https://mcp.example.com/report'
	};
}

class MockRequestService implements Partial<IRequestService> {
	private responses = new Map<string, { statusCode: number; data?: any }>();

	setResponse(url: string, statusCode: number, data?: any): void {
		this.responses.set(url, { statusCode, data });
	}

	async request(options: any, token: CancellationToken): Promise<IRequestContext> {
		const response = this.responses.get(options.url);
		const statusCode = response?.statusCode ?? 200;

		return {
			res: {
				statusCode,
				headers: {}
			} as any,
			stream: {} as any
		};
	}
}

class MockConfigurationService implements Partial<IConfigurationService> {
	private config = new Map<string, any>();
	private _onDidChangeConfiguration = new Event.Emitter<any>();
	readonly onDidChangeConfiguration = this._onDidChangeConfiguration.event;

	getValue<T>(key: string): T | undefined {
		return this.config.get(key);
	}

	updateValue(key: string, value: any, target?: ConfigurationTarget): Promise<void> {
		const oldValue = this.config.get(key);
		this.config.set(key, value);

		if (oldValue !== value) {
			this._onDidChangeConfiguration.fire({
				affectsConfiguration: (config: string) => config === key
			});
		}

		return Promise.resolve();
	}
}

class MockRemoteAgentService implements Partial<IRemoteAgentService> {
	getConnection(): any {
		return null;
	}
}

class MockSharedProcessService implements Partial<ISharedProcessService> {
	getChannel(channelName: string): any {
		return {
			call: async (command: string, args: any[]) => { }
		};
	}
}

suite('WorkbenchMcpGalleryManifestService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	let mcpGalleryManifestService: WorkbenchMcpGalleryManifestService;
	let productService: MockProductService;
	let requestService: MockRequestService;
	let configurationService: MockConfigurationService;
	let remoteAgentService: MockRemoteAgentService;
	let sharedProcessService: MockSharedProcessService;

	setup(() => {
		productService = new MockProductService();
		requestService = new MockRequestService();
		configurationService = new MockConfigurationService();
		remoteAgentService = new MockRemoteAgentService();
		sharedProcessService = new MockSharedProcessService();

		// Set default successful response for version checks
		requestService.setResponse('https://mcp.example.com/v0.1/servers?limit=1', 200);

		mcpGalleryManifestService = disposables.add(new WorkbenchMcpGalleryManifestService(
			productService as IProductService,
			remoteAgentService as IRemoteAgentService,
			requestService as IRequestService,
			new NullLogService(),
			sharedProcessService as ISharedProcessService,
			configurationService as IConfigurationService
		));
	});

	suite('initialization', () => {
		test('should initialize with product service URL', async () => {
			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();

			assert.ok(manifest, 'Manifest should be returned');
			assert.strictEqual(manifest!.url, 'https://mcp.example.com');
			assert.ok(manifest!.version, 'Should have a version');
		});

		test('should set status to Available when manifest exists', async () => {
			await mcpGalleryManifestService.getMcpGalleryManifest();

			assert.strictEqual(
				mcpGalleryManifestService.mcpGalleryManifestStatus,
				McpGalleryManifestStatus.Available
			);
		});

		test('should set status to Unavailable when no manifest', async () => {
			productService.mcpGallery = undefined;

			const newService = disposables.add(new WorkbenchMcpGalleryManifestService(
				productService as IProductService,
				remoteAgentService as IRemoteAgentService,
				requestService as IRequestService,
				new NullLogService(),
				sharedProcessService as ISharedProcessService,
				configurationService as IConfigurationService
			));

			await newService.getMcpGalleryManifest();

			assert.strictEqual(
				newService.mcpGalleryManifestStatus,
				McpGalleryManifestStatus.Unavailable
			);
		});

		test('should cache manifest after first fetch', async () => {
			const manifest1 = await mcpGalleryManifestService.getMcpGalleryManifest();
			const manifest2 = await mcpGalleryManifestService.getMcpGalleryManifest();

			assert.strictEqual(manifest1, manifest2, 'Should return cached instance');
		});
	});

	suite('manifest structure', () => {
		test('should include all resource types for product gallery', async () => {
			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();

			assert.ok(manifest, 'Manifest should exist');

			const resourceTypes = manifest!.resources.map(r => r.type);

			assert.ok(resourceTypes.includes(McpGalleryResourceType.McpServersQueryService));
			assert.ok(resourceTypes.includes(McpGalleryResourceType.McpServerVersionUri));
			assert.ok(resourceTypes.includes(McpGalleryResourceType.McpServerLatestVersionUri));
			assert.ok(resourceTypes.includes(McpGalleryResourceType.McpServerNamedResourceUri));
			assert.ok(resourceTypes.includes(McpGalleryResourceType.McpServerWebUri));
			assert.ok(resourceTypes.includes(McpGalleryResourceType.PublisherUriTemplate));
			assert.ok(resourceTypes.includes(McpGalleryResourceType.ContactSupportUri));
			assert.ok(resourceTypes.includes(McpGalleryResourceType.PrivacyPolicyUri));
			assert.ok(resourceTypes.includes(McpGalleryResourceType.TermsOfServiceUri));
			assert.ok(resourceTypes.includes(McpGalleryResourceType.ReportUri));
		});

		test('should construct correct server query URL', async () => {
			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();

			const queryResource = manifest!.resources.find(
				r => r.type === McpGalleryResourceType.McpServersQueryService
			);

			assert.ok(queryResource);
			assert.ok(queryResource!.id.includes('/servers'));
		});

		test('should construct correct version-specific URLs', async () => {
			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();

			const versionResource = manifest!.resources.find(
				r => r.type === McpGalleryResourceType.McpServerVersionUri
			);

			assert.ok(versionResource);
			assert.ok(versionResource!.id.includes('{name}'));
			assert.ok(versionResource!.id.includes('{version}'));
		});

		test('should strip trailing slash from URL', async () => {
			productService.mcpGallery.serviceUrl = 'https://mcp.example.com/';

			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();

			assert.strictEqual(manifest!.url, 'https://mcp.example.com');
		});

		test('should preserve URL without trailing slash', async () => {
			productService.mcpGallery.serviceUrl = 'https://mcp.example.com';

			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();

			assert.strictEqual(manifest!.url, 'https://mcp.example.com');
		});
	});

	suite('version detection', () => {
		test('should use v0.1 when available', async () => {
			requestService.setResponse('https://mcp.example.com/v0.1/servers?limit=1', 200);
			requestService.setResponse('https://mcp.example.com/v0/servers?limit=1', 404);

			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();

			assert.strictEqual(manifest!.version, 'v0.1');
		});

		test('should fallback to v0 when v0.1 not available', async () => {
			requestService.setResponse('https://mcp.example.com/v0.1/servers?limit=1', 404);
			requestService.setResponse('https://mcp.example.com/v0/servers?limit=1', 200);

			// Need to create a new service to avoid cached version
			const newService = disposables.add(new WorkbenchMcpGalleryManifestService(
				productService as IProductService,
				remoteAgentService as IRemoteAgentService,
				requestService as IRequestService,
				new NullLogService(),
				sharedProcessService as ISharedProcessService,
				configurationService as IConfigurationService
			));

			const manifest = await newService.getMcpGalleryManifest();

			assert.strictEqual(manifest!.version, 'v0');
		});

		test('should default to v0.1 when no versions respond', async () => {
			requestService.setResponse('https://mcp.example.com/v0.1/servers?limit=1', 404);
			requestService.setResponse('https://mcp.example.com/v0/servers?limit=1', 404);

			const newService = disposables.add(new WorkbenchMcpGalleryManifestService(
				productService as IProductService,
				remoteAgentService as IRemoteAgentService,
				requestService as IRequestService,
				new NullLogService(),
				sharedProcessService as ISharedProcessService,
				configurationService as IConfigurationService
			));

			const manifest = await newService.getMcpGalleryManifest();

			assert.strictEqual(manifest!.version, 'v0.1');
		});

		test('should include McpServerIdUri for v0', async () => {
			requestService.setResponse('https://mcp.example.com/v0.1/servers?limit=1', 404);
			requestService.setResponse('https://mcp.example.com/v0/servers?limit=1', 200);

			const newService = disposables.add(new WorkbenchMcpGalleryManifestService(
				productService as IProductService,
				remoteAgentService as IRemoteAgentService,
				requestService as IRequestService,
				new NullLogService(),
				sharedProcessService as ISharedProcessService,
				configurationService as IConfigurationService
			));

			const manifest = await newService.getMcpGalleryManifest();

			const hasIdUri = manifest!.resources.some(
				r => r.type === McpGalleryResourceType.McpServerIdUri
			);

			assert.ok(hasIdUri, 'v0 manifest should include McpServerIdUri');
		});
	});

	suite('configuration changes', () => {
		test('should update manifest when configuration changes', async () => {
			await mcpGalleryManifestService.getMcpGalleryManifest();

			const eventPromise = Event.toPromise(mcpGalleryManifestService.onDidChangeMcpGalleryManifest);

			await configurationService.updateValue('chat.mcp.gallery', {
				serviceUrl: 'https://new-mcp.example.com',
				version: 'v0.1'
			});

			// Wait for the event
			await eventPromise;

			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();
			assert.strictEqual(manifest!.url, 'https://new-mcp.example.com');
		});

		test('should emit status change event when manifest changes', async () => {
			await mcpGalleryManifestService.getMcpGalleryManifest();

			const statusEventPromise = Event.toPromise(mcpGalleryManifestService.onDidChangeMcpGalleryManifestStatus);

			await configurationService.updateValue('chat.mcp.gallery', {
				serviceUrl: 'https://new-mcp.example.com',
				version: 'v0.1'
			});

			const status = await statusEventPromise;
			assert.strictEqual(status, McpGalleryManifestStatus.Available);
		});

		test('should not update when unrelated configuration changes', async () => {
			const manifest1 = await mcpGalleryManifestService.getMcpGalleryManifest();

			await configurationService.updateValue('some.other.setting', 'value');

			const manifest2 = await mcpGalleryManifestService.getMcpGalleryManifest();

			assert.strictEqual(manifest1, manifest2, 'Should not update for unrelated config');
		});

		test('should use configured version from settings', async () => {
			await configurationService.updateValue('chat.mcp.gallery', {
				serviceUrl: 'https://configured.example.com',
				version: 'v0'
			});

			const newService = disposables.add(new WorkbenchMcpGalleryManifestService(
				productService as IProductService,
				remoteAgentService as IRemoteAgentService,
				requestService as IRequestService,
				new NullLogService(),
				sharedProcessService as ISharedProcessService,
				configurationService as IConfigurationService
			));

			const manifest = await newService.getMcpGalleryManifest();

			assert.strictEqual(manifest!.version, 'v0');
			assert.strictEqual(manifest!.url, 'https://configured.example.com');
		});
	});

	suite('event emission', () => {
		test('should not emit change event when manifest is identical', async () => {
			await mcpGalleryManifestService.getMcpGalleryManifest();

			let changeEventFired = false;
			const disposable = mcpGalleryManifestService.onDidChangeMcpGalleryManifest(() => {
				changeEventFired = true;
			});

			// Update with same URL and version
			await configurationService.updateValue('chat.mcp.gallery', {
				serviceUrl: 'https://mcp.example.com',
				version: 'v0.1'
			});

			await timeout(50);

			assert.strictEqual(changeEventFired, false, 'Should not emit event for identical manifest');

			disposable.dispose();
		});

		test('should emit change event when URL changes', async () => {
			await mcpGalleryManifestService.getMcpGalleryManifest();

			const eventPromise = Event.toPromise(mcpGalleryManifestService.onDidChangeMcpGalleryManifest);

			await configurationService.updateValue('chat.mcp.gallery', {
				serviceUrl: 'https://different.example.com',
				version: 'v0.1'
			});

			const manifest = await eventPromise;
			assert.strictEqual(manifest!.url, 'https://different.example.com');
		});

		test('should emit change event when version changes', async () => {
			await mcpGalleryManifestService.getMcpGalleryManifest();

			const eventPromise = Event.toPromise(mcpGalleryManifestService.onDidChangeMcpGalleryManifest);

			await configurationService.updateValue('chat.mcp.gallery', {
				serviceUrl: 'https://mcp.example.com',
				version: 'v0'
			});

			const manifest = await eventPromise;
			assert.strictEqual(manifest!.version, 'v0');
		});
	});

	suite('edge cases', () => {
		test('should handle null product service mcpGallery', async () => {
			productService.mcpGallery = undefined;

			const newService = disposables.add(new WorkbenchMcpGalleryManifestService(
				productService as IProductService,
				remoteAgentService as IRemoteAgentService,
				requestService as IRequestService,
				new NullLogService(),
				sharedProcessService as ISharedProcessService,
				configurationService as IConfigurationService
			));

			const manifest = await newService.getMcpGalleryManifest();

			assert.strictEqual(manifest, null);
		});

		test('should handle URLs with paths', async () => {
			productService.mcpGallery.serviceUrl = 'https://mcp.example.com/api/v1';

			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();

			assert.strictEqual(manifest!.url, 'https://mcp.example.com/api/v1');
			assert.ok(manifest!.resources.some(r => r.id.includes('/api/v1/')));
		});

		test('should handle special characters in URLs', async () => {
			productService.mcpGallery.serviceUrl = 'https://mcp.example.com/api-v1_test';

			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();

			assert.strictEqual(manifest!.url, 'https://mcp.example.com/api-v1_test');
		});

		test('should handle multiple rapid configuration changes', async () => {
			await mcpGalleryManifestService.getMcpGalleryManifest();

			// Trigger multiple rapid changes
			await configurationService.updateValue('chat.mcp.gallery', {
				serviceUrl: 'https://url1.example.com',
				version: 'v0.1'
			});

			await configurationService.updateValue('chat.mcp.gallery', {
				serviceUrl: 'https://url2.example.com',
				version: 'v0.1'
			});

			await configurationService.updateValue('chat.mcp.gallery', {
				serviceUrl: 'https://url3.example.com',
				version: 'v0.1'
			});

			await timeout(100);

			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();

			// Should have the latest URL
			assert.strictEqual(manifest!.url, 'https://url3.example.com');
		});
	});

	suite('resource URLs', () => {
		test('should construct template URLs correctly', async () => {
			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();

			const webUri = manifest!.resources.find(
				r => r.type === McpGalleryResourceType.McpServerWebUri
			);

			assert.ok(webUri);
			assert.strictEqual(webUri!.id, 'https://mcp.example.com/items/{name}');
		});

		test('should include publisher URL from product', async () => {
			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();

			const publisherUri = manifest!.resources.find(
				r => r.type === McpGalleryResourceType.PublisherUriTemplate
			);

			assert.ok(publisherUri);
			assert.strictEqual(publisherUri!.id, 'https://mcp.example.com/publishers/{publisher}');
		});

		test('should include support URLs', async () => {
			const manifest = await mcpGalleryManifestService.getMcpGalleryManifest();

			const supportUri = manifest!.resources.find(
				r => r.type === McpGalleryResourceType.ContactSupportUri
			);
			const privacyUri = manifest!.resources.find(
				r => r.type === McpGalleryResourceType.PrivacyPolicyUri
			);
			const termsUri = manifest!.resources.find(
				r => r.type === McpGalleryResourceType.TermsOfServiceUri
			);
			const reportUri = manifest!.resources.find(
				r => r.type === McpGalleryResourceType.ReportUri
			);

			assert.ok(supportUri);
			assert.ok(privacyUri);
			assert.ok(termsUri);
			assert.ok(reportUri);
		});
	});
});
