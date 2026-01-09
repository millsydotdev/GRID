/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export * from './messenger.js';
export * from './aiService.js';
export * from './terminalSecurity.js';
export * from './fileIndexing.js';

import { ToAIServiceProtocol, FromAIServiceProtocol } from './aiService.js';
import { ToSecurityServiceProtocol, FromSecurityServiceProtocol } from './terminalSecurity.js';
import { ToIndexingServiceProtocol, FromIndexingServiceProtocol } from './fileIndexing.js';

/**
 * Combined protocol types for all GRID services
 */

// AI Service
export type AIServiceSendProtocol = ToAIServiceProtocol;
export type AIServiceReceiveProtocol = FromAIServiceProtocol;

// Security Service
export type SecurityServiceSendProtocol = ToSecurityServiceProtocol;
export type SecurityServiceReceiveProtocol = FromSecurityServiceProtocol;

// Indexing Service
export type IndexingServiceSendProtocol = ToIndexingServiceProtocol;
export type IndexingServiceReceiveProtocol = FromIndexingServiceProtocol;
