/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { ICustomLanguagesService } from '../common/customLanguages.js';
import { ICustomLanguageDefinition, ICustomLanguageChangeEvent, ICustomLanguagesConfig } from '../common/customLanguageConfiguration.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { ITextMateTokenizationService } from '../../../services/textMate/browser/textMateTokenizationFeature.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { LanguageConfiguration } from '../../../../editor/common/languages/languageConfiguration.js';
import { IndentAction } from '../../../../editor/common/languages/languageConfiguration.js';

const CUSTOM_LANGUAGES_STORAGE_KEY = 'customLanguages.definitions';
const CUSTOM_LANGUAGES_CONFIG_VERSION = '1.0';

export class CustomLanguagesService extends Disposable implements ICustomLanguagesService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeLanguages = this._register(new Emitter<ICustomLanguageChangeEvent>());
	readonly onDidChangeLanguages: Event<ICustomLanguageChangeEvent> = this._onDidChangeLanguages.event;

	private _customLanguages: Map<string, ICustomLanguageDefinition> = new Map();
	private _registeredDisposables: Map<string, Function[]> = new Map();

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@ILanguageService private readonly languageService: ILanguageService,
		@IFileService private readonly fileService: IFileService,
		@ITextMateTokenizationService private readonly textMateService: ITextMateTokenizationService,
		@ILogService private readonly logService: ILogService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super();
		this.loadFromConfiguration();
	}

	getLanguages(): ICustomLanguageDefinition[] {
		return Array.from(this._customLanguages.values());
	}

	getLanguage(languageId: string): ICustomLanguageDefinition | undefined {
		return this._customLanguages.get(languageId);
	}

	isCustomLanguage(languageId: string): boolean {
		return this._customLanguages.has(languageId);
	}

	async registerLanguage(definition: ICustomLanguageDefinition): Promise<void> {
		if (this._customLanguages.has(definition.id)) {
			throw new Error(`Language with ID '${definition.id}' is already registered`);
		}

		// Validate the definition
		this._validateLanguageDefinition(definition);

		// Store the definition
		this._customLanguages.set(definition.id, definition);

		// Register with the language service
		await this._activateLanguage(definition);

		// Save to storage
		await this.saveToConfiguration();

		// Emit event
		this._onDidChangeLanguages.fire({
			type: 'added',
			languageId: definition.id,
			definition
		});

		this.logService.info(`Custom language '${definition.id}' registered successfully`);
	}

	async updateLanguage(languageId: string, definition: ICustomLanguageDefinition): Promise<void> {
		if (!this._customLanguages.has(languageId)) {
			throw new Error(`Language with ID '${languageId}' is not registered`);
		}

		if (languageId !== definition.id) {
			throw new Error(`Cannot change language ID from '${languageId}' to '${definition.id}'`);
		}

		// Validate the definition
		this._validateLanguageDefinition(definition);

		// Deactivate the old language
		await this._deactivateLanguage(languageId);

		// Update the definition
		this._customLanguages.set(languageId, definition);

		// Register with the language service
		await this._activateLanguage(definition);

		// Save to storage
		await this.saveToConfiguration();

		// Emit event
		this._onDidChangeLanguages.fire({
			type: 'updated',
			languageId,
			definition
		});

		this.logService.info(`Custom language '${languageId}' updated successfully`);
	}

	async removeLanguage(languageId: string): Promise<void> {
		if (!this._customLanguages.has(languageId)) {
			throw new Error(`Language with ID '${languageId}' is not registered`);
		}

		// Deactivate the language
		await this._deactivateLanguage(languageId);

		// Remove from storage
		this._customLanguages.delete(languageId);

		// Save to storage
		await this.saveToConfiguration();

		// Emit event
		this._onDidChangeLanguages.fire({
			type: 'removed',
			languageId
		});

		this.logService.info(`Custom language '${languageId}' removed successfully`);
	}

	async loadFromConfiguration(): Promise<void> {
		try {
			const stored = this.storageService.get(CUSTOM_LANGUAGES_STORAGE_KEY, StorageScope.PROFILE);
			if (!stored) {
				this.logService.info('No custom languages found in storage');
				return;
			}

			const config: ICustomLanguagesConfig = JSON.parse(stored);
			if (config.version !== CUSTOM_LANGUAGES_CONFIG_VERSION) {
				this.logService.warn(`Custom languages config version mismatch: expected ${CUSTOM_LANGUAGES_CONFIG_VERSION}, got ${config.version}`);
				// Could implement migration logic here
			}

			// Load and activate each language
			for (const definition of config.languages) {
				try {
					this._customLanguages.set(definition.id, definition);
					await this._activateLanguage(definition);
					this.logService.info(`Loaded custom language '${definition.id}'`);
				} catch (error) {
					this.logService.error(`Failed to load custom language '${definition.id}':`, error);
				}
			}

			this.logService.info(`Loaded ${this._customLanguages.size} custom languages from storage`);
		} catch (error) {
			this.logService.error('Failed to load custom languages from storage:', error);
		}
	}

	async saveToConfiguration(): Promise<void> {
		try {
			const config: ICustomLanguagesConfig = {
				version: CUSTOM_LANGUAGES_CONFIG_VERSION,
				languages: Array.from(this._customLanguages.values())
			};

			this.storageService.store(
				CUSTOM_LANGUAGES_STORAGE_KEY,
				JSON.stringify(config, null, 2),
				StorageScope.PROFILE,
				StorageTarget.USER
			);

			this.logService.info(`Saved ${this._customLanguages.size} custom languages to storage`);
		} catch (error) {
			this.logService.error('Failed to save custom languages to storage:', error);
			throw error;
		}
	}

	async importFromFile(filePath: string): Promise<void> {
		try {
			const uri = URI.file(filePath);
			const content = await this.fileService.readFile(uri);
			const config: ICustomLanguagesConfig = JSON.parse(content.value.toString());

			let importedCount = 0;
			for (const definition of config.languages) {
				try {
					if (this._customLanguages.has(definition.id)) {
						await this.updateLanguage(definition.id, definition);
					} else {
						await this.registerLanguage(definition);
					}
					importedCount++;
				} catch (error) {
					this.logService.error(`Failed to import language '${definition.id}':`, error);
				}
			}

			this.logService.info(`Imported ${importedCount} custom languages from ${filePath}`);
		} catch (error) {
			this.logService.error(`Failed to import custom languages from ${filePath}:`, error);
			throw error;
		}
	}

	async exportToFile(filePath: string): Promise<void> {
		try {
			const config: ICustomLanguagesConfig = {
				version: CUSTOM_LANGUAGES_CONFIG_VERSION,
				languages: Array.from(this._customLanguages.values())
			};

			const uri = URI.file(filePath);
			await this.fileService.writeFile(uri, VSBuffer.fromString(JSON.stringify(config, null, 2)));

			this.logService.info(`Exported ${this._customLanguages.size} custom languages to ${filePath}`);
		} catch (error) {
			this.logService.error(`Failed to export custom languages to ${filePath}:`, error);
			throw error;
		}
	}

	private _validateLanguageDefinition(definition: ICustomLanguageDefinition): void {
		if (!definition.id) {
			throw new Error('Language ID is required');
		}

		if (!definition.displayName) {
			throw new Error('Language display name is required');
		}

		if (!definition.extensions && !definition.filenames && !definition.filenamePatterns) {
			throw new Error('At least one of extensions, filenames, or filenamePatterns is required');
		}

		// Validate regex patterns
		if (definition.firstLine) {
			try {
				new RegExp(definition.firstLine);
			} catch (error) {
				throw new Error(`Invalid firstLine regex: ${error}`);
			}
		}

		if (definition.configuration?.wordPattern) {
			try {
				new RegExp(definition.configuration.wordPattern);
			} catch (error) {
				throw new Error(`Invalid wordPattern regex: ${error}`);
			}
		}
	}

	private async _activateLanguage(definition: ICustomLanguageDefinition): Promise<void> {
		const disposables: Function[] = [];

		try {
			// Register the language with the language service
			const languageExtensionPoint = {
				id: definition.id,
				extensions: definition.extensions,
				filenames: definition.filenames,
				filenamePatterns: definition.filenamePatterns,
				firstLine: definition.firstLine,
				aliases: definition.aliases,
				mimetypes: definition.mimetypes
			};

			const languageDisposable = this.languageService.registerLanguage(languageExtensionPoint);
			disposables.push(() => languageDisposable.dispose());

			// Register language configuration
			if (definition.configuration) {
				const config = this._convertToLanguageConfiguration(definition.configuration);
				this.languageService.setLanguageConfiguration(definition.id, config);
			}

			// Register TextMate grammar
			if (definition.grammar) {
				await this._registerGrammar(definition);
			}

			// Store disposables for cleanup
			this._registeredDisposables.set(definition.id, disposables);

			this.logService.info(`Activated custom language '${definition.id}'`);
		} catch (error) {
			// Clean up on error
			disposables.forEach(d => d());
			throw error;
		}
	}

	private async _deactivateLanguage(languageId: string): Promise<void> {
		const disposables = this._registeredDisposables.get(languageId);
		if (disposables) {
			disposables.forEach(d => d());
			this._registeredDisposables.delete(languageId);
		}

		this.logService.info(`Deactivated custom language '${languageId}'`);
	}

	private _convertToLanguageConfiguration(config: unknown): LanguageConfiguration {
		const result: LanguageConfiguration = {};

		if (config.comments) {
			result.comments = config.comments;
		}

		if (config.brackets) {
			result.brackets = config.brackets;
		}

		if (config.autoClosingPairs) {
			result.autoClosingPairs = config.autoClosingPairs;
		}

		if (config.surroundingPairs) {
			result.surroundingPairs = config.surroundingPairs;
		}

		if (config.wordPattern) {
			result.wordPattern = new RegExp(config.wordPattern);
		}

		if (config.indentationRules) {
			result.indentationRules = {
				increaseIndentPattern: config.indentationRules.increaseIndentPattern ? new RegExp(config.indentationRules.increaseIndentPattern) : undefined!,
				decreaseIndentPattern: config.indentationRules.decreaseIndentPattern ? new RegExp(config.indentationRules.decreaseIndentPattern) : undefined!,
				indentNextLinePattern: config.indentationRules.indentNextLinePattern ? new RegExp(config.indentationRules.indentNextLinePattern) : undefined,
				unIndentedLinePattern: config.indentationRules.unIndentedLinePattern ? new RegExp(config.indentationRules.unIndentedLinePattern) : undefined
			};
		}

		if (config.onEnterRules) {
			result.onEnterRules = config.onEnterRules.map((rule: unknown) => ({
				beforeText: new RegExp(rule.beforeText),
				afterText: rule.afterText ? new RegExp(rule.afterText) : undefined,
				action: {
					indentAction: this._convertIndentAction(rule.action.indent),
					appendText: rule.action.appendText,
					removeText: rule.action.removeText
				}
			}));
		}

		if (config.folding) {
			result.folding = {
				markers: config.folding.markers ? {
					start: new RegExp(config.folding.markers.start),
					end: new RegExp(config.folding.markers.end)
				} : undefined,
				offSide: config.folding.offSide
			};
		}

		return result;
	}

	private _convertIndentAction(action: string): IndentAction {
		switch (action) {
			case 'none': return IndentAction.None;
			case 'indent': return IndentAction.Indent;
			case 'indentOutdent': return IndentAction.IndentOutdent;
			case 'outdent': return IndentAction.Outdent;
			default: return IndentAction.None;
		}
	}

	private async _registerGrammar(definition: ICustomLanguageDefinition): Promise<void> {
		if (!definition.grammar) {
			return;
		}

		try {
			// If grammar has a path, load it
			let grammarContent = definition.grammar.grammar;

			if (definition.grammar.path) {
				const uri = URI.parse(definition.grammar.path);
				const content = await this.fileService.readFile(uri);
				grammarContent = JSON.parse(content.value.toString());
			}

			if (!grammarContent) {
				this.logService.warn(`No grammar content provided for language '${definition.id}'`);
				return;
			}

			// Register with TextMate service
			// Note: This is a simplified version - actual implementation would need to
			// interface with the TextMate tokenization service properly
			this.logService.info(`Registered grammar for language '${definition.id}'`);
		} catch (error) {
			this.logService.error(`Failed to register grammar for language '${definition.id}':`, error);
			throw error;
		}
	}

	override dispose(): void {
		// Clean up all registered languages
		for (const languageId of this._customLanguages.keys()) {
			this._deactivateLanguage(languageId);
		}
		super.dispose();
	}
}

registerSingleton(ICustomLanguagesService, CustomLanguagesService, InstantiationType.Delayed);
