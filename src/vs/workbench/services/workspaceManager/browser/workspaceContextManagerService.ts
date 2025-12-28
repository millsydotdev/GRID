/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IWorkspaceContextManagerService, IWorkspaceContext, IAgentSession, ICreateWorkspaceInstanceOptions, ICreateAgentSessionOptions, IWorkspaceInstanceCreatedEvent, IWorkspaceInstanceClosedEvent, IAgentSessionUpdatedEvent, WORKSPACE_CONTEXTS_STORAGE_KEY, CURRENT_WORKSPACE_INSTANCE_KEY } from '../common/workspaceContext.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { generateUuid } from '../../../../base/common/uuid.js';

interface IStoredWorkspaceContext extends Omit<IWorkspaceContext, 'agentSessions'> {
	agentSessions: IAgentSession[];
}

export class WorkspaceContextManagerService extends Disposable implements IWorkspaceContextManagerService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidCreateInstance = this._register(new Emitter<IWorkspaceInstanceCreatedEvent>());
	readonly onDidCreateInstance: Event<IWorkspaceInstanceCreatedEvent> = this._onDidCreateInstance.event;

	private readonly _onDidCloseInstance = this._register(new Emitter<IWorkspaceInstanceClosedEvent>());
	readonly onDidCloseInstance: Event<IWorkspaceInstanceClosedEvent> = this._onDidCloseInstance.event;

	private readonly _onDidChangePrimaryInstance = this._register(new Emitter<IWorkspaceContext>());
	readonly onDidChangePrimaryInstance: Event<IWorkspaceContext> = this._onDidChangePrimaryInstance.event;

	private readonly _onDidUpdateAgentSession = this._register(new Emitter<IAgentSessionUpdatedEvent>());
	readonly onDidUpdateAgentSession: Event<IAgentSessionUpdatedEvent> = this._onDidUpdateAgentSession.event;

	private contextsCache: Map<string, IWorkspaceContext> = new Map();
	private currentInstanceId: string | undefined;

	constructor(
		@IStorageService private readonly storageService: IStorageService
	) {
		super();
		this._loadContexts();
		this._loadCurrentInstanceId();
	}

	async getActiveInstances(): Promise<IWorkspaceContext[]> {
		return Array.from(this.contextsCache.values());
	}

	async getInstance(instanceId: string): Promise<IWorkspaceContext | undefined> {
		return this.contextsCache.get(instanceId);
	}

	async getPrimaryInstance(): Promise<IWorkspaceContext | undefined> {
		const instances = Array.from(this.contextsCache.values());
		return instances.find(ctx => ctx.isPrimary);
	}

	async createInstance(options: ICreateWorkspaceInstanceOptions): Promise<IWorkspaceContext> {
		const instanceId = generateUuid();
		const now = Date.now();

		// If makePrimary is true, demote all other instances
		if (options.makePrimary) {
			for (const [id, ctx] of this.contextsCache.entries()) {
				if (ctx.isPrimary) {
					this.contextsCache.set(id, { ...ctx, isPrimary: false });
				}
			}
		}

		const context: IWorkspaceContext = {
			workspaceId: options.workspaceId,
			instanceId,
			displayName: options.displayName || `Workspace ${this.contextsCache.size + 1}`,
			isPrimary: options.makePrimary ?? true,
			chatThreadIds: [],
			agentSessions: [],
			settings: options.settings,
			createdAt: now,
			lastActivityAt: now,
			properties: {}
		};

		this.contextsCache.set(instanceId, context);
		await this._saveContexts();

		// Set as current context if primary
		if (context.isPrimary) {
			await this.setCurrentContext(instanceId);
			this._onDidChangePrimaryInstance.fire(context);
		}

		this._onDidCreateInstance.fire({ context });
		return context;
	}

	async closeInstance(instanceId: string, saveState: boolean = true): Promise<void> {
		const context = this.contextsCache.get(instanceId);
		if (!context) {
			return;
		}

		// If closing the primary instance, promote another one
		if (context.isPrimary) {
			const otherInstances = Array.from(this.contextsCache.values())
				.filter(ctx => ctx.instanceId !== instanceId);

			if (otherInstances.length > 0) {
				const newPrimary = otherInstances[0];
				await this.setPrimaryInstance(newPrimary.instanceId);
			}
		}

		// Remove from cache
		this.contextsCache.delete(instanceId);

		if (saveState) {
			await this._saveContexts();
		}

		// Clear current context if it was this instance
		if (this.currentInstanceId === instanceId) {
			const primary = await this.getPrimaryInstance();
			if (primary) {
				await this.setCurrentContext(primary.instanceId);
			} else {
				this.currentInstanceId = undefined;
				this.storageService.remove(CURRENT_WORKSPACE_INSTANCE_KEY, StorageScope.WORKSPACE);
			}
		}

		this._onDidCloseInstance.fire({ instanceId });
	}

	async setPrimaryInstance(instanceId: string): Promise<void> {
		const newPrimary = this.contextsCache.get(instanceId);
		if (!newPrimary) {
			throw new Error(`Instance ${instanceId} not found`);
		}

		// Demote all others
		for (const [id, ctx] of this.contextsCache.entries()) {
			this.contextsCache.set(id, { ...ctx, isPrimary: id === instanceId });
		}

		await this._saveContexts();
		await this.setCurrentContext(instanceId);
		this._onDidChangePrimaryInstance.fire(newPrimary);
	}

	async getInstancesForWorkspace(workspaceId: string): Promise<IWorkspaceContext[]> {
		const instances = Array.from(this.contextsCache.values());
		return instances.filter(ctx => ctx.workspaceId === workspaceId);
	}

	async createAgentSession(options: ICreateAgentSessionOptions): Promise<IAgentSession> {
		const context = this.contextsCache.get(options.instanceId);
		if (!context) {
			throw new Error(`Instance ${options.instanceId} not found`);
		}

		const now = Date.now();
		const session: IAgentSession = {
			id: generateUuid(),
			agentName: options.agentName,
			currentTask: options.task,
			state: 'idle',
			chatThreadId: options.chatThreadId,
			workingFiles: [],
			metadata: {
				...options.metadata,
				instanceId: options.instanceId
			},
			startedAt: now,
			updatedAt: now
		};

		context.agentSessions.push(session);
		context.lastActivityAt = now;

		await this._saveContexts();
		this._onDidUpdateAgentSession.fire({ instanceId: options.instanceId, session });

		return session;
	}

	async updateAgentSession(instanceId: string, sessionId: string, updates: Partial<IAgentSession>): Promise<IAgentSession> {
		const context = this.contextsCache.get(instanceId);
		if (!context) {
			throw new Error(`Instance ${instanceId} not found`);
		}

		const sessionIndex = context.agentSessions.findIndex(s => s.id === sessionId);
		if (sessionIndex === -1) {
			throw new Error(`Session ${sessionId} not found in instance ${instanceId}`);
		}

		const updated: IAgentSession = {
			...context.agentSessions[sessionIndex],
			...updates,
			updatedAt: Date.now()
		};

		context.agentSessions[sessionIndex] = updated;
		context.lastActivityAt = Date.now();

		await this._saveContexts();
		this._onDidUpdateAgentSession.fire({ instanceId, session: updated });

		return updated;
	}

	async endAgentSession(instanceId: string, sessionId: string): Promise<void> {
		const context = this.contextsCache.get(instanceId);
		if (!context) {
			return;
		}

		const sessionIndex = context.agentSessions.findIndex(s => s.id === sessionId);
		if (sessionIndex !== -1) {
			const session = context.agentSessions[sessionIndex];
			// Mark as completed instead of removing
			await this.updateAgentSession(instanceId, sessionId, { state: 'completed' });

			// Optionally remove completed sessions after a delay
			// For now, keep them in history
		}
	}

	async getAgentSessions(instanceId: string): Promise<IAgentSession[]> {
		const context = this.contextsCache.get(instanceId);
		return context?.agentSessions ?? [];
	}

	async getCurrentContext(): Promise<IWorkspaceContext | undefined> {
		if (!this.currentInstanceId) {
			// Try to get primary instance
			const primary = await this.getPrimaryInstance();
			if (primary) {
				this.currentInstanceId = primary.instanceId;
				return primary;
			}
			return undefined;
		}

		return this.contextsCache.get(this.currentInstanceId);
	}

	async setCurrentContext(instanceId: string): Promise<void> {
		const context = this.contextsCache.get(instanceId);
		if (!context) {
			throw new Error(`Instance ${instanceId} not found`);
		}

		this.currentInstanceId = instanceId;
		this.storageService.store(CURRENT_WORKSPACE_INSTANCE_KEY, instanceId, StorageScope.WORKSPACE, StorageTarget.MACHINE);

		// Update last activity
		context.lastActivityAt = Date.now();
		await this._saveContexts();
	}

	async isInParallelMode(workspaceId: string): Promise<boolean> {
		const instances = await this.getInstancesForWorkspace(workspaceId);
		return instances.length > 1;
	}

	async getStatistics(): Promise<{ totalInstances: number; activeAgents: number; workspacesInParallelMode: number }> {
		const instances = Array.from(this.contextsCache.values());
		const activeAgents = instances.reduce((sum, ctx) =>
			sum + ctx.agentSessions.filter(s => s.state === 'working').length, 0
		);

		const workspaceIds = new Set(instances.map(ctx => ctx.workspaceId));
		let workspacesInParallelMode = 0;

		for (const workspaceId of workspaceIds) {
			const count = instances.filter(ctx => ctx.workspaceId === workspaceId).length;
			if (count > 1) {
				workspacesInParallelMode++;
			}
		}

		return {
			totalInstances: instances.length,
			activeAgents,
			workspacesInParallelMode
		};
	}

	private async _saveContexts(): Promise<void> {
		const contexts = Array.from(this.contextsCache.values());
		const serialized = JSON.stringify(contexts);
		this.storageService.store(WORKSPACE_CONTEXTS_STORAGE_KEY, serialized, StorageScope.APPLICATION, StorageTarget.MACHINE);
	}

	private async _loadContexts(): Promise<void> {
		const stored = this.storageService.get(WORKSPACE_CONTEXTS_STORAGE_KEY, StorageScope.APPLICATION);
		if (!stored) {
			return;
		}

		try {
			const contexts: IStoredWorkspaceContext[] = JSON.parse(stored);
			for (const ctx of contexts) {
				this.contextsCache.set(ctx.instanceId, ctx);
			}
		} catch (error) {
			console.error('Failed to load workspace contexts:', error);
		}
	}

	private _loadCurrentInstanceId(): void {
		this.currentInstanceId = this.storageService.get(CURRENT_WORKSPACE_INSTANCE_KEY, StorageScope.WORKSPACE);
	}
}

// Register the service
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
registerSingleton(IWorkspaceContextManagerService, WorkspaceContextManagerService, InstantiationType.Delayed);
