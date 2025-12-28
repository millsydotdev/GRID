/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../base/common/event.js';
import { ICustomLanguageDefinition, ICustomLanguageChangeEvent } from './customLanguageConfiguration.js';

export const ICustomLanguagesService = createDecorator<ICustomLanguagesService>('customLanguagesService');

/**
 * Service for managing custom language definitions
 */
export interface ICustomLanguagesService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when a custom language is added, removed, or updated
	 */
	readonly onDidChangeLanguages: Event<ICustomLanguageChangeEvent>;

	/**
	 * Get all registered custom languages
	 */
	getLanguages(): ICustomLanguageDefinition[];

	/**
	 * Get a specific custom language by ID
	 */
	getLanguage(languageId: string): ICustomLanguageDefinition | undefined;

	/**
	 * Register a new custom language
	 */
	registerLanguage(definition: ICustomLanguageDefinition): Promise<void>;

	/**
	 * Update an existing custom language
	 */
	updateLanguage(languageId: string, definition: ICustomLanguageDefinition): Promise<void>;

	/**
	 * Remove a custom language
	 */
	removeLanguage(languageId: string): Promise<void>;

	/**
	 * Load custom languages from configuration
	 */
	loadFromConfiguration(): Promise<void>;

	/**
	 * Save custom languages to configuration
	 */
	saveToConfiguration(): Promise<void>;

	/**
	 * Import languages from a file
	 */
	importFromFile(filePath: string): Promise<void>;

	/**
	 * Export languages to a file
	 */
	exportToFile(filePath: string): Promise<void>;

	/**
	 * Check if a language ID is a custom language
	 */
	isCustomLanguage(languageId: string): boolean;
}
