/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ICustomLanguagesService } from '../../../services/customLanguages/common/customLanguages.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ActionExtensions, IWorkbenchActionRegistry } from '../../../common/actions.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IQuickInputService, IQuickPickItem } from '../../../../platform/quickinput/common/quickInput.js';
import { ICustomLanguageDefinition } from '../../../services/customLanguages/common/customLanguageConfiguration.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { URI } from '../../../../base/common/uri.js';

class CustomLanguagesContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.customLanguages';

	constructor(
		@ICustomLanguagesService private readonly customLanguagesService: ICustomLanguagesService
	) {
		super();
		this._register(this.customLanguagesService.onDidChangeLanguages(e => {
			// Handle language changes if needed
		}));
	}
}

registerWorkbenchContribution2(CustomLanguagesContribution.ID, CustomLanguagesContribution, WorkbenchPhase.Eventually);

// Command: Add Custom Language
class AddCustomLanguageAction extends Action2 {
	constructor() {
		super({
			id: 'customLanguages.add',
			title: { value: 'Add Custom Language', original: 'Add Custom Language' },
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const customLanguagesService = accessor.get(ICustomLanguagesService);
		const quickInputService = accessor.get(IQuickInputService);
		const notificationService = accessor.get(INotificationService);

		// Get language ID
		const languageId = await quickInputService.input({
			prompt: 'Enter language ID (e.g., mylang)',
			placeHolder: 'mylang',
			validateInput: async (value) => {
				if (!value) {
					return 'Language ID is required';
				}
				if (!/^[a-z][a-z0-9-]*$/.test(value)) {
					return 'Language ID must start with a letter and contain only lowercase letters, numbers, and hyphens';
				}
				if (customLanguagesService.isCustomLanguage(value)) {
					return 'A custom language with this ID already exists';
				}
				return null;
			}
		});

		if (!languageId) {
			return;
		}

		// Get display name
		const displayName = await quickInputService.input({
			prompt: 'Enter display name for the language',
			placeHolder: 'My Language',
			validateInput: async (value) => {
				if (!value) {
					return 'Display name is required';
				}
				return null;
			}
		});

		if (!displayName) {
			return;
		}

		// Get file extensions
		const extensions = await quickInputService.input({
			prompt: 'Enter file extensions (comma-separated, e.g., .myl, .mylang)',
			placeHolder: '.myl',
			validateInput: async (value) => {
				if (!value) {
					return 'At least one file extension is required';
				}
				return null;
			}
		});

		if (!extensions) {
			return;
		}

		// Parse extensions
		const extensionList = extensions.split(',').map(e => e.trim()).filter(e => e.length > 0);

		// Get comment syntax (optional)
		const lineComment = await quickInputService.input({
			prompt: 'Enter line comment syntax (optional, e.g., //)',
			placeHolder: '//'
		});

		// Create basic language definition
		const definition: ICustomLanguageDefinition = {
			id: languageId,
			displayName,
			extensions: extensionList,
			aliases: [displayName],
			configuration: {
				comments: lineComment ? { lineComment } : undefined,
				brackets: [
					['{', '}'],
					['[', ']'],
					['(', ')']
				],
				autoClosingPairs: [
					{ open: '{', close: '}' },
					{ open: '[', close: ']' },
					{ open: '(', close: ')' },
					{ open: '"', close: '"' },
					{ open: "'", close: "'" }
				],
				surroundingPairs: [
					['{', '}'],
					['[', ']'],
					['(', ')'],
					['"', '"'],
					["'", "'"]
				]
			}
		};

		try {
			await customLanguagesService.registerLanguage(definition);
			notificationService.info(`Custom language '${displayName}' added successfully`);
		} catch (error) {
			notificationService.error(`Failed to add custom language: ${error}`);
		}
	}
}

// Command: Edit Custom Language
class EditCustomLanguageAction extends Action2 {
	constructor() {
		super({
			id: 'customLanguages.edit',
			title: { value: 'Edit Custom Language', original: 'Edit Custom Language' },
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const customLanguagesService = accessor.get(ICustomLanguagesService);
		const quickInputService = accessor.get(IQuickInputService);
		const notificationService = accessor.get(INotificationService);

		const languages = customLanguagesService.getLanguages();
		if (languages.length === 0) {
			notificationService.info('No custom languages to edit');
			return;
		}

		// Pick language to edit
		const items: IQuickPickItem[] = languages.map(lang => ({
			label: lang.displayName,
			description: lang.id,
			detail: `Extensions: ${lang.extensions?.join(', ') || 'none'}`
		}));

		const selected = await quickInputService.pick(items, {
			placeHolder: 'Select a custom language to edit'
		});

		if (!selected) {
			return;
		}

		const languageId = selected.description!;
		const definition = customLanguagesService.getLanguage(languageId);

		if (!definition) {
			notificationService.error('Language not found');
			return;
		}

		// Show JSON editor (simplified - in real implementation, use a proper editor)
		notificationService.info(`To edit '${definition.displayName}', use the 'Export Custom Languages' command to export, edit the JSON file, and import it back.`);
	}
}

// Command: Remove Custom Language
class RemoveCustomLanguageAction extends Action2 {
	constructor() {
		super({
			id: 'customLanguages.remove',
			title: { value: 'Remove Custom Language', original: 'Remove Custom Language' },
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const customLanguagesService = accessor.get(ICustomLanguagesService);
		const quickInputService = accessor.get(IQuickInputService);
		const notificationService = accessor.get(INotificationService);

		const languages = customLanguagesService.getLanguages();
		if (languages.length === 0) {
			notificationService.info('No custom languages to remove');
			return;
		}

		// Pick language to remove
		const items: IQuickPickItem[] = languages.map(lang => ({
			label: lang.displayName,
			description: lang.id,
			detail: `Extensions: ${lang.extensions?.join(', ') || 'none'}`
		}));

		const selected = await quickInputService.pick(items, {
			placeHolder: 'Select a custom language to remove'
		});

		if (!selected) {
			return;
		}

		const languageId = selected.description!;

		// Confirm removal
		const confirm = await quickInputService.pick(
			[
				{ label: 'Yes', description: 'Remove the language' },
				{ label: 'No', description: 'Cancel' }
			],
			{
				placeHolder: `Are you sure you want to remove '${selected.label}'?`
			}
		);

		if (!confirm || confirm.label !== 'Yes') {
			return;
		}

		try {
			await customLanguagesService.removeLanguage(languageId);
			notificationService.info(`Custom language '${selected.label}' removed successfully`);
		} catch (error) {
			notificationService.error(`Failed to remove custom language: ${error}`);
		}
	}
}

// Command: List Custom Languages
class ListCustomLanguagesAction extends Action2 {
	constructor() {
		super({
			id: 'customLanguages.list',
			title: { value: 'List Custom Languages', original: 'List Custom Languages' },
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const customLanguagesService = accessor.get(ICustomLanguagesService);
		const quickInputService = accessor.get(IQuickInputService);
		const notificationService = accessor.get(INotificationService);

		const languages = customLanguagesService.getLanguages();
		if (languages.length === 0) {
			notificationService.info('No custom languages registered');
			return;
		}

		const items: IQuickPickItem[] = languages.map(lang => ({
			label: lang.displayName,
			description: lang.id,
			detail: `Extensions: ${lang.extensions?.join(', ') || 'none'} | Aliases: ${lang.aliases?.join(', ') || 'none'}`
		}));

		await quickInputService.pick(items, {
			placeHolder: `${languages.length} custom language(s) registered`
		});
	}
}

// Command: Import Custom Languages
class ImportCustomLanguagesAction extends Action2 {
	constructor() {
		super({
			id: 'customLanguages.import',
			title: { value: 'Import Custom Languages', original: 'Import Custom Languages' },
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const customLanguagesService = accessor.get(ICustomLanguagesService);
		const fileDialogService = accessor.get(IFileDialogService);
		const notificationService = accessor.get(INotificationService);

		const files = await fileDialogService.showOpenDialog({
			title: 'Import Custom Languages',
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: [{ name: 'JSON Files', extensions: ['json'] }]
		});

		if (!files || files.length === 0) {
			return;
		}

		try {
			await customLanguagesService.importFromFile(files[0].fsPath);
			notificationService.info('Custom languages imported successfully');
		} catch (error) {
			notificationService.error(`Failed to import custom languages: ${error}`);
		}
	}
}

// Command: Export Custom Languages
class ExportCustomLanguagesAction extends Action2 {
	constructor() {
		super({
			id: 'customLanguages.export',
			title: { value: 'Export Custom Languages', original: 'Export Custom Languages' },
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const customLanguagesService = accessor.get(ICustomLanguagesService);
		const fileDialogService = accessor.get(IFileDialogService);
		const notificationService = accessor.get(INotificationService);

		const languages = customLanguagesService.getLanguages();
		if (languages.length === 0) {
			notificationService.info('No custom languages to export');
			return;
		}

		const file = await fileDialogService.showSaveDialog({
			title: 'Export Custom Languages',
			defaultUri: URI.file('custom-languages.json'),
			filters: [{ name: 'JSON Files', extensions: ['json'] }]
		});

		if (!file) {
			return;
		}

		try {
			await customLanguagesService.exportToFile(file.fsPath);
			notificationService.info('Custom languages exported successfully');
		} catch (error) {
			notificationService.error(`Failed to export custom languages: ${error}`);
		}
	}
}

// Register all actions
registerAction2(AddCustomLanguageAction);
registerAction2(EditCustomLanguageAction);
registerAction2(RemoveCustomLanguageAction);
registerAction2(ListCustomLanguagesAction);
registerAction2(ImportCustomLanguagesAction);
registerAction2(ExportCustomLanguagesAction);
