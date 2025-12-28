/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICustomLanguageDefinition } from '../../services/customLanguages/common/customLanguageConfiguration.js';
import { IMainContext, MainContext, MainThreadCustomLanguagesShape } from './extHost.protocol.js';

export class ExtHostCustomLanguages {

	private readonly _proxy: MainThreadCustomLanguagesShape;

	constructor(mainContext: IMainContext) {
		this._proxy = mainContext.getProxy(MainContext.MainThreadCustomLanguages);
	}

	/**
	 * Register a custom language
	 */
	async registerCustomLanguage(definition: ICustomLanguageDefinition): Promise<void> {
		return this._proxy.$registerCustomLanguage(definition);
	}

	/**
	 * Update a custom language
	 */
	async updateCustomLanguage(languageId: string, definition: ICustomLanguageDefinition): Promise<void> {
		return this._proxy.$updateCustomLanguage(languageId, definition);
	}

	/**
	 * Remove a custom language
	 */
	async removeCustomLanguage(languageId: string): Promise<void> {
		return this._proxy.$removeCustomLanguage(languageId);
	}

	/**
	 * Get all custom languages
	 */
	async getCustomLanguages(): Promise<ICustomLanguageDefinition[]> {
		return this._proxy.$getCustomLanguages();
	}

	/**
	 * Get a specific custom language
	 */
	async getCustomLanguage(languageId: string): Promise<ICustomLanguageDefinition | undefined> {
		return this._proxy.$getCustomLanguage(languageId);
	}

	/**
	 * Check if a language is a custom language
	 */
	async isCustomLanguage(languageId: string): Promise<boolean> {
		return this._proxy.$isCustomLanguage(languageId);
	}
}
