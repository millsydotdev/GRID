/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect, useCallback } from 'react'
import { useAccessor } from '../servicesCore.js'
import { DisposableStore } from '../../../../../../../../base/common/lifecycle.js'
import { StorageScope } from '../../../../../../../../platform/storage/common/storage.js'
import { OPT_OUT_KEY } from '../../../../../common/storageKeys.js'

export const useIsOptedOut = () => {
	const accessor = useAccessor()
	const storageService = accessor.get('IStorageService')

	const getVal = useCallback(() => {
		return storageService.getBoolean(OPT_OUT_KEY, StorageScope.APPLICATION, false)
	}, [storageService])

	const [s, ss] = useState(getVal())

	useEffect(() => {
		const disposables = new DisposableStore();
		const d = storageService.onDidChangeValue(StorageScope.APPLICATION, OPT_OUT_KEY, disposables)(e => {
			ss(getVal())
		})
		disposables.add(d)
		return () => disposables.clear()
	}, [storageService, getVal])

	return s
}
