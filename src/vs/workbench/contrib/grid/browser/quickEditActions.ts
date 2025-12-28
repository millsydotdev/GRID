/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { Action2, registerAction2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { KeybindingWeight } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IEditCodeService } from './editCodeServiceInterface.js';
import { roundRangeToLines } from './sidebarActions.js';
import { GRID_CTRL_K_ACTION_ID } from './actionIDs.js';
import { localize2 } from '../../../../nls.js';
import { IMetricsService } from '../common/metricsService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { IGridSettingsService } from '../common/gridSettingsService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { EndOfLinePreference } from '../../../../editor/common/model.js';
import { IProgressService, ProgressLocation } from '../../../../platform/progress/common/progress.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { joinPath } from '../../../../base/common/resources.js';
import Severity from '../../../../base/common/severity.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';

export type QuickEditPropsType = {
	diffareaid: number;
	textAreaRef: (ref: HTMLTextAreaElement | null) => void;
	onChangeHeight: (height: number) => void;
	onChangeText: (text: string) => void;
	initText: string | null;
};

export type QuickEdit = {
	startLine: number; // 0-indexed
	beforeCode: string;
	afterCode?: string;
	instructions?: string;
	responseText?: string; // model can produce a text response too
};

registerAction2(
	class extends Action2 {
		constructor() {
			super({
				id: GRID_CTRL_K_ACTION_ID,
				f1: true,
				title: localize2('gridQuickEditAction', 'GRID: Quick Edit'),
				keybinding: {
					primary: KeyMod.CtrlCmd | KeyCode.KeyK,
					weight: KeybindingWeight.ExternalExtension,
					when: ContextKeyExpr.deserialize('editorFocus && !terminalFocus'),
				},
			});
		}

		async run(accessor: ServicesAccessor): Promise<void> {
			const editorService = accessor.get(ICodeEditorService);
			const metricsService = accessor.get(IMetricsService);
			metricsService.capture('Ctrl+K', {});

			const editor = editorService.getActiveCodeEditor();
			if (!editor) {
				// If no editor, show a notification with action to open a file
				const notificationService = accessor.get(INotificationService);
				const commandService = accessor.get(ICommandService);
				notificationService.prompt(Severity.Info, 'Quick Edit requires an open file. Would you like to open a file?', [
					{
						label: 'Open File',
						run: () => commandService.executeCommand('workbench.action.files.openFile'),
					},
				]);
				return;
			}
			const model = editor.getModel();
			if (!model) return;
			const selection = roundRangeToLines(editor.getSelection(), { emptySelectionBehavior: 'line' });
			if (!selection) return;

			const { startLineNumber: startLine, endLineNumber: endLine } = selection;

			const editCodeService = accessor.get(IEditCodeService);
			editCodeService.addCtrlKZone({ startLine, endLine, editor });
		}
	}
);

