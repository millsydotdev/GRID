/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ISecurityEvaluation, ISecurityRisk, SecurityPolicy } from '../terminalSecurityService.js';

/**
 * Command execution request
 */
export interface ICommandExecutionRequest {
	command: string;
	workingDirectory?: string;
	env?: Record<string, string>;
}

/**
 * Command execution response
 */
export interface ICommandExecutionResponse {
	allowed: boolean;
	policy: SecurityPolicy;
	risks: ISecurityRisk[];
	requiresPermission: boolean;
}

/**
 * Permission grant request
 */
export interface IPermissionRequest {
	command: string;
	risks: ISecurityRisk[];
	reason?: string;
}

/**
 * Permission response
 */
export interface IPermissionResponse {
	granted: boolean;
	remember?: boolean;
}

/**
 * Protocol for Terminal → Security Service communication
 */
export type ToSecurityServiceProtocol = {
	/**
	 * Evaluate command before execution
	 */
	'command/evaluate': [ICommandExecutionRequest, ISecurityEvaluation];

	/**
	 * Request permission for risky command
	 */
	'permission/request': [IPermissionRequest, IPermissionResponse];

	/**
	 * Add command to allowlist
	 */
	'allowlist/add': [{ command: string; pattern?: string }, void];

	/**
	 * Remove command from allowlist
	 */
	'allowlist/remove': [{ command: string }, void];

	/**
	 * Get allowlist
	 */
	'allowlist/get': [undefined, string[]];

	/**
	 * Clear allowlist
	 */
	'allowlist/clear': [undefined, void];
};

/**
 * Protocol for Security Service → Terminal communication
 */
export type FromSecurityServiceProtocol = {
	/**
	 * Notify about blocked command
	 */
	'command/blocked': [{ command: string; reason: string }, void];

	/**
	 * Notify about security policy update
	 */
	'policy/updated': [{ policy: SecurityPolicy }, void];
};
