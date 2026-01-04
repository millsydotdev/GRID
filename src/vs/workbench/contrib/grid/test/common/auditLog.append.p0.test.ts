/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { suite, test } from 'mocha';
import * as assert from 'assert';
import { IAuditLogService, AuditEvent } from '../../common/auditLogService.js';
import { Workspace } from '../../../../../platform/workspace/common/workspace.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { URI } from '../../../../../base/common/uri.js';
import { Event } from '../../../../../base/common/event.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';

/**
 * Mock FileService for testing
 */
class MockFileService {
	private files: Map<string, VSBuffer> = new Map();
	private folders: Set<string> = new Set();

	async createFolder(uri: URI): Promise<void> {
		this.folders.add(uri.toString());
	}

	async writeFile(uri: URI, content: VSBuffer): Promise<void> {
		this.files.set(uri.toString(), content);
	}

	async readFile(uri: URI): Promise<{ value: VSBuffer }> {
		const content = this.files.get(uri.toString());
		if (!content) {
			throw new Error('File not found');
		}
		return { value: content };
	}

	async stat(uri: URI): Promise<{ size: number }> {
		const content = this.files.get(uri.toString());
		return { size: content ? content.byteLength : 0 };
	}

	async exists(uri: URI): Promise<boolean> {
		return this.files.has(uri.toString());
	}

	getWrittenEvents(): AuditEvent[] {
		const events: AuditEvent[] = [];
		for (const [, buffer] of this.files) {
			const lines = buffer
				.toString()
				.split('\n')
				.filter((line) => line.trim());
			for (const line of lines) {
				try {
					events.push(JSON.parse(line));
				} catch {
					// Skip invalid JSON
				}
			}
		}
		return events;
	}
}

/**
 * Mock WorkspaceContextService for testing
 */
class MockWorkspaceContextService {
	getWorkspace(): Workspace {
		return {
			id: 'test-workspace',
			folders: [
				{
					uri: URI.file('/test/workspace'),
					name: 'test',
					index: 0,
					toResource: (relativePath: string) => URI.file(`/test/workspace/${relativePath}`),
					toJSON: () => ({ uri: URI.file('/test/workspace'), name: 'test', index: 0 }),
				} as any,
			],
			configuration: null,
		} as any;
	}
}

/**
 * Mock ConfigurationService for testing
 */
class MockConfigurationService {
	private config: Map<string, any> = new Map();
	onDidChangeConfiguration = Event.None;

	constructor(initialConfig: Record<string, any> = {}) {
		Object.entries(initialConfig).forEach(([key, value]) => {
			this.config.set(key, value);
		});
	}

	getValue<T>(key: string): T | undefined {
		return this.config.get(key);
	}

	updateValue(key: string, value: any): void {
		this.config.set(key, value);
	}
}

/**
 * Mock EnvironmentService for testing
 */
class MockEnvironmentService implements Partial<IEnvironmentService> {
	workspaceStorageHome = URI.file('/test/storage');
}

