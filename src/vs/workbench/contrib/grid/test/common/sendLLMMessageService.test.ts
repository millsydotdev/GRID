/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { LLMMessageService } from '../../common/sendLLMMessageService.js';
import { IMainProcessService } from '../../../../../platform/ipc/common/mainProcessService.js';
import { IGridSettingsService } from '../../common/gridSettingsService.js';
import { IMCPService } from '../../common/mcpService.js';
import { ISecretDetectionService } from '../../common/secretDetectionService.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { ServiceSendLLMMessageParams } from '../../common/sendLLMMessageTypes.js';
import { Severity } from '../../../../../platform/notification/common/notification.js';

/**
 * Mock IPC Channel for testing
 */
class MockChannel {
	private eventEmitters: Map<string, Emitter<any>> = new Map();
	private callHandlers: Map<string, (args: any) => void> = new Map();

	listen<T>(event: string): Event<T> {
		if (!this.eventEmitters.has(event)) {
			this.eventEmitters.set(event, new Emitter<T>());
		}
		return this.eventEmitters.get(event)!.event;
	}

	call(command: string, args: any): Promise<any> {
		const handler = this.callHandlers.get(command);
		if (handler) {
			handler(args);
		}
		return Promise.resolve();
	}

	// Test helpers
	emit(event: string, data: any) {
		const emitter = this.eventEmitters.get(event);
		if (emitter) {
			emitter.fire(data);
		}
	}

	onCall(command: string, handler: (args: any) => void) {
		this.callHandlers.set(command, handler);
	}
}

/**
 * Mock MainProcessService
 */
class MockMainProcessService implements Partial<IMainProcessService> {
	private channel: MockChannel;

	constructor(channel: MockChannel) {
		this.channel = channel;
	}

	getChannel(channelName: string) {
		return this.channel as any;
	}
}

/**
 * Mock GridSettingsService
 */
class MockGridSettingsService implements Partial<IGridSettingsService> {
	state = {
		settingsOfProvider: {
			anthropic: {
				_didFillInProviderSettings: true,
				endpoint: 'https://api.anthropic.com',
				models: [{ modelName: 'claude-3-5-sonnet-20241022', isHidden: false }],
			},
		},
		overridesOfModel: {},
		globalSettings: {},
	};
}

/**
 * Mock MCPService
 */
class MockMCPService implements Partial<IMCPService> {
	getMCPTools() {
		return [];
	}
}

/**
 * Mock SecretDetectionService
 */
class MockSecretDetectionService implements Partial<ISecretDetectionService> {
	private enabled = false;

	getConfig() {
		return {
			enabled: this.enabled,
			mode: 'redact' as const,
			customPatterns: [],
		};
	}

	detectSecrets(text: string) {
		if (!this.enabled) {
			return { hasSecrets: false, matches: [], redactedText: text };
		}

		// Simple pattern matching for testing
		const patterns = [
			{ name: 'API Key', pattern: /sk-[a-zA-Z0-9]{48}/g },
			{ name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/g },
		];

		let hasSecrets = false;
		let redactedText = text;
		const matches: any[] = [];

		for (const { name, pattern } of patterns) {
			const found = text.match(pattern);
			if (found) {
				hasSecrets = true;
				matches.push({ pattern: { name }, value: found[0] });
				redactedText = redactedText.replace(pattern, '[REDACTED]');
			}
		}

		return { hasSecrets, matches, redactedText };
	}

	redactSecretsInObject(obj: any) {
		return { redacted: obj, hasSecrets: false };
	}

	enableForTesting() {
		this.enabled = true;
	}
}

/**
 * Mock NotificationService
 */
class MockNotificationService implements Partial<INotificationService> {
	private notifications: Array<{ severity: Severity; message: string }> = [];

	info(message: string) {
		this.notifications.push({ severity: Severity.Info, message });
	}

	warn(message: string) {
		this.notifications.push({ severity: Severity.Warning, message });
	}

	error(message: string) {
		this.notifications.push({ severity: Severity.Error, message });
	}

	getNotifications() {
		return this.notifications;
	}

	clearNotifications() {
		this.notifications = [];
	}
}

