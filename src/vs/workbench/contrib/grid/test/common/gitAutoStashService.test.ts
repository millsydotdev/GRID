/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IGitAutoStashService } from '../../common/gitAutoStashService.js';

/**
 * Mock Configuration Service
 */
class MockConfigurationService {
	private config: Map<string, any> = new Map();
	private listeners: Array<(e: any) => void> = [];

	constructor() {
		// Default configuration
		this.config.set('grid.safety.autostash.enable', true);
		this.config.set('grid.safety.autostash.mode', 'dirty-only');
	}

	getValue<T>(key: string): T | undefined {
		return this.config.get(key) as T | undefined;
	}

	setValue(key: string, value: any): void {
		this.config.set(key, value);
		this.notifyChange(key);
	}

	onDidChangeConfiguration(callback: (e: any) => void): { dispose: () => void } {
		this.listeners.push(callback);
		return {
			dispose: () => {
				const index = this.listeners.indexOf(callback);
				if (index >= 0) {
					this.listeners.splice(index, 1);
				}
			},
		};
	}

	private notifyChange(key: string): void {
		const event = {
			affectsConfiguration: (configKey: string) => configKey === key,
		};
		this.listeners.forEach((listener) => listener(event));
	}
}

/**
 * Mock Log Service
 */
class MockLogService {
	logs: Array<{ level: string; message: string; args: any[] }> = [];

	info(message: string, ...args: any[]): void {
		this.logs.push({ level: 'info', message, args });
	}

	warn(message: string, ...args: any[]): void {
		this.logs.push({ level: 'warn', message, args });
	}

	error(message: string, ...args: any[]): void {
		this.logs.push({ level: 'error', message, args });
	}
}

/**
 * Mock Audit Log Service
 */
class MockAuditLogService {
	private enabled = true;
	entries: Array<any> = [];

	isEnabled(): boolean {
		return this.enabled;
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	async append(entry: any): Promise<void> {
		this.entries.push(entry);
	}
}

/**
 * Mock Notification Service
 */
class MockNotificationService {
	notifications: Array<any> = [];

	notify(notification: any): void {
		this.notifications.push(notification);
	}

	info(message: string): void {
		this.notifications.push({ severity: 1, message });
	}

	warn(message: string): void {
		this.notifications.push({ severity: 2, message });
	}

	error(message: string): void {
		this.notifications.push({ severity: 3, message });
	}
}

/**
 * Mock Extension Service
 */
class MockExtensionService {
	private extensions: Map<string, any> = new Map();
	private activatedExtensions: Set<string> = new Set();

	constructor() {
		// Add git extension by default
		this.extensions.set('vscode.git', {
			identifier: { value: 'vscode.git', id: 'vscode.git' },
		});
	}

	async getExtension(extensionId: string): Promise<any> {
		return this.extensions.get(extensionId);
	}

	async activateById(identifier: any, options: any): Promise<void> {
		this.activatedExtensions.add(identifier.value || identifier);
	}

	isActivated(extensionId: string): boolean {
		return this.activatedExtensions.has(extensionId);
	}

	removeExtension(extensionId: string): void {
		this.extensions.delete(extensionId);
	}
}

/**
 * Mock Command Service
 */
class MockCommandService {
	private commands: Map<string, (...args: any[]) => any> = new Map();
	executedCommands: Array<{ command: string; args: any[] }> = [];

	constructor() {
		// Register default git commands
		this.commands.set('git.stashIncludeUntracked', async () => {});
		this.commands.set('git.stashPopLatest', async () => {});
		this.commands.set('git.stashApplyLatest', async () => {});
		this.commands.set('git.stashDrop', async (index: number) => {});
	}

	async executeCommand(command: string, ...args: any[]): Promise<any> {
		this.executedCommands.push({ command, args });
		const handler = this.commands.get(command);
		if (handler) {
			return await handler(...args);
		}
		throw new Error(`Command not found: ${command}`);
	}

	registerCommand(command: string, handler: (...args: any[]) => any): void {
		this.commands.set(command, handler);
	}

