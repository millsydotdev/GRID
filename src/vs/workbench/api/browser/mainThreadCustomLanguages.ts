/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../base/common/lifecycle.js';
import { ICustomLanguagesService } from '../../services/customLanguages/common/customLanguages.js';
import { ICustomLanguageDefinition } from '../../services/customLanguages/common/customLanguageConfiguration.js';
import { extHostNamedCustomer, IExtHostContext } from '../../services/extensions/common/extHostCustomers.js';
import { MainContext, MainThreadCustomLanguagesShape } from '../common/extHost.protocol.js';

@extHostNamedCustomer(MainContext.MainThreadCustomLanguages)
export class MainThreadCustomLanguages extends Disposable implements MainThreadCustomLanguagesShape {

	constructor(
		_extHostContext: IExtHostContext,
		@ICustomLanguagesService private readonly _customLanguagesService: ICustomLanguagesService
	) {
		super();
	}

	async $registerCustomLanguage(definition: ICustomLanguageDefinition): Promise<void> {
		return this._customLanguagesService.registerLanguage(definition);
	}

	async $updateCustomLanguage(languageId: string, definition: ICustomLanguageDefinition): Promise<void> {
		return this._customLanguagesService.updateLanguage(languageId, definition);
	}

	async $removeCustomLanguage(languageId: string): Promise<void> {
		return this._customLanguagesService.removeLanguage(languageId);
	}

	async $getCustomLanguages(): Promise<ICustomLanguageDefinition[]> {
		return this._customLanguagesService.getLanguages();
	}

	async $getCustomLanguage(languageId: string): Promise<ICustomLanguageDefinition | undefined> {
		return this._customLanguagesService.getLanguage(languageId);
	}

	async $isCustomLanguage(languageId: string): Promise<boolean> {
		return this._customLanguagesService.isCustomLanguage(languageId);
	}

	override dispose(): void {
		super.dispose();
	}
}
