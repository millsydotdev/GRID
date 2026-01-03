/*---------------------------------------------------------------------------------------------
 *  Copyright (c) GRID Editor. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../../base/common/uri.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IProtocol } from './messenger.js';

/**
 * Chat message structure
 */
export interface IChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp?: number;
}

/**
 * Autocomplete request
 */
export interface IAutocompleteRequest {
	uri: URI;
	position: Position;
	context: string;
	language?: string;
}

/**
 * Autocomplete response
 */
export interface IAutocompleteResponse {
	suggestions: {
		text: string;
		range: Range;
		confidence: number;
	}[];
}

/**
 * Diff generation request
 */
export interface IDiffRequest {
	oldContent: string;
	newContent: string;
	streaming?: boolean;
}

/**
 * Diff line result
 */
export interface IDiffLine {
	type: 'old' | 'new' | 'same';
	line: string;
	lineNumber?: number;
}

/**
 * Code edit request
 */
export interface ICodeEditRequest {
	uri: URI;
	instruction: string;
	range?: Range;
	context?: string;
}

/**
 * Code edit response
 */
export interface ICodeEditResponse {
	edits: {
		range: Range;
		newText: string;
	}[];
	explanation?: string;
}

/**
 * Protocol for Editor → AI Service communication
 */
export type ToAIServiceProtocol = {
	/**
	 * Send a chat message
	 */
	'chat/send': [
		{ messages: IChatMessage[]; stream?: boolean },
		AsyncGenerator<string> | string
	];

	/**
	 * Request autocomplete suggestions
	 */
	'autocomplete/request': [IAutocompleteRequest, IAutocompleteResponse];

	/**
	 * Generate diff
	 */
	'diff/generate': [IDiffRequest, IDiffLine[] | AsyncGenerator<IDiffLine>];

	/**
	 * Request code edit
	 */
	'edit/request': [ICodeEditRequest, ICodeEditResponse];

	/**
	 * Cancel ongoing operation
	 */
	'operation/cancel': [{ operationId: string }, void];

	/**
	 * Get AI service status
	 */
	'service/status': [undefined, { available: boolean; model?: string }];
};

/**
 * Protocol for AI Service → Editor communication
 */
export type FromAIServiceProtocol = {
	/**
	 * Notify about autocomplete ready
	 */
	'autocomplete/ready': [{ uri: URI }, void];

	/**
	 * Notify about operation progress
	 */
	'operation/progress': [{ operationId: string; progress: number; message?: string }, void];

	/**
	 * Notify about operation complete
	 */
	'operation/complete': [{ operationId: string; success: boolean; error?: string }, void];

	/**
	 * Request to apply edits
	 */
	'edit/apply': [{ uri: URI; edits: { range: Range; newText: string }[] }, boolean];
};
