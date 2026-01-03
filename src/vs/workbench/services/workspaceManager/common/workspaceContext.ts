/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';

export const IWorkspaceContextManagerService = createDecorator<IWorkspaceContextManagerService>('workspaceContextManagerService');

/**
 * Represents an isolated context for a workspace instance
 * Each workspace can have its own AI chat threads, agent sessions, and state
 */
export interface IWorkspaceContext {
	/**
	 * Unique identifier for this workspace instance
	 */
	workspaceId: string;

	/**
	 * Instance ID - allows multiple instances of the same workspace
	 */
	instanceId: string;

	/**
	 * Display name for this instance (e.g., "My Project - Window 1")
	 */
	displayName: string;

	/**
	 * Whether this is the primary/active instance
	 */
	isPrimary: boolean;

	/**
	 * Chat thread IDs associated with this workspace instance
	 */
	chatThreadIds: string[];

	/**
	 * Active agent sessions in this workspace
	 */
	agentSessions: IAgentSession[];

	/**
	 * Workspace-specific settings overrides
	 */
	settings?: Record<string, unknown>;

	/**
	 * Creation timestamp
	 */
	createdAt: number;

	/**
	 * Last activity timestamp
	 */
	lastActivityAt: number;

	/**
	 * Custom context properties
	 */
	properties?: Record<string, unknown>;
}

/**
 * Represents an AI agent session within a workspace
 */
export interface IAgentSession {
	/**
	 * Unique session identifier
	 */
	id: string;

	/**
	 * Agent name/type
	 */
	agentName: string;

	/**
	 * Current task description
	 */
	currentTask?: string;

	/**
	 * Session state
	 */
	state: 'idle' | 'working' | 'paused' | 'completed' | 'error';

	/**
	 * Associated chat thread ID
	 */
	chatThreadId?: string;

	/**
	 * Files currently being worked on
	 */
	workingFiles?: string[];

	/**
	 * Session metadata
	 */
	metadata?: Record<string, unknown>;

	/**
	 * Start timestamp
	 */
	startedAt: number;

	/**
	 * Last update timestamp
	 */
	updatedAt: number;
}

/**
 * Options for creating a new workspace instance
 */
export interface ICreateWorkspaceInstanceOptions {
	/**
	 * Base workspace ID
	 */
	workspaceId: string;

	/**
	 * Display name for this instance
	 */
	displayName?: string;

	/**
	 * Whether to make this the primary instance
	 */
	makePrimary?: boolean;

	/**
	 * Initial settings overrides
	 */
	settings?: Record<string, unknown>;
}

/**
 * Options for creating an agent session
 */
export interface ICreateAgentSessionOptions {
	/**
	 * Workspace instance ID
	 */
	instanceId: string;

	/**
	 * Agent name/type
	 */
	agentName: string;

	/**
	 * Initial task description
	 */
	task?: string;

	/**
	 * Associated chat thread ID
	 */
	chatThreadId?: string;

	/**
	 * Session metadata
	 */
	metadata?: Record<string, unknown>;
}

/**
 * Event fired when a workspace instance is created
 */
export interface IWorkspaceInstanceCreatedEvent {
	context: IWorkspaceContext;
}

/**
 * Event fired when a workspace instance is closed
 */
export interface IWorkspaceInstanceClosedEvent {
	instanceId: string;
}

/**
 * Event fired when an agent session updates
 */
export interface IAgentSessionUpdatedEvent {
	instanceId: string;
	session: IAgentSession;
}

/**
 * Service for managing parallel workspace contexts
 * Ensures AI agents don't get confused between different workspace instances
 */
export interface IWorkspaceContextManagerService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when a workspace instance is created
	 */
	readonly onDidCreateInstance: Event<IWorkspaceInstanceCreatedEvent>;

	/**
	 * Event fired when a workspace instance is closed
	 */
	readonly onDidCloseInstance: Event<IWorkspaceInstanceClosedEvent>;

	/**
	 * Event fired when the primary instance changes
	 */
	readonly onDidChangePrimaryInstance: Event<IWorkspaceContext>;

	/**
	 * Event fired when an agent session is updated
	 */
	readonly onDidUpdateAgentSession: Event<IAgentSessionUpdatedEvent>;

	/**
	 * Get all active workspace instances
	 */
	getActiveInstances(): Promise<IWorkspaceContext[]>;

	/**
	 * Get a specific workspace instance
	 */
	getInstance(instanceId: string): Promise<IWorkspaceContext | undefined>;

	/**
	 * Get the current/primary workspace instance
	 */
	getPrimaryInstance(): Promise<IWorkspaceContext | undefined>;

	/**
	 * Create a new workspace instance (parallel workspace)
	 */
	createInstance(options: ICreateWorkspaceInstanceOptions): Promise<IWorkspaceContext>;

	/**
	 * Close a workspace instance
	 */
	closeInstance(instanceId: string, saveState?: boolean): Promise<void>;

	/**
	 * Switch primary instance
	 */
	setPrimaryInstance(instanceId: string): Promise<void>;

	/**
	 * Get instances for a specific workspace
	 */
	getInstancesForWorkspace(workspaceId: string): Promise<IWorkspaceContext[]>;

	/**
	 * Create an agent session in a workspace instance
	 */
	createAgentSession(options: ICreateAgentSessionOptions): Promise<IAgentSession>;

	/**
	 * Update an agent session
	 */
	updateAgentSession(instanceId: string, sessionId: string, updates: Partial<IAgentSession>): Promise<IAgentSession>;

	/**
	 * End an agent session
	 */
	endAgentSession(instanceId: string, sessionId: string): Promise<void>;

	/**
	 * Get all agent sessions for an instance
	 */
	getAgentSessions(instanceId: string): Promise<IAgentSession[]>;

	/**
	 * Get context for the current request
	 * This ensures AI responses are scoped to the correct workspace instance
	 */
	getCurrentContext(): Promise<IWorkspaceContext | undefined>;

	/**
	 * Set context for the current request
	 */
	setCurrentContext(instanceId: string): Promise<void>;

	/**
	 * Check if a workspace has multiple active instances (parallel mode)
	 */
	isInParallelMode(workspaceId: string): Promise<boolean>;

	/**
	 * Get statistics about workspace instances
	 */
	getStatistics(): Promise<{
		totalInstances: number;
		activeAgents: number;
		workspacesInParallelMode: number;
	}>;
}

/**
 * Context key for storing current workspace instance ID
 * Used by AI/agent services to scope their operations
 */
export const CURRENT_WORKSPACE_INSTANCE_KEY = 'currentWorkspaceInstanceId';

/**
 * Storage key for workspace contexts
 */
export const WORKSPACE_CONTEXTS_STORAGE_KEY = 'workspaceContextManager.contexts';

/**
 * Helper to scope data to a workspace instance
 * Use this when storing data that should be isolated per instance
 */
export function scopeToInstance<T>(instanceId: string, key: string, data: T): { scopedKey: string; data: T } {
	return {
		scopedKey: `workspace:${instanceId}:${key}`,
		data
	};
}

/**
 * Helper to check if an agent session belongs to a specific instance
 */
export function isSessionInInstance(session: IAgentSession, instanceId: string): boolean {
	return session.metadata?.instanceId === instanceId;
}
