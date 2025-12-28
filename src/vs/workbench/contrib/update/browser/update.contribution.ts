/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import '../../../../platform/update/common/update.config.contribution.js';
import { localize, localize2 } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions, IWorkbenchContribution } from '../../../common/contributions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { ProductContribution, UpdateContribution, CONTEXT_UPDATE_STATE, SwitchProductQualityContribution, RELEASE_NOTES_URL, showReleaseNotesInEditor, DOWNLOAD_URL } from './update.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import product from '../../../../platform/product/common/product.js';
import { IUpdateService, StateType, State } from '../../../../platform/update/common/update.js';
import { IInstantiationService, ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { isWindows, isWeb } from '../../../../base/common/platform.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { mnemonicButtonLabel } from '../../../../base/common/labels.js';
import { ShowCurrentReleaseNotesActionId, ShowCurrentReleaseNotesFromCurrentFileActionId } from '../common/update.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { URI } from '../../../../base/common/uri.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IBannerService } from '../../../services/banner/browser/bannerService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';

const workbench = Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);

workbench.registerWorkbenchContribution(ProductContribution, LifecyclePhase.Restored);
workbench.registerWorkbenchContribution(UpdateContribution, LifecyclePhase.Restored);
workbench.registerWorkbenchContribution(SwitchProductQualityContribution, LifecyclePhase.Restored);

// Release notes

export class ShowCurrentReleaseNotesAction extends Action2 {

