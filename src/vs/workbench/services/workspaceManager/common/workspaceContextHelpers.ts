/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkspaceContext, IAgentSession } from './workspaceContext.js';
import { IWorkspaceMetadata } from './workspaceManager.js';
import { URI } from '../../../../base/common/uri.js';

/**
 * Helper utilities for working with workspace contexts
 */

/**
 * Format workspace context for AI prompt injection
 */
export function formatWorkspaceContextForAI(context: IWorkspaceContext, workspace?: IWorkspaceMetadata): string {
	const parts: string[] = [];

	parts.push('# Workspace Context');
	parts.push('');

	if (workspace) {
		parts.push(`**Workspace:** ${workspace.name}`);
		if (workspace.description) {
			parts.push(`**Description:** ${workspace.description}`);
		}
		parts.push(`**Location:** ${workspace.rootUri.fsPath}`);
	}

	if (context.isParallelMode) {
		parts.push(`**Mode:** Parallel (Instance: ${context.displayName})`);
		parts.push('⚠️ This is one of multiple parallel instances. Be careful not to modify files being edited in other instances.');
	}

	if (context.agentSessions && context.agentSessions.length > 0) {
		const activeSessions = context.agentSessions.filter(s => s.state === 'working');
		if (activeSessions.length > 0) {
			parts.push('');
			parts.push('**Active AI Agents:**');
			for (const session of activeSessions) {
				parts.push(`- ${session.agentName}: ${session.currentTask || 'Working'}`);
				if (session.workingFiles && session.workingFiles.length > 0) {
					parts.push(`  Files: ${session.workingFiles.join(', ')}`);
				}
			}
		}
	}

	parts.push('');
	return parts.join('\n');
}

/**
 * Check if a file path is within the workspace
 */
export function isFileInWorkspace(filePath: string, workspaceRoot?: string): boolean {
	if (!workspaceRoot) {
		return true; // No workspace root, assume it's ok
	}

	const normalizedFile = filePath.replace(/\\/g, '/');
	const normalizedRoot = workspaceRoot.replace(/\\/g, '/');

	return normalizedFile.startsWith(normalizedRoot);
}

/**
 * Get relative path from workspace root
 */
export function getRelativePathFromWorkspace(filePath: string, workspaceRoot?: string): string {
	if (!workspaceRoot) {
		return filePath;
	}

	const normalizedFile = filePath.replace(/\\/g, '/');
	const normalizedRoot = workspaceRoot.replace(/\\/g, '/').replace(/\/$/, '');

	if (normalizedFile.startsWith(normalizedRoot)) {
		return normalizedFile.substring(normalizedRoot.length + 1);
	}

	return filePath;
}

/**
 * Create a workspace-scoped file URI
 */