// Inline Edit (AI) command
registerAction2(
	class extends Action2 {
		constructor() {
			super({
				id: 'grid.inlineEdit',
				f1: true,
				title: localize2('gridInlineEditAction', 'GRID: Inline Edit (AI)'),
				category: localize2('gridCategory', 'GRID'),
				keybinding: {
					primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyE,
					weight: KeybindingWeight.ExternalExtension,
					when: ContextKeyExpr.deserialize('editorFocus && !terminalFocus'),
				},
				menu: {
					id: MenuId.EditorContext,
					group: '1_modification',
					order: 1.5,
					when: ContextKeyExpr.deserialize('editorTextFocus && !terminalFocus'),
				},
			});
		}

		async run(accessor: ServicesAccessor): Promise<void> {
			const editorService = accessor.get(ICodeEditorService);
			const metricsService = accessor.get(IMetricsService);
			const quickInputService = accessor.get(IQuickInputService);
			const llmMessageService = accessor.get(ILLMMessageService);
			const settingsService = accessor.get(IGridSettingsService);
			const workspaceContextService = accessor.get(IWorkspaceContextService);
			const progressService = accessor.get(IProgressService);
			const notificationService = accessor.get(INotificationService);
			const editCodeService = accessor.get(IEditCodeService);
			const fileService = accessor.get(IFileService);
			const commandService = accessor.get(ICommandService);

			metricsService.capture('Inline Edit', {});

			const editor = editorService.getActiveCodeEditor();
			if (!editor) {
				notificationService.prompt(
					Severity.Warning,
					'Inline Edit requires an open file. Would you like to open a file?',
					[
						{
							label: 'Open File',
							run: () => commandService.executeCommand('workbench.action.files.openFile'),
						},
					]
				);
				return;
			}

			const model = editor.getModel();
			if (!model) {
				notificationService.prompt(Severity.Warning, 'No file is currently open. Would you like to open a file?', [
					{
						label: 'Open File',
						run: () => commandService.executeCommand('workbench.action.files.openFile'),
					},
				]);
				return;
			}

			// Check workspace boundary
			if (!workspaceContextService.isInsideWorkspace(model.uri)) {
				notificationService.prompt(
					Severity.Warning,
					'Inline Edit only works on files within your workspace folder. Please open a file from your workspace.',
					[
						{
							label: 'Open Folder',
							run: () => commandService.executeCommand('workbench.action.files.openFolder'),
						},
					]
				);
				return;
			}

			// Get selection or current line
			const selection = roundRangeToLines(editor.getSelection(), { emptySelectionBehavior: 'line' });
			if (!selection) {
				notificationService.warn('Please select code or position cursor on a line.');
				return;
			}

			const { startLineNumber, endLineNumber } = selection;
			const selectedCode = model.getValueInRange(selection, EndOfLinePreference.LF);

			// Collect context (nearby lines)
			const contextLines = 5;
			const contextStart = Math.max(1, startLineNumber - contextLines);
			const contextEnd = Math.min(model.getLineCount(), endLineNumber + contextLines);
			const contextCode = model.getValueInRange(
				{
					startLineNumber: contextStart,
					startColumn: 1,
					endLineNumber: contextEnd,
					endColumn: Number.MAX_SAFE_INTEGER,
				},
				EndOfLinePreference.LF
			);

			// Prompt for edit instruction
			const instruction = await quickInputService
				.input({
					placeHolder: localize2(
						'gridInlineEditPlaceholder',
						'Describe what you want to change (e.g., "add error handling", "refactor to use async/await")...'
					).value,
					prompt: localize2('gridInlineEditPrompt', 'Edit instruction').value,
				})
				.then((result: string | undefined) => result);

			if (!instruction) return;

			// Check for model selection
			const modelSelection = settingsService.state.modelSelectionOfFeature['Chat'];
			if (!modelSelection) {
				notificationService.prompt(
					Severity.Warning,
					'Inline Edit requires a model to be configured. Would you like to open GRID Settings?',
					[
						{
							label: 'Open Settings',
							run: () => commandService.executeCommand('workbench.action.openGridSettings'),
						},
					]
				);
				return;
			}

			// Generate edit using LLM
			let generatedEdit: string | null = null;
			let requestId: string | null = null;
			let isComplete = false;
			let errorMessage: string | null = null;
			const cancellationToken = new CancellationTokenSource();

			// Read project Rules files if they exist
			let projectRules = '';
			try {
				const workspaceFolder = workspaceContextService.getWorkspaceFolder(model.uri);
				if (workspaceFolder) {
					const rulesFiles = ['.cursorrules', '.gridrules', '.rules'];
					for (const rulesFile of rulesFiles) {
						const rulesUri = joinPath(workspaceFolder.uri, rulesFile);
						try {
							const content = await fileService.readFile(rulesUri);
							if (content && content.value) {
								const rulesText = content.value.toString().trim();
								if (rulesText) {
									projectRules = `\n\nProject Rules (from ${rulesFile}):\n${rulesText}\n`;
									break; // Use first found rules file
								}
							}
						} catch {
							// File doesn't exist or can't be read, continue to next
						}
					}
				}
			} catch {
				// Ignore errors reading rules files
			}

			await progressService.withProgress(
				{
					location: ProgressLocation.Notification,
					title: localize2('gridInlineEditProgress', 'Generating edit...').value,
					cancellable: true,
				},
				async (progress) => {
					// Build prompt for minimal patch
					const systemMessage = `You are a code assistant. Generate a minimal SEARCH/REPLACE block to implement the requested change.

Rules:
1. Return ONLY the SEARCH/REPLACE block(s) - no explanations or code blocks
2. The ORIGINAL code must EXACTLY match the selected code
3. Keep changes minimal - only modify what's necessary
4. Format: ${'<<<<<<< ORIGINAL'}\n<original code>\n${'======='}\n<new code>\n${'>>>>>>> UPDATED'}${projectRules}

Selected code (lines ${startLineNumber}-${endLineNumber}):
\`\`\`
${selectedCode}
\`\`\`

Context (nearby lines):
\`\`\`
${contextCode}
\`\`\``;

					const userMessage = `Edit instruction: ${instruction}\n\nGenerate a SEARCH/REPLACE block for the selected code.`;

					const chatOptions = settingsService.state.optionsOfModelSelection['Chat'];
					// Skip "auto" - it's not a real provider
					const modelOptions =
						modelSelection && !(modelSelection.providerName === 'auto' && modelSelection.modelName === 'auto')
							? chatOptions[modelSelection.providerName]?.[modelSelection.modelName]
							: undefined;
					const overrides = settingsService.state.overridesOfModel;

					requestId = llmMessageService.sendLLMMessage({
						messagesType: 'chatMessages',
						chatMode: 'normal',
						messages: [
							{ role: 'system', content: systemMessage },
							{ role: 'user', content: userMessage },
						],
						modelSelection,
						modelSelectionOptions: modelOptions,
						overridesOfModel: overrides,
						separateSystemMessage: systemMessage,
						logging: { loggingName: 'Inline Edit', loggingExtras: {} },
						onText: ({ fullText }) => {
							generatedEdit = fullText;
							progress.report({ message: 'Generating...' });
						},
						onFinalMessage: ({ fullText }) => {
							generatedEdit = fullText;
							isComplete = true;
						},
						onError: ({ message }) => {
							errorMessage = message;
							isComplete = true;
						},
						onAbort: () => {
							isComplete = true;
						},
					});

					if (!requestId) {
						throw new Error('Failed to start LLM request');
					}

					// Wait for completion with cancellation support
					await new Promise<void>((resolve) => {
						const timeout = setTimeout(() => {
							if (requestId && !isComplete) {
								llmMessageService.abort(requestId);
								errorMessage = 'Timeout after 30 seconds';
								isComplete = true;
							}
							resolve();
						}, 30000); // 30s timeout

						const checkInterval = setInterval(() => {
							if (cancellationToken.token.isCancellationRequested) {
								clearInterval(checkInterval);
								clearTimeout(timeout);
								if (requestId && !isComplete) {
									llmMessageService.abort(requestId);
								}
								isComplete = true;
								resolve();
								return;
							}
							if (isComplete) {
								clearInterval(checkInterval);
								clearTimeout(timeout);
								resolve();
							}
						}, 100);
					});
				},
				() => {
					// onDidCancel callback
					cancellationToken.cancel();
				}
			);

			if (errorMessage) {
				notificationService.error(`Inline Edit failed: ${errorMessage}`);
				return;
			}

			if (!generatedEdit || typeof generatedEdit !== 'string') {
				notificationService.warn('No edit was generated. Please try again.');
				return;
			}

			// Extract search/replace blocks from response
			// TypeScript now knows generatedEdit is string after the check above
			const searchReplaceBlocks = (generatedEdit as string)
				.replace(/```[\w]*\n?/g, '')
				.replace(/```/g, '')
				.trim();

			if (!searchReplaceBlocks.includes('<<<<<<< ORIGINAL') || !searchReplaceBlocks.includes('>>>>>>> UPDATED')) {
				notificationService.warn(
					'The model did not generate a valid SEARCH/REPLACE block. Please try again or use Ctrl+K Quick Edit.'
				);
				return;
			}

			// Apply the edit using existing EditCodeService
			// This will show the diff preview automatically
			await editCodeService.callBeforeApplyOrEdit(model.uri);
			editCodeService.instantlyApplySearchReplaceBlocks({
				uri: model.uri,
				searchReplaceBlocks,
			});

			notificationService.info('Edit generated. Review the diff and apply or reject changes.');
		}
	}
);
