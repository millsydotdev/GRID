/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IDashboardApiClient } from './dashboardApiClient.js';
import {
	DashboardSettings,
	DashboardUser,
	DashboardConfig,
	UserTier,
} from './dashboardTypes.js';
import { IGridSettingsService, GridSettingsState } from './gridSettingsService.js';
import { SettingsOfProvider } from './gridSettingsTypes.js';
import { IMcpServersConfiguration } from '../../../../platform/mcp/common/mcpPlatformTypes.js';

export const IDashboardConfigService = createDecorator<IDashboardConfigService>('dashboardConfigService');

export interface IDashboardConfigService {
	readonly _serviceBrand: undefined;

	/**
	 * Get current dashboard settings
	 */
	readonly dashboardSettings: DashboardSettings;

	/**
	 * Event fired when dashboard settings change
	 */
	readonly onDidChangeDashboardSettings: Event<DashboardSettings>;

	/**
	 * Event fired when sync completes
	 */
	readonly onDidSync: Event<{ success: boolean; error?: string }>;

	/**
	 * Login to dashboard with API key
	 */
	login(apiKey: string): Promise<DashboardUser>;

	/**
	 * Logout from dashboard
	 */
	logout(): Promise<void>;

	/**
	 * Sync configuration from dashboard to local
	 */
	syncFromDashboard(): Promise<void>;

	/**
	 * Push local configuration to dashboard
	 */
	pushToDashboard(): Promise<void>;

	/**
	 * Update dashboard settings
	 */
	updateDashboardSettings(settings: Partial<DashboardSettings>): Promise<void>;

	/**
	 * Check if user is authenticated
	 */
	isAuthenticated(): boolean;

	/**
	 * Get user tier
	 */
	getUserTier(): UserTier;

	/**
	 * Initialize and perform auto-sync if configured
	 */
	initialize(): Promise<void>;
}

export class DashboardConfigService extends Disposable implements IDashboardConfigService {
	readonly _serviceBrand: undefined;

	private readonly _onDidChangeDashboardSettings = this._register(new Emitter<DashboardSettings>());
	readonly onDidChangeDashboardSettings = this._onDidChangeDashboardSettings.event;

	private readonly _onDidSync = this._register(new Emitter<{ success: boolean; error?: string }>());
	readonly onDidSync = this._onDidSync.event;

	private _dashboardSettings: DashboardSettings;
	private _isSyncing = false;
	private _initialized = false;

	constructor(
		@IDashboardApiClient private readonly dashboardApiClient: IDashboardApiClient,
		@IGridSettingsService private readonly gridSettingsService: IGridSettingsService,
		@ILogService private readonly logService: ILogService
	) {
		super();

		// Get dashboard settings from grid settings state
		this._dashboardSettings = this.gridSettingsService.state.dashboardSettings;

		// Listen for changes to dashboard settings in grid settings
		this._register(
			this.gridSettingsService.onDidChangeState(() => {
				const newSettings = this.gridSettingsService.state.dashboardSettings;
				if (JSON.stringify(newSettings) !== JSON.stringify(this._dashboardSettings)) {
					this._dashboardSettings = newSettings;
					this._onDidChangeDashboardSettings.fire(newSettings);
				}
			})
		);
	}

	get dashboardSettings(): DashboardSettings {
		return this._dashboardSettings;
	}

	async initialize(): Promise<void> {
		if (this._initialized) {
			return;
		}

		this._initialized = true;

		// Configure API client with stored settings
		if (this._dashboardSettings.dashboardApiKey) {
			this.dashboardApiClient.setApiKey(this._dashboardSettings.dashboardApiKey);
		}
		this.dashboardApiClient.setEndpoint(this._dashboardSettings.dashboardEndpoint);

		// Auto-sync if configured and authenticated
		if (this._dashboardSettings.autoSyncConfig && this.isAuthenticated()) {
			try {
				await this.syncFromDashboard();
			} catch (error) {
				this.logService.error(`[DashboardConfigService] Auto-sync failed: ${error}`);
			}
		}
	}

	async login(apiKey: string): Promise<DashboardUser> {
		this.logService.info('[DashboardConfigService] Logging in to dashboard...');

		try {
			// Validate API key and get user info
			const user = await this.dashboardApiClient.login(apiKey);

			// Update dashboard settings
			await this.updateDashboardSettings({
				dashboardApiKey: apiKey,
				tier: user.tier,
				userEmail: user.email,
				teamId: user.teamId,
				isTeamAdmin: user.isTeamAdmin,
			});

			this.logService.info(`[DashboardConfigService] Logged in as ${user.email} (${user.tier})`);

			// Auto-sync after login if enabled
			if (this._dashboardSettings.autoSyncConfig) {
				await this.syncFromDashboard();
			}

			return user;
		} catch (error) {
			this.logService.error(`[DashboardConfigService] Login failed: ${error}`);
			throw error;
		}
	}

	async logout(): Promise<void> {
		this.logService.info('[DashboardConfigService] Logging out from dashboard...');

		await this.updateDashboardSettings({
			dashboardApiKey: undefined,
			tier: 'community',
			userEmail: undefined,
			teamId: undefined,
			isTeamAdmin: false,
			configSource: 'local',
		});
	}

