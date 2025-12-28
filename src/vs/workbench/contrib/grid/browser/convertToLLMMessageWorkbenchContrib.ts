/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import {
	IWorkbenchContribution,
	registerWorkbenchContribution2,
	WorkbenchPhase,
} from '../../../common/contributions.js';
import { IGridModelService } from '../common/gridModelService.js';

class ConvertContribWorkbenchContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.grid.convertcontrib';
	_serviceBrand: undefined;

	constructor(
		@IGridModelService private readonly gridModelService: IGridModelService,
		@IWorkspaceContextService private readonly workspaceContext: IWorkspaceContextService
	) {
		super();

		const initializeURI = (uri: URI) => {
			this.workspaceContext.getWorkspace();
			const gridRulesURI = URI.joinPath(uri, '.gridrules');
			this.gridModelService.initializeModel(gridRulesURI);
		};

		// call
		this._register(
			this.workspaceContext.onDidChangeWorkspaceFolders((e) => {
				[...e.changed, ...e.added].forEach((w) => {
					initializeURI(w.uri);
				});
			})
		);
		this.workspaceContext.getWorkspace().folders.forEach((w) => {
			initializeURI(w.uri);
		});
	}
}

registerWorkbenchContribution2(
	ConvertContribWorkbenchContribution.ID,
	ConvertContribWorkbenchContribution,
	WorkbenchPhase.BlockRestore
);
