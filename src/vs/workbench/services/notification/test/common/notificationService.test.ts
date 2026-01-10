/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NotificationService } from '../../common/notificationService.js';
import { Severity, NotificationsFilter, INotificationSource, NeverShowAgainScope } from '../../../../../platform/notification/common/notification.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { timeout } from '../../../../../base/common/async.js';

suite('NotificationService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	let notificationService: NotificationService;
	let storageService: TestStorageService;

	setup(() => {
		storageService = disposables.add(new TestStorageService());
		notificationService = disposables.add(new NotificationService(storageService));
	});

	suite('info notifications', () => {
		test('should show info notification', () => {
			notificationService.info('Test info message');

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 1);
			assert.strictEqual(notifications[0].severity, Severity.Info);
			assert.strictEqual(notifications[0].message.toString(), 'Test info message');
		});

		test('should handle multiple info messages', () => {
			notificationService.info('Message 1');
			notificationService.info('Message 2');
			notificationService.info('Message 3');

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 3);
			assert.ok(notifications.every(n => n.severity === Severity.Info));
		});

		test('should handle array of messages', () => {
			notificationService.info(['Message 1', 'Message 2', 'Message 3']);

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 3);
		});

		test('should handle empty message', () => {
			notificationService.info('');

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 1);
			assert.strictEqual(notifications[0].message.toString(), '');
		});

		test('should handle unicode in messages', () => {
			const unicodeMessage = '你好世界 🌍 Привет';
			notificationService.info(unicodeMessage);

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications[0].message.toString(), unicodeMessage);
		});
	});

	suite('warning notifications', () => {
		test('should show warning notification', () => {
			notificationService.warn('Test warning message');

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 1);
			assert.strictEqual(notifications[0].severity, Severity.Warning);
			assert.strictEqual(notifications[0].message.toString(), 'Test warning message');
		});

		test('should handle array of warning messages', () => {
			notificationService.warn(['Warning 1', 'Warning 2']);

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 2);
			assert.ok(notifications.every(n => n.severity === Severity.Warning));
		});

		test('should handle long warning messages', () => {
			const longMessage = 'Warning: ' + 'x'.repeat(1000);
			notificationService.warn(longMessage);

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications[0].message.toString(), longMessage);
		});
	});

	suite('error notifications', () => {
		test('should show error notification', () => {
			notificationService.error('Test error message');

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 1);
			assert.strictEqual(notifications[0].severity, Severity.Error);
			assert.strictEqual(notifications[0].message.toString(), 'Test error message');
		});

		test('should handle array of error messages', () => {
			notificationService.error(['Error 1', 'Error 2', 'Error 3']);

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 3);
			assert.ok(notifications.every(n => n.severity === Severity.Error));
		});

		test('should handle Error objects', () => {
			const error = new Error('Something went wrong');
			notificationService.error(error.message);

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications[0].message.toString(), 'Something went wrong');
		});
	});

	suite('notify with options', () => {
		test('should create notification with custom options', () => {
			const handle = notificationService.notify({
				severity: Severity.Info,
				message: 'Custom notification'
			});

			assert.ok(handle);
			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 1);
		});

		test('should handle notification with actions', () => {
			const actionCalled = { primary: false, secondary: false };

			const handle = notificationService.notify({
				severity: Severity.Info,
				message: 'Notification with actions',
				actions: {
					primary: [{
						id: 'primary.action',
						label: 'Primary Action',
						run: () => { actionCalled.primary = true; }
					}],
					secondary: [{
						id: 'secondary.action',
						label: 'Secondary Action',
						run: () => { actionCalled.secondary = true; }
					}]
				}
			});

			assert.ok(handle);
			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 1);
			assert.ok(notifications[0].actions?.primary);
			assert.ok(notifications[0].actions?.secondary);
		});

		test('should handle notification with source', () => {
			const source: INotificationSource = {
				id: 'test.source',
				label: 'Test Source'
			};

			notificationService.notify({
				severity: Severity.Info,
				message: 'Notification with source',
				source
			});

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 1);
		});

		test('should handle notification close event', async () => {
			const handle = notificationService.notify({
				severity: Severity.Info,
				message: 'Test notification'
			});

			const closePromise = Event.toPromise(handle.onDidClose);

			handle.close();

			await closePromise;
			assert.ok(true, 'Close event should fire');
		});
	});

	suite('neverShowAgain functionality', () => {
		test('should not show notification when neverShowAgain is set', () => {
			const neverShowId = 'test.neverShow';

			// First notification
			const handle1 = notificationService.notify({
				severity: Severity.Info,
				message: 'First notification',
				neverShowAgain: {
					id: neverShowId,
					scope: NeverShowAgainScope.APPLICATION
				}
			});

			assert.ok(handle1);

			// Simulate "Don't Show Again" action
			storageService.store(neverShowId, true, -1 /* StorageScope.APPLICATION */, 0);

			// Second notification should be no-op
			const handle2 = notificationService.notify({
				severity: Severity.Info,
				message: 'Second notification',
				neverShowAgain: {
					id: neverShowId,
					scope: NeverShowAgainScope.APPLICATION
				}
			});

			// The second handle should be a no-op
			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 1, 'Only first notification should show');
		});

		test('should add "Don\'t Show Again" action', () => {
			const handle = notificationService.notify({
				severity: Severity.Info,
				message: 'Test notification',
				neverShowAgain: {
					id: 'test.neverShow',
					scope: NeverShowAgainScope.APPLICATION,
					isSecondary: false
				}
			});

			const notifications = notificationService.model.notifications;
			assert.ok(notifications[0].actions?.primary);
			assert.ok(notifications[0].actions.primary.length > 0);
		});

		test('should handle different neverShowAgain scopes', () => {
			const scopes = [
				NeverShowAgainScope.APPLICATION,
				NeverShowAgainScope.PROFILE,
				NeverShowAgainScope.WORKSPACE
			];

			for (const scope of scopes) {
				notificationService.notify({
					severity: Severity.Info,
					message: `Notification with ${scope} scope`,
					neverShowAgain: {
						id: `test.${scope}`,
						scope
					}
				});
			}

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 3);
		});

		test('should place neverShowAgain action as secondary when specified', () => {
			const handle = notificationService.notify({
				severity: Severity.Info,
				message: 'Test notification',
				neverShowAgain: {
					id: 'test.secondary',
					scope: NeverShowAgainScope.APPLICATION,
					isSecondary: true
				}
			});

			const notifications = notificationService.model.notifications;
			assert.ok(notifications[0].actions?.secondary);
			assert.ok(notifications[0].actions.secondary.length > 0);
		});
	});

	suite('filters', () => {
		test('should get default filter', () => {
			const filter = notificationService.getFilter();
			assert.strictEqual(filter, NotificationsFilter.OFF);
		});

		test('should set global filter', () => {
			notificationService.setFilter(NotificationsFilter.ERROR);

			const filter = notificationService.getFilter();
			assert.strictEqual(filter, NotificationsFilter.ERROR);
		});

		test('should emit filter change event', async () => {
			const eventPromise = Event.toPromise(notificationService.onDidChangeFilter);

			notificationService.setFilter(NotificationsFilter.ERROR);

			await eventPromise;
			assert.ok(true, 'Filter change event should fire');
		});

		test('should not emit event when filter unchanged', async () => {
			notificationService.setFilter(NotificationsFilter.ERROR);

			let eventFired = false;
			const disposable = notificationService.onDidChangeFilter(() => {
				eventFired = true;
			});

			notificationService.setFilter(NotificationsFilter.ERROR);

			await timeout(50);

			assert.strictEqual(eventFired, false, 'Event should not fire for unchanged filter');
			disposable.dispose();
		});

		test('should persist global filter', () => {
			notificationService.setFilter(NotificationsFilter.ERROR);

			const stored = storageService.get('notifications.doNotDisturbMode', -1);
			assert.strictEqual(stored, 'true');
		});

		test('should set source-specific filter', () => {
			const source: INotificationSource = {
				id: 'test.source',
				label: 'Test Source'
			};

			notificationService.setFilter({
				id: source.id,
				label: source.label,
				filter: NotificationsFilter.ERROR
			});

			const filter = notificationService.getFilter(source);
			assert.strictEqual(filter, NotificationsFilter.ERROR);
		});

		test('should get filters', () => {
			notificationService.setFilter({
				id: 'source1',
				label: 'Source 1',
				filter: NotificationsFilter.ERROR
			});

			notificationService.setFilter({
				id: 'source2',
				label: 'Source 2',
				filter: NotificationsFilter.OFF
			});

			const filters = notificationService.getFilters();
			assert.strictEqual(filters.length, 2);
			assert.ok(filters.some(f => f.id === 'source1'));
			assert.ok(filters.some(f => f.id === 'source2'));
		});

		test('should remove source filter', () => {
			notificationService.setFilter({
				id: 'test.source',
				label: 'Test Source',
				filter: NotificationsFilter.ERROR
			});

			notificationService.removeFilter('test.source');

			const filters = notificationService.getFilters();
			assert.ok(!filters.some(f => f.id === 'test.source'));
		});

		test('should persist source filters', () => {
			notificationService.setFilter({
				id: 'test.source',
				label: 'Test Source',
				filter: NotificationsFilter.ERROR
			});

			const stored = storageService.get('notifications.perSourceDoNotDisturbMode', -1);
			assert.ok(stored);

			const filters = JSON.parse(stored!);
			assert.ok(Array.isArray(filters));
			assert.ok(filters.some((f: any) => f.id === 'test.source'));
		});

		test('should update source filter when label changes', () => {
			const source: INotificationSource = {
				id: 'test.source',
				label: 'Original Label'
			};

			// Set initial filter
			notificationService.setFilter({
				id: source.id,
				label: source.label,
				filter: NotificationsFilter.ERROR
			});

			// Simulate notification with updated label
			notificationService.notify({
				severity: Severity.Info,
				message: 'Test',
				source: {
					id: source.id,
					label: 'Updated Label'
				}
			});

			const filters = notificationService.getFilters();
			const filter = filters.find(f => f.id === source.id);
			assert.strictEqual(filter?.label, 'Updated Label');
		});

		test('should handle filter for unknown source', () => {
			const unknownSource: INotificationSource = {
				id: 'unknown.source',
				label: 'Unknown Source'
			};

			const filter = notificationService.getFilter(unknownSource);
			assert.strictEqual(filter, NotificationsFilter.OFF, 'Unknown source should default to OFF');
		});

		test('should not change filter when setting identical filter', () => {
			notificationService.setFilter({
				id: 'test.source',
				label: 'Test Source',
				filter: NotificationsFilter.ERROR
			});

			const filtersBefore = notificationService.getFilters();

			notificationService.setFilter({
				id: 'test.source',
				label: 'Test Source',
				filter: NotificationsFilter.ERROR
			});

			const filtersAfter = notificationService.getFilters();

			assert.deepStrictEqual(filtersBefore, filtersAfter);
		});
	});

	suite('model integration', () => {
		test('should have notifications model', () => {
			assert.ok(notificationService.model);
		});

		test('should add notifications to model', () => {
			notificationService.info('Test');

			assert.strictEqual(notificationService.model.notifications.length, 1);
		});

		test('should track notification changes', async () => {
			let changeDetected = false;

			const disposable = notificationService.model.onDidChangeNotification(() => {
				changeDetected = true;
			});

			notificationService.info('Test');

			await timeout(10);

			assert.ok(changeDetected, 'Model should notify of notification changes');
			disposable.dispose();
		});

		test('should auto-register sources from notifications', () => {
			const source: INotificationSource = {
				id: 'auto.source',
				label: 'Auto Source'
			};

			notificationService.notify({
				severity: Severity.Info,
				message: 'Test',
				source
			});

			const filters = notificationService.getFilters();
			assert.ok(filters.some(f => f.id === source.id), 'Source should be auto-registered');
		});
	});

	suite('disposal', () => {
		test('should dispose cleanly', () => {
			notificationService.info('Test');

			assert.doesNotThrow(() => {
				notificationService.dispose();
			});
		});

		test('should handle multiple dispose calls', () => {
			notificationService.dispose();

			assert.doesNotThrow(() => {
				notificationService.dispose();
			}, 'Multiple dispose calls should not throw');
		});
	});

	suite('edge cases', () => {
		test('should handle rapid notifications', () => {
			for (let i = 0; i < 100; i++) {
				notificationService.info(`Message ${i}`);
			}

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 100);
		});

		test('should handle mixed severity notifications', () => {
			notificationService.info('Info');
			notificationService.warn('Warning');
			notificationService.error('Error');
			notificationService.info('Info 2');
			notificationService.error('Error 2');

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 5);

			const severities = notifications.map(n => n.severity);
			assert.deepStrictEqual(severities, [
				Severity.Info,
				Severity.Warning,
				Severity.Error,
				Severity.Info,
				Severity.Error
			]);
		});

		test('should handle very long messages', () => {
			const longMessage = 'x'.repeat(10000);
			notificationService.info(longMessage);

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications[0].message.toString().length, 10000);
		});

		test('should handle special characters in source IDs', () => {
			const specialId = 'source.with-dashes_and_underscores.and.dots';

			notificationService.setFilter({
				id: specialId,
				label: 'Special Source',
				filter: NotificationsFilter.ERROR
			});

			const filter = notificationService.getFilter({
				id: specialId,
				label: 'Special Source'
			});

			assert.strictEqual(filter, NotificationsFilter.ERROR);
		});

		test('should handle concurrent filter operations', () => {
			notificationService.setFilter({
				id: 'source1',
				label: 'Source 1',
				filter: NotificationsFilter.ERROR
			});

			notificationService.setFilter({
				id: 'source2',
				label: 'Source 2',
				filter: NotificationsFilter.OFF
			});

			notificationService.removeFilter('source1');

			notificationService.setFilter({
				id: 'source3',
				label: 'Source 3',
				filter: NotificationsFilter.ERROR
			});

			const filters = notificationService.getFilters();
			assert.strictEqual(filters.length, 2);
			assert.ok(!filters.some(f => f.id === 'source1'));
			assert.ok(filters.some(f => f.id === 'source2'));
			assert.ok(filters.some(f => f.id === 'source3'));
		});

		test('should handle empty array of messages', () => {
			notificationService.info([]);

			const notifications = notificationService.model.notifications;
			assert.strictEqual(notifications.length, 0);
		});
	});
});