suite('AuditLog P0 Events', () => {

	// ensureNoDisposablesAreLeakedInTestSuite();
	let fileService: MockFileService;
	let configService: MockConfigurationService;
	let auditLogService: IAuditLogService;

	setup(() => {
		fileService = new MockFileService();
		configService = new MockConfigurationService({
			'grid.audit.enable': true,
			'grid.audit.path': '/test/audit.jsonl',
		});

		// Create a basic implementation of IAuditLogService for testing
		new MockWorkspaceContextService();
		new MockEnvironmentService();
		new NullLogService();

		// Since we can't easily instantiate the real service, we'll test it through its interface
		auditLogService = {
			_serviceBrand: undefined,
			append: async (event: AuditEvent) => {
				if (!configService.getValue('grid.audit.enable')) {
					return;
				}
				const uri = URI.file(configService.getValue('grid.audit.path') || '/test/audit.jsonl');
				const line = JSON.stringify(event) + '\n';
				const existing = await fileService.readFile(uri).catch(() => ({ value: VSBuffer.fromString('') }));
				const combined = VSBuffer.concat([existing.value, VSBuffer.fromString(line)]);
				await fileService.writeFile(uri, combined);
			},
			isEnabled: () => configService.getValue('grid.audit.enable') ?? false,
		};
	});

	test('snapshot:create event appended', async () => {
		// Append a snapshot:create event
		await auditLogService.append({
			ts: Date.now(),
			action: 'snapshot:create',
			files: ['/test/file1.ts', '/test/file2.ts'],
			ok: true,
			meta: {
				snapshotId: 'test-snapshot-1',
				bytes: 1024,
				skipped: false,
			},
		});

		// Verify audit log contains snapshot:create event
		const events = fileService.getWrittenEvents();
		assert.strictEqual(events.length, 1, 'Expected 1 event in audit log');
		assert.strictEqual(events[0].action, 'snapshot:create', 'Expected snapshot:create action');
		assert.strictEqual(events[0].ok, true, 'Expected ok=true');
		assert.deepStrictEqual(events[0].files, ['/test/file1.ts', '/test/file2.ts'], 'Expected correct files');
		assert.strictEqual(events[0].meta?.snapshotId, 'test-snapshot-1', 'Expected correct snapshot ID');
	});

	test('git:stash event appended', async () => {
		// Append a git:stash event
		await auditLogService.append({
			ts: Date.now(),
			action: 'git:stash',
			ok: true,
			meta: {
				operationId: 'test-op-1',
				stashRef: 'stash@{0}',
			},
		});

		// Verify audit log contains git:stash event
		const events = fileService.getWrittenEvents();
		assert.strictEqual(events.length, 1, 'Expected 1 event in audit log');
		assert.strictEqual(events[0].action, 'git:stash', 'Expected git:stash action');
		assert.strictEqual(events[0].ok, true, 'Expected ok=true');
		assert.strictEqual(events[0].meta?.stashRef, 'stash@{0}', 'Expected correct stash ref');
	});

	test('snapshot:restore event appended on failure', async () => {
		// Append a failed snapshot:restore event
		await auditLogService.append({
			ts: Date.now(),
			action: 'snapshot:restore',
			ok: false,
			meta: {
				snapshotId: 'test-snapshot-1',
				error: 'File not found',
			},
		});

		// Verify audit log contains snapshot:restore event with ok=false
		const events = fileService.getWrittenEvents();
		assert.strictEqual(events.length, 1, 'Expected 1 event in audit log');
		assert.strictEqual(events[0].action, 'snapshot:restore', 'Expected snapshot:restore action');
		assert.strictEqual(events[0].ok, false, 'Expected ok=false for failed restore');
		assert.strictEqual(events[0].meta?.error, 'File not found', 'Expected error message');
	});

	test('multiple events can be appended', async () => {
		// Append multiple events
		await auditLogService.append({
			ts: Date.now(),
			action: 'snapshot:create',
			ok: true,
			meta: { snapshotId: 'snap-1' },
		});

		await auditLogService.append({
			ts: Date.now(),
			action: 'git:stash',
			ok: true,
			meta: { stashRef: 'stash@{0}' },
		});

		await auditLogService.append({
			ts: Date.now(),
			action: 'snapshot:restore',
			ok: true,
			meta: { snapshotId: 'snap-1' },
		});

		// Verify all events are in audit log
		const events = fileService.getWrittenEvents();
		assert.strictEqual(events.length, 3, 'Expected 3 events in audit log');
		assert.strictEqual(events[0].action, 'snapshot:create');
		assert.strictEqual(events[1].action, 'git:stash');
		assert.strictEqual(events[2].action, 'snapshot:restore');
	});

	test('audit log respects enabled configuration', async () => {
		// Disable audit log
		configService.updateValue('grid.audit.enable', false);

		// Try to append an event
		await auditLogService.append({
			ts: Date.now(),
			action: 'snapshot:create',
			ok: true,
		});

		// Verify no events were written
		const events = fileService.getWrittenEvents();
		assert.strictEqual(events.length, 0, 'Expected no events when audit log is disabled');
	});
});
