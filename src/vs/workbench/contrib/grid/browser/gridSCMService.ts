/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKey, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ISCMService } from '../../scm/common/scm.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { IGridSCMService } from '../common/gridSCMTypes.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { IGridSettingsService } from '../common/gridSettingsService.js';
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { ModelSelection, OverridesOfModel, ModelSelectionOptions } from '../common/gridSettingsTypes.js';
import {
	gitCommitMessage_systemMessage,
	gitCommitMessage_userMessage,
} from '../common/prompt/prompts.js';
import { LLMChatMessage } from '../common/sendLLMMessageTypes.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator, ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';

interface ModelOptions {
	modelSelection: ModelSelection | null;
	modelSelectionOptions?: ModelSelectionOptions;
	overridesOfModel: OverridesOfModel;
}

export interface IGenerateCommitMessageService {
	readonly _serviceBrand: undefined;
	generateCommitMessage(): Promise<void>;
	abort(): void;
}

export const IGenerateCommitMessageService = createDecorator<IGenerateCommitMessageService>(
	'gridGenerateCommitMessageService'
);

const loadingContextKey = 'gridSCMGenerateCommitMessageLoading';

class GenerateCommitMessageService extends Disposable implements IGenerateCommitMessageService {
	readonly _serviceBrand: undefined;
	private readonly execute = new ThrottledDelayer(300);
	private llmRequestId: string | null = null;
	private currentRequestId: string | null = null;
	private gridSCM: IGridSCMService;
	private loadingContextKey: IContextKey<boolean>;

	constructor(
		@ISCMService private readonly scmService: ISCMService,
		@IMainProcessService mainProcessService: IMainProcessService,
		@IGridSettingsService private readonly gridSettingsService: IGridSettingsService,
		@IConvertToLLMMessageService private readonly convertToLLMMessageService: IConvertToLLMMessageService,
		@ILLMMessageService private readonly llmMessageService: ILLMMessageService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@INotificationService private readonly notificationService: INotificationService
	) {
		super();
		this.loadingContextKey = this.contextKeyService.createKey(loadingContextKey, false);
		this.gridSCM = ProxyChannel.toService<IGridSCMService>(mainProcessService.getChannel('grid-channel-scm'));
	}

	override dispose() {
		this.execute.dispose();
		super.dispose();
	}

	async generateCommitMessage() {
		this.loadingContextKey.set(true);
		this.execute.trigger(async () => {
			const requestId = generateUuid();
			this.currentRequestId = requestId;

			try {
				const { path, repo } = this.gitRepoInfo();
				const [stat, sampledDiffs, branch, log] = await Promise.all([
					this.gridSCM.gitStat(path),
					this.gridSCM.gitSampledDiffs(path),
					this.gridSCM.gitBranch(path),
					this.gridSCM.gitLog(path),
				]);

				if (!this.isCurrentRequest(requestId)) {
					throw new CancellationError();
				}

				const modelSelection = this.gridSettingsService.state.modelSelectionOfFeature['SCM'] ?? null;
				// Skip "auto" - it's not a real provider
				const modelSelectionOptions =
					modelSelection && !(modelSelection.providerName === 'auto' && modelSelection.modelName === 'auto')
						? this.gridSettingsService.state.optionsOfModelSelection['SCM'][modelSelection.providerName]?.[
								modelSelection.modelName
							]
						: undefined;
				const overridesOfModel = this.gridSettingsService.state.overridesOfModel;

				const modelOptions: ModelOptions = { modelSelection, modelSelectionOptions, overridesOfModel };

				const prompt = gitCommitMessage_userMessage(stat, sampledDiffs, branch, log);

				// Use standard system message for commit generation
				const systemMessage = gitCommitMessage_systemMessage;

				const simpleMessages = [{ role: 'user', content: prompt } as const];
				const { messages, separateSystemMessage } = this.convertToLLMMessageService.prepareLLMSimpleMessages({
					simpleMessages,
					systemMessage,
					modelSelection: modelOptions.modelSelection,
					featureName: 'SCM',
				});

				const commitMessage = await this.sendLLMMessage(messages, separateSystemMessage!, modelOptions);

				if (!this.isCurrentRequest(requestId)) {
					throw new CancellationError();
				}

				repo.input.setValue(commitMessage, false);
			} catch (error) {
				this.onError(error);
			} finally {
				if (this.isCurrentRequest(requestId)) {
					this.loadingContextKey.set(false);
				}
			}
		});
	}

