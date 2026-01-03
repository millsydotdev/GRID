/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Normally you'd want to put these exports in the files that register them, but if you do that you'll get an import order error if you import them in certain cases.
// (importing them runs the whole file to get the ID, causing an import error). I guess it's best practice to separate out IDs, pretty annoying...

export const GRID_CTRL_L_ACTION_ID = 'grid.ctrlLAction';

export const GRID_CTRL_K_ACTION_ID = 'grid.ctrlKAction';

export const GRID_ACCEPT_DIFF_ACTION_ID = 'grid.acceptDiff';

export const GRID_REJECT_DIFF_ACTION_ID = 'grid.rejectDiff';

export const GRID_GOTO_NEXT_DIFF_ACTION_ID = 'grid.goToNextDiff';

export const GRID_GOTO_PREV_DIFF_ACTION_ID = 'grid.goToPrevDiff';

export const GRID_GOTO_NEXT_URI_ACTION_ID = 'grid.goToNextUri';

export const GRID_GOTO_PREV_URI_ACTION_ID = 'grid.goToPrevUri';

export const GRID_ACCEPT_FILE_ACTION_ID = 'grid.acceptFile';

export const GRID_REJECT_FILE_ACTION_ID = 'grid.rejectFile';

export const GRID_ACCEPT_ALL_DIFFS_ACTION_ID = 'grid.acceptAllDiffs';

export const GRID_REJECT_ALL_DIFFS_ACTION_ID = 'grid.rejectAllDiffs';
