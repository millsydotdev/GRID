/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

export type GridCheckUpdateResponse =
	| {
			message: string;
			action?: 'reinstall' | 'restart' | 'download' | 'apply';
	  }
	| {
			message: null;
			actions?: undefined;
	  }
	| null;
