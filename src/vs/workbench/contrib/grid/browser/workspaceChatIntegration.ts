/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IWorkspaceContextManagerService } from '../../../services/workspaceManager/common/workspaceContext.js';
import { IWorkspaceManagerService } from '../../../services/workspaceManager/common/workspaceManager.js';
import { IChatThreadService } from './chatThreadService.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';

export const IWorkspaceChatIntegrationService = createDecorator<IWorkspaceChatIntegrationService>(
	'workspaceChatIntegrationService'
);

/**
 * Context information attached to chat messages and AI requests
 */
export interface IChatWorkspaceContext {
	/**
	 * Current workspace ID
	 */
	workspaceId?: string;

	/**
	 * Current workspace instance ID (for parallel mode)
	 */
	instanceId?: string;

	/**
	 * Workspace name for display
	 */
	workspaceName?: string;

	/**
	 * Active agent session ID (if any)
	 */
	agentSessionId?: string;

	/**
	 * Workspace root path
	 */
	workspaceRoot?: string;

	/**
	 * Indicates if workspace is in parallel mode
	 */
	isParallelMode?: boolean;
}

/**
 * Service that integrates workspace management with chat/AI services
 * Ensures AI conversations are scoped to the correct workspace instance
 */
export interface IWorkspaceChatIntegrationService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when workspace context changes
	 */
	readonly onDidChangeWorkspaceContext: Event<IChatWorkspaceContext>;

	/**
	 * Get current workspace context for AI operations
	 */
	getCurrentWorkspaceContext(): Promise<IChatWorkspaceContext>;

	/**
	 * Create a new chat thread scoped to a workspace instance
	 */
	createWorkspaceChatThread(instanceId: string, threadName?: string): Promise<string>;

	/**
	 * Get all chat threads for a workspace instance
	 */
	getChatThreadsForInstance(instanceId: string): Promise<string[]>;

	/**
	 * Associate an agent session with a chat thread
	 */
	associateAgentWithThread(sessionId: string, threadId: string): Promise<void>;

	/**
	 * Get the workspace context for a specific chat thread
	 */
	getWorkspaceContextForThread(threadId: string): Promise<IChatWorkspaceContext | undefined>;

	/**
	 * Inject workspace context into AI request metadata
	 */
	enrichAIRequest(request: any): Promise<any>;

	/**
	 * Switch workspace context (updates current instance)
	 */
	switchWorkspaceContext(instanceId: string): Promise<void>;

	/**
	 * Clean up threads for closed workspace instances
	 */
	cleanupClosedWorkspaceThreads(instanceId: string): Promise<void>;
}

const THREAD_WORKSPACE_MAP_KEY = 'workspaceChat.threadWorkspaceMap';

