/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton, InstantiationType } from '../../../../../platform/instantiation/common/extensions.js';
import { IAutocompleteDebouncer, AutocompleteDebouncer } from './autocompleteDebouncer.js';
import { IBracketMatchingService, BracketMatchingService } from './bracketMatchingService.js';
import { IImportDefinitionsService, ImportDefinitionsService } from './importDefinitionsService.js';
import { IRootPathContextService, RootPathContextService } from './rootPathContextService.js';
import { IContextRankingService, ContextRankingService } from './contextRankingService.js';
import { IEnhancedAutocompleteService, EnhancedAutocompleteService } from './enhancedAutocompleteService.js';
import { IStaticContextService, StaticContextService } from './staticContextService.js';
import { IAutocompleteLoggingService, AutocompleteLoggingService } from './autocompleteLoggingService.js';

// Register all autocomplete services as singletons

// Core services
registerSingleton(IAutocompleteDebouncer, AutocompleteDebouncer, InstantiationType.Delayed);
registerSingleton(IBracketMatchingService, BracketMatchingService, InstantiationType.Delayed);
registerSingleton(IImportDefinitionsService, ImportDefinitionsService, InstantiationType.Delayed);
registerSingleton(IRootPathContextService, RootPathContextService, InstantiationType.Delayed);
registerSingleton(IContextRankingService, ContextRankingService, InstantiationType.Delayed);
registerSingleton(IStaticContextService, StaticContextService, InstantiationType.Delayed);
registerSingleton(IAutocompleteLoggingService, AutocompleteLoggingService, InstantiationType.Delayed);

// Enhanced service (coordinates all others)
registerSingleton(IEnhancedAutocompleteService, EnhancedAutocompleteService, InstantiationType.Delayed);