	setCommandHandler(command: string, handler: (...args: any[]) => any): void {
		this.commands.set(command, handler);
	}
}

/**
 * Mock GitAutoStashService Implementation
 */
class MockGitAutoStashService implements IGitAutoStashService {
	readonly _serviceBrand: undefined;
	private enabled = true;
	private stashRefs = new Map<string, string>();

	constructor(
		private configService: MockConfigurationService,
		private logService: MockLogService,
		private auditLogService: MockAuditLogService,
		private notificationService: MockNotificationService,
		private extensionService: MockExtensionService,
		private commandService: MockCommandService
	) {
		this.updateConfiguration();
		this.configService.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('grid.safety.autostash')) {
				this.updateConfiguration();
			}
		});
	}

	private updateConfiguration(): void {
		this.enabled = this.configService.getValue<boolean>('grid.safety.autostash.enable') ?? true;
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	async createStash(operationId: string): Promise<string | undefined> {
		if (!this.enabled) {
			return undefined;
		}

		try {
			const gitExtension = await this.extensionService.getExtension('vscode.git');
			if (!gitExtension) {
				this.logService.warn('[GitAutoStash] Git extension not available');
				return undefined;
			}

			await this.extensionService.activateById(gitExtension.identifier, {});
			await this.commandService.executeCommand('git.stashIncludeUntracked');

			const stashRef = `stash@{0}`;
			this.stashRefs.set(operationId, stashRef);

			this.notificationService.notify({
				severity: 1,
				message: `Auto-stash created: ${stashRef}`,
				sticky: false,
			});

			if (this.auditLogService.isEnabled()) {
				await this.auditLogService.append({
					ts: Date.now(),
					action: 'git:stash',
					ok: true,
					meta: { operationId, stashRef },
				});
			}

			return stashRef;
		} catch (error) {
			this.logService.error('[GitAutoStash] Failed to create stash:', error);
			if (this.auditLogService.isEnabled()) {
				await this.auditLogService.append({
					ts: Date.now(),
					action: 'git:stash',
					ok: false,
					meta: { operationId, error: String(error) },
				});
			}
			return undefined;
		}
	}

	async restoreStash(stashRef: string): Promise<void> {
		try {
			const match = stashRef.match(/stash@\{(\d+)\}/);
			const stashIndex = match ? parseInt(match[1], 10) : 0;

			if (stashIndex === 0) {
				try {
					await this.commandService.executeCommand('git.stashPopLatest');
				} catch (error) {
					await this.commandService.executeCommand('git.stashApplyLatest');
				}
			} else {
				this.logService.warn(`[GitAutoStash] Restore of stash@{${stashIndex}} not supported`);
				throw new Error(`Only stash@{0} restore is supported`);
			}

			if (this.auditLogService.isEnabled()) {
				await this.auditLogService.append({
					ts: Date.now(),
					action: 'git:stash:restore',
					ok: true,
					meta: { stashRef },
				});
			}

			this.notificationService.notify({
				severity: 1,
				message: `Working tree restored from ${stashRef}`,
				sticky: false,
			});
		} catch (error) {
			this.logService.error('[GitAutoStash] Failed to restore stash:', error);
			if (this.auditLogService.isEnabled()) {
				await this.auditLogService.append({
					ts: Date.now(),
					action: 'git:stash:restore',
					ok: false,
					meta: { stashRef, error: String(error) },
				});
			}
			throw error;
		}
	}

	async dropStash(stashRef: string): Promise<void> {
		try {
			const match = stashRef.match(/stash@\{(\d+)\}/);
			const stashIndex = match ? parseInt(match[1], 10) : 0;
			await this.commandService.executeCommand('git.stashDrop', stashIndex);
		} catch (error) {
			this.logService.warn('[GitAutoStash] Failed to drop stash:', error);
		}
	}
}

