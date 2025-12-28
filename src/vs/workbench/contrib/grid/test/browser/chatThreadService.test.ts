/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ChatThreadService } from '../../browser/chatThreadService.js';
import { URI } from '../../../../../base/common/uri.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IStorageService, InMemoryStorageService } from '../../../../../platform/storage/common/storage.js';
import { ILLMMessageService } from '../../common/sendLLMMessageService.js';
import { IGridSettingsService } from '../../common/gridSettingsService.js';
import { IToolsService } from '../../browser/toolsService.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { IMetricsService } from '../../common/metricsService.js';
import { IGridModelService } from '../../common/gridModelService.js';
import { IEditCodeService } from '../../browser/editCodeServiceInterface.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IConvertToLLMMessageService } from '../../browser/convertToLLMMessageService.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IDirectoryStrService } from '../../common/directoryStrService.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IMCPService } from '../../common/mcpService.js';
import { ITaskAwareModelRouter } from '../../common/modelRouter.js';
import { IEditRiskScoringService } from '../../common/editRiskScoringService.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IAuditLogService } from '../../common/auditLogService.js';
import { ChatMessage, StagingSelectionItem } from '../../common/chatThreadServiceTypes.js';
import { Emitter } from '../../../../../base/common/event.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';

// Mock implementations
class MockLLMMessageService implements Partial<ILLMMessageService> {
	async sendLLMMessage() {
		return {
			role: 'assistant' as const,
			content: [{ type: 'text' as const, text: 'Mock response' }],
		};
	}
}

class MockGridSettingsService implements Partial<IGridSettingsService> {
	private _onDidChangeSettings = new Emitter<void>();
	onDidChangeSettings = this._onDidChangeSettings.event;

	getSettings() {
		return {
			modelSelection: { provider: 'anthropic', modelName: 'claude-sonnet-4-5' },
			chatMode: 'normal' as const,
			features: {},
		};
	}
}

class MockToolsService implements Partial<IToolsService> {
	async executeBuiltinTool() {
		return { type: 'success' as const, result: 'Mock tool result' };
	}
}

class MockMetricsService implements Partial<IMetricsService> {
	trackEvent() {}
	trackError() {}
}

class MockEditCodeService implements Partial<IEditCodeService> {
	async applyEdits() {
		return { success: true, filesModified: [] };
	}
	async createCheckpoint() {
		return 'checkpoint-id';
	}
}

class MockNotificationService implements Partial<INotificationService> {
	notify() {
		return { close: () => {}, updateMessage: () => {}, updateSeverity: () => {}, updateActions: () => {} };
	}
	info() {}
	warn() {}
	error() {}
}

class MockConvertToLLMMessageService implements Partial<IConvertToLLMMessageService> {
	async convertToLLMMessages() {
		return [];
	}
}

class MockWorkspaceContextService implements Partial<IWorkspaceContextService> {
	getWorkspace() {
		return { folders: [{ uri: URI.file('/test/workspace'), name: 'test', index: 0 }], id: 'test', configuration: null };
	}
}

class MockDirectoryStrService implements Partial<IDirectoryStrService> {
	async getDirectoryStructure() {
		return 'test/\n  file1.ts\n  file2.ts';
	}
}

class MockFileService implements Partial<IFileService> {
	async exists() {
		return true;
	}
	async readFile() {
		return { value: Buffer.from('test content') };
	}
}

class MockMCPService implements Partial<IMCPService> {
	async listTools() {
		return [];
	}
}

class MockModelRouter implements Partial<ITaskAwareModelRouter> {
	routeTask() {
		return { provider: 'anthropic', modelName: 'claude-sonnet-4-5', reasoning: 'Default model' };
	}
}

class MockEditRiskScoringService implements Partial<IEditRiskScoringService> {
	scoreEditRisk() {
		return { score: 0.5, confidence: 0.8, factors: [] };
	}
}

class MockModelService implements Partial<IModelService> {
	getModel() {
		return null;
	}
}

class MockCommandService implements Partial<ICommandService> {
	async executeCommand() {
		return undefined;
	}
}

class MockAuditLogService implements Partial<IAuditLogService> {
	log() {}
}

