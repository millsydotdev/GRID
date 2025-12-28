/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { mountFnGenerator } from '../util/mountFnGenerator.js'
import { GridCommandBarMain } from './GridCommandBar.js'
import { GridSelectionHelperMain } from './GridSelectionHelper.js'

export const mountGridCommandBar = mountFnGenerator(GridCommandBarMain)

export const mountGridSelectionHelper = mountFnGenerator(GridSelectionHelperMain)