	abort() {
		if (this.llmRequestId) {
			this.llmMessageService.abort(this.llmRequestId);
		}
		this.execute.cancel();
		this.loadingContextKey.set(false);
		this.currentRequestId = null;
	}

	private gitRepoInfo() {
		const repo = Array.from(this.scmService.repositories || []).find((r: any) => r.provider.contextValue === 'git');
		if (!repo) {
			throw new Error('No git repository found');
		}
		if (!repo.provider.rootUri?.fsPath) {
			throw new Error('No git repository root path found');
		}
		return { path: repo.provider.rootUri.fsPath, repo };
	}

	/** LLM Functions */

	private sendLLMMessage(
		messages: LLMChatMessage[],
		separateSystemMessage: string,
		modelOptions: ModelOptions
	): Promise<string> {
		return new Promise((resolve, reject) => {
			this.llmRequestId = this.llmMessageService.sendLLMMessage({
				messagesType: 'chatMessages',
				messages,
				separateSystemMessage,
				chatMode: null,
				modelSelection: modelOptions.modelSelection,
				modelSelectionOptions: modelOptions.modelSelectionOptions,
				overridesOfModel: modelOptions.overridesOfModel,
				onText: () => {},
				onFinalMessage: (params: { fullText: string }) => {
					const match = params.fullText.match(/<output>([\s\S]*?)<\/output>/i);
					const commitMessage = match ? match[1].trim() : '';
					resolve(commitMessage);
				},
				onError: (error) => {
					console.error(error);
					reject(error);
				},
				onAbort: () => {
					reject(new CancellationError());
				},
				logging: { loggingName: 'GridSCM - Commit Message' },
			});
		});
	}

	/** Request Helpers */

	private isCurrentRequest(requestId: string) {
		return requestId === this.currentRequestId;
	}

	/** UI Functions */

	private onError(error: unknown) {
		if (!isCancellationError(error)) {
			console.error(error);
			this.notificationService.error(
				localize2('gridFailedToGenerateCommitMessage', 'Failed to generate commit message.').value
			);
		}
	}
}

class GenerateCommitMessageAction extends Action2 {
	constructor() {
		super({
			id: 'grid.generateCommitMessageAction',
			title: localize2('gridCommitMessagePrompt', 'GRID: Generate Commit Message'),
			icon: ThemeIcon.fromId('sparkle'),
			tooltip: localize2('gridCommitMessagePromptTooltip', 'GRID: Generate Commit Message'),
			f1: true,
			menu: [
				{
					id: MenuId.SCMInputBox,
					when: ContextKeyExpr.and(
						ContextKeyExpr.equals('scmProvider', 'git'),
						ContextKeyExpr.equals(loadingContextKey, false)
					),
					group: 'inline',
				},
			],
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const generateCommitMessageService = accessor.get(IGenerateCommitMessageService);
		generateCommitMessageService.generateCommitMessage();
	}
}

class LoadingGenerateCommitMessageAction extends Action2 {
	constructor() {
		super({
			id: 'grid.loadingGenerateCommitMessageAction',
			title: localize2('gridCommitMessagePromptCancel', 'GRID: Cancel Commit Message Generation'),
			icon: ThemeIcon.fromId('stop-circle'),
			tooltip: localize2('gridCommitMessagePromptCancelTooltip', 'GRID: Cancel Commit Message Generation'),
			f1: false, //Having a cancel command in the command palette is more confusing than useful.
			menu: [
				{
					id: MenuId.SCMInputBox,
					when: ContextKeyExpr.and(
						ContextKeyExpr.equals('scmProvider', 'git'),
						ContextKeyExpr.equals(loadingContextKey, true)
					),
					group: 'inline',
				},
			],
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const generateCommitMessageService = accessor.get(IGenerateCommitMessageService);
		generateCommitMessageService.abort();
	}
}

registerAction2(GenerateCommitMessageAction);
registerAction2(LoadingGenerateCommitMessageAction);
registerSingleton(IGenerateCommitMessageService, GenerateCommitMessageService, InstantiationType.Delayed);
