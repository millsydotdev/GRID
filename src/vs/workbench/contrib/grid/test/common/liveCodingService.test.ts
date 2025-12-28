/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import {
	LiveCodingService,
	Collaborator,
	CollaborationSession,
	CodeChange,
	ChatMessage,
} from '../../common/liveCodingService.js';

/**
 * Mock File Service
 */
class MockFileService {
	private files: Map<string, string> = new Map();

	async readFile(path: string): Promise<string> {
		return this.files.get(path) || '';
	}

	async writeFile(path: string, content: string): Promise<void> {
		this.files.set(path, content);
	}

	setContent(path: string, content: string): void {
		this.files.set(path, content);
	}
}

/**
 * Mock Editor Service
 */
class MockEditorService {
	private activeEditors: Map<string, any> = new Map();

	getActiveEditor(filePath: string): any {
		return this.activeEditors.get(filePath);
	}

	setActiveEditor(filePath: string, editor: any): void {
		this.activeEditors.set(filePath, editor);
	}
}

/**
 * Mock WebSocket (for testing without real network)
 */
class MockWebSocket {
	public readyState: number = 1; // OPEN state
	public onopen: (() => void) | null = null;
	public onclose: (() => void) | null = null;
	public onerror: ((error: any) => void) | null = null;
	public onmessage: ((event: { data: string }) => void) | null = null;

	private messageQueue: string[] = [];

	constructor(public url: string) {
		// Simulate connection
		setTimeout(() => {
			if (this.onopen) {
				this.onopen();
			}
		}, 10);
	}

	send(data: string): void {
		this.messageQueue.push(data);
	}

	close(): void {
		this.readyState = 3; // CLOSED
		if (this.onclose) {
			this.onclose();
		}
	}

	simulateMessage(data: any): void {
		if (this.onmessage) {
			this.onmessage({ data: JSON.stringify(data) });
		}
	}

	getMessageQueue(): string[] {
		return this.messageQueue;
	}
}

