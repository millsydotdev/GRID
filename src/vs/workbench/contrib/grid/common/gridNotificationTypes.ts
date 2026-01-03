/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Notification Types for GRID IDE
 * These types mirror the website's notification system for cross-platform consistency.
 */

export type NotificationType = 'delegation' | 'update' | 'chat' | 'sync' | 'pm' | 'system';

export interface GridNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    read: boolean;
    createdAt: number; // Unix timestamp
    metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
    // Delegation notifications
    delegation_email: boolean;
    delegation_web: boolean;
    delegation_ide: boolean;

    // Update notifications
    update_email: boolean;
    update_web: boolean;
    update_ide: boolean;
    update_auto_download: boolean;

    // Chat notifications (@mentions)
    chat_email: boolean;
    chat_web: boolean;
    chat_ide: boolean;

    // Sync notifications
    sync_email: boolean;
    sync_web: boolean;
    sync_ide: boolean;

    // Project Management notifications
    pm_email: boolean;
    pm_web: boolean;
    pm_ide: boolean;

    // System-wide
    email_digest_enabled: boolean;
    email_digest_frequency: 'daily' | 'weekly' | 'instant';
}

export interface IGridNotificationService {
    readonly _serviceBrand: undefined;

    /**
     * Get all notifications for the current user
     */
    getNotifications(options?: { unreadOnly?: boolean; limit?: number }): Promise<GridNotification[]>;

    /**
     * Get unread notification count
     */
    getUnreadCount(): Promise<number>;

    /**
     * Mark notifications as read
     */
    markAsRead(notificationIds?: string[]): Promise<void>;

    /**
     * Get notification preferences
     */
    getPreferences(): Promise<NotificationPreferences>;

    /**
     * Update notification preferences
     */
    updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void>;

    /**
     * Show a toast notification in the IDE
     */
    showToast(notification: GridNotification): void;

    /**
     * Start polling for new notifications
     */
    startPolling(): void;

    /**
     * Stop polling for notifications
     */
    stopPolling(): void;
}

/**
 * Default notification preferences for new users
 */
export function getDefaultNotificationPreferences(): NotificationPreferences {
    return {
        delegation_email: true,
        delegation_web: true,
        delegation_ide: true,
        update_email: false,
        update_web: true,
        update_ide: true,
        update_auto_download: false,
        chat_email: true,
        chat_web: true,
        chat_ide: true,
        sync_email: false,
        sync_web: true,
        sync_ide: true,
        pm_email: true,
        pm_web: true,
        pm_ide: true,
        email_digest_enabled: false,
        email_digest_frequency: 'daily'
    };
}