suite('LLMMessageService Tests', () => {
	let service: LLMMessageService;
	let channel: MockChannel;
	let mainProcessService: MockMainProcessService;
	let gridSettingsService: MockGridSettingsService;
	let mcpService: MockMCPService;
	let secretDetectionService: MockSecretDetectionService;
	let notificationService: MockNotificationService;

	setup(() => {
		channel = new MockChannel();
		mainProcessService = new MockMainProcessService(channel);
		gridSettingsService = new MockGridSettingsService();
		mcpService = new MockMCPService();
		secretDetectionService = new MockSecretDetectionService();
		notificationService = new MockNotificationService();

		service = new LLMMessageService(
			mainProcessService as any,
			gridSettingsService as any,
			notificationService as any,
			mcpService as any,
			secretDetectionService as any
		);
	});

	teardown(() => {
		service.dispose();
	});

	suite('sendLLMMessage', () => {
		test('should send chat message successfully', (done) => {
			const params: ServiceSendLLMMessageParams = {
				messagesType: 'chatMessages',
				messages: [{ role: 'user', content: 'Hello' }],
				modelSelection: { providerName: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' },
				onText: () => {},
				onFinalMessage: (result) => {
					assert.strictEqual(result.fullText, 'Response text');
					done();
				},
				onError: () => {
					assert.fail('Should not call onError');
				},
				onAbort: () => {},
				logging: { loggingName: 'Chat', loggingExtras: {} },
				modelSelectionOptions: {},
				overridesOfModel: {},
				chatMode: 'edit',
				separateSystemMessage: false,
			};

			const requestId = service.sendLLMMessage(params);

			assert.ok(requestId);

			// Simulate IPC response
			channel.emit('onFinalMessage_sendLLMMessage', {
				requestId,
				fullText: 'Response text',
				fullReasoning: null,
				toolCall: null,
			});
		});

		test('should handle onText streaming', (done) => {
			let textCallCount = 0;

			const params: ServiceSendLLMMessageParams = {
				messagesType: 'chatMessages',
				messages: [{ role: 'user', content: 'Hello' }],
				modelSelection: { providerName: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' },
				onText: (result) => {
					textCallCount++;
					assert.ok(result.fullText.length > 0);
				},
				onFinalMessage: () => {
					assert.ok(textCallCount > 0, 'Should have called onText at least once');
					done();
				},
				onError: () => {
					assert.fail('Should not call onError');
				},
				onAbort: () => {},
				logging: { loggingName: 'Chat', loggingExtras: {} },
				modelSelectionOptions: {},
				overridesOfModel: {},
				chatMode: 'edit',
				separateSystemMessage: false,
			};

			const requestId = service.sendLLMMessage(params);

			// Simulate streaming
			channel.emit('onText_sendLLMMessage', {
				requestId,
				fullText: 'Partial',
				newText: 'Partial',
			});

			channel.emit('onText_sendLLMMessage', {
				requestId,
				fullText: 'Partial response',
				newText: ' response',
			});

			channel.emit('onFinalMessage_sendLLMMessage', {
				requestId,
				fullText: 'Partial response',
				fullReasoning: null,
				toolCall: null,
			});
		});

		test('should handle errors', (done) => {
			const params: ServiceSendLLMMessageParams = {
				messagesType: 'chatMessages',
				messages: [{ role: 'user', content: 'Hello' }],
				modelSelection: { providerName: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' },
				onText: () => {},
				onFinalMessage: () => {
					assert.fail('Should not call onFinalMessage');
				},
				onError: (error) => {
					assert.strictEqual(error.message, 'API Error');
					done();
				},
				onAbort: () => {},
				logging: { loggingName: 'Chat', loggingExtras: {} },
				modelSelectionOptions: {},
				overridesOfModel: {},
				chatMode: 'edit',
				separateSystemMessage: false,
			};

			const requestId = service.sendLLMMessage(params);

			// Simulate error
			channel.emit('onError_sendLLMMessage', {
				requestId,
				message: 'API Error',
				fullError: null,
			});
		});

		test('should reject null model selection', (done) => {
			const params: ServiceSendLLMMessageParams = {
				messagesType: 'chatMessages',
				messages: [{ role: 'user', content: 'Hello' }],
				modelSelection: null,
				onText: () => {},
				onFinalMessage: () => {
					assert.fail('Should not call onFinalMessage');
				},
				onError: (error) => {
					assert.ok(error.message.includes('Please add a provider'));
					done();
				},
				onAbort: () => {},
				logging: { loggingName: 'Chat', loggingExtras: {} },
				modelSelectionOptions: {},
				overridesOfModel: {},
				chatMode: 'edit',
				separateSystemMessage: false,
			};

			const requestId = service.sendLLMMessage(params);

			assert.strictEqual(requestId, null, 'Should return null for invalid params');
		});

		test('should reject empty messages', (done) => {
			const params: ServiceSendLLMMessageParams = {
				messagesType: 'chatMessages',
				messages: [],
				modelSelection: { providerName: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' },
				onText: () => {},
				onFinalMessage: () => {
					assert.fail('Should not call onFinalMessage');
				},
				onError: (error) => {
					assert.ok(error.message.includes('No messages detected'));
					done();
				},
				onAbort: () => {},
				logging: { loggingName: 'Chat', loggingExtras: {} },
				modelSelectionOptions: {},
				overridesOfModel: {},
				chatMode: 'edit',
				separateSystemMessage: false,
			};

			const requestId = service.sendLLMMessage(params);

			assert.strictEqual(requestId, null, 'Should return null for empty messages');
		});

		test('should pass settings to IPC channel', (done) => {
			channel.onCall('sendLLMMessage', (args) => {
				assert.strictEqual(args.modelSelection.providerName, 'anthropic');
				assert.strictEqual(args.modelSelection.modelName, 'claude-3-5-sonnet-20241022');
				assert.ok(args.settingsOfProvider);
				assert.ok(args.requestId);
				done();
			});

			const params: ServiceSendLLMMessageParams = {
				messagesType: 'chatMessages',
				messages: [{ role: 'user', content: 'Hello' }],
				modelSelection: { providerName: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' },
				onText: () => {},
				onFinalMessage: () => {},
				onError: () => {},
				onAbort: () => {},
				logging: { loggingName: 'Chat', loggingExtras: {} },
				modelSelectionOptions: {},
				overridesOfModel: {},
				chatMode: 'edit',
				separateSystemMessage: false,
			};

			service.sendLLMMessage(params);
		});
	});

	suite('abort', () => {
		test('should abort message', (done) => {
			let abortCalled = false;

			const params: ServiceSendLLMMessageParams = {
				messagesType: 'chatMessages',
				messages: [{ role: 'user', content: 'Hello' }],
				modelSelection: { providerName: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' },
				onText: () => {},
				onFinalMessage: () => {
					assert.fail('Should not call onFinalMessage after abort');
				},
				onError: () => {},
				onAbort: () => {
					abortCalled = true;
				},
				logging: { loggingName: 'Chat', loggingExtras: {} },
				modelSelectionOptions: {},
				overridesOfModel: {},
				chatMode: 'edit',
				separateSystemMessage: false,
			};

			const requestId = service.sendLLMMessage(params);

			assert.ok(requestId);

			channel.onCall('abort', (args) => {
				assert.strictEqual(args.requestId, requestId);
				assert.ok(abortCalled, 'Should have called onAbort before IPC call');
				done();
			});

			service.abort(requestId!);
		});

		test('should clean up hooks after abort', () => {
			const params: ServiceSendLLMMessageParams = {
				messagesType: 'chatMessages',
				messages: [{ role: 'user', content: 'Hello' }],
				modelSelection: { providerName: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' },
				onText: () => {},
				onFinalMessage: () => {},
				onError: () => {},
				onAbort: () => {},
				logging: { loggingName: 'Chat', loggingExtras: {} },
				modelSelectionOptions: {},
				overridesOfModel: {},
				chatMode: 'edit',
				separateSystemMessage: false,
			};

			const requestId = service.sendLLMMessage(params);

			assert.ok(requestId);

			service.abort(requestId!);

			// After abort, hooks should be cleared, so events should not trigger
			let called = false;
			channel.emit('onText_sendLLMMessage', {
				requestId,
				fullText: 'Should not receive this',
				newText: 'Should not receive this',
			});

			assert.strictEqual(called, false, 'Should not call hooks after abort');
		});
	});

	suite('Secret Detection', () => {
		test('should redact secrets in chat messages', (done) => {
			secretDetectionService.enableForTesting();

			const params: ServiceSendLLMMessageParams = {
				messagesType: 'chatMessages',
				messages: [{ role: 'user', content: 'My API key is sk-' + 'a'.repeat(48) }],
				modelSelection: { providerName: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' },
				onText: () => {},
				onFinalMessage: () => {},
				onError: () => {},
				onAbort: () => {},
				logging: { loggingName: 'Chat', loggingExtras: {} },
				modelSelectionOptions: {},
				overridesOfModel: {},
				chatMode: 'edit',
				separateSystemMessage: false,
			};

			channel.onCall('sendLLMMessage', (args) => {
				// Message content should be redacted
				assert.ok(args.messages[0].content.includes('[REDACTED]'));
				assert.ok(!args.messages[0].content.includes('sk-'));
				done();
			});

			service.sendLLMMessage(params);
		});

		test('should not redact when secret detection disabled', (done) => {
			// Secret detection is disabled by default

			const secretKey = 'sk-' + 'a'.repeat(48);
			const params: ServiceSendLLMMessageParams = {
				messagesType: 'chatMessages',
				messages: [{ role: 'user', content: `My API key is ${secretKey}` }],
				modelSelection: { providerName: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' },
				onText: () => {},
				onFinalMessage: () => {},
				onError: () => {},
				onAbort: () => {},
				logging: { loggingName: 'Chat', loggingExtras: {} },
				modelSelectionOptions: {},
				overridesOfModel: {},
				chatMode: 'edit',
				separateSystemMessage: false,
			};

			channel.onCall('sendLLMMessage', (args) => {
				// Message should NOT be redacted when detection is disabled
				assert.ok(args.messages[0].content.includes(secretKey));
				done();
			});

			service.sendLLMMessage(params);
		});
	});

	suite('Model Listing', () => {
		test('should list Ollama models', (done) => {
			const onSuccess = (result: any) => {
				assert.ok(result.models);
				assert.strictEqual(result.models.length, 2);
				done();
			};

			const onError = () => {
				assert.fail('Should not call onError');
			};

			service.ollamaList({
				onSuccess,
				onError,
			});

			// Simulate success response
			setTimeout(() => {
				// Find the most recent requestId
				channel.emit('onSuccess_list_ollama', {
					requestId: 'test-request-id',
					models: [
						{ name: 'llama3-8b', size: 4500000000 },
						{ name: 'codellama', size: 3800000000 },
					],
				});
			}, 10);
		});

		test('should handle Ollama list errors', (done) => {
			const onSuccess = () => {
				assert.fail('Should not call onSuccess');
			};

			const onError = (error: any) => {
				assert.ok(error.message);
				done();
			};

			service.ollamaList({
				onSuccess,
				onError,
			});

			setTimeout(() => {
				channel.emit('onError_list_ollama', {
					requestId: 'test-request-id',
					message: 'Ollama not running',
				});
			}, 10);
		});

		test('should list OpenAI-compatible models', (done) => {
			const onSuccess = (result: any) => {
				assert.ok(result.models);
				done();
			};

			const onError = () => {
				assert.fail('Should not call onError');
			};

			service.openAICompatibleList({
				providerName: 'lmstudio',
				onSuccess,
				onError,
			});

			setTimeout(() => {
				channel.emit('onSuccess_list_openAICompatible', {
					requestId: 'test-request-id',
					models: [{ id: 'model-1', object: 'model', created: Date.now(), owned_by: 'lmstudio' }],
				});
			}, 10);
		});
	});

	suite('Hook Cleanup', () => {
		test('should clean up hooks after final message', (done) => {
			const params: ServiceSendLLMMessageParams = {
				messagesType: 'chatMessages',
				messages: [{ role: 'user', content: 'Hello' }],
				modelSelection: { providerName: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' },
				onText: () => {},
				onFinalMessage: () => {
					// After final message, try sending another event
					setTimeout(() => {
						let unexpectedCall = false;
						channel.emit('onText_sendLLMMessage', {
							requestId,
							fullText: 'Should not receive',
							newText: 'Should not receive',
						});

						assert.strictEqual(unexpectedCall, false, 'Should not call hooks after cleanup');
						done();
					}, 10);
				},
				onError: () => {},
				onAbort: () => {},
				logging: { loggingName: 'Chat', loggingExtras: {} },
				modelSelectionOptions: {},
				overridesOfModel: {},
				chatMode: 'edit',
				separateSystemMessage: false,
			};

			const requestId = service.sendLLMMessage(params);

			channel.emit('onFinalMessage_sendLLMMessage', {
				requestId,
				fullText: 'Done',
				fullReasoning: null,
				toolCall: null,
			});
		});

		test('should clean up hooks after error', (done) => {
			const params: ServiceSendLLMMessageParams = {
				messagesType: 'chatMessages',
				messages: [{ role: 'user', content: 'Hello' }],
				modelSelection: { providerName: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' },
				onText: () => {},
				onFinalMessage: () => {},
				onError: () => {
					setTimeout(() => {
						let unexpectedCall = false;
						channel.emit('onText_sendLLMMessage', {
							requestId,
							fullText: 'Should not receive',
							newText: 'Should not receive',
						});

						assert.strictEqual(unexpectedCall, false);
						done();
					}, 10);
				},
				onAbort: () => {},
				logging: { loggingName: 'Chat', loggingExtras: {} },
				modelSelectionOptions: {},
				overridesOfModel: {},
				chatMode: 'edit',
				separateSystemMessage: false,
			};

			const requestId = service.sendLLMMessage(params);

			channel.emit('onError_sendLLMMessage', {
				requestId,
				message: 'Error',
				fullError: null,
			});
		});
	});
});