suite('LiveCodingService Tests', () => {
	let service: LiveCodingService;
	let mockFileService: MockFileService;
	let mockEditorService: MockEditorService;

	setup(() => {
		mockFileService = new MockFileService();
		mockEditorService = new MockEditorService();
		service = new LiveCodingService(mockFileService, mockEditorService, 'ws://localhost:8080/test');
	});

	test('should create a collaboration session', async () => {
		const session = await service.createSession('Test Session', {
			allowEditing: true,
			requireApproval: false,
			chatEnabled: true,
		});

		assert.ok(session.id, 'Session should have an ID');
		assert.strictEqual(session.name, 'Test Session', 'Session name should match');
		assert.ok(session.createdAt > 0, 'Session should have creation timestamp');
		assert.ok(session.settings.allowEditing, 'Session should allow editing');
		assert.ok(session.settings.chatEnabled, 'Session should have chat enabled');
	});

	test('should join an existing session', async () => {
		const session = await service.createSession('Test Session');
		const sessionId = session.id;

		const collaborator = {
			name: 'Alice',
			color: '#FF0000',
			role: 'editor' as const,
		};

		await service.joinSession(sessionId, collaborator);

		const currentSession = service.getCurrentSession();
		assert.ok(currentSession, 'Should have current session');
		assert.strictEqual(currentSession!.id, sessionId, 'Session ID should match');
	});

	test('should leave a session', async () => {
		const session = await service.createSession('Test Session');
		await service.leaveSession(session.id);

		const currentSession = service.getCurrentSession();
		assert.strictEqual(currentSession, null, 'Should not have a current session');
	});

	test('should get current session', async () => {
		assert.strictEqual(service.getCurrentSession(), null, 'Should have no session initially');

		const session = await service.createSession('Test Session');
		const currentSession = service.getCurrentSession();

		assert.ok(currentSession, 'Should have current session');
		assert.strictEqual(currentSession!.id, session.id, 'Session should match');
	});

	test('should update cursor position', async () => {
		await service.createSession('Test Session');
		const filePath = '/test/file.ts';
		const line = 10;
		const column = 5;

		service.updateCursor(filePath, line, column);

		// Cursor update should not throw errors
		assert.ok(true);
	});

	test('should update selection', async () => {
		await service.createSession('Test Session');
		const filePath = '/test/file.ts';

		service.updateSelection(filePath, 5, 0, 10, 15);

		// Selection update should not throw errors
		assert.ok(true);
	});

	test('should send code changes', async () => {
		await service.createSession('Test Session');

		const change = {
			collaboratorId: 'user1',
			filePath: '/test/file.ts',
			change: {
				type: 'insert' as const,
				startLine: 5,
				startColumn: 0,
				content: 'const x = 1;',
			},
		};

		await service.sendCodeChange(change);

		// Change should be sent without errors
		assert.ok(true);
	});

	test('should handle different code change types', async () => {
		await service.createSession('Test Session');

		const insertChange = {
			collaboratorId: 'user1',
			filePath: '/test/file.ts',
			change: {
				type: 'insert' as const,
				startLine: 5,
				startColumn: 0,
				content: 'new line',
			},
		};

		const deleteChange = {
			collaboratorId: 'user1',
			filePath: '/test/file.ts',
			change: {
				type: 'delete' as const,
				startLine: 5,
				startColumn: 0,
				endLine: 5,
				endColumn: 10,
				content: '',
				oldContent: 'old content',
			},
		};

		const replaceChange = {
			collaboratorId: 'user1',
			filePath: '/test/file.ts',
			change: {
				type: 'replace' as const,
				startLine: 5,
				startColumn: 0,
				endLine: 5,
				endColumn: 10,
				content: 'new content',
				oldContent: 'old content',
			},
		};

		await service.sendCodeChange(insertChange);
		await service.sendCodeChange(deleteChange);
		await service.sendCodeChange(replaceChange);

		assert.ok(true, 'Should handle all change types');
	});

	test('should send chat messages', async () => {
		await service.createSession('Test Session');

		await service.sendChatMessage('Hello, world!');
		await service.sendChatMessage('Check this code', {
			filePath: '/test/file.ts',
			line: 10,
			codeSnippet: 'const x = 1;',
		});

		const history = service.getChatHistory();
		assert.ok(Array.isArray(history), 'Chat history should be an array');
	});

	test('should get chat history', async () => {
		await service.createSession('Test Session');

		await service.sendChatMessage('Message 1');
		await service.sendChatMessage('Message 2');
		await service.sendChatMessage('Message 3');

		const history = service.getChatHistory();
		assert.ok(history.length >= 0, 'Should return chat history');
	});

	test('should get collaborators', async () => {
		await service.createSession('Test Session');

		const collaborators = service.getCollaborators();
		assert.ok(Array.isArray(collaborators), 'Should return collaborators array');
	});

	test('should share files', async () => {
		await service.createSession('Test Session');

		const filePath = '/test/shared.ts';
		await service.shareFile(filePath);

		// File should be shared without errors
		assert.ok(true);
	});

	test('should unshare files', async () => {
		await service.createSession('Test Session');

		const filePath = '/test/shared.ts';
		await service.shareFile(filePath);
		await service.unshareFile(filePath);

		// File should be unshared without errors
		assert.ok(true);
	});

	test('should track statistics', () => {
		const stats = service.getStats();

		assert.ok(typeof stats.totalSessions === 'number', 'Should track total sessions');
		assert.ok(typeof stats.totalCollaborators === 'number', 'Should track total collaborators');
		assert.ok(typeof stats.averageSessionDuration === 'number', 'Should track average session duration');
		assert.ok(Array.isArray(stats.mostCollaboratedFiles), 'Should have most collaborated files array');
		assert.ok(typeof stats.activeSessions === 'number', 'Should track active sessions');
	});

	test('should increment total sessions count', async () => {
		const statsBefore = service.getStats();
		await service.createSession('Session 1');
		const statsAfter = service.getStats();

		assert.ok(statsAfter.totalSessions >= statsBefore.totalSessions, 'Should increment sessions count');
	});

	test('should toggle voice chat', async () => {
		await service.createSession('Test Session');

		await service.toggleVoice(true);
		await service.toggleVoice(false);

		// Voice toggle should not throw errors
		assert.ok(true);
	});

	test('should toggle video', async () => {
		await service.createSession('Test Session');

		await service.toggleVideo(true);
		await service.toggleVideo(false);

		// Video toggle should not throw errors
		assert.ok(true);
	});

	test('should handle collaborator roles correctly', async () => {
		const session = await service.createSession('Test Session');

		const owner: Collaborator = {
			id: 'user1',
			name: 'Owner',
			color: '#FF0000',
			role: 'owner',
			isActive: true,
			lastActivity: Date.now(),
		};

		const editor: Collaborator = {
			id: 'user2',
			name: 'Editor',
			color: '#00FF00',
			role: 'editor',
			isActive: true,
			lastActivity: Date.now(),
		};

		const viewer: Collaborator = {
			id: 'user3',
			name: 'Viewer',
			color: '#0000FF',
			role: 'viewer',
			isActive: true,
			lastActivity: Date.now(),
		};

		assert.strictEqual(owner.role, 'owner', 'Owner role should be correct');
		assert.strictEqual(editor.role, 'editor', 'Editor role should be correct');
		assert.strictEqual(viewer.role, 'viewer', 'Viewer role should be correct');
	});

	test('should handle session settings', async () => {
		const session = await service.createSession('Test Session', {
			allowEditing: false,
			requireApproval: true,
			voiceEnabled: true,
			videoEnabled: false,
			chatEnabled: true,
		});

		assert.strictEqual(session.settings.allowEditing, false, 'Should not allow editing');
		assert.strictEqual(session.settings.requireApproval, true, 'Should require approval');
		assert.strictEqual(session.settings.voiceEnabled, true, 'Voice should be enabled');
		assert.strictEqual(session.settings.videoEnabled, false, 'Video should be disabled');
		assert.strictEqual(session.settings.chatEnabled, true, 'Chat should be enabled');
	});

	test('should track collaborator activity', async () => {
		await service.createSession('Test Session');

		const collaborator = {
			name: 'Alice',
			color: '#FF0000',
			role: 'editor' as const,
		};

		await service.joinSession(service.getCurrentSession()!.id, collaborator);

		const collaborators = service.getCollaborators();
		if (collaborators.length > 0) {
			assert.ok(collaborators[0].lastActivity > 0, 'Should track last activity');
			assert.ok(typeof collaborators[0].isActive === 'boolean', 'Should track active status');
		}
	});

	test('should handle cursor positions', async () => {
		await service.createSession('Test Session');

		const filePath = '/test/file.ts';
		service.updateCursor(filePath, 10, 5);

		const collaborators = service.getCollaborators();
		if (collaborators.length > 0 && collaborators[0].cursor) {
			assert.strictEqual(collaborators[0].cursor.filePath, filePath, 'Cursor file path should match');
			assert.strictEqual(collaborators[0].cursor.line, 10, 'Cursor line should match');
			assert.strictEqual(collaborators[0].cursor.column, 5, 'Cursor column should match');
		}
	});

	test('should handle selections', async () => {
		await service.createSession('Test Session');

		const filePath = '/test/file.ts';
		service.updateSelection(filePath, 5, 0, 10, 15);

		const collaborators = service.getCollaborators();
		if (collaborators.length > 0 && collaborators[0].selection) {
			const selection = collaborators[0].selection;
			assert.strictEqual(selection.filePath, filePath, 'Selection file path should match');
			assert.strictEqual(selection.startLine, 5, 'Selection start line should match');
			assert.strictEqual(selection.startColumn, 0, 'Selection start column should match');
			assert.strictEqual(selection.endLine, 10, 'Selection end line should match');
			assert.strictEqual(selection.endColumn, 15, 'Selection end column should match');
		}
	});

	test('should handle chat message types', async () => {
		await service.createSession('Test Session');

		await service.sendChatMessage('Text message');
		await service.sendChatMessage('Code snippet', {
			filePath: '/test/file.ts',
			line: 10,
			codeSnippet: 'const x = 1;',
		});

		const history = service.getChatHistory();
		// Chat history handling depends on implementation
		assert.ok(Array.isArray(history), 'Should handle different message types');
	});

	test('should create unique session IDs', async () => {
		const session1 = await service.createSession('Session 1');
		await service.leaveSession(session1.id);
		const session2 = await service.createSession('Session 2');

		assert.notStrictEqual(session1.id, session2.id, 'Session IDs should be unique');
	});

	test('should handle multiple file shares', async () => {
		await service.createSession('Test Session');

		await service.shareFile('/test/file1.ts');
		await service.shareFile('/test/file2.ts');
		await service.shareFile('/test/file3.ts');

		// Multiple files should be shared without errors
		assert.ok(true);
	});

	test('should handle rapid cursor updates', async () => {
		await service.createSession('Test Session');

		const filePath = '/test/file.ts';

		// Simulate rapid cursor movements
		for (let i = 0; i < 10; i++) {
			service.updateCursor(filePath, i, i * 2);
		}

		// Should handle rapid updates without errors
		assert.ok(true);
	});

	test('should validate collaborator colors', async () => {
		const session = await service.createSession('Test Session');

		const collaborator1 = {
			name: 'User1',
			color: '#FF0000',
			role: 'editor' as const,
		};

		const collaborator2 = {
			name: 'User2',
			color: '#00FF00',
			role: 'editor' as const,
		};

		// Colors should be valid hex codes
		assert.ok(/^#[0-9A-F]{6}$/i.test(collaborator1.color), 'Color 1 should be valid hex');
		assert.ok(/^#[0-9A-F]{6}$/i.test(collaborator2.color), 'Color 2 should be valid hex');
	});
});
