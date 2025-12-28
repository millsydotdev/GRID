/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Live Coding & Collaboration Service
 *
 * Real-time pair programming features including:
 * - Live cursor positions and selections
 * - Real-time code synchronization
 * - Voice/video integration
 * - Shared debugging sessions
 * - Collaborative editing with conflict resolution
 */

export interface Collaborator {
	id: string;
	name: string;
	avatar?: string;
	color: string; // Unique color for cursor/selections
	role: 'owner' | 'editor' | 'viewer';
	isActive: boolean;
	lastActivity: number;
	cursor?: {
		filePath: string;
		line: number;
		column: number;
	};
	selection?: {
		filePath: string;
		startLine: number;
		startColumn: number;
		endLine: number;
		endColumn: number;
	};
}

export interface CollaborationSession {
	id: string;
	name: string;
	createdAt: number;
	createdBy: string;
	collaborators: Map<string, Collaborator>;
	sharedFiles: Set<string>;
	settings: {
		allowEditing: boolean;
		requireApproval: boolean;
		voiceEnabled: boolean;
		videoEnabled: boolean;
		chatEnabled: boolean;
	};
}

export interface CodeChange {
	id: string;
	collaboratorId: string;
	filePath: string;
	timestamp: number;
	change: {
		type: 'insert' | 'delete' | 'replace';
		startLine: number;
		startColumn: number;
		endLine?: number;
		endColumn?: number;
		content: string;
		oldContent?: string;
	};
	synced: boolean;
}

export interface ChatMessage {
	id: string;
	collaboratorId: string;
	timestamp: number;
	type: 'text' | 'code' | 'system';
	content: string;
	metadata?: {
		filePath?: string;
		line?: number;
		codeSnippet?: string;
	};
}

export interface LiveCodingStats {
	totalSessions: number;
	totalCollaborators: number;
	averageSessionDuration: number;
	mostCollaboratedFiles: Array<{ filePath: string; edits: number }>;
	activeSessions: number;
}

export interface ILiveCodingService {
	/**
	 * Create a new collaboration session
	 */
	createSession(name: string, settings?: Partial<CollaborationSession['settings']>): Promise<CollaborationSession>;

	/**
	 * Join an existing session
	 */
	joinSession(sessionId: string, collaborator: Omit<Collaborator, 'id' | 'isActive' | 'lastActivity'>): Promise<void>;

	/**
	 * Leave a session
	 */
	leaveSession(sessionId: string): Promise<void>;

	/**
	 * Get current session
	 */
	getCurrentSession(): CollaborationSession | null;

	/**
	 * Update cursor position (broadcasts to all collaborators)
	 */
	updateCursor(filePath: string, line: number, column: number): void;

	/**
	 * Update selection (broadcasts to all collaborators)
	 */
	updateSelection(filePath: string, startLine: number, startColumn: number, endLine: number, endColumn: number): void;

	/**
	 * Send a code change (automatically synced)
	 */
	sendCodeChange(change: Omit<CodeChange, 'id' | 'timestamp' | 'synced'>): Promise<void>;

	/**
	 * Send a chat message
	 */
	sendChatMessage(content: string, metadata?: ChatMessage['metadata']): Promise<void>;

	/**
	 * Get chat history
	 */
	getChatHistory(): ChatMessage[];

	/**
	 * Get all collaborators in current session
	 */
	getCollaborators(): Collaborator[];

	/**
	 * Share a file with collaborators
	 */
	shareFile(filePath: string): Promise<void>;

	/**
	 * Stop sharing a file
	 */
	unshareFile(filePath: string): Promise<void>;

	/**
	 * Get statistics
	 */
	getStats(): LiveCodingStats;

	/**
	 * Enable/disable voice chat
	 */
	toggleVoice(enabled: boolean): Promise<void>;

	/**
	 * Enable/disable video
	 */
	toggleVideo(enabled: boolean): Promise<void>;
}

export class LiveCodingService implements ILiveCodingService {
	private currentSession: CollaborationSession | null = null;
	private currentUser: Collaborator | null = null;
	private codeChanges: CodeChange[] = [];
	private chatHistory: ChatMessage[] = [];
	private stats: LiveCodingStats = {
		totalSessions: 0,
		totalCollaborators: 0,
		averageSessionDuration: 0,
		mostCollaboratedFiles: [],
		activeSessions: 0,
	};

	// WebSocket connection for real-time sync
	private ws: WebSocket | null = null;
	private connectionUrl: string;

	constructor(
		private fileService: unknown,
		private editorService: unknown,
		connectionUrl: string = 'ws://localhost:8080/collaboration'
	) {
		this.connectionUrl = connectionUrl;
	}

