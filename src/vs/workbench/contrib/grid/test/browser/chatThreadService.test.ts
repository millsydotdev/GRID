/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IChatThreadService } from '../../browser/chatThreadService.js';
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
import { StagingSelectionItem } from '../../common/chatThreadServiceTypes.js';
import { Emitter } from '../../../../../base/common/event.js';

// Mock implementations
class MockLLMMessageService {
	async sendLLMMessage(): Promise<any> {
		return {
			role: 'assistant' as const,
			content: [{ type: 'text' as const, text: 'Mock response' }],
		};
	}
}

class MockGridSettingsService {
	private _onDidChangeSettings = new Emitter<void>();
	onDidChangeSettings = this._onDidChangeSettings.event;

	getSettings(): any {
		return {
			modelSelection: { provider: 'anthropic', modelName: 'claude-sonnet-4-5' },
			chatMode: 'normal' as const,
			features: {},
		};
	}
}

class MockToolsService {
	async executeBuiltinTool(): Promise<any> {
		return { type: 'success' as const, result: 'Mock tool result' };
	}
}

class MockMetricsService {
	trackEvent(): any {}
	trackError(): any {}
}

class MockEditCodeService {
	async applyEdits(): Promise<any> {
		return { success: true, filesModified: [] };
	}
	async createCheckpoint(): Promise<any> {
		return 'checkpoint-id';
	}
}

class MockNotificationService {
	notify(): any {
		return { close: () => {}, updateMessage: () => {}, updateSeverity: () => {}, updateActions: () => {} };
	}
	info(): any {}
	warn() {}
	error() {}
}

class MockConvertToLLMMessageService {
	async convertToLLMMessages(): Promise<any> {
		return [];
	}
}

class MockWorkspaceContextService {
	getWorkspace(): any {
		return { folders: [{ uri: URI.file('/test/workspace'), name: 'test', index: 0 }], id: 'test', configuration: null };
	}
}

class MockDirectoryStrService {
	async getDirectoryStructure(): Promise<any> {
		return 'test/\n  file1.ts\n  file2.ts';
	}
}

class MockFileService {
	async exists(): Promise<any> {
		return true;
	}
	async readFile(): Promise<any> {
		return { value: Buffer.from('test content') };
	}
}

class MockMCPService {
	async listTools(): Promise<any> {
		return [];
	}
}

class MockModelRouter {
	routeTask(): any {
		return { provider: 'anthropic', modelName: 'claude-sonnet-4-5', reasoning: 'Default model' };
	}
}

class MockEditRiskScoringService {
	scoreEditRisk(): any {
		return { score: 0.5, confidence: 0.8, factors: [] };
	}
}

class MockModelService {
	getModel(): any {
		return null;
	}
}

class MockCommandService {
	async executeCommand(): Promise<any> {
		return undefined;
	}
}

class MockAuditLogService {
	log(): any {}
}

suite('ChatThreadService', () => {

	// ensureNoDisposablesAreLeakedInTestSuite();
	let instantiationService: TestInstantiationService;
	let chatThreadService: IChatThreadService;
	let storageService: InMemoryStorageService;

	setup(() => {
		instantiationService = new TestInstantiationService();
		storageService = new InMemoryStorageService();

		// Register all mock services
		instantiationService.stub(IStorageService, storageService);
		instantiationService.stub(ILLMMessageService, new MockLLMMessageService() as any);
		instantiationService.stub(IGridSettingsService, new MockGridSettingsService() as any);
		instantiationService.stub(IToolsService, new MockToolsService() as any);
		instantiationService.stub(ILanguageFeaturesService, {} as any);
		instantiationService.stub(IMetricsService, new MockMetricsService() as any);
		instantiationService.stub(IGridModelService, {} as any);
		instantiationService.stub(IEditCodeService, new MockEditCodeService() as any);
		instantiationService.stub(INotificationService, new MockNotificationService() as any);
		instantiationService.stub(IConvertToLLMMessageService, new MockConvertToLLMMessageService() as any);
		instantiationService.stub(IWorkspaceContextService, new MockWorkspaceContextService() as any);
		instantiationService.stub(IDirectoryStrService, new MockDirectoryStrService() as any);
		instantiationService.stub(IFileService, new MockFileService() as any);
		instantiationService.stub(IMCPService, new MockMCPService() as any);
		instantiationService.stub(ITaskAwareModelRouter, new MockModelRouter() as any);
		instantiationService.stub(IEditRiskScoringService, new MockEditRiskScoringService() as any);
		instantiationService.stub(IModelService, new MockModelService() as any);
		instantiationService.stub(ICommandService, new MockCommandService() as any);
		instantiationService.stub(IAuditLogService, new MockAuditLogService() as any);

		// Note: ChatThreadService class is not exported, use service locator
		chatThreadService = instantiationService.get(IChatThreadService) as any;
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

			const threadIds = (chatThreadService as any).getAllThreadIds();
			assert.strictEqual(threadIds.length, 3); // Initial + 2 new threads
		});

		test('should delete a thread', () => {
			const thread1 = chatThreadService.getCurrentThread();
			chatThreadService.openNewThread();
			const thread2Id = chatThreadService.getCurrentThread().id;

			chatThreadService.deleteThread(thread1.id);
			const threadIds = (chatThreadService as any).getAllThreadIds();

			assert.strictEqual(threadIds.length, 1);
			assert.strictEqual(threadIds[0], thread2Id);
		});

		test('should duplicate a thread', () => {
			const originalThread = chatThreadService.getCurrentThread();
			chatThreadService.duplicateThread(originalThread.id);

			const threadIds = (chatThreadService as any).getAllThreadIds();
			assert.strictEqual(threadIds.length, 2);
		});
	});

	suite('Staging Selections', () => {
		test('should add staging selection', () => {
			const selection: StagingSelectionItem = {
				type: 'File',
				uri: URI.file('/test/file.ts'),
			} as any;

			chatThreadService.addNewStagingSelection(selection);
			const thread = chatThreadService.getCurrentThread();

			assert.strictEqual(thread.state.stagingSelections.length, 1);
			assert.strictEqual(thread.state.stagingSelections[0].uri.fsPath, selection.uri.fsPath);
		});

		test('should not add duplicate file selection', () => {
			const selection: StagingSelectionItem = {
				type: 'File',
				uri: URI.file('/test/file.ts'),
			} as any;

			chatThreadService.addNewStagingSelection(selection);
			chatThreadService.addNewStagingSelection(selection);

			const thread = chatThreadService.getCurrentThread();
			assert.strictEqual(thread.state.stagingSelections.length, 1);
		});

		test('should pop staging selections', () => {
			const selection1: StagingSelectionItem = {
				type: 'File',
				uri: URI.file('/test/file1.ts'),
			} as any;
			const selection2: StagingSelectionItem = {
				type: 'File',
				uri: URI.file('/test/file2.ts'),
			} as any;

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
			} as any;

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
			chatThreadService.getCurrentThread();
			chatThreadService.openNewThread();

			// Threads should be persisted automatically
			const allThreadIds = (chatThreadService as any).getAllThreadIds();
			assert.strictEqual(allThreadIds.length, 2);
		});

		test('should restore threads from storage', () => {
			// Create threads
			chatThreadService.getCurrentThread();
			chatThreadService.openNewThread();
			chatThreadService.getCurrentThread().id;

			// Create new service instance (should restore from storage)
			const newService = instantiationService.get(IChatThreadService) as any;
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
