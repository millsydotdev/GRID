/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { VSBufferReadableStream, streamToBuffer } from '../../../../base/common/buffer.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import {
	DashboardUser,
	DashboardConfig,
	DashboardApiError,
	dashboardApiEndpoints,
	CreateCheckoutSessionRequest,
	CreateCheckoutSessionResponse,
	Team,
	TeamMember,
	Repository,
} from './dashboardTypes.js';
import { SettingsOfProvider } from './gridSettingsTypes.js';
import { IMcpServersConfiguration } from '../../../../platform/mcp/common/mcpPlatformTypes.js';

export const IDashboardApiClient = createDecorator<IDashboardApiClient>('dashboardApiClient');

export interface IDashboardApiClient {
	readonly _serviceBrand: undefined;

	/**
	 * Login to dashboard with API key
	 */
	login(apiKey: string): Promise<DashboardUser>;

	/**
	 * Validate API key and get user info
	 */
	validateToken(apiKey: string): Promise<DashboardUser>;

	/**
	 * Get user information
	 */
	getUser(): Promise<DashboardUser>;

	/**
	 * Get full configuration from dashboard
	 */
	getConfig(): Promise<DashboardConfig>;

	/**
	 * Update full configuration on dashboard
	 */
	updateConfig(config: DashboardConfig): Promise<void>;

	/**
	 * Get MCP configuration
	 */
	getMcpConfig(): Promise<IMcpServersConfiguration>;

	/**
	 * Update MCP configuration
	 */
	updateMcpConfig(mcpConfig: IMcpServersConfiguration): Promise<void>;

	/**
	 * Get provider settings
	 */
	getProviderSettings(): Promise<SettingsOfProvider>;

	/**
	 * Update provider settings
	 */
	updateProviderSettings(settings: SettingsOfProvider): Promise<void>;

	/**
	 * Get team information
	 */
	getTeam(): Promise<Team>;

	/**
	 * List team members
	 */
	listTeamMembers(): Promise<TeamMember[]>;

	/**
	 * Invite team member
	 */
	inviteTeamMember(email: string, role: 'admin' | 'member'): Promise<void>;

	/**
	 * Remove team member
	 */
	removeTeamMember(memberId: string): Promise<void>;

	/**
	 * List accessible repositories
	 */
	listRepositories(): Promise<Repository[]>;

	/**
	 * Create Stripe checkout session
	 */
	createCheckoutSession(request: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse>;

	/**
	 * Create Stripe customer portal session
	 */
	createPortalSession(): Promise<{ url: string }>;

	/**
	 * Get subscription status
	 */
	getSubscription(): Promise<{ status: string; tier: string; seats?: number }>;

	/**
	 * Set API key for subsequent requests
	 */
	setApiKey(apiKey: string): void;

	/**
	 * Set dashboard endpoint URL
	 */
	setEndpoint(endpoint: string): void;
}

export class DashboardApiClient implements IDashboardApiClient {
	readonly _serviceBrand: undefined;

	private apiKey: string | undefined;
	private endpoint: string = 'https://grideditor.com';

	constructor(
		@IRequestService private readonly requestService: IRequestService,
		@ILogService private readonly logService: ILogService
	) { }

	setApiKey(apiKey: string): void {
		this.apiKey = apiKey;
	}

	setEndpoint(endpoint: string): void {
		this.endpoint = endpoint.replace(/\/$/, ''); // Remove trailing slash
	}

	async login(apiKey: string): Promise<DashboardUser> {
		this.setApiKey(apiKey);
		return this.validateToken(apiKey);
	}

	async validateToken(apiKey: string): Promise<DashboardUser> {
		return this.request<DashboardUser>('POST', dashboardApiEndpoints.validateToken, { apiKey });
	}

	async getUser(): Promise<DashboardUser> {
		return this.request<DashboardUser>('GET', dashboardApiEndpoints.getUser);
	}

	async getConfig(): Promise<DashboardConfig> {
		return this.request<DashboardConfig>('GET', dashboardApiEndpoints.getConfig);
	}

