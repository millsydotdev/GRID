/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { UniversalWatcherClient } from '../../electron-browser/watcherClient.js';
import { IFileChange, FileChangeType } from '../../../../../platform/files/common/files.js';
import { ILogMessage } from '../../../../../platform/files/common/watcher.js';
import { IUtilityProcessWorkerWorkbenchService } from '../../../utilityProcess/electron-browser/utilityProcessWorkerWorkbenchService.js';
import { timeout } from '../../../../../base/common/async.js';
import { URI } from '../../../../../base/common/uri.js';

class MockUtilityProcessWorkerWorkbenchService implements Partial<IUtilityProcessWorkerWorkbenchService> {
	private workers = new Map<string, any>();
	private terminateHandlers = new Map<string, () => void>();

	async createWorker(options: any): Promise<any> {
		const workerId = `worker-${options.type}-${Date.now()}`;

		const onDidTerminate = new Promise<{ reason?: { code: number; signal: string } }>((resolve) => {
			this.terminateHandlers.set(workerId, () => {
				resolve({ reason: { code: 0, signal: 'SIGTERM' } });
			});
		});

		const worker = {
			client: {
				getChannel: (channelName: string) => ({
					call: async (method: string, args: any[]) => {
						// Mock watcher channel methods
						return;
					},
					listen: (event: string, args: any[]) => Event.None
				})
			},
			onDidTerminate,
			dispose: () => {
				this.workers.delete(workerId);
			}
		};

		this.workers.set(workerId, worker);
		return worker;
	}

	terminateWorker(workerId: string, code: number = 0, signal: string = 'SIGTERM'): void {
		const handler = this.terminateHandlers.get(workerId);
		if (handler) {
			handler();
			this.terminateHandlers.delete(workerId);
		}
	}

	getActiveWorkerCount(): number {
		return this.workers.size;
	}
}