export function createWorkspaceScopedURI(relativePath: string, workspaceRoot: string): URI {
	const fullPath = workspaceRoot + '/' + relativePath.replace(/^\//, '');
	return URI.file(fullPath);
}

/**
 * Get workspace context summary for logging/debugging
 */
export function getWorkspaceContextSummary(context: IWorkspaceContext): string {
	const parts = [
		`Workspace: ${context.workspaceId}`,
		`Instance: ${context.instanceId.substring(0, 8)}...`,
		`Name: ${context.displayName}`,
		`Parallel: ${context.isParallelMode ? 'Yes' : 'No'}`,
		`Agents: ${context.agentSessions?.length || 0}`,
		`Threads: ${context.chatThreadIds?.length || 0}`
	];

	return parts.join(' | ');
}

/**
 * Check if two workspace contexts are the same instance
 */
export function isSameWorkspaceInstance(ctx1: IWorkspaceContext, ctx2: IWorkspaceContext): boolean {
	return ctx1.instanceId === ctx2.instanceId;
}

/**
 * Check if two workspace contexts are the same workspace (different instances allowed)
 */
export function isSameWorkspace(ctx1: IWorkspaceContext, ctx2: IWorkspaceContext): boolean {
	return ctx1.workspaceId === ctx2.workspaceId;
}

/**
 * Get active agents count for a context
 */
export function getActiveAgentsCount(context: IWorkspaceContext): number {
	if (!context.agentSessions) {
		return 0;
	}
	return context.agentSessions.filter(s => s.state === 'working').length;
}

/**
 * Get files being modified across all agents in a context
 */
export function getFilesBeingModified(context: IWorkspaceContext): string[] {
	if (!context.agentSessions) {
		return [];
	}

	const files = new Set<string>();
	for (const session of context.agentSessions) {
		if (session.state === 'working' && session.workingFiles) {
			for (const file of session.workingFiles) {
				files.add(file);
			}
		}
	}

	return Array.from(files);
}

/**
 * Check if a file is currently being modified by an agent
 */
export function isFileBeingModified(filePath: string, context: IWorkspaceContext): boolean {
	const modifiedFiles = getFilesBeingModified(context);
	const normalizedPath = filePath.replace(/\\/g, '/');

	return modifiedFiles.some(f => f.replace(/\\/g, '/') === normalizedPath);
}

/**
 * Get warning message if file is being modified in another instance
 */
export function getFileConflictWarning(
	filePath: string,
	currentContext: IWorkspaceContext,
	allContexts: IWorkspaceContext[]
): string | undefined {
	// Check if file is being modified in other instances of the same workspace
	for (const ctx of allContexts) {
		if (!isSameWorkspaceInstance(ctx, currentContext) && isSameWorkspace(ctx, currentContext)) {
			if (isFileBeingModified(filePath, ctx)) {
				const agents = ctx.agentSessions!.filter(s =>
					s.state === 'working' && s.workingFiles?.some(f => f.replace(/\\/g, '/') === filePath.replace(/\\/g, '/'))
				);

				if (agents.length > 0) {
					const agentNames = agents.map(a => a.agentName).join(', ');
					return `⚠️ Warning: File is being modified by ${agentNames} in instance "${ctx.displayName}"`;
				}
			}
		}
	}

	return undefined;
}

/**
 * Create a safe context for parallel operations
 * Returns a context with only essential information, removing sensitive data
 */
export function createSafeWorkspaceContext(context: IWorkspaceContext): Partial<IWorkspaceContext> {
	return {
		workspaceId: context.workspaceId,
		instanceId: context.instanceId,
		displayName: context.displayName,
		isPrimary: context.isPrimary,
		isParallelMode: context.isParallelMode
	};
}

/**
 * Merge workspace properties from multiple sources
 */
export function mergeWorkspaceProperties(
	base: Record<string, unknown>,
	...overrides: (Record<string, unknown> | undefined)[]
): Record<string, unknown> {
	let result = { ...base };

	for (const override of overrides) {
		if (override) {
			result = { ...result, ...override };
		}
	}

	return result;
}

/**
 * Validate workspace context is complete and valid
 */
export function validateWorkspaceContext(context: IWorkspaceContext): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!context.workspaceId) {
		errors.push('Missing workspaceId');
	}

	if (!context.instanceId) {
		errors.push('Missing instanceId');
	}

	if (!context.displayName) {
		errors.push('Missing displayName');
	}

	if (!context.chatThreadIds) {
		errors.push('Missing chatThreadIds array');
	}

	if (!context.agentSessions) {
		errors.push('Missing agentSessions array');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Format agent session for display
 */
export function formatAgentSession(session: IAgentSession): string {
	const state = session.state.toUpperCase();
	const task = session.currentTask || 'Idle';
	const duration = Math.floor((Date.now() - session.startedAt) / 1000 / 60);

	return `[${state}] ${session.agentName}: ${task} (${duration}m)`;
}

/**
 * Get workspace instance display name with context
 */
export function getInstanceDisplayName(context: IWorkspaceContext, includeStatus: boolean = true): string {
	let name = context.displayName;

	if (includeStatus) {
		const indicators: string[] = [];

		if (context.isPrimary) {
			indicators.push('PRIMARY');
		}

		const activeAgents = getActiveAgentsCount(context);
		if (activeAgents > 0) {
			indicators.push(`${activeAgents} AGENT${activeAgents > 1 ? 'S' : ''}`);
		}

		if (indicators.length > 0) {
			name += ` [${indicators.join(', ')}]`;
		}
	}

	return name;
}
