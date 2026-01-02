/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { INotificationActions, INotificationHandle, INotificationService } from '../../../../platform/notification/common/notification.js';
import { IMetricsService } from '../common/metricsService.js';
import { IGridUpdateService } from '../common/gridUpdateService.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import * as dom from '../../../../base/browser/dom.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { GridCheckUpdateRespose } from '../common/gridUpdateServiceTypes.js';
import { IAction } from '../../../../base/common/actions.js';




const notifyUpdate = (res: GridCheckUpdateRespose & { message: string }, notifService: INotificationService, updateService: IUpdateService): INotificationHandle => {
	const message = res?.message || 'This is a very old version of GRID, please download the latest version! [GRID](https://grid.millsy.dev/download-beta)!';

	let actions: INotificationActions | undefined;

	if (res?.action) {
		const primary: IAction[] = [];

		if (res.action === 'reinstall') {
			primary.push({
				label: `Reinstall`,
				id: 'void.updater.reinstall',
				enabled: true,
				tooltip: '',
				class: undefined,
				run: () => {
					const { window } = dom.getActiveWindow();
					window.open('https://grid.millsy.dev/download-beta');
				}
			});
		}

		if (res.action === 'download') {
			primary.push({
				label: `Download`,
				id: 'void.updater.download',
				enabled: true,
				tooltip: '',
				class: undefined,
				run: () => {
					updateService.downloadUpdate();
				}
			});
		}


		if (res.action === 'apply') {
			primary.push({
				label: `Apply`,
				id: 'void.updater.apply',
				enabled: true,
				tooltip: '',
				class: undefined,
				run: () => {
					updateService.applyUpdate();
				}
			});
		}

		if (res.action === 'restart') {
			primary.push({
				label: `Restart`,
				id: 'void.updater.restart',
				enabled: true,
				tooltip: '',
				class: undefined,
				run: () => {
					updateService.quitAndInstall();
				}
			});
		}

		primary.push({
			id: 'void.updater.site',
			enabled: true,
			label: `GRID Site`,
			tooltip: '',
			class: undefined,
			run: () => {
				const { window } = dom.getActiveWindow();
				window.open('https://grid.millsy.dev/');
			}
		});

		actions = {
			primary: primary,
			secondary: [{
				id: 'void.updater.close',
				enabled: true,
				label: `Keep current version`,
				tooltip: '',
				class: undefined,
				run: () => {
					notifController.close();
				}
			}]
		};
	}
	else {
		actions = undefined;
	}

	const notifController = notifService.notify({
		severity: Severity.Info,
		message: message,
		sticky: true,
		progress: actions ? { worked: 0, total: 100 } : undefined,
		actions: actions,
	});

	return notifController;
	// const d = notifController.onDidClose(() => {
	// 	notifyYesUpdate(notifService, res)
	// 	d.dispose()
	// })
};
const notifyErrChecking = (notifService: INotificationService): INotificationHandle => {
	const message = `GRID Error: There was an error checking for updates. If this persists, please get in touch or reinstall GRID [here](https://grid.millsy.dev/download-beta)!`;
	const notifController = notifService.notify({
		severity: Severity.Info,
		message: message,
		sticky: true,
	});
	return notifController;
};


const performGridCheck = async (
	explicit: boolean,
	notifService: INotificationService,
	gridUpdateService: IGridUpdateService,
	metricsService: IMetricsService,
	updateService: IUpdateService,
): Promise<INotificationHandle | null> => {

	const metricsTag = explicit ? 'Manual' : 'Auto';

	metricsService.capture(`GRID Update ${metricsTag}: Checking...`, {});
	const res = await gridUpdateService.check(explicit);
	if (!res) {
		const notifController = notifyErrChecking(notifService);
		metricsService.capture(`GRID Update ${metricsTag}: Error`, { res });
		return notifController;
	}
	else {
		if (res.message) {
			const notifController = notifyUpdate(res, notifService, updateService);
			metricsService.capture(`GRID Update ${metricsTag}: Yes`, { res });
			return notifController;
		}
		else {
			metricsService.capture(`GRID Update ${metricsTag}: No`, { res });
			return null;
		}
	}
};


// Action
let lastNotifController: INotificationHandle | null = null;


registerAction2(class extends Action2 {
	constructor() {
		super({
			f1: true,
			id: 'void.voidCheckUpdate',
			title: localize2('gridCheckUpdate', 'GRID: Check for Updates'),
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const gridUpdateService = accessor.get(IGridUpdateService);
		const notifService = accessor.get(INotificationService);
		const metricsService = accessor.get(IMetricsService);
		const updateService = accessor.get(IUpdateService);

		const currNotifController = lastNotifController;

		const newController = await performGridCheck(true, notifService, gridUpdateService, metricsService, updateService);

		if (newController) {
			currNotifController?.close();
			lastNotifController = newController;
		}
	}
});

// on mount
class GridUpdateWorkbenchContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.void.voidUpdate';
	constructor(
		@IGridUpdateService gridUpdateService: IGridUpdateService,
		@IMetricsService metricsService: IMetricsService,
		@INotificationService notifService: INotificationService,
		@IUpdateService updateService: IUpdateService,
	) {
		super();

		const autoCheck = () => {
			performGridCheck(false, notifService, gridUpdateService, metricsService, updateService);
		};

		// check once 5 seconds after mount
		// check every 3 hours
		const { window } = dom.getActiveWindow();

		const initId = window.setTimeout(() => autoCheck(), 5 * 1000);
		this._register({ dispose: () => window.clearTimeout(initId) });


		const intervalId = window.setInterval(() => autoCheck(), 3 * 60 * 60 * 1000); // every 3 hrs
		this._register({ dispose: () => window.clearInterval(intervalId) });

	}
}
registerWorkbenchContribution2(GridUpdateWorkbenchContribution.ID, GridUpdateWorkbenchContribution, WorkbenchPhase.BlockRestore);
