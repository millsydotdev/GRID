/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IEnvironmentMainService } from '../../../../platform/environment/electron-main/environmentMainService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUpdateService, StateType } from '../../../../platform/update/common/update.js';
import { IGridUpdateService } from '../common/gridUpdateService.js';
import { GridCheckUpdateResponse } from '../common/gridUpdateServiceTypes.js';
import { IRequestService, asJson } from '../../../../platform/request/common/request.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';

export class GridMainUpdateService extends Disposable implements IGridUpdateService {
	_serviceBrand: undefined;

	constructor(
		@IProductService private readonly _productService: IProductService,
		@IEnvironmentMainService private readonly _envMainService: IEnvironmentMainService,
		@IUpdateService private readonly _updateService: IUpdateService,
		@IRequestService private readonly _requestService: IRequestService,
		@IConfigurationService private readonly _configurationService: IConfigurationService
	) {
		super();
	}

	async check(explicit: boolean): Promise<GridCheckUpdateResponse> {
		const isDevMode = !this._envMainService.isBuilt; // found in abstractUpdateService.ts

		if (isDevMode) {
			return { message: null } as const;
		}

		// if disabled and not explicitly checking, return early
		if (this._updateService.state.type === StateType.Disabled) {
			if (!explicit) {return { message: null } as const;}
		}

		this._updateService.checkForUpdates(false); // implicity check, then handle result ourselves

		console.log('updateState', this._updateService.state);

		if (this._updateService.state.type === StateType.Uninitialized) {
			// The update service hasn't been initialized yet
			return {
				message: explicit ? 'Checking for updates soon...' : null,
				action: explicit ? 'reinstall' : undefined,
			} as const;
		}

		if (this._updateService.state.type === StateType.Idle) {
			// No updates currently available
			return { message: explicit ? 'No updates found!' : null, action: explicit ? 'reinstall' : undefined } as const;
		}

		if (this._updateService.state.type === StateType.CheckingForUpdates) {
			// Currently checking for updates
			return { message: explicit ? 'Checking for updates...' : null } as const;
		}

		if (this._updateService.state.type === StateType.AvailableForDownload) {
			// Update available but requires manual download (mainly for Linux)
			return { message: 'A new update is available!', action: 'download' } as const;
		}

		if (this._updateService.state.type === StateType.Downloading) {
			// Update is currently being downloaded
			return { message: explicit ? 'Currently downloading update...' : null } as const;
		}

		if (this._updateService.state.type === StateType.Downloaded) {
			// Update has been downloaded but not yet ready
			return { message: explicit ? 'An update is ready to be applied!' : null, action: 'apply' } as const;
		}

		if (this._updateService.state.type === StateType.Updating) {
			// Update is being applied
			return { message: explicit ? 'Applying update...' : null } as const;
		}

		if (this._updateService.state.type === StateType.Ready) {
			// Update is ready
			return { message: 'Restart GRID to update!', action: 'restart' } as const;
		}

		if (this._updateService.state.type === StateType.Disabled) {
			return await this._manualCheckGHTagIfDisabled(explicit);
		}
		return null;
	}

	private async _manualCheckGHTagIfDisabled(explicit: boolean): Promise<GridCheckUpdateResponse> {
		try {
			// Get channel from configuration
			const channel = this._configurationService.getValue<string>('update.updateChannel') || 'stable';

			// Determine URL based on channel
			// Stable: /releases/latest
			// Beta/Nightly: /releases?per_page=1 (as per plan)
			const url = channel === 'stable'
				? 'https://api.github.com/repos/GRID-Editor/GRID/releases/latest'
				: 'https://api.github.com/repos/GRID-Editor/GRID/releases?per_page=1';

			const context = await this._requestService.request({
				url,
				headers: {
					'User-Agent': 'grid-client'
				}
			}, CancellationToken.None);

			let data: unknown;
			if (context.res.statusCode === 200) {
				const json = await asJson(context);
				// If strictly stable, it's an object. If beta/nightly (list), take first item.
				if (Array.isArray(json)) {
					data = json[0];
				} else {
					data = json;
				}
			} else {
				throw new Error(`Non-200 status code: ${context.res.statusCode}`);
			}

			const version = (data as any).tag_name;

			const myVersion = this._productService.version;
			const latestVersion = version;

			const isUpToDate = myVersion === latestVersion; // only makes sense if response.ok

			let message: string | null;
			let action: 'reinstall' | undefined;

			// explicit
			if (explicit) {
				if (!isUpToDate) {
					message =
						`A new ${channel} version of GRID is available! Please reinstall (auto-updates are disabled on this OS) - it only takes a second!`;
					action = 'reinstall';
				} else {
					message = 'GRID is up-to-date!';
				}
			}
			// not explicit
			else {
				if (!isUpToDate) {
					message =
						`A new ${channel} version of GRID is available! Please reinstall (auto-updates are disabled on this OS) - it only takes a second!`;
					action = 'reinstall';
				} else {
					message = null;
				}
			}
			return { message, action } as const;
		} catch (e) {
			if (explicit) {
				return {
					message: `An error occurred when fetching the latest GitHub release tag: ${e}. Please try again in ~5 minutes.`,
					action: 'reinstall',
				};
			} else {
				return { message: null } as const;
			}
		}
	}
}