	public async createSession(
		name: string,
		settings?: Partial<CollaborationSession['settings']>
	): Promise<CollaborationSession> {
		const session: CollaborationSession = {
			id: this.generateId(),
			name,
			createdAt: Date.now(),
			createdBy: this.currentUser?.id || 'unknown',
			collaborators: new Map(),
			sharedFiles: new Set(),
			settings: {
				allowEditing: true,
				requireApproval: false,
				voiceEnabled: false,
				videoEnabled: false,
				chatEnabled: true,
				...settings,
			},
		};

		this.currentSession = session;
		this.stats.totalSessions++;
		this.stats.activeSessions++;

		// Connect to WebSocket server
		await this.connectWebSocket(session.id);

		// Add creator as first collaborator
		if (this.currentUser) {
			session.collaborators.set(this.currentUser.id, {
				...this.currentUser,
				role: 'owner',
				isActive: true,
				lastActivity: Date.now(),
			});
		}

		// Broadcast session creation
		this.broadcastMessage({
			type: 'session-created',
			sessionId: session.id,
			session,
		});

		return session;
	}

	public async joinSession(
		sessionId: string,
		collaborator: Omit<Collaborator, 'id' | 'isActive' | 'lastActivity'>
	): Promise<void> {
		// Connect to WebSocket
		await this.connectWebSocket(sessionId);

		// Request to join session
		const fullCollaborator: Collaborator = {
			...collaborator,
			id: this.generateId(),
			isActive: true,
			lastActivity: Date.now(),
		};

		this.currentUser = fullCollaborator;

		// Send join request
		this.broadcastMessage({
			type: 'join-session',
			sessionId,
			collaborator: fullCollaborator,
		});

		// Wait for session data
		// In real implementation, this would wait for WebSocket response
		this.stats.totalCollaborators++;
	}

	public async leaveSession(sessionId: string): Promise<void> {
		if (!this.currentSession || this.currentSession.id !== sessionId) {
			return;
		}

		// Broadcast leave
		this.broadcastMessage({
			type: 'leave-session',
			sessionId,
			collaboratorId: this.currentUser?.id,
		});

		// Disconnect WebSocket
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.currentSession = null;
		this.stats.activeSessions--;
	}

	public getCurrentSession(): CollaborationSession | null {
		return this.currentSession;
	}

	public updateCursor(filePath: string, line: number, column: number): void {
		if (!this.currentUser || !this.currentSession) return;

		this.currentUser.cursor = { filePath, line, column };
		this.currentUser.lastActivity = Date.now();

		// Broadcast cursor update
		this.broadcastMessage({
			type: 'cursor-update',
			collaboratorId: this.currentUser.id,
			cursor: this.currentUser.cursor,
		});
	}

	public updateSelection(
		filePath: string,
		startLine: number,
		startColumn: number,
		endLine: number,
		endColumn: number
	): void {
		if (!this.currentUser || !this.currentSession) return;

		this.currentUser.selection = {
			filePath,
			startLine,
			startColumn,
			endLine,
			endColumn,
		};
		this.currentUser.lastActivity = Date.now();

		// Broadcast selection update
		this.broadcastMessage({
			type: 'selection-update',
			collaboratorId: this.currentUser.id,
			selection: this.currentUser.selection,
		});
	}

	public async sendCodeChange(change: Omit<CodeChange, 'id' | 'timestamp' | 'synced'>): Promise<void> {
		if (!this.currentUser || !this.currentSession) return;

		const codeChange: CodeChange = {
			id: this.generateId(),
			timestamp: Date.now(),
			synced: false,
			...change,
		};

		this.codeChanges.push(codeChange);

		// Broadcast code change
		this.broadcastMessage({
			type: 'code-change',
			change: codeChange,
		});

		// Apply change locally (if needed)
		await this.applyCodeChange(codeChange);

		// Mark as synced
		codeChange.synced = true;

		// Update stats
		this.updateFileStats(change.filePath);
	}

	public async sendChatMessage(content: string, metadata?: ChatMessage['metadata']): Promise<void> {
		if (!this.currentUser || !this.currentSession) return;

		const message: ChatMessage = {
			id: this.generateId(),
			collaboratorId: this.currentUser.id,
			timestamp: Date.now(),
			type: metadata?.codeSnippet ? 'code' : 'text',
			content,
			metadata,
		};

		this.chatHistory.push(message);

		// Broadcast message
		this.broadcastMessage({
			type: 'chat-message',
			message,
		});
	}

	public getChatHistory(): ChatMessage[] {
		return this.chatHistory;
	}

	public getCollaborators(): Collaborator[] {
		if (!this.currentSession) return [];
		return Array.from(this.currentSession.collaborators.values());
	}

	public async shareFile(filePath: string): Promise<void> {
		if (!this.currentSession) return;

		this.currentSession.sharedFiles.add(filePath);

		// Broadcast file share
		this.broadcastMessage({
			type: 'file-shared',
			filePath,
		});

		// Send file content to new collaborators
		const content = await this.fileService.readFile(filePath);
		this.broadcastMessage({
			type: 'file-content',
			filePath,
			content,
		});
	}

