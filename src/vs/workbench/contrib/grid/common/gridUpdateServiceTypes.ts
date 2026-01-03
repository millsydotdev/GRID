/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
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