	async updateConfig(config: DashboardConfig): Promise<void> {
		await this.request('PUT', dashboardApiEndpoints.updateConfig, config);
	}

	async getMcpConfig(): Promise<IMcpServersConfiguration> {
		return this.request<IMcpServersConfiguration>('GET', dashboardApiEndpoints.getMcpConfig);
	}

	async updateMcpConfig(mcpConfig: IMcpServersConfiguration): Promise<void> {
		await this.request('PUT', dashboardApiEndpoints.updateMcpConfig, mcpConfig);
	}

	async getProviderSettings(): Promise<SettingsOfProvider> {
		return this.request<SettingsOfProvider>('GET', dashboardApiEndpoints.getProviderSettings);
	}

	async updateProviderSettings(settings: SettingsOfProvider): Promise<void> {
		await this.request('PUT', dashboardApiEndpoints.updateProviderSettings, settings);
	}

	async getTeam(): Promise<Team> {
		return this.request<Team>('GET', dashboardApiEndpoints.getTeam);
	}

	async listTeamMembers(): Promise<TeamMember[]> {
		return this.request<TeamMember[]>('GET', dashboardApiEndpoints.listMembers);
	}

	async inviteTeamMember(email: string, role: 'admin' | 'member'): Promise<void> {
		await this.request('POST', dashboardApiEndpoints.inviteMember, { email, role });
	}

	async removeTeamMember(memberId: string): Promise<void> {
		const url = dashboardApiEndpoints.removeMember.replace(':memberId', memberId);
		await this.request('DELETE', url);
	}

	async listRepositories(): Promise<Repository[]> {
		return this.request<Repository[]>('GET', dashboardApiEndpoints.listRepos);
	}

	async createCheckoutSession(request: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> {
		return this.request<CreateCheckoutSessionResponse>('POST', dashboardApiEndpoints.createCheckoutSession, request);
	}

	async createPortalSession(): Promise<{ url: string }> {
		return this.request<{ url: string }>('POST', dashboardApiEndpoints.createPortalSession);
	}

	async getSubscription(): Promise<{ status: string; tier: string; seats?: number }> {
		return this.request<{ status: string; tier: string; seats?: number }>('GET', dashboardApiEndpoints.getSubscription);
	}

	/**
	 * Generic request method
	 */
	private async request<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
		if (!this.apiKey) {
			throw new Error('Dashboard API key not set. Please configure your API key in settings.');
		}

		const url = `${this.endpoint}${path}`;

		this.logService.debug(`[DashboardApiClient] ${method} ${url}`);

		try {
			const response = await this.requestService.request(
				{
					url,
					type: method,
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.apiKey}`,
					},
					data: body ? JSON.stringify(body) : undefined,
				},
				CancellationToken.None
			);

			if (response.res.statusCode && response.res.statusCode >= 400) {
				const errorText = await this.streamToString(response.stream);
				let error: DashboardApiError;

				try {
					error = JSON.parse(errorText);
				} catch {
					error = {
						error: 'UnknownError',
						message: errorText || `HTTP ${response.res.statusCode}`,
						statusCode: response.res.statusCode,
					};
				}

				this.logService.error(`[DashboardApiClient] Error ${error.statusCode}: ${error.message}`);
				throw new Error(`Dashboard API error: ${error.message}`);
			}

			const responseText = await this.streamToString(response.stream);

			if (!responseText || responseText.trim() === '') {
				return undefined as T;
			}

			return JSON.parse(responseText) as T;
		} catch (error) {
			this.logService.error(`[DashboardApiClient] Request failed: ${error}`);
			throw error;
		}
	}

	/**
	 * Helper to convert stream to string
	 */
	private async streamToString(stream: VSBufferReadableStream): Promise<string> {
		const buffer = await streamToBuffer(stream);
		return buffer.toString();
	}
}

registerSingleton(IDashboardApiClient, DashboardApiClient, InstantiationType.Delayed);