suite('GitAutoStashService Tests', () => {
	ensureNoDisposablesAreLeakedInTestSuite();
	let service: MockGitAutoStashService;
	let mockConfigService: MockConfigurationService;
	let mockLogService: MockLogService;
	let mockAuditLogService: MockAuditLogService;
	let mockNotificationService: MockNotificationService;
	let mockExtensionService: MockExtensionService;
	let mockCommandService: MockCommandService;

	setup(() => {
		mockConfigService = new MockConfigurationService();
		mockLogService = new MockLogService();
		mockAuditLogService = new MockAuditLogService();
		mockNotificationService = new MockNotificationService();
		mockExtensionService = new MockExtensionService();
		mockCommandService = new MockCommandService();

		service = new MockGitAutoStashService(
			mockConfigService,
			mockLogService,
			mockAuditLogService,
			mockNotificationService,
			mockExtensionService,
			mockCommandService
		);
	});

	test('should be enabled by default', () => {
		assert.strictEqual(service.isEnabled(), true, 'Should be enabled by default');
	});

	test('should respect configuration setting', () => {
		mockConfigService.setValue('grid.safety.autostash.enable', false);
		assert.strictEqual(service.isEnabled(), false, 'Should be disabled when config is false');

		mockConfigService.setValue('grid.safety.autostash.enable', true);
		assert.strictEqual(service.isEnabled(), true, 'Should be enabled when config is true');
	});

	test('should create stash successfully', async () => {
		const stashRef = await service.createStash('test-operation-1');

		assert.ok(stashRef, 'Should return stash reference');
		assert.strictEqual(stashRef, 'stash@{0}', 'Should return stash@{0}');
	});

	test('should not create stash when disabled', async () => {
		mockConfigService.setValue('grid.safety.autostash.enable', false);

		const stashRef = await service.createStash('test-operation-2');

		assert.strictEqual(stashRef, undefined, 'Should not create stash when disabled');
	});

	test('should activate git extension before creating stash', async () => {
		await service.createStash('test-operation-3');

		assert.ok(mockExtensionService.isActivated('vscode.git'), 'Should activate git extension');
	});

	test('should execute stashIncludeUntracked command', async () => {
		await service.createStash('test-operation-4');

		const stashCommand = mockCommandService.executedCommands.find((cmd) => cmd.command === 'git.stashIncludeUntracked');
		assert.ok(stashCommand, 'Should execute stashIncludeUntracked command');
	});

	test('should send notification when stash is created', async () => {
		await service.createStash('test-operation-5');

		assert.ok(mockNotificationService.notifications.length > 0, 'Should send notification');
		const notification = mockNotificationService.notifications[0];
		assert.ok(notification.message.includes('stash@{0}'), 'Notification should mention stash ref');
	});

	test('should log to audit log when stash is created', async () => {
		await service.createStash('test-operation-6');

		assert.ok(mockAuditLogService.entries.length > 0, 'Should log to audit log');
		const entry = mockAuditLogService.entries[0];
		assert.strictEqual(entry.action, 'git:stash', 'Action should be git:stash');
		assert.strictEqual(entry.ok, true, 'Entry should be successful');
	});

	test('should handle git extension not available', async () => {
		mockExtensionService.removeExtension('vscode.git');

		const stashRef = await service.createStash('test-operation-7');

		assert.strictEqual(stashRef, undefined, 'Should return undefined when git extension not available');
		const warnLog = mockLogService.logs.find((log) => log.level === 'warn');
		assert.ok(warnLog, 'Should log warning');
	});

	test('should handle stash command failure', async () => {
		mockCommandService.setCommandHandler('git.stashIncludeUntracked', async () => {
			throw new Error('Stash command failed');
		});

		const stashRef = await service.createStash('test-operation-8');

		assert.strictEqual(stashRef, undefined, 'Should return undefined on failure');
		const errorLog = mockLogService.logs.find((log) => log.level === 'error');
		assert.ok(errorLog, 'Should log error');
	});

	test('should restore stash successfully', async () => {
		await service.restoreStash('stash@{0}');

		const popCommand = mockCommandService.executedCommands.find((cmd) => cmd.command === 'git.stashPopLatest');
		assert.ok(popCommand, 'Should execute stashPopLatest command');
	});

	test('should fallback to apply if pop fails', async () => {
		mockCommandService.setCommandHandler('git.stashPopLatest', async () => {
			throw new Error('Pop failed - conflicts');
		});

		await service.restoreStash('stash@{0}');

		const applyCommand = mockCommandService.executedCommands.find((cmd) => cmd.command === 'git.stashApplyLatest');
		assert.ok(applyCommand, 'Should execute stashApplyLatest as fallback');
	});

	test('should send notification when stash is restored', async () => {
		await service.restoreStash('stash@{0}');

		const notification = mockNotificationService.notifications.find((n) => n.message && n.message.includes('restored'));
		assert.ok(notification, 'Should send restore notification');
	});

	test('should log to audit log when stash is restored', async () => {
		await service.restoreStash('stash@{0}');

		const entry = mockAuditLogService.entries.find((e) => e.action === 'git:stash:restore');
		assert.ok(entry, 'Should log restore to audit log');
		assert.strictEqual(entry.ok, true, 'Entry should be successful');
	});

	test('should not support restoring non-latest stash', async () => {
		try {
			await service.restoreStash('stash@{1}');
			assert.fail('Should throw error for non-latest stash');
		} catch (error) {
			assert.ok(error instanceof Error, 'Should throw error');
			assert.ok((error as Error).message.includes('stash@{0}'), 'Error should mention limitation');
		}
	});

	test('should drop stash successfully', async () => {
		await service.dropStash('stash@{0}');

		const dropCommand = mockCommandService.executedCommands.find((cmd) => cmd.command === 'git.stashDrop');
		assert.ok(dropCommand, 'Should execute stashDrop command');
		assert.strictEqual(dropCommand!.args[0], 0, 'Should drop stash at index 0');
	});

	test('should parse stash index correctly', async () => {
		await service.dropStash('stash@{3}');

		const dropCommand = mockCommandService.executedCommands.find((cmd) => cmd.command === 'git.stashDrop');
		assert.strictEqual(dropCommand!.args[0], 3, 'Should drop stash at index 3');
	});

	test('should handle drop failure gracefully', async () => {
		mockCommandService.setCommandHandler('git.stashDrop', async () => {
			throw new Error('Drop failed');
		});

		// Should not throw
		await service.dropStash('stash@{0}');

		const warnLog = mockLogService.logs.find((log) => log.level === 'warn' && log.message.includes('drop'));
		assert.ok(warnLog, 'Should log warning on drop failure');
	});

	test('should handle audit log disabled', async () => {
		mockAuditLogService.setEnabled(false);

		await service.createStash('test-operation-9');

		assert.strictEqual(mockAuditLogService.entries.length, 0, 'Should not log when audit log disabled');
	});

	test('should track multiple stash operations', async () => {
		const stashRef1 = await service.createStash('operation-1');
		const stashRef2 = await service.createStash('operation-2');
		const stashRef3 = await service.createStash('operation-3');

		assert.ok(stashRef1, 'Should create first stash');
		assert.ok(stashRef2, 'Should create second stash');
		assert.ok(stashRef3, 'Should create third stash');
	});

	test('should handle restore failure and log to audit', async () => {
		mockCommandService.setCommandHandler('git.stashPopLatest', async () => {
			throw new Error('Pop failed');
		});
		mockCommandService.setCommandHandler('git.stashApplyLatest', async () => {
			throw new Error('Apply failed');
		});

		try {
			await service.restoreStash('stash@{0}');
			assert.fail('Should throw error');
		} catch (error) {
			// Expected
		}

		const entry = mockAuditLogService.entries.find((e) => e.action === 'git:stash:restore' && !e.ok);
		assert.ok(entry, 'Should log failed restore to audit log');
	});

	test('should handle invalid stash reference format', async () => {
		await service.dropStash('invalid-ref');

		const dropCommand = mockCommandService.executedCommands.find((cmd) => cmd.command === 'git.stashDrop');
		assert.ok(dropCommand, 'Should still execute drop command');
		assert.strictEqual(dropCommand!.args[0], 0, 'Should default to index 0');
	});

	test('should respond to configuration changes', () => {
		assert.strictEqual(service.isEnabled(), true, 'Should be enabled initially');

		mockConfigService.setValue('grid.safety.autostash.enable', false);
		assert.strictEqual(service.isEnabled(), false, 'Should be disabled after config change');

		mockConfigService.setValue('grid.safety.autostash.enable', true);
		assert.strictEqual(service.isEnabled(), true, 'Should be enabled after config change');
	});
});
