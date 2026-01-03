/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { GridCheckUpdateResponse } from './gridUpdateServiceTypes.js';

export interface IGridUpdateService {
	readonly _serviceBrand: undefined;
	check: (explicit: boolean) => Promise<GridCheckUpdateResponse>;
}

export const IGridUpdateService = createDecorator<IGridUpdateService>('GridUpdateService');

// implemented by calling channel
export class GridUpdateService implements IGridUpdateService {
	readonly _serviceBrand: undefined;
	private readonly gridUpdateService: IGridUpdateService;

	constructor(
		@IMainProcessService mainProcessService: IMainProcessService // (only usable on client side)
	) {
		// creates an IPC proxy to use metricsMainService.ts
		this.gridUpdateService = ProxyChannel.toService<IGridUpdateService>(
			mainProcessService.getChannel('grid-channel-update')
		);
	}

	// anything transmitted over a channel must be async even if it looks like it doesn't have to be
	check: IGridUpdateService['check'] = async (explicit) => {
		const res = await this.gridUpdateService.check(explicit);
		return res;
	};
}

registerSingleton(IGridUpdateService, GridUpdateService, InstantiationType.Eager);
