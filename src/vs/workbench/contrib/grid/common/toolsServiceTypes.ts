/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { RawMCPToolCall } from './mcpServiceTypes.js';
import { builtinTools } from './prompt/prompts.js';
import { RawToolParamsObj } from './sendLLMMessageTypes.js';

export type TerminalResolveReason = { type: 'timeout' } | { type: 'done'; exitCode: number };

export type LintErrorItem = { code: string; message: string; startLineNumber: number; endLineNumber: number };

// Partial of IFileStat
export type ShallowDirectoryItem = {
	uri: URI;
	name: string;
	isDirectory: boolean;
	isSymbolicLink: boolean;
};

export const approvalTypeOfBuiltinToolName: Partial<{ [T in BuiltinToolName]?: 'edits' | 'terminal' | 'MCP tools' }> = {
	create_file_or_folder: 'edits',
	delete_file_or_folder: 'edits',
	rewrite_file: 'edits',
	edit_file: 'edits',
	run_command: 'terminal',
	run_nl_command: 'terminal',
	run_persistent_command: 'terminal',
	open_persistent_terminal: 'terminal',
	kill_persistent_terminal: 'terminal',
};

export type ToolApprovalType = NonNullable<
	(typeof approvalTypeOfBuiltinToolName)[keyof typeof approvalTypeOfBuiltinToolName]
>;

export const toolApprovalTypes = new Set<ToolApprovalType>([
	...Object.values(approvalTypeOfBuiltinToolName),
	'MCP tools',
]);

// PARAMS OF TOOL CALL
export type BuiltinToolCallParams = {
	read_file: { uri: URI; startLine: number | null; endLine: number | null; pageNumber: number };
	ls_dir: { uri: URI; pageNumber: number };
	get_dir_tree: { uri: URI };
	search_pathnames_only: { query: string; includePattern: string | null; pageNumber: number };
	search_for_files: { query: string; isRegex: boolean; searchInFolder: URI | null; pageNumber: number };
	search_in_file: { uri: URI; query: string; isRegex: boolean };
	read_lint_errors: { uri: URI };
	// ---
	rewrite_file: { uri: URI; newContent: string };
	edit_file: { uri: URI; searchReplaceBlocks: string };
	create_file_or_folder: { uri: URI; isFolder: boolean };
	delete_file_or_folder: { uri: URI; isRecursive: boolean; isFolder: boolean };
	// ---
	run_command: { command: string; cwd: string | null; terminalId: string };
	run_nl_command: { nlInput: string; cwd: string | null; terminalId: string };
	open_persistent_terminal: { cwd: string | null };
	run_persistent_command: { command: string; persistentTerminalId: string };
	kill_persistent_terminal: { persistentTerminalId: string };
	// ---
	web_search: { query: string; k?: number; refresh?: boolean };
	browse_url: { url: string; refresh?: boolean };
	start_project_research: { intent: string };
	generate_image: { prompt: string; width?: number; height?: number; num_images?: number };
	go_to_definition: { uri: URI; line: number; column: number | null };
	go_to_usages: { uri: URI; line: number; column: number | null };
};

// RESULT OF TOOL CALL
export type BuiltinToolResultType = {
	read_file: { fileContents: string; totalFileLen: number; totalNumLines: number; hasNextPage: boolean };
	ls_dir: {
		children: ShallowDirectoryItem[] | null;
		hasNextPage: boolean;
		hasPrevPage: boolean;
		itemsRemaining: number;
	};
	get_dir_tree: { str: string };
	search_pathnames_only: { uris: URI[]; hasNextPage: boolean };
	search_for_files: { uris: URI[]; hasNextPage: boolean };
	search_in_file: { lines: number[] };
	read_lint_errors: { lintErrors: LintErrorItem[] | null };
	// ---
	rewrite_file: Promise<{ lintErrors: LintErrorItem[] | null }>;
	edit_file: Promise<{ lintErrors: LintErrorItem[] | null }>;
	create_file_or_folder: {};
	delete_file_or_folder: {};
	// ---
	run_command: { result: string; resolveReason: TerminalResolveReason };
	run_nl_command: { result: string; resolveReason: TerminalResolveReason; parsedCommand: string; explanation: string };
	run_persistent_command: { result: string; resolveReason: TerminalResolveReason };
	open_persistent_terminal: { persistentTerminalId: string };
	kill_persistent_terminal: {};
	// ---
	web_search: { results: Array<{ title: string; snippet: string; url: string }> };
	browse_url: { content: string; title?: string; url: string; metadata?: { publishedDate?: string } };
	start_project_research: { success: boolean };
	generate_image: { images: Array<{ url: string; prompt: string }> };
	go_to_definition: { definitions: Array<{ uri: URI; range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } }> };
	go_to_usages: { references: Array<{ uri: URI; range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } }> };
};

export type ToolCallParams<T extends BuiltinToolName | (string & {})> = T extends BuiltinToolName
	? BuiltinToolCallParams[T]
	: RawToolParamsObj;
export type ToolResult<T extends BuiltinToolName | (string & {})> = T extends BuiltinToolName
	? BuiltinToolResultType[T]
	: RawMCPToolCall;

export type BuiltinToolName = keyof BuiltinToolResultType;

type BuiltinToolParamNameOfTool<T extends BuiltinToolName> = keyof (typeof builtinTools)[T]['params'];
export type BuiltinToolParamName = { [T in BuiltinToolName]: BuiltinToolParamNameOfTool<T> }[BuiltinToolName];

export type ToolName = BuiltinToolName | (string & {});
export type ToolParamName<T extends ToolName> = T extends BuiltinToolName ? BuiltinToolParamNameOfTool<T> : string;
