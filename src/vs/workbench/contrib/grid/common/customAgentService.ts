/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Custom Agent Service
 * 
 * Allows users to define local mini-agents via `.grid/agents/*.md` files.
 * Each agent can have:
 * - Custom system prompt
 * - Restricted tool access
 * - Specific use-case focus
 */

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { URI } from '../../../../base/common/uri.js';
import { joinPath } from '../../../../base/common/resources.js';

export interface CustomAgent {
	id: string;
	name: string;
	description: string;
	systemPrompt: string;
	allowedTools?: string[];  // If undefined, all tools allowed
	disabledTools?: string[]; // Explicitly disabled tools
	icon?: string;
	filePath: string;
}

export interface ICustomAgentService {
	readonly _serviceBrand: undefined;

	/** Get all available custom agents */
	getAgents(): Promise<CustomAgent[]>;

	/** Get a specific agent by ID */
	getAgent(id: string): Promise<CustomAgent | undefined>;

	/** Reload agents from disk */
	refreshAgents(): Promise<void>;

	/** Get the default agent (system) */
	getDefaultAgent(): CustomAgent;

	/** Check if a tool is allowed for a specific agent */
	isToolAllowed(agentId: string, toolName: string): Promise<boolean>;
}

export const ICustomAgentService = createDecorator<ICustomAgentService>('customAgentService');

const DEFAULT_AGENT: CustomAgent = {
	id: 'default',
	name: 'GRID Assistant',
	description: 'The default GRID AI assistant with full capabilities.',
	systemPrompt: '', // Uses standard system prompt
	icon: '🤖',
	filePath: '',
};

class CustomAgentService implements ICustomAgentService {
	declare readonly _serviceBrand: undefined;

	private _agents: Map<string, CustomAgent> = new Map();
	private _agentsDir: URI | null = null;

	constructor(
		@IFileService private readonly _fileService: IFileService,
		@IWorkspaceContextService private readonly _workspaceContextService: IWorkspaceContextService
	) {
		this._initAgentsDir();
	}

	private _initAgentsDir(): void {
		const workspace = this._workspaceContextService.getWorkspace();
		if (workspace.folders.length > 0) {
			this._agentsDir = joinPath(workspace.folders[0].uri, '.grid', 'agents');
		}
	}

	getDefaultAgent(): CustomAgent {
		return DEFAULT_AGENT;
	}

	async getAgents(): Promise<CustomAgent[]> {
		if (this._agents.size === 0) {
			await this.refreshAgents();
		}
		return [DEFAULT_AGENT, ...Array.from(this._agents.values())];
	}

	async getAgent(id: string): Promise<CustomAgent | undefined> {
		if (id === 'default') {
			return DEFAULT_AGENT;
		}
		if (this._agents.size === 0) {
			await this.refreshAgents();
		}
		return this._agents.get(id);
	}

	async refreshAgents(): Promise<void> {
		this._agents.clear();
		if (!this._agentsDir) {
			return;
		}

		try {
			const exists = await this._fileService.exists(this._agentsDir);
			if (!exists) {
				return;
			}

			const stat = await this._fileService.resolve(this._agentsDir);
			if (!stat.children) {
				return;
			}

			for (const child of stat.children) {
				if (child.name.endsWith('.md')) {
					const agent = await this._parseAgentFile(child.resource);
					if (agent) {
						this._agents.set(agent.id, agent);
					}
				}
			}
		} catch (e) {
			console.warn('Failed to load custom agents:', e);
		}
	}

	private async _parseAgentFile(uri: URI): Promise<CustomAgent | null> {
		try {
			const content = await this._fileService.readFile(uri);
			const text = content.value.toString();

			// Parse YAML frontmatter and markdown body
			const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
			if (!frontmatterMatch) {
				// No frontmatter - use filename as name, content as prompt
				const name = uri.path.split('/').pop()?.replace('.md', '') || 'Custom Agent';
				return {
					id: name.toLowerCase().replace(/\s+/g, '-'),
					name,
					description: 'Custom agent',
					systemPrompt: text.trim(),
					filePath: uri.fsPath,
				};
			}

			const frontmatter = frontmatterMatch[1];
			const body = frontmatterMatch[2].trim();

			// Parse simple YAML manually
			const parseYaml = (yaml: string): Record<string, string | string[]> => {
				const result: Record<string, string | string[]> = {};
				const lines = yaml.split('\n');
				let currentKey = '';
				let currentArray: string[] | null = null;

				for (const line of lines) {
					const trimmed = line.trim();
					if (trimmed.startsWith('- ') && currentArray) {
						currentArray.push(trimmed.slice(2));
					} else if (trimmed.includes(':')) {
						const [key, ...valueParts] = trimmed.split(':');
						const value = valueParts.join(':').trim();
						currentKey = key.trim();
						if (value) {
							result[currentKey] = value;
							currentArray = null;
						} else {
							// Could be array
							currentArray = [];
							result[currentKey] = currentArray;
						}
					}
				}
				return result;
			};

			const meta = parseYaml(frontmatter);
			const name = (typeof meta.name === 'string' ? meta.name : uri.path.split('/').pop()?.replace('.md', '')) || 'Custom Agent';

			return {
				id: (typeof meta.id === 'string' ? meta.id : name.toLowerCase().replace(/\s+/g, '-')),
				name,
				description: typeof meta.description === 'string' ? meta.description : 'Custom agent',
				systemPrompt: body,
				allowedTools: Array.isArray(meta.allowedTools) ? meta.allowedTools : undefined,
				disabledTools: Array.isArray(meta.disabledTools) ? meta.disabledTools : undefined,
				icon: typeof meta.icon === 'string' ? meta.icon : undefined,
				filePath: uri.fsPath,
			};
		} catch (e) {
			console.warn('Failed to parse agent file:', uri.fsPath, e);
			return null;
		}
	}

	async isToolAllowed(agentId: string, toolName: string): Promise<boolean> {
		const agent = await this.getAgent(agentId);
		if (!agent) {
			return true; // Unknown agent = allow all
		}
		// Default agent has no restrictions
		if (agentId === 'default') {
			return true;
		}
		// Check disabled list first
		if (agent.disabledTools && agent.disabledTools.includes(toolName)) {
			return false;
		}
		// If allowed list is specified, tool must be in it
		if (agent.allowedTools && agent.allowedTools.length > 0) {
			return agent.allowedTools.includes(toolName);
		}
		// No restrictions = allowed
		return true;
	}
}

registerSingleton(ICustomAgentService, CustomAgentService, InstantiationType.Delayed);
