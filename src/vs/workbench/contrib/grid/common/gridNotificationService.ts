/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IGridSettingsService } from './gridSettingsService.js';
import {
    GridNotification,
    NotificationPreferences,
    IGridNotificationService,
    getDefaultNotificationPreferences
} from './gridNotificationTypes.js';

export const IGridNotificationServiceId = createDecorator<IGridNotificationService>('gridNotificationService');

const DEFAULT_POLL_INTERVAL_MS = 30000; // 30 seconds

export class GridNotificationService extends Disposable implements IGridNotificationService {
    readonly _serviceBrand: undefined;

    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private lastCheckedNotificationId: string | null = null;

    constructor(
        @INotificationService private readonly notificationService: INotificationService,
        @IGridSettingsService private readonly gridSettingsService: IGridSettingsService
    ) {
        super();
    }

    override dispose(): void {
        this.stopPolling();
        super.dispose();
    }

    async getNotifications(options?: { unreadOnly?: boolean; limit?: number }): Promise<GridNotification[]> {
        const dashboardUrl = this.getDashboardUrl();
        const apiKey = this.getApiKey();

        if (!apiKey) {
            return [];
        }

        try {
            const params = new URLSearchParams();
            if (options?.unreadOnly) {params.set('unreadOnly', 'true');}
            if (options?.limit) {params.set('limit', String(options.limit));}

            const response = await fetch(`${dashboardUrl}/api/notifications?${params}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (!response.ok) {return [];}

            const data = await response.json();
            return (data.notifications || []).map(this.transformNotification);
        } catch (error) {
            console.error('[GridNotificationService] Failed to fetch notifications:', error);
            return [];
        }
    }

    async getUnreadCount(): Promise<number> {
        const dashboardUrl = this.getDashboardUrl();
        const apiKey = this.getApiKey();

        if (!apiKey) {return 0;}

        try {
            const response = await fetch(`${dashboardUrl}/api/notifications?countOnly=true`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (!response.ok) {return 0;}

            const data = await response.json();
            return data.count || 0;
        } catch {
            return 0;
        }
    }

    async markAsRead(notificationIds?: string[]): Promise<void> {
        const dashboardUrl = this.getDashboardUrl();
        const apiKey = this.getApiKey();

        if (!apiKey) {return;}

        try {
            await fetch(`${dashboardUrl}/api/notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notificationIds })
            });
        } catch (error) {
            console.error('[GridNotificationService] Failed to mark as read:', error);
        }
    }

    async getPreferences(): Promise<NotificationPreferences> {
        const dashboardUrl = this.getDashboardUrl();
        const apiKey = this.getApiKey();

        if (!apiKey) {return getDefaultNotificationPreferences();}

        try {
            const response = await fetch(`${dashboardUrl}/api/notifications/preferences`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (!response.ok) {return getDefaultNotificationPreferences();}

            const data = await response.json();
            return data.preferences || getDefaultNotificationPreferences();
        } catch {
            return getDefaultNotificationPreferences();
        }
    }

    async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
        const dashboardUrl = this.getDashboardUrl();
        const apiKey = this.getApiKey();

        if (!apiKey) {return;}

        try {
            await fetch(`${dashboardUrl}/api/notifications/preferences`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(preferences)
            });
        } catch (error) {
            console.error('[GridNotificationService] Failed to update preferences:', error);
        }
    }

    showToast(notification: GridNotification): void {
        const severity = this.getNotificationSeverity(notification.type);

        this.notificationService.notify({
            severity,
            message: notification.title,
            actions: notification.actionUrl ? {
                primary: [{
                    id: 'view',
                    label: 'View',
                    run: () => {
                        // Open in external browser or internal webview
                        if (notification.actionUrl) {
                            globalThis.open(notification.actionUrl, '_blank');
                        }
                        return Promise.resolve();
                    }
                }]
            } : undefined
        });
    }

    startPolling(): void {
        if (this.pollInterval) {return;}

        this.pollInterval = setInterval(async () => {
            await this.checkForNewNotifications();
        }, DEFAULT_POLL_INTERVAL_MS);

        // Also check immediately
        this.checkForNewNotifications();
    }

    stopPolling(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    // ============================================================================
    // Private Helpers
    // ============================================================================

    private async checkForNewNotifications(): Promise<void> {
        const prefs = await this.getPreferences();
        const notifications = await this.getNotifications({ unreadOnly: true, limit: 5 });

        for (const notification of notifications) {
            // Skip if already shown
            if (this.lastCheckedNotificationId === notification.id) {continue;}

            // Check if IDE notifications are enabled for this type
            const prefKey = `${notification.type}_ide` as keyof NotificationPreferences;
            if (prefs[prefKey] === false) {continue;}

            // Show toast
            this.showToast(notification);
        }

        if (notifications.length > 0) {
            this.lastCheckedNotificationId = notifications[0].id;
        }
    }

    private getDashboardUrl(): string {
        return this.gridSettingsService.state.dashboardSettings?.dashboardEndpoint || 'https://grideditor.com';
    }

    private getApiKey(): string | undefined {
        return this.gridSettingsService.state.dashboardSettings?.dashboardApiKey;
    }

    private getNotificationSeverity(type: string): Severity {
        switch (type) {
            case 'system':
            case 'update':
                return Severity.Warning;
            case 'delegation':
            case 'pm':
                return Severity.Info;
            default:
                return Severity.Info;
        }
    }

    private transformNotification(raw: any): GridNotification {
        const r = raw as any;
        return {
            id: r.id,
            type: r.type,
            title: r.title,
            message: r.message,
            actionUrl: r.action_url,
            read: r.read,
            createdAt: new Date(r.created_at).getTime(),
            metadata: r.metadata
        };
    }
}
