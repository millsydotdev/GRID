/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ICustomLanguagesService } from '../common/customLanguages.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ICustomLanguagesConfig } from '../common/customLanguageConfiguration.js';
import { FileChangeType } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';

/**
 * Contribution that integrates custom languages with workspace indexing
 */
export class CustomLanguageIndexingContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.customLanguageIndexing';

	private static readonly WORKSPACE_CONFIG_FILE = '.vscode/custom-languages.json';

	constructor(
		@ICustomLanguagesService private readonly customLanguagesService: ICustomLanguagesService,
		@IEditorService _editorService: IEditorService,
		@ILanguageService _languageService: ILanguageService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@ILogService private readonly logService: ILogService
	) {
		super();
		this._initialize();
	}

	private async _initialize(): Promise<void> {
		// Load workspace-specific custom languages
		await this._loadWorkspaceLanguages();

		// Watch for changes to the workspace configuration file
		this._watchWorkspaceConfig();

		// Listen for custom language changes
		this._register(this.customLanguagesService.onDidChangeLanguages(e => {
			this.logService.info(`Custom language ${e.type}: ${e.languageId}`);
		}));
	}

	private async _loadWorkspaceLanguages(): Promise<void> {
		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			return;
		}

		const configUri = URI.joinPath(workspaceFolder.uri, CustomLanguageIndexingContribution.WORKSPACE_CONFIG_FILE);

		try {
			const exists = await this.fileService.exists(configUri);
			if (!exists) {
				this.logService.info('No workspace custom languages configuration found');
				return;
			}

			const content = await this.fileService.readFile(configUri);
			const config: ICustomLanguagesConfig = JSON.parse(content.value.toString());

			for (const definition of config.languages) {
				try {
					// Check if already registered
					if (this.customLanguagesService.isCustomLanguage(definition.id)) {
						await this.customLanguagesService.updateLanguage(definition.id, definition);
					} else {
						await this.customLanguagesService.registerLanguage(definition);
					}
					this.logService.info(`Loaded workspace custom language: ${definition.id}`);
				} catch (error) {
					this.logService.error(`Failed to load workspace custom language '${definition.id}':`, error);
				}
			}
		} catch (error) {
			this.logService.error('Failed to load workspace custom languages:', error);
		}
	}

	private _watchWorkspaceConfig(): void {
		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			return;
		}

		const configUri = URI.joinPath(workspaceFolder.uri, CustomLanguageIndexingContribution.WORKSPACE_CONFIG_FILE);

		// Watch for file changes
		this._register(this.fileService.watch(configUri));
		this._register(this.fileService.onDidFilesChange(e => {
			if (e.contains(configUri, FileChangeType.UPDATED, FileChangeType.ADDED)) {
				this.logService.info('Workspace custom languages configuration changed, reloading...');
				this._loadWorkspaceLanguages();
			}
		}));
	}

	/**
	 * Export current custom languages to workspace configuration
	 */
	async exportToWorkspace(): Promise<void> {
		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			throw new Error('No workspace folder available');
		}

		const configUri = URI.joinPath(workspaceFolder.uri, CustomLanguageIndexingContribution.WORKSPACE_CONFIG_FILE);
		const languages = this.customLanguagesService.getLanguages();

		const config: ICustomLanguagesConfig = {
			version: '1.0',
			languages
		};

		await this.fileService.writeFile(configUri, VSBuffer.fromString(JSON.stringify(config, null, 2)));
		this.logService.info(`Exported ${languages.length} custom languages to workspace configuration`);
	}
}

registerWorkbenchContribution2(
	CustomLanguageIndexingContribution.ID,
	CustomLanguageIndexingContribution,
	WorkbenchPhase.BlockRestore
);
