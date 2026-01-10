/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from 'react'
import { chatThreadsState, chatThreadsStateListeners } from '../servicesCore.js'

export const useChatThreadsState = () => {
	const [s, ss] = useState(chatThreadsState)
	useEffect(() => {
		ss(chatThreadsState)
		chatThreadsStateListeners.add(ss)
		return () => { chatThreadsStateListeners.delete(ss) }
	}, [ss])
	return s
}
