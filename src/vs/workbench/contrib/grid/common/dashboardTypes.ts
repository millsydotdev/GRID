/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { SettingsOfProvider } from './gridSettingsTypes.js';
import { IMcpServersConfiguration } from '../../../../platform/mcp/common/mcpPlatformTypes.js';

/**
 * User tier determines feature availability and configuration management
 */
export type UserTier = 'community' | 'pro' | 'enterprise';

/**
 * Configuration source determines where settings are loaded from
 */
export type ConfigSource = 'local' | 'dashboard' | 'merged';

/**
 * Dashboard settings stored in GridSettingsState
 */
export interface DashboardSettings {
	/** User's current tier */
	tier: UserTier;

	/** API key for dashboard authentication (encrypted in storage) */
	dashboardApiKey?: string;

	/** Dashboard endpoint URL */
	dashboardEndpoint: string;

	/** Whether to automatically sync configuration from dashboard */
	autoSyncConfig: boolean;

	/** Current configuration source */
	configSource: ConfigSource;

	/** Last successful sync timestamp */
	lastSyncTimestamp?: number;

	/** User email (fetched from dashboard) */
	userEmail?: string;

	/** Team ID for enterprise users */
	teamId?: string;

	/** Whether user is team admin */
	isTeamAdmin?: boolean;
}

export const defaultDashboardSettings: DashboardSettings = {
	tier: 'community',
	dashboardApiKey: undefined,
	dashboardEndpoint: 'https://grideditor.com',
	autoSyncConfig: true,
	configSource: 'local',
	lastSyncTimestamp: undefined,
	userEmail: undefined,
	teamId: undefined,
	isTeamAdmin: false,
};

/**
 * Dashboard user info returned from /api/user endpoint
 */
export interface DashboardUser {
	id: string;
	email: string;
	tier: UserTier;
	teamId?: string;
	isTeamAdmin?: boolean;
	stripeCustomerId?: string;
	subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trialing';
}

/**
 * Dashboard configuration returned from /api/config endpoints
 */
export interface DashboardConfig {
	/** Provider settings (API keys, endpoints, models) */
	providerSettings: SettingsOfProvider;

	/** MCP.json configuration */
	mcpConfig: IMcpServersConfiguration;

	/** Last updated timestamp */
	updatedAt: number;

	/** Configuration version for conflict resolution */
	version: number;
}

/**
 * Stripe subscription tier metadata
 */
export interface SubscriptionTier {
	tier: UserTier;
	priceId: string;
	price: number;
	currency: string;
	interval: 'month' | 'year';
	features: string[];
}

/**
 * Subscription tiers for automated billing
 */
export const subscriptionTiers: Record<UserTier, SubscriptionTier | null> = {
	community: null, // Free tier
	pro: {
		tier: 'pro',
		priceId: 'price_grid_pro_monthly',
		price: 12,
		currency: 'GBP',
		interval: 'month',
		features: [
			'Dashboard-managed configuration',
			'Team management (up to 5 members)',
			'Shared MCP.json and API keys',
			'Priority support',
			'Multiple repository access',
		],
	},
	enterprise: {
		tier: 'enterprise',
		priceId: 'price_grid_enterprise_seat',
		price: 25,
		currency: 'GBP',
		interval: 'month',
		features: [
			'All Pro features',
			'Unlimited team members',
			'Seat-based billing',
			'SSO integration',
			'Audit logs',
			'SLA support',
			'Custom integrations',
		],
	},
};

/**
 * Dashboard API endpoints
 */
export const dashboardApiEndpoints = {
	// Authentication
	login: '/api/auth/login',
	logout: '/api/auth/logout',
	validateToken: '/api/auth/validate',

	// User management
	getUser: '/api/user',
	updateUser: '/api/user',
	deleteUser: '/api/user',

	// Configuration
	getConfig: '/api/config',
	updateConfig: '/api/config',
	getMcpConfig: '/api/config/mcp',
	updateMcpConfig: '/api/config/mcp',
	getProviderSettings: '/api/config/providers',
	updateProviderSettings: '/api/config/providers',

	// Teams (Pro/Enterprise)
	getTeam: '/api/team',
	updateTeam: '/api/team',
	listMembers: '/api/team/members',
	inviteMember: '/api/team/members/invite',
	removeMember: '/api/team/members/:memberId',

	// Repositories
	listRepos: '/api/repos',
	getRepo: '/api/repos/:repoId',
	authorizeClone: '/api/repos/clone',

	// Billing (Stripe)
	createCheckoutSession: '/api/billing/checkout',
	createPortalSession: '/api/billing/portal',
	getSubscription: '/api/billing/subscription',
	cancelSubscription: '/api/billing/subscription/cancel',
	updateSubscription: '/api/billing/subscription/update',
} as const;

/**
 * Dashboard API error response
 */
export interface DashboardApiError {
	error: string;
	message: string;
	statusCode: number;
}

/**
 * Stripe checkout session request
 */
export interface CreateCheckoutSessionRequest {
	tier: 'pro' | 'enterprise';
	seats?: number; // For enterprise only
	successUrl: string;
	cancelUrl: string;
}

/**
 * Stripe checkout session response
 */
export interface CreateCheckoutSessionResponse {
	sessionId: string;
	url: string;
}

/**
 * Team member info
 */
export interface TeamMember {
	id: string;
	email: string;
	role: 'admin' | 'member';
	joinedAt: number;
}

/**
 * Team info
 */
export interface Team {
	id: string;
	name: string;
	ownerId: string;
	members: TeamMember[];
	createdAt: number;
}

/**
 * Repository info
 */
export interface Repository {
	id: string;
	name: string;
	url: string;
	owner: string;
	isPrivate: boolean;
	accessLevel: 'read' | 'write' | 'admin';
}