export class WorkspaceChatIntegrationService extends Disposable implements IWorkspaceChatIntegrationService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeWorkspaceContext = this._register(new Emitter<IChatWorkspaceContext>());
	readonly onDidChangeWorkspaceContext: Event<IChatWorkspaceContext> = this._onDidChangeWorkspaceContext.event;

	// Map of thread ID -> workspace context
	private threadWorkspaceMap: Map<string, IChatWorkspaceContext> = new Map();

	// Map of instance ID -> thread IDs
	private instanceThreadsMap: Map<string, Set<string>> = new Map();

	// Map of agent session ID -> thread ID
	private agentThreadMap: Map<string, string> = new Map();

	private currentContext: IChatWorkspaceContext | undefined;

	constructor(
		@IWorkspaceContextManagerService private readonly contextManager: IWorkspaceContextManagerService,
		@IWorkspaceManagerService private readonly workspaceManager: IWorkspaceManagerService,
		@IChatThreadService private readonly chatThreadService: IChatThreadService,
		@IStorageService private readonly storageService: IStorageService
	) {
		super();
		this._loadStoredMappings();
		this._registerListeners();
		this._initializeCurrentContext();
	}

	async getCurrentWorkspaceContext(): Promise<IChatWorkspaceContext> {
		if (this.currentContext) {
			return this.currentContext;
		}

		// Initialize from current workspace
		const instance = await this.contextManager.getCurrentContext();
		if (!instance) {
			return {};
		}

		const workspace = await this.workspaceManager.getWorkspace(instance.workspaceId);
		const isParallel = await this.contextManager.isInParallelMode(instance.workspaceId);

		this.currentContext = {
			workspaceId: instance.workspaceId,
			instanceId: instance.instanceId,
			workspaceName: workspace?.name || instance.displayName,
			workspaceRoot: workspace?.rootUri.fsPath,
			isParallelMode: isParallel,
		};

		return this.currentContext;
	}

	async createWorkspaceChatThread(instanceId: string, threadName?: string): Promise<string> {
		const instance = await this.contextManager.getInstance(instanceId);
		if (!instance) {
			throw new Error(`Workspace instance ${instanceId} not found`);
		}

		const workspace = await this.workspaceManager.getWorkspace(instance.workspaceId);
		const name = threadName || `${workspace?.name || 'Workspace'} - ${instance.displayName}`;

		// Create thread using chat service
		this.chatThreadService.openNewThread();
		const threadId = this.chatThreadService.state.currentThreadId;

		// Build context
		const context: IChatWorkspaceContext = {
			workspaceId: instance.workspaceId,
			instanceId: instance.instanceId,
			workspaceName: workspace?.name || instance.displayName,
			workspaceRoot: workspace?.rootUri.fsPath,
			isParallelMode: await this.contextManager.isInParallelMode(instance.workspaceId),
		};

		// Store mappings
		this.threadWorkspaceMap.set(threadId, context);

		let instanceThreads = this.instanceThreadsMap.get(instanceId);
		if (!instanceThreads) {
			instanceThreads = new Set();
			this.instanceThreadsMap.set(instanceId, instanceThreads);
		}
		instanceThreads.add(threadId);

		// Add to instance's chat thread IDs
		instance.chatThreadIds.push(threadId);

		await this._saveMappings();
		return threadId;
	}

	async getChatThreadsForInstance(instanceId: string): Promise<string[]> {
		const threads = this.instanceThreadsMap.get(instanceId);
		return threads ? Array.from(threads) : [];
	}

	async associateAgentWithThread(sessionId: string, threadId: string): Promise<void> {
		this.agentThreadMap.set(sessionId, threadId);

		// Update context with agent session
		const context = this.threadWorkspaceMap.get(threadId);
		if (context) {
			context.agentSessionId = sessionId;
			this.threadWorkspaceMap.set(threadId, context);
		}

		await this._saveMappings();
	}

	async getWorkspaceContextForThread(threadId: string): Promise<IChatWorkspaceContext | undefined> {
		return this.threadWorkspaceMap.get(threadId);
	}

	async enrichAIRequest(request: any): Promise<any> {
		const context = await this.getCurrentWorkspaceContext();

		return {
			...request,
			workspaceContext: context,
			metadata: {
				...request.metadata,
				workspaceId: context.workspaceId,
				instanceId: context.instanceId,
				workspaceName: context.workspaceName,
				workspaceRoot: context.workspaceRoot,
				isParallelMode: context.isParallelMode,
			},
		};
	}

	async switchWorkspaceContext(instanceId: string): Promise<void> {
		await this.contextManager.setCurrentContext(instanceId);

		const instance = await this.contextManager.getInstance(instanceId);
		if (!instance) {
			return;
		}

		const workspace = await this.workspaceManager.getWorkspace(instance.workspaceId);
		const isParallel = await this.contextManager.isInParallelMode(instance.workspaceId);

		this.currentContext = {
			workspaceId: instance.workspaceId,
			instanceId: instance.instanceId,
			workspaceName: workspace?.name || instance.displayName,
			workspaceRoot: workspace?.rootUri.fsPath,
			isParallelMode: isParallel,
		};

		this._onDidChangeWorkspaceContext.fire(this.currentContext);
	}

	async cleanupClosedWorkspaceThreads(instanceId: string): Promise<void> {
		const threads = this.instanceThreadsMap.get(instanceId);
		if (!threads) {
			return;
		}

		// Remove thread mappings
		for (const threadId of threads) {
			this.threadWorkspaceMap.delete(threadId);

			// Remove agent associations
			for (const [sessionId, tId] of this.agentThreadMap.entries()) {
				if (tId === threadId) {
					this.agentThreadMap.delete(sessionId);
				}
			}
		}

		this.instanceThreadsMap.delete(instanceId);
		await this._saveMappings();
	}

	private async _initializeCurrentContext(): Promise<void> {
		await this.getCurrentWorkspaceContext();
	}

	private _registerListeners(): void {
		// Listen for workspace instance changes
		this._register(
			this.contextManager.onDidChangePrimaryInstance(async (instance) => {
				await this.switchWorkspaceContext(instance.instanceId);
			})
		);

		// Listen for instance closures
		this._register(
			this.contextManager.onDidCloseInstance(async (event) => {
				await this.cleanupClosedWorkspaceThreads(event.instanceId);
			})
		);

		// Listen for agent session updates
		this._register(
			this.contextManager.onDidUpdateAgentSession(async (event) => {
				// Update agent-thread associations
				const session = event.session;
				if (session.chatThreadId) {
					await this.associateAgentWithThread(session.id, session.chatThreadId);
				}
			})
		);
	}

	private async _saveMappings(): Promise<void> {
		const data = {
			threadWorkspaceMap: Array.from(this.threadWorkspaceMap.entries()),
			instanceThreadsMap: Array.from(this.instanceThreadsMap.entries()).map(([k, v]) => [k, Array.from(v)]),
			agentThreadMap: Array.from(this.agentThreadMap.entries()),
		};

		this.storageService.store(
			THREAD_WORKSPACE_MAP_KEY,
			JSON.stringify(data),
			StorageScope.APPLICATION,
			StorageTarget.MACHINE
		);
	}

	private _loadStoredMappings(): void {
		const stored = this.storageService.get(THREAD_WORKSPACE_MAP_KEY, StorageScope.APPLICATION);
		if (!stored) {
			return;
		}

		try {
			const data = JSON.parse(stored);

			if (data.threadWorkspaceMap) {
				this.threadWorkspaceMap = new Map(data.threadWorkspaceMap);
			}

			if (data.instanceThreadsMap) {
				this.instanceThreadsMap = new Map(data.instanceThreadsMap.map(([k, v]: [string, string[]]) => [k, new Set(v)]));
			}

			if (data.agentThreadMap) {
				this.agentThreadMap = new Map(data.agentThreadMap);
			}
		} catch (error) {
			console.error('Failed to load workspace chat mappings:', error);
		}
	}
}

// Register the service
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
registerSingleton(IWorkspaceChatIntegrationService, WorkspaceChatIntegrationService, InstantiationType.Delayed);