	public async unshareFile(filePath: string): Promise<void> {
		if (!this.currentSession) return;

		this.currentSession.sharedFiles.delete(filePath);

		// Broadcast file unshare
		this.broadcastMessage({
			type: 'file-unshared',
			filePath,
		});
	}

	public getStats(): LiveCodingStats {
		return this.stats;
	}

	public async toggleVoice(enabled: boolean): Promise<void> {
		if (!this.currentSession) return;

		this.currentSession.settings.voiceEnabled = enabled;

		// Broadcast voice toggle
		this.broadcastMessage({
			type: 'voice-toggle',
			enabled,
		});

		// In real implementation, this would start/stop WebRTC voice connection
	}

	public async toggleVideo(enabled: boolean): Promise<void> {
		if (!this.currentSession) return;

		this.currentSession.settings.videoEnabled = enabled;

		// Broadcast video toggle
		this.broadcastMessage({
			type: 'video-toggle',
			enabled,
		});

		// In real implementation, this would start/stop WebRTC video connection
	}

	// Private helper methods

	private async connectWebSocket(sessionId: string): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.ws = new WebSocket(`${this.connectionUrl}/${sessionId}`);

				this.ws.onopen = () => {
					console.log('WebSocket connected');
					resolve();
				};

				this.ws.onmessage = (event) => {
					this.handleWebSocketMessage(event.data);
				};

				this.ws.onerror = (error) => {
					console.error('WebSocket error:', error);
					reject(error);
				};

				this.ws.onclose = () => {
					console.log('WebSocket disconnected');
				};
			} catch (error) {
				reject(error);
			}
		});
	}

	private broadcastMessage(message: unknown): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		}
	}

	private handleWebSocketMessage(data: string): void {
		try {
			const message = JSON.parse(data);

			switch (message.type) {
				case 'collaborator-joined':
					this.handleCollaboratorJoined(message.collaborator);
					break;
				case 'collaborator-left':
					this.handleCollaboratorLeft(message.collaboratorId);
					break;
				case 'cursor-update':
					this.handleCursorUpdate(message.collaboratorId, message.cursor);
					break;
				case 'selection-update':
					this.handleSelectionUpdate(message.collaboratorId, message.selection);
					break;
				case 'code-change':
					this.handleCodeChange(message.change);
					break;
				case 'chat-message':
					this.handleChatMessage(message.message);
					break;
				case 'file-shared':
					this.handleFileShared(message.filePath);
					break;
				case 'file-content':
					this.handleFileContent(message.filePath, message.content);
					break;
			}
		} catch (error) {
			console.error('Error handling WebSocket message:', error);
		}
	}

	private handleCollaboratorJoined(collaborator: Collaborator): void {
		if (!this.currentSession) return;
		this.currentSession.collaborators.set(collaborator.id, collaborator);
		this.stats.totalCollaborators++;
	}

	private handleCollaboratorLeft(collaboratorId: string): void {
		if (!this.currentSession) return;
		this.currentSession.collaborators.delete(collaboratorId);
	}

	private handleCursorUpdate(collaboratorId: string, cursor: Collaborator['cursor']): void {
		if (!this.currentSession) return;
		const collaborator = this.currentSession.collaborators.get(collaboratorId);
		if (collaborator) {
			collaborator.cursor = cursor;
			collaborator.lastActivity = Date.now();
		}
	}

	private handleSelectionUpdate(collaboratorId: string, selection: Collaborator['selection']): void {
		if (!this.currentSession) return;
		const collaborator = this.currentSession.collaborators.get(collaboratorId);
		if (collaborator) {
			collaborator.selection = selection;
			collaborator.lastActivity = Date.now();
		}
	}

	private async handleCodeChange(change: CodeChange): Promise<void> {
		// Apply remote code change
		await this.applyCodeChange(change);
		this.codeChanges.push(change);
		this.updateFileStats(change.filePath);
	}

	private handleChatMessage(message: ChatMessage): void {
		this.chatHistory.push(message);
	}

	private handleFileShared(filePath: string): void {
		if (!this.currentSession) return;
		this.currentSession.sharedFiles.add(filePath);
	}

	private async handleFileContent(filePath: string, content: string): Promise<void> {
		// Sync file content
		await this.fileService.writeFile(filePath, content);
	}

	private async applyCodeChange(change: CodeChange): Promise<void> {
		// Apply code change to editor
		const document = await this.editorService.openTextDocument(change.filePath);
		// Implementation would apply the actual edit
	}

	private updateFileStats(filePath: string): void {
		const existing = this.stats.mostCollaboratedFiles.find((f) => f.filePath === filePath);
		if (existing) {
			existing.edits++;
		} else {
			this.stats.mostCollaboratedFiles.push({ filePath, edits: 1 });
		}

		// Sort by edits
		this.stats.mostCollaboratedFiles.sort((a, b) => b.edits - a.edits);

		// Keep only top 10
		this.stats.mostCollaboratedFiles = this.stats.mostCollaboratedFiles.slice(0, 10);
	}

	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
}
