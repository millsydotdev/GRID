/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Configuration for a custom language definition
 */
export interface ICustomLanguageDefinition {
	/**
	 * Unique identifier for the language
	 */
	id: string;

	/**
	 * Display name for the language
	 */
	displayName: string;

	/**
	 * File extensions associated with this language (e.g., ['.myl', '.mylang'])
	 */
	extensions?: string[];

	/**
	 * Exact filenames that should use this language (e.g., ['Mylangfile', 'mylang.config'])
	 */
	filenames?: string[];

	/**
	 * Filename patterns (glob) for this language (e.g., ['*.config.myl'])
	 */
	filenamePatterns?: string[];

	/**
	 * Alternative names for the language
	 */
	aliases?: string[];

	/**
	 * First line regex pattern for language detection (e.g., shebang)
	 */
	firstLine?: string;

	/**
	 * MIME types associated with this language
	 */
	mimetypes?: string[];

	/**
	 * Language configuration (comments, brackets, etc.)
	 */
	configuration?: ICustomLanguageConfiguration;

	/**
	 * TextMate grammar configuration
	 */
	grammar?: ICustomLanguageGrammar;

	/**
	 * Language server configuration (optional)
	 */
	languageServer?: ICustomLanguageServerConfig;
}

/**
 * Language configuration defining editor behavior
 */
export interface ICustomLanguageConfiguration {
	/**
	 * Comment tokens
	 */
	comments?: {
		lineComment?: string;
		blockComment?: [string, string];
	};

	/**
	 * Bracket pairs
	 */
	brackets?: Array<[string, string]>;

	/**
	 * Auto-closing pairs
	 */
	autoClosingPairs?: Array<{
		open: string;
		close: string;
		notIn?: ('string' | 'comment')[];
	}>;

	/**
	 * Surrounding pairs for selections
	 */
	surroundingPairs?: Array<[string, string]>;

	/**
	 * Word pattern regex
	 */
	wordPattern?: string;

	/**
	 * Indentation rules
	 */
	indentationRules?: {
		increaseIndentPattern?: string;
		decreaseIndentPattern?: string;
		indentNextLinePattern?: string;
		unIndentedLinePattern?: string;
	};

	/**
	 * On enter rules
	 */
	onEnterRules?: Array<{
		beforeText: string;
		afterText?: string;
		action: {
			indent: 'none' | 'indent' | 'indentOutdent' | 'outdent';
			appendText?: string;
			removeText?: number;
		};
	}>;

	/**
	 * Folding markers
	 */
	folding?: {
		markers?: {
			start: string;
			end: string;
		};
		offSide?: boolean;
	};

	/**
	 * Auto-indent behavior
	 */
	autoIndent?: 'none' | 'keep' | 'brackets' | 'advanced' | 'full';
}

/**
 * TextMate grammar configuration
 */
export interface ICustomLanguageGrammar {
	/**
	 * Unique TextMate scope name (e.g., 'source.mylang')
	 */
	scopeName: string;

	/**
	 * Path to the TextMate grammar file (.tmLanguage.json or .tmLanguage.plist)
	 * Can be a URL, file path, or inline grammar object
	 */
	path?: string;

	/**
	 * Inline grammar rules (if not using external file)
	 */
	grammar?: unknown;

	/**
	 * Embedded language support
	 */
	embeddedLanguages?: { [scopeName: string]: string };

	/**
	 * Token types mapping
	 */
	tokenTypes?: { [scopeName: string]: string };

	/**
	 * Inject this grammar into other languages
	 */
	injectTo?: string[];

	/**
	 * Balanced bracket scopes
	 */
	balancedBracketScopes?: string[];

	/**
	 * Unbalanced bracket scopes
	 */
	unbalancedBracketScopes?: string[];
}

/**
 * Language server configuration
 */
export interface ICustomLanguageServerConfig {
	/**
	 * Command to start the language server
	 */
	command: string;

	/**
	 * Arguments for the language server command
	 */
	args?: string[];

	/**
	 * Environment variables
	 */
	env?: { [key: string]: string };

	/**
	 * Transport type
	 */
	transport?: 'stdio' | 'ipc' | 'socket' | 'pipe';

	/**
	 * Port for socket transport
	 */
	port?: number;

	/**
	 * File patterns to activate the language server
	 */
	fileEvents?: string[];

	/**
	 * Initialization options
	 */
	initializationOptions?: unknown;
}

/**
 * Storage format for custom languages
 */
export interface ICustomLanguagesConfig {
	/**
	 * Version of the configuration schema
	 */
	version: string;

	/**
	 * Custom language definitions
	 */
	languages: ICustomLanguageDefinition[];
}

/**
 * Events emitted by the custom language service
 */
export interface ICustomLanguageChangeEvent {
	/**
	 * Type of change
	 */
	type: 'added' | 'removed' | 'updated';

	/**
	 * Language that changed
	 */
	languageId: string;

	/**
	 * New definition (for added/updated)
	 */
	definition?: ICustomLanguageDefinition;
}
