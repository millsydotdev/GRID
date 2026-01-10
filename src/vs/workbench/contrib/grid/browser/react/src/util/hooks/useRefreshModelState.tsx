/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from 'react'
import { refreshModelState, refreshModelStateListeners, refreshModelProviderListeners } from '../servicesCore.js'
import { RefreshableProviderName } from '../../../../../../../../workbench/contrib/grid/common/gridSettingsTypes.js'
import { RefreshModelStateOfProvider } from '../../../../../../../../workbench/contrib/grid/common/refreshModelService.js'

export const useRefreshModelState = () => {
	const [s, ss] = useState(refreshModelState)
	useEffect(() => {
		ss(refreshModelState)
		refreshModelStateListeners.add(ss)
		return () => { refreshModelStateListeners.delete(ss) }
	}, [ss])
	return s
}

export const useRefreshModelListener = (listener: (providerName: RefreshableProviderName, s: RefreshModelStateOfProvider) => void) => {
	useEffect(() => {
		refreshModelProviderListeners.add(listener)
		return () => { refreshModelProviderListeners.delete(listener) }
	}, [listener, refreshModelProviderListeners])
}
