/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';

export const IWorkspaceManagerService = createDecorator<IWorkspaceManagerService>('workspaceManagerService');

/**
 * Workspace metadata and configuration
 */
export interface IWorkspaceMetadata {
	/**
	 * Unique identifier for the workspace
	 */
	id: string;

	/**
	 * Display name of the workspace
	 */
	name: string;

	/**
	 * Description of the workspace (optional)
	 */
	description?: string;

	/**
	 * Root folder URI where workspace data is stored
	 */
	rootUri: URI;

	/**
	 * Path to the .code-workspace file
	 */
	workspaceFile: URI;

	/**
	 * Creation timestamp
	 */
	createdAt: number;

	/**
	 * Last accessed timestamp
	 */
	lastAccessedAt: number;

	/**
	 * Last modified timestamp
	 */
	lastModifiedAt: number;

	/**
	 * Color theme for workspace identification
	 */
	color?: string;

	/**
	 * Icon identifier for the workspace
	 */
	icon?: string;

	/**
	 * Tags for categorization
	 */
	tags?: string[];

	/**
	 * Template used to create this workspace (if any)
	 */
	template?: string;

	/**
	 * Whether this workspace is pinned/favorited
	 */
	pinned?: boolean;

	/**
	 * Custom properties for extensibility
	 */
	properties?: Record<string, unknown>;
}

/**
 * Workspace state that gets persisted and restored
 */
export interface IWorkspaceState {
	/**
	 * Currently open files with their state
	 */
	openEditors?: {
		resource: URI;
		viewState?: unknown;
		options?: unknown;
	}[];

	/**
	 * Active editor
	 */
	activeEditor?: URI;

	/**
	 * Explorer view state (expanded folders, etc.)
	 */
	explorerState?: unknown;

	/**
	 * Sidebar visibility and size
	 */
	sidebarState?: {
		visible: boolean;
		width?: number;
		activeViewlet?: string;
	};

	/**
	 * Panel visibility and size
	 */
	panelState?: {
		visible: boolean;
		height?: number;
		activePanel?: string;
	};

	/**
	 * Layout state
	 */
	layoutState?: unknown;

	/**
	 * Custom view states
	 */
	viewStates?: Record<string, unknown>;
}

/**
 * Template for creating new workspaces
 */
export interface IWorkspaceTemplate {
	/**
	 * Unique template identifier
	 */
	id: string;

	/**
	 * Template display name
	 */
	name: string;

	/**
	 * Template description
	 */
	description?: string;

	/**
	 * Icon for the template
	 */
	icon?: string;

	/**
	 * Folders to create in the workspace
	 */
	folders?: {
		name: string;
		path: string;
	}[];

	/**
	 * Files to create with initial content
	 */
	files?: {
		path: string;
		content: string;
	}[];

	/**
	 * Default settings for workspaces created from this template
	 */
	settings?: Record<string, unknown>;

	/**
	 * Extensions to recommend
	 */
	extensions?: string[];

	/**
	 * Tasks to pre-configure
	 */
	tasks?: unknown[];
}

/**
 * Options for creating a new workspace
 */
export interface ICreateWorkspaceOptions {
	/**
	 * Workspace name (required)
	 */
	name: string;

	/**
	 * Description
	 */
	description?: string;

	/**
	 * Parent directory where workspace folder will be created
	 */
	parentDirectory: URI;

	/**
	 * Template to use
	 */
	template?: string;

	/**
	 * Initial folders to add to workspace
	 */
	folders?: URI[];

	/**
	 * Color for workspace
	 */
	color?: string;

	/**
	 * Icon for workspace
	 */
	icon?: string;

	/**
	 * Tags for workspace
	 */
	tags?: string[];

	/**
	 * Whether to open the workspace immediately after creation
	 */
	openAfterCreate?: boolean;
}

/**
 * Event fired when workspaces are added
 */
export interface IWorkspacesAddedEvent {
	workspaces: IWorkspaceMetadata[];
}

/**
 * Event fired when workspaces are removed
 */
export interface IWorkspacesRemovedEvent {
	workspaceIds: string[];
}

/**
 * Event fired when a workspace is updated
 */
export interface IWorkspaceUpdatedEvent {
	workspace: IWorkspaceMetadata;
}

/**
 * Event fired when active workspace changes
 */
export interface IActiveWorkspaceChangedEvent {
	previous?: IWorkspaceMetadata;
	current?: IWorkspaceMetadata;
}

/**
 * Service for managing multiple workspaces
 */
export interface IWorkspaceManagerService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when workspaces are added
	 */
	readonly onDidAddWorkspaces: Event<IWorkspacesAddedEvent>;

	/**
	 * Event fired when workspaces are removed
	 */
	readonly onDidRemoveWorkspaces: Event<IWorkspacesRemovedEvent>;

	/**
	 * Event fired when a workspace is updated
	 */
	readonly onDidUpdateWorkspace: Event<IWorkspaceUpdatedEvent>;

	/**
	 * Event fired when the active workspace changes
	 */
	readonly onDidChangeActiveWorkspace: Event<IActiveWorkspaceChangedEvent>;

	/**
	 * Get all registered workspaces
	 */
	getWorkspaces(): Promise<IWorkspaceMetadata[]>;

	/**
	 * Get a specific workspace by ID
	 */
	getWorkspace(id: string): Promise<IWorkspaceMetadata | undefined>;

	/**
	 * Get the currently active workspace
	 */
	getActiveWorkspace(): Promise<IWorkspaceMetadata | undefined>;

	/**
	 * Create a new workspace
	 */
	createWorkspace(options: ICreateWorkspaceOptions): Promise<IWorkspaceMetadata>;

	/**
	 * Update workspace metadata
	 */
	updateWorkspace(id: string, updates: Partial<IWorkspaceMetadata>): Promise<IWorkspaceMetadata>;

	/**
	 * Delete a workspace
	 */
	deleteWorkspace(id: string, deleteFiles?: boolean): Promise<void>;

	/**
	 * Switch to a different workspace
	 */
	switchWorkspace(id: string): Promise<void>;

	/**
	 * Save current workspace state
	 */
	saveWorkspaceState(workspaceId?: string): Promise<void>;

	/**
	 * Load workspace state
	 */
	loadWorkspaceState(workspaceId: string): Promise<IWorkspaceState | undefined>;

	/**
	 * Get available workspace templates
	 */
	getTemplates(): Promise<IWorkspaceTemplate[]>;

	/**
	 * Register a new workspace template
	 */
	registerTemplate(template: IWorkspaceTemplate): Promise<void>;

	/**
	 * Unregister a workspace template
	 */
	unregisterTemplate(templateId: string): Promise<void>;

	/**
	 * Export workspace configuration
	 */
	exportWorkspace(id: string, destination: URI): Promise<void>;

	/**
	 * Import workspace from a file
	 */
	importWorkspace(source: URI, parentDirectory: URI): Promise<IWorkspaceMetadata>;

	/**
	 * Search workspaces by name, tags, or properties
	 */
	searchWorkspaces(query: string): Promise<IWorkspaceMetadata[]>;

	/**
	 * Get recently accessed workspaces
	 */
	getRecentWorkspaces(limit?: number): Promise<IWorkspaceMetadata[]>;

	/**
	 * Pin/unpin a workspace
	 */
	togglePinWorkspace(id: string): Promise<void>;
}