	async syncFromDashboard(): Promise<void> {
		if (!this.isAuthenticated()) {
			throw new Error('Not authenticated. Please login first.');
		}

		if (this._isSyncing) {
			this.logService.warn('[DashboardConfigService] Sync already in progress, skipping...');
			return;
		}

		this._isSyncing = true;
		this.logService.info('[DashboardConfigService] Syncing configuration from dashboard...');

		try {
			// Fetch configuration from dashboard
			const dashboardConfig = await this.dashboardApiClient.getConfig();

			// Apply configuration based on tier
			await this.applyDashboardConfig(dashboardConfig);

			// Update last sync timestamp
			await this.updateDashboardSettings({
				lastSyncTimestamp: Date.now(),
			});

			this.logService.info('[DashboardConfigService] Sync completed successfully');
			this._onDidSync.fire({ success: true });
		} catch (error) {
			this.logService.error(`[DashboardConfigService] Sync failed: ${error}`);
			this._onDidSync.fire({ success: false, error: String(error) });
			throw error;
		} finally {
			this._isSyncing = false;
		}
	}

	async pushToDashboard(): Promise<void> {
		if (!this.isAuthenticated()) {
			throw new Error('Not authenticated. Please login first.');
		}

		if (this._isSyncing) {
			this.logService.warn('[DashboardConfigService] Sync already in progress, skipping push...');
			return;
		}

		this._isSyncing = true;
		this.logService.info('[DashboardConfigService] Pushing configuration to dashboard...');

		try {
			const currentState = this.gridSettingsService.state;

			// Create dashboard config from current state
			const dashboardConfig: DashboardConfig = {
				providerSettings: currentState.settingsOfProvider,
				mcpConfig: currentState.mcpConfig || { servers: {}, inputs: [] },
				updatedAt: Date.now(),
				version: 1,
			};

			// Push to dashboard
			await this.dashboardApiClient.updateConfig(dashboardConfig);

			this.logService.info('[DashboardConfigService] Push completed successfully');
			this._onDidSync.fire({ success: true });
		} catch (error) {
			this.logService.error(`[DashboardConfigService] Push failed: ${error}`);
			this._onDidSync.fire({ success: false, error: String(error) });
			throw error;
		} finally {
			this._isSyncing = false;
		}
	}

	async updateDashboardSettings(settings: Partial<DashboardSettings>): Promise<void> {
		const newSettings: DashboardSettings = {
			...this._dashboardSettings,
			...settings,
		};

		// Update in grid settings service
		await this.gridSettingsService.setDashboardSettings(newSettings);

		// Update API client if API key or endpoint changed
		if (settings.dashboardApiKey) {
			this.dashboardApiClient.setApiKey(settings.dashboardApiKey);
		}
		if (settings.dashboardEndpoint) {
			this.dashboardApiClient.setEndpoint(settings.dashboardEndpoint);
		}
	}

	isAuthenticated(): boolean {
		return !!this._dashboardSettings.dashboardApiKey;
	}

	getUserTier(): UserTier {
		return this._dashboardSettings.tier;
	}

	/**
	 * Apply dashboard configuration based on user tier
	 */
	private async applyDashboardConfig(dashboardConfig: DashboardConfig): Promise<void> {
		const tier = this._dashboardSettings.tier;
		const currentState = this.gridSettingsService.state;

		this.logService.debug(`[DashboardConfigService] Applying config for tier: ${tier}`);

		switch (tier) {
			case 'community':
				// Community: Use local config only (no sync)
				this.logService.debug('[DashboardConfigService] Community tier: Using local config only');
				await this.updateDashboardSettings({ configSource: 'local' });
				break;

			case 'pro':
				// Pro: Merge dashboard config with local (local overrides allowed)
				this.logService.debug('[DashboardConfigService] Pro tier: Merging dashboard and local config');
				await this.mergeConfig(dashboardConfig, currentState);
				await this.updateDashboardSettings({ configSource: 'merged' });
				break;

			case 'enterprise':
				// Enterprise: Dashboard config only (read-only, no local overrides)
				this.logService.debug('[DashboardConfigService] Enterprise tier: Using dashboard config only');
				await this.replaceConfig(dashboardConfig);
				await this.updateDashboardSettings({ configSource: 'dashboard' });
				break;
		}
	}

	/**
	 * Merge dashboard config with local config (Pro tier)
	 * Dashboard config takes precedence, but local additions are preserved
	 */
	private async mergeConfig(dashboardConfig: DashboardConfig, localState: GridSettingsState): Promise<void> {
		// Merge provider settings: dashboard overrides local for filled-in providers
		const mergedProviderSettings: SettingsOfProvider = { ...localState.settingsOfProvider };

		for (const providerName of Object.keys(dashboardConfig.providerSettings) as Array<keyof SettingsOfProvider>) {
			const dashboardProvider = dashboardConfig.providerSettings[providerName];
			if (dashboardProvider._didFillInProviderSettings) {
				(mergedProviderSettings as any)[providerName] = dashboardProvider;
			}
		}

		// Merge MCP config: combine servers from both
		const mergedMcpConfig: IMcpServersConfiguration = {
			servers: {
				...(localState.mcpConfig?.servers || {}),
				...(dashboardConfig.mcpConfig?.servers || {}),
			},
			inputs: [
				...(localState.mcpConfig?.inputs || []),
				...(dashboardConfig.mcpConfig?.inputs || []),
			],
		};

		// Apply merged config
		await this.gridSettingsService.dangerousSetState({
			...localState,
			settingsOfProvider: mergedProviderSettings,
			mcpConfig: mergedMcpConfig,
		});
	}

	/**
	 * Replace local config with dashboard config (Enterprise tier)
	 */
	private async replaceConfig(dashboardConfig: DashboardConfig): Promise<void> {
		const currentState = this.gridSettingsService.state;

		// Replace provider settings and MCP config entirely
		await this.gridSettingsService.dangerousSetState({
			...currentState,
			settingsOfProvider: dashboardConfig.providerSettings,
			mcpConfig: dashboardConfig.mcpConfig,
		});
	}
}

registerSingleton(IDashboardConfigService, DashboardConfigService, InstantiationType.Delayed);
