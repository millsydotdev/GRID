/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

// register inline diffs
import './editCodeService.js';

// register Sidebar pane, state, actions (keybinds, menus) (Ctrl+L)
import './sidebarActions.js';
import './sidebarPane.js';
import './gridStudioPane.js';
import './apiClientPane.js';
import './gridStudioActions.js';
import './projectManagement.contribution.js';
import './composer.contribution.js';

// register quick edit (Ctrl+K)
import './quickEditActions.js';

// register Quick Actions
import './quickActions.js';

// register Autocomplete
import './autocompleteService.js';

// settings pane
import './gridSettingsPane.js';

// register css
import './media/grid.css';

// update (frontend part, also see platform/)
import './gridUpdateActions.js';

import './convertToLLMMessageWorkbenchContrib.js';

// tools
import './toolsService.js';
import './terminalToolService.js';

// register Thread History
import './chatThreadService.js';

// ping - lazy load after startup
import('./metricsPollService.js').catch(() => { });

// helper services
import './helperServices/consistentItemService.js';

// register selection helper
import './gridSelectionHelperWidget.js';

// register tooltip service
import './tooltipService.js';

// register onboarding service - lazy load (only needed on first run)
import('./gridOnboardingService.js').catch(() => { });

// register misc service
import './miscWorkbenchContrib.js';

// remove built-in chat surfaces we don't use
import './hideBuiltinChat.js';

// register file service (for explorer context menu)
import './fileService.js';

// register source control management
import './gridSCMService.js';

// ---------- common (unclear if these actually need to be imported, because they're already imported wherever they're used) ----------

// llmMessage
import '../common/sendLLMMessageService.js';

// gridSettings
import '../common/gridSettingsService.js';

// dashboard integration
import '../common/dashboardApiClient.js';
import '../common/dashboardConfigService.js';

// secret detection
import '../common/secretDetectionService.js';

// memories
import '../common/memoriesService.js';
import './memoriesTrackingContribution.js';

// edit risk scoring
import '../common/editRiskScoringService.js';

// code review
import '../common/codeReviewService.js';
import './codeReviewEditorContribution.js';
import './codeReviewCommands.js';

// codebase query - lazy load (only needed when user invokes codebase query command)
import('./codebaseQueryCommands.js').catch(() => { });

// NL shell parser - lazy load (only needed when NL shell parsing is used)
import('../common/nlShellParserService.js').catch(() => { });

// error detection
import '../common/errorDetectionService.js';
import './errorDetectionEditorContribution.js';
import './errorDetectionCommands.js';

// performance guardrails
import '../common/performanceGuardrailsService.js';

// status bar contribution
import './gridStatusBar.js';

// first-run validation - lazy load (only needed on first run)
import('./firstRunValidation.js').catch(() => { });
import('../common/secretDetectionConfiguration.js').catch(() => { });

// refreshModel
import '../common/refreshModelService.js';

// metrics
import '../common/metricsService.js';

// updates
import '../common/gridUpdateService.js';

// model service
import '../common/gridModelService.js';

// model warm-up service
import '../common/modelWarmupService.js';

// ollama installer service (main-process proxy) - lazy load (only needed when Ollama is accessed)
import('../common/ollamaInstallerService.js').catch(() => { });

// repo indexer
import './repoIndexerService.js';
// repo indexer actions - lazy load (only needed when user invokes indexer actions)
import('./repoIndexerActions.js').catch(() => { });

// Image QA Registry initialization
import './imageQARegistryContribution.js';

// Workspace chat integration
import './workspaceChatIntegration.js';