	constructor() {
		super({
			id: ShowCurrentReleaseNotesActionId,
			title: {
				...localize2('showReleaseNotes', "Show Release Notes"),
				mnemonicTitle: localize({ key: 'mshowReleaseNotes', comment: ['&& denotes a mnemonic'] }, "Show &&Release Notes"),
			},
			category: { value: product.nameShort, original: product.nameShort },
			f1: true,
			precondition: RELEASE_NOTES_URL,
			menu: [{
				id: MenuId.MenubarHelpMenu,
				group: '1_welcome',
				order: 5,
				when: RELEASE_NOTES_URL,
			}]
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const instantiationService = accessor.get(IInstantiationService);
		const productService = accessor.get(IProductService);
		const openerService = accessor.get(IOpenerService);

		try {
			await showReleaseNotesInEditor(instantiationService, productService.version, false);
		} catch (err) {
			if (productService.releaseNotesUrl) {
				await openerService.open(URI.parse(productService.releaseNotesUrl));
			} else {
				throw new Error(localize('update.noReleaseNotesOnline', "This version of {0} does not have release notes online", productService.nameLong));
			}
		}
	}
}

export class ShowCurrentReleaseNotesFromCurrentFileAction extends Action2 {

	constructor() {
		super({
			id: ShowCurrentReleaseNotesFromCurrentFileActionId,
			title: {
				...localize2('showReleaseNotesCurrentFile', "Open Current File as Release Notes"),
				mnemonicTitle: localize({ key: 'mshowReleaseNotes', comment: ['&& denotes a mnemonic'] }, "Show &&Release Notes"),
			},
			category: localize2('developerCategory', "Developer"),
			f1: true,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const instantiationService = accessor.get(IInstantiationService);
		const productService = accessor.get(IProductService);

		try {
			await showReleaseNotesInEditor(instantiationService, productService.version, true);
		} catch (err) {
			throw new Error(localize('releaseNotesFromFileNone', "Cannot open the current file as Release Notes"));
		}
	}
}

registerAction2(ShowCurrentReleaseNotesAction);
registerAction2(ShowCurrentReleaseNotesFromCurrentFileAction);

// Update

export class CheckForUpdateAction extends Action2 {

	constructor() {
		super({
			id: 'update.checkForUpdate',
			title: localize2('checkForUpdates', 'Check for Updates...'),
			category: { value: product.nameShort, original: product.nameShort },
			f1: true,
			precondition: CONTEXT_UPDATE_STATE.isEqualTo(StateType.Idle),
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const updateService = accessor.get(IUpdateService);
		return updateService.checkForUpdates(true);
	}
}

class DownloadUpdateAction extends Action2 {
	constructor() {
		super({
			id: 'update.downloadUpdate',
			title: localize2('downloadUpdate', 'Download Update'),
			category: { value: product.nameShort, original: product.nameShort },
			f1: true,
			precondition: CONTEXT_UPDATE_STATE.isEqualTo(StateType.AvailableForDownload)
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		await accessor.get(IUpdateService).downloadUpdate();
	}
}

class InstallUpdateAction extends Action2 {
	constructor() {
		super({
			id: 'update.installUpdate',
			title: localize2('installUpdate', 'Install Update'),
			category: { value: product.nameShort, original: product.nameShort },
			f1: true,
			precondition: CONTEXT_UPDATE_STATE.isEqualTo(StateType.Downloaded)
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		await accessor.get(IUpdateService).applyUpdate();
	}
}

class RestartToUpdateAction extends Action2 {
	constructor() {
		super({
			id: 'update.restartToUpdate',
			title: localize2('restartToUpdate', 'Restart to Update'),
			category: { value: product.nameShort, original: product.nameShort },
			f1: true,
			precondition: CONTEXT_UPDATE_STATE.isEqualTo(StateType.Ready)
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		await accessor.get(IUpdateService).quitAndInstall();
	}
}

class DownloadAction extends Action2 {

	static readonly ID = 'workbench.action.download';

	constructor() {
		super({
			id: DownloadAction.ID,
			title: localize2('openDownloadPage', "Download {0}", product.nameLong),
			precondition: ContextKeyExpr.and(IsWebContext, DOWNLOAD_URL), // Only show when running in a web browser and a download url is available
			f1: true,
			menu: [{
				id: MenuId.StatusBarWindowIndicatorMenu,
				when: ContextKeyExpr.and(IsWebContext, DOWNLOAD_URL)
			}]
		});
	}

	run(accessor: ServicesAccessor): void {
		const productService = accessor.get(IProductService);
		const openerService = accessor.get(IOpenerService);

		if (productService.downloadUrl) {
			openerService.open(URI.parse(productService.downloadUrl));
		}
	}
}

registerAction2(DownloadAction);
registerAction2(CheckForUpdateAction);
registerAction2(DownloadUpdateAction);
registerAction2(InstallUpdateAction);
registerAction2(RestartToUpdateAction);

if (isWindows) {
	class DeveloperApplyUpdateAction extends Action2 {
		constructor() {
			super({
				id: '_update.applyupdate',
				title: localize2('applyUpdate', 'Apply Update...'),
				category: Categories.Developer,
				f1: true,
				precondition: CONTEXT_UPDATE_STATE.isEqualTo(StateType.Idle)
			});
		}

		async run(accessor: ServicesAccessor): Promise<void> {
			const updateService = accessor.get(IUpdateService);
			const fileDialogService = accessor.get(IFileDialogService);

			const updatePath = await fileDialogService.showOpenDialog({
				title: localize('pickUpdate', "Apply Update"),
				filters: [{ name: 'Setup', extensions: ['exe'] }],
				canSelectFiles: true,
				openLabel: mnemonicButtonLabel(localize({ key: 'updateButton', comment: ['&& denotes a mnemonic'] }, "&&Update"))
			});

			if (!updatePath || !updatePath[0]) {
				return;
			}

			await updateService._applySpecificUpdate(updatePath[0].fsPath);
		}
	}

	registerAction2(DeveloperApplyUpdateAction);
}

// Update Banner

const UPDATE_BANNER_LATER_COMMAND = 'update.banner.later';
const UPDATE_BANNER_INSTALL_COMMAND = 'update.banner.install';

export class UpdateBannerContribution extends Disposable implements IWorkbenchContribution {

	private static readonly BANNER_ID = 'update.banner';
	private bannerShown = false;
	private currentState: State | undefined;

	constructor(
		@IUpdateService private readonly updateService: IUpdateService,
		@IBannerService private readonly bannerService: IBannerService,
	) {
		super();

		// Register commands for banner actions
		this.registerCommands();

		// Listen to update state changes
		this._register(this.updateService.onStateChange(state => this.onUpdateStateChange(state)));

		// Check initial state
		this.onUpdateStateChange(this.updateService.state);
	}

	private registerCommands(): void {
		// Register "Later" command
		CommandsRegistry.registerCommand(UPDATE_BANNER_LATER_COMMAND, () => {
			if (this.bannerShown) {
				this.bannerService.hide(UpdateBannerContribution.BANNER_ID);
				this.bannerShown = false;
			}
		});

		// Register "Install Now" command
		CommandsRegistry.registerCommand(UPDATE_BANNER_INSTALL_COMMAND, () => {
			if (!this.currentState) {
				return;
			}

			if (this.currentState.type === StateType.Ready) {
				this.updateService.quitAndInstall();
			} else if (this.currentState.type === StateType.Downloaded) {
				this.updateService.applyUpdate();
			}
		});
	}

	private onUpdateStateChange(state: State): void {
		this.currentState = state;

		// Only show banner for Ready or Downloaded states
		// Don't show if updates are disabled or if we're on web
		if (isWeb || state.type === StateType.Disabled || state.type === StateType.Uninitialized) {
			if (this.bannerShown) {
				this.bannerService.hide(UpdateBannerContribution.BANNER_ID);
				this.bannerShown = false;
			}
			return;
		}

		// Show banner when update is ready or downloaded
		if (state.type === StateType.Ready || state.type === StateType.Downloaded) {
			if (!this.bannerShown) {
				this.showBanner(state);
			}
		} else {
			// Hide banner for other states
			if (this.bannerShown) {
				this.bannerService.hide(UpdateBannerContribution.BANNER_ID);
				this.bannerShown = false;
			}
		}
	}

	private showBanner(state: State): void {
		this.bannerService.show({
			id: UpdateBannerContribution.BANNER_ID,
			message: localize('updateBanner.message', 'New update available'),
			icon: ThemeIcon.fromId('sync'),
			actions: [
				{
					label: localize('updateBanner.later', 'Later'),
					href: `command:${UPDATE_BANNER_LATER_COMMAND}`
				},
				{
					label: localize('updateBanner.installNow', 'Install Now'),
					href: `command:${UPDATE_BANNER_INSTALL_COMMAND}`
				}
			],
			onClose: () => {
				this.bannerShown = false;
			}
		});

		this.bannerShown = true;
	}
}

workbench.registerWorkbenchContribution(UpdateBannerContribution, LifecyclePhase.Restored);