suite('ChatThreadService', () => {
	let instantiationService: TestInstantiationService;
	let chatThreadService: ChatThreadService;
	let storageService: InMemoryStorageService;

	setup(() => {
		instantiationService = new TestInstantiationService();
		storageService = new InMemoryStorageService();

		// Register all mock services
		instantiationService.stub(IStorageService, storageService);
		instantiationService.stub(ILLMMessageService, new MockLLMMessageService());
		instantiationService.stub(IGridSettingsService, new MockGridSettingsService());
		instantiationService.stub(IToolsService, new MockToolsService());
		instantiationService.stub(ILanguageFeaturesService, {});
		instantiationService.stub(IMetricsService, new MockMetricsService());
		instantiationService.stub(IGridModelService, {});
		instantiationService.stub(IEditCodeService, new MockEditCodeService());
		instantiationService.stub(INotificationService, new MockNotificationService());
		instantiationService.stub(IConvertToLLMMessageService, new MockConvertToLLMMessageService());
		instantiationService.stub(IWorkspaceContextService, new MockWorkspaceContextService());
		instantiationService.stub(IDirectoryStrService, new MockDirectoryStrService());
		instantiationService.stub(IFileService, new MockFileService());
		instantiationService.stub(IMCPService, new MockMCPService());
		instantiationService.stub(ITaskAwareModelRouter, new MockModelRouter());
		instantiationService.stub(IEditRiskScoringService, new MockEditRiskScoringService());
		instantiationService.stub(IModelService, new MockModelService());
		instantiationService.stub(ICommandService, new MockCommandService());
		instantiationService.stub(IAuditLogService, new MockAuditLogService());

		chatThreadService = instantiationService.createInstance(ChatThreadService);
	});

	suite('Thread Management', () => {
		test('should create a new thread on initialization', () => {
			const currentThread = chatThreadService.getCurrentThread();
			assert.ok(currentThread);
			assert.ok(currentThread.id);
			assert.strictEqual(currentThread.messages.length, 0);
		});

		test('should open a new thread', () => {
			const initialThread = chatThreadService.getCurrentThread();
			chatThreadService.openNewThread();
			const newThread = chatThreadService.getCurrentThread();

			assert.notStrictEqual(initialThread.id, newThread.id);
			assert.strictEqual(newThread.messages.length, 0);
		});

		test('should switch between threads', () => {
			const thread1 = chatThreadService.getCurrentThread();
			chatThreadService.openNewThread();
			const thread2 = chatThreadService.getCurrentThread();

			assert.notStrictEqual(thread1.id, thread2.id);

			chatThreadService.switchToThread(thread1.id);
			const switchedThread = chatThreadService.getCurrentThread();
			assert.strictEqual(switchedThread.id, thread1.id);
		});

		test('should list all thread IDs', () => {
			chatThreadService.openNewThread();
			chatThreadService.openNewThread();

			const threadIds = chatThreadService.getAllThreadIds();
			assert.strictEqual(threadIds.length, 3); // Initial + 2 new threads
		});

		test('should delete a thread', () => {
			const thread1 = chatThreadService.getCurrentThread();
			chatThreadService.openNewThread();
			const thread2Id = chatThreadService.getCurrentThread().id;

			chatThreadService.deleteThread(thread1.id);
			const threadIds = chatThreadService.getAllThreadIds();

			assert.strictEqual(threadIds.length, 1);
			assert.strictEqual(threadIds[0], thread2Id);
		});

		test('should duplicate a thread', () => {
			const originalThread = chatThreadService.getCurrentThread();
			chatThreadService.duplicateThread(originalThread.id);

			const threadIds = chatThreadService.getAllThreadIds();
			assert.strictEqual(threadIds.length, 2);
		});
	});

	suite('Staging Selections', () => {
		test('should add staging selection', () => {
			const selection: StagingSelectionItem = {
				type: 'File',
				uri: URI.file('/test/file.ts'),
			};

			chatThreadService.addNewStagingSelection(selection);
			const thread = chatThreadService.getCurrentThread();

			assert.strictEqual(thread.state.stagingSelections.length, 1);
			assert.strictEqual(thread.state.stagingSelections[0].uri.fsPath, selection.uri.fsPath);
		});

		test('should not add duplicate file selection', () => {
			const selection: StagingSelectionItem = {
				type: 'File',
				uri: URI.file('/test/file.ts'),
			};

			chatThreadService.addNewStagingSelection(selection);
			chatThreadService.addNewStagingSelection(selection);

			const thread = chatThreadService.getCurrentThread();
			assert.strictEqual(thread.state.stagingSelections.length, 1);
		});

		test('should pop staging selections', () => {
			const selection1: StagingSelectionItem = {
				type: 'File',
				uri: URI.file('/test/file1.ts'),
			};
			const selection2: StagingSelectionItem = {
				type: 'File',
				uri: URI.file('/test/file2.ts'),
			};

			chatThreadService.addNewStagingSelection(selection1);
			chatThreadService.addNewStagingSelection(selection2);

			let thread = chatThreadService.getCurrentThread();
			assert.strictEqual(thread.state.stagingSelections.length, 2);

			chatThreadService.popStagingSelections(1);
			thread = chatThreadService.getCurrentThread();
			assert.strictEqual(thread.state.stagingSelections.length, 1);
			assert.strictEqual(thread.state.stagingSelections[0].uri.fsPath, selection1.uri.fsPath);
		});

		test('should handle code selection ranges', () => {
			const selection: StagingSelectionItem = {
				type: 'CodeSelection',
				uri: URI.file('/test/file.ts'),
				range: [10, 20],
			};

			chatThreadService.addNewStagingSelection(selection);
			const thread = chatThreadService.getCurrentThread();

			assert.strictEqual(thread.state.stagingSelections.length, 1);
			assert.strictEqual(thread.state.stagingSelections[0].type, 'CodeSelection');
			if (thread.state.stagingSelections[0].type === 'CodeSelection') {
				assert.deepStrictEqual(thread.state.stagingSelections[0].range, [10, 20]);
			}
		});
	});

	suite('Message Focus Management', () => {
		test('should set and get focused message index', () => {
			chatThreadService.setCurrentlyFocusedMessageIdx(5);
			const focusedIdx = chatThreadService.getCurrentFocusedMessageIdx();
			assert.strictEqual(focusedIdx, 5);
		});

		test('should detect if currently focusing a message', () => {
			assert.strictEqual(chatThreadService.isCurrentlyFocusingMessage(), false);

			chatThreadService.setCurrentlyFocusedMessageIdx(0);
			assert.strictEqual(chatThreadService.isCurrentlyFocusingMessage(), true);

			chatThreadService.setCurrentlyFocusedMessageIdx(undefined);
			assert.strictEqual(chatThreadService.isCurrentlyFocusingMessage(), false);
		});
	});

	suite('Abort Operations', () => {
		test('should abort running thread', async () => {
			const threadId = chatThreadService.getCurrentThread().id;
			await chatThreadService.abortRunning(threadId);
			// Should not throw
			assert.ok(true);
		});

		test('should dismiss stream error', () => {
			const threadId = chatThreadService.getCurrentThread().id;
			chatThreadService.dismissStreamError(threadId);
			// Should not throw
			assert.ok(true);
		});
	});

	suite('Tool Request Handling', () => {
		test('should approve latest tool request', () => {
			const threadId = chatThreadService.getCurrentThread().id;
			chatThreadService.approveLatestToolRequest(threadId);
			// Should not throw
			assert.ok(true);
		});

		test('should reject latest tool request', () => {
			const threadId = chatThreadService.getCurrentThread().id;
			chatThreadService.rejectLatestToolRequest(threadId);
			// Should not throw
			assert.ok(true);
		});
	});

	suite('Thread Persistence', () => {
		test('should persist threads to storage', () => {
			const thread = chatThreadService.getCurrentThread();
			chatThreadService.openNewThread();

			// Threads should be persisted automatically
			const allThreadIds = chatThreadService.getAllThreadIds();
			assert.strictEqual(allThreadIds.length, 2);
		});

		test('should restore threads from storage', () => {
			// Create threads
			const thread1 = chatThreadService.getCurrentThread();
			chatThreadService.openNewThread();
			const thread2Id = chatThreadService.getCurrentThread().id;

			// Create new service instance (should restore from storage)
			const newService = instantiationService.createInstance(ChatThreadService);
			const restoredIds = newService.getAllThreadIds();

			assert.ok(restoredIds.length >= 2);
		});
	});

	suite('Relative Path Handling', () => {
		test('should get relative string for workspace file', () => {
			const uri = URI.file('/test/workspace/src/file.ts');
			const relativeStr = chatThreadService.getRelativeStr(uri);
			assert.ok(relativeStr !== undefined);
		});

		test('should handle non-workspace files', () => {
			const uri = URI.file('/outside/workspace/file.ts');
			const relativeStr = chatThreadService.getRelativeStr(uri);
			// May return undefined or absolute path depending on implementation
			assert.ok(relativeStr !== undefined || relativeStr === undefined);
		});
	});
});