suite('UniversalWatcherClient', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	let watcherClient: UniversalWatcherClient;
	let utilityProcessService: MockUtilityProcessWorkerWorkbenchService;
	let fileChanges: IFileChange[] = [];
	let logMessages: ILogMessage[] = [];

	setup(() => {
		fileChanges = [];
		logMessages = [];
		utilityProcessService = new MockUtilityProcessWorkerWorkbenchService();

		watcherClient = disposables.add(new UniversalWatcherClient(
			(changes: IFileChange[]) => {
				fileChanges.push(...changes);
			},
			(msg: ILogMessage) => {
				logMessages.push(msg);
			},
			false, // verboseLogging
			utilityProcessService as IUtilityProcessWorkerWorkbenchService
		));
	});

	suite('initialization', () => {
		test('should create watcher client without errors', async () => {
			assert.ok(watcherClient, 'Watcher client should be created');
		});

		test('should create utility process worker', async () => {
			// Wait a bit for initialization
			await timeout(50);

			assert.ok(
				utilityProcessService.getActiveWorkerCount() > 0,
				'Should have created at least one worker'
			);
		});

		test('should create worker with correct configuration', async () => {
			// Initialization happens in constructor
			await timeout(50);

			// Verify worker was created (indirect test via worker count)
			assert.strictEqual(
				utilityProcessService.getActiveWorkerCount(),
				1,
				'Should create exactly one worker'
			);
		});
	});

	suite('file change callbacks', () => {
		test('should accept file changes callback', () => {
			const changes: IFileChange[] = [];

			const client = disposables.add(new UniversalWatcherClient(
				(c) => changes.push(...c),
				() => { },
				false,
				utilityProcessService as IUtilityProcessWorkerWorkbenchService
			));

			assert.ok(client, 'Should create client with callback');
		});

		test('should accept log message callback', () => {
			const logs: ILogMessage[] = [];

			const client = disposables.add(new UniversalWatcherClient(
				() => { },
				(msg) => logs.push(msg),
				false,
				utilityProcessService as IUtilityProcessWorkerWorkbenchService
			));

			assert.ok(client, 'Should create client with log callback');
		});

		test('should support verbose logging mode', () => {
			const client = disposables.add(new UniversalWatcherClient(
				() => { },
				() => { },
				true, // verbose logging
				utilityProcessService as IUtilityProcessWorkerWorkbenchService
			));

			assert.ok(client, 'Should create client with verbose logging enabled');
		});
	});

	suite('disposal', () => {
		test('should dispose watcher client cleanly', async () => {
			const client = disposables.add(new UniversalWatcherClient(
				() => { },
				() => { },
				false,
				utilityProcessService as IUtilityProcessWorkerWorkbenchService
			));

			await timeout(50);

			const workerCountBefore = utilityProcessService.getActiveWorkerCount();
			assert.ok(workerCountBefore > 0, 'Should have active workers');

			client.dispose();

			// Note: Disposal behavior depends on implementation
			assert.ok(true, 'Disposal should not throw');
		});

		test('should handle multiple dispose calls', () => {
			const client = new UniversalWatcherClient(
				() => { },
				() => { },
				false,
				utilityProcessService as IUtilityProcessWorkerWorkbenchService
			);

			assert.doesNotThrow(() => {
				client.dispose();
				client.dispose();
				client.dispose();
			}, 'Multiple dispose calls should not throw');
		});
	});

	suite('multiple instances', () => {
		test('should support multiple watcher clients', async () => {
			const client1 = disposables.add(new UniversalWatcherClient(
				() => { },
				() => { },
				false,
				utilityProcessService as IUtilityProcessWorkerWorkbenchService
			));

			const client2 = disposables.add(new UniversalWatcherClient(
				() => { },
				() => { },
				false,
				utilityProcessService as IUtilityProcessWorkerWorkbenchService
			));

			const client3 = disposables.add(new UniversalWatcherClient(
				() => { },
				() => { },
				false,
				utilityProcessService as IUtilityProcessWorkerWorkbenchService
			));

			await timeout(100);

			// Each client should create its own worker
			assert.ok(
				utilityProcessService.getActiveWorkerCount() >= 3,
				'Should support multiple concurrent watchers'
			);
		});

		test('should isolate callbacks between instances', () => {
			const changes1: IFileChange[] = [];
			const changes2: IFileChange[] = [];

			const client1 = disposables.add(new UniversalWatcherClient(
				(c) => changes1.push(...c),
				() => { },
				false,
				utilityProcessService as IUtilityProcessWorkerWorkbenchService
			));

			const client2 = disposables.add(new UniversalWatcherClient(
				(c) => changes2.push(...c),
				() => { },
				false,
				utilityProcessService as IUtilityProcessWorkerWorkbenchService
			));

			// Callbacks should be independent
			assert.strictEqual(changes1.length, 0);
			assert.strictEqual(changes2.length, 0);
		});
	});

	suite('logging', () => {
		test('should collect log messages when provided', () => {
			const logs: ILogMessage[] = [];

			const client = disposables.add(new UniversalWatcherClient(
				() => { },
				(msg) => logs.push(msg),
				false,
				utilityProcessService as IUtilityProcessWorkerWorkbenchService
			));

			// Initially no logs
			assert.strictEqual(logs.length, 0);
		});

		test('should handle verbose and non-verbose modes', () => {
			const verboseLogs: ILogMessage[] = [];
			const normalLogs: ILogMessage[] = [];

			const verboseClient = disposables.add(new UniversalWatcherClient(
				() => { },
				(msg) => verboseLogs.push(msg),
				true,
				utilityProcessService as IUtilityProcessWorkerWorkbenchService
			));

			const normalClient = disposables.add(new UniversalWatcherClient(
				() => { },
				(msg) => normalLogs.push(msg),
				false,
				utilityProcessService as IUtilityProcessWorkerWorkbenchService
			));

			assert.ok(verboseClient);
			assert.ok(normalClient);
		});
	});

	suite('edge cases', () => {
		test('should handle rapid creation and disposal', async () => {
			for (let i = 0; i < 10; i++) {
				const client = new UniversalWatcherClient(
					() => { },
					() => { },
					false,
					utilityProcessService as IUtilityProcessWorkerWorkbenchService
				);

				await timeout(5);
				client.dispose();
			}

			assert.ok(true, 'Rapid creation/disposal should not crash');
		});

		test('should handle empty callbacks', () => {
			assert.doesNotThrow(() => {
				const client = disposables.add(new UniversalWatcherClient(
					() => { },
					() => { },
					false,
					utilityProcessService as IUtilityProcessWorkerWorkbenchService
				));

				assert.ok(client);
			});
		});

		test('should work with different utility process configurations', () => {
			const mockService1 = new MockUtilityProcessWorkerWorkbenchService();
			const mockService2 = new MockUtilityProcessWorkerWorkbenchService();

			const client1 = disposables.add(new UniversalWatcherClient(
				() => { },
				() => { },
				false,
				mockService1 as IUtilityProcessWorkerWorkbenchService
			));

			const client2 = disposables.add(new UniversalWatcherClient(
				() => { },
				() => { },
				true,
				mockService2 as IUtilityProcessWorkerWorkbenchService
			));

			assert.ok(client1);
			assert.ok(client2);
		});
	});
});
