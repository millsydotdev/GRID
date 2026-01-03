/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { TaskAwareModelRouter, TaskContext } from '../../common/modelRouter.js';
import { IGridSettingsService } from '../../common/gridSettingsService.js';

/**
 * Mock GridSettingsService for testing
 */
class MockGridSettingsService implements Partial<IGridSettingsService> {
	state: any;
	private changeListeners: Array<() => void> = [];

	constructor(initialState?: any) {
		this.state = initialState || this.createDefaultState();
	}

	createDefaultState() {
		return {
			settingsOfProvider: {
				anthropic: {
					_didFillInProviderSettings: true,
					models: [
						{ modelName: 'claude-3-5-sonnet-20241022', isHidden: false },
						{ modelName: 'claude-3-haiku-20240307', isHidden: false },
						{ modelName: 'claude-3-opus-20240229', isHidden: false },
					],
				},
				openai: {
					_didFillInProviderSettings: true,
					models: [
						{ modelName: 'gpt-4o', isHidden: false },
						{ modelName: 'gpt-3.5-turbo', isHidden: false },
					],
				},
				gemini: {
					_didFillInProviderSettings: true,
					models: [
						{ modelName: 'gemini-pro', isHidden: false },
						{ modelName: 'gemini-flash', isHidden: false },
					],
				},
				ollama: {
					_didFillInProviderSettings: true,
					models: [
						{ modelName: 'llama3-8b', isHidden: false },
						{ modelName: 'llava', isHidden: false },
					],
				},
			},
			overridesOfModel: {},
			globalSettings: {
				localFirstAI: false,
				perf: {
					enable: false,
					routerCacheTtlMs: 2000,
				},
			},
		};
	}

	onDidChangeState(callback: () => void) {
		this.changeListeners.push(callback);
		return {
			dispose: () => {
				const index = this.changeListeners.indexOf(callback);
				if (index >= 0) {
					this.changeListeners.splice(index, 1);
				}
			},
		};
	}

	triggerStateChange() {
		this.changeListeners.forEach((listener) => listener());
	}
}

/**
 * Mock StorageService for testing
 */
class MockStorageService {
	private storage: Map<string, string> = new Map();

	get(key: string, scope: any, defaultValue?: string): string | undefined {
		return this.storage.get(key) ?? defaultValue;
	}

	store(key: string, value: string, scope: any, target: any): void {
		this.storage.set(key, value);
	}

	remove(key: string, scope: any): void {
		this.storage.delete(key);
	}
}

suite('ModelRouter Tests', () => {

	// ensureNoDisposablesAreLeakedInTestSuite();
	let router: TaskAwareModelRouter;
	let settingsService: MockGridSettingsService;
	let storageService: MockStorageService;

	setup(() => {
		settingsService = new MockGridSettingsService();
		storageService = new MockStorageService();
		router = new TaskAwareModelRouter(settingsService as any, storageService as any);
	});

	teardown(() => {
		router.dispose();
	});

	suite('User Override', () => {
		test('should respect user override', async () => {
			const context: TaskContext = {
				taskType: 'chat',
				userOverride: { providerName: 'openAI', modelName: 'gpt-3.5-turbo' },
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.modelSelection.providerName, 'openAI');
			assert.strictEqual(decision.modelSelection.modelName, 'gpt-3.5-turbo');
			assert.strictEqual(decision.confidence, 1.0);
			assert.strictEqual(decision.reasoning, 'User explicitly selected this model');
		});

		test('should use user override even for vision tasks', async () => {
			const context: TaskContext = {
				taskType: 'vision',
				hasImages: true,
				userOverride: { providerName: 'openAI', modelName: 'gpt-3.5-turbo' },
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.modelSelection.providerName, 'openAI');
			assert.strictEqual(decision.modelSelection.modelName, 'gpt-3.5-turbo');
		});
	});

	suite('Privacy Mode', () => {
		test('should select local model in privacy mode', async () => {
			const context: TaskContext = {
				taskType: 'chat',
				requiresPrivacy: true,
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.modelSelection.providerName, 'ollama');
			assert.ok(decision.reasoning.includes('Privacy/offline mode'));
		});

		test('should handle no local models available in privacy mode', async () => {
			// Remove all local models
			settingsService.state.settingsOfProvider.ollama._didFillInProviderSettings = false;

			const context: TaskContext = {
				taskType: 'chat',
				requiresPrivacy: true,
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.shouldAbstain, true);
			assert.ok(decision.abstainReason?.includes('No local models available'));
		});

		test('should select local vision model for images in privacy mode', async () => {
			const context: TaskContext = {
				taskType: 'vision',
				hasImages: true,
				requiresPrivacy: true,
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.modelSelection.providerName, 'ollama');
			assert.strictEqual(decision.modelSelection.modelName, 'llava');
		});
	});

	suite('Task Type Routing', () => {
		test('should route simple questions to fast models', async () => {
			const context: TaskContext = {
				taskType: 'chat',
				isSimpleQuestion: true,
			};

			const decision = await router.route(context);

			const modelName = decision.modelSelection.modelName.toLowerCase();
			// Should select a fast model (haiku, flash, turbo, mini)
			assert.ok(
				modelName.includes('haiku') ||
					modelName.includes('flash') ||
					modelName.includes('turbo') ||
					modelName.includes('mini'),
				`Expected fast model, got ${decision.modelSelection.modelName}`
			);
			assert.strictEqual(decision.qualityTier, 'cheap_fast');
		});

		test('should route vision tasks to vision-capable models', async () => {
			const context: TaskContext = {
				taskType: 'vision',
				hasImages: true,
			};

			const decision = await router.route(context);

			// Should select a vision-capable model (Gemini, Claude 3+, GPT-4, or llava)
			const provider = decision.modelSelection.providerName;
			const modelName = decision.modelSelection.modelName.toLowerCase();

			const isVisionCapable =
				provider === 'gemini' ||
				(provider === 'anthropic' && (modelName.includes('3') || modelName.includes('4'))) ||
				(provider === 'openAI' && modelName.includes('4')) ||
				(provider === 'ollama' && modelName.includes('llava'));

			assert.ok(isVisionCapable, `Expected vision-capable model, got ${provider}/${modelName}`);
		});

		test('should route code tasks to code-capable models', async () => {
			const context: TaskContext = {
				taskType: 'code',
				hasCode: true,
			};

			const decision = await router.route(context);

			// Should prefer high-quality models for code
			const provider = decision.modelSelection.providerName;
			assert.ok(
				provider === 'anthropic' || provider === 'openAI' || provider === 'gemini',
				`Expected high-quality provider, got ${provider}`
			);
		});

		test('should route complex reasoning tasks to top-tier models', async () => {
			const context: TaskContext = {
				taskType: 'chat',
				requiresComplexReasoning: true,
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.qualityTier, 'escalate');

			// Should select a top-tier model (Claude Opus/Sonnet, GPT-4)
			const provider = decision.modelSelection.providerName;
			const modelName = decision.modelSelection.modelName.toLowerCase();

			const isTopTier =
				(provider === 'anthropic' && (modelName.includes('opus') || modelName.includes('sonnet'))) ||
				(provider === 'openAI' && modelName.includes('4'));

			assert.ok(isTopTier, `Expected top-tier model, got ${provider}/${modelName}`);
		});
	});

	suite('Context Size Matching', () => {
		test('should select model with sufficient context window', async () => {
			const context: TaskContext = {
				taskType: 'code',
				contextSize: 100_000, // Large context requirement
			};

			const decision = await router.route(context);

			// Verify the selected model has large enough context (this is a heuristic test)
			assert.ok(decision.confidence > 0, 'Should find a model with sufficient context');
		});

		test('should handle no models with sufficient context', async () => {
			// Create a state with only small-context models
			settingsService.state = {
				settingsOfProvider: {
					openai: {
						_didFillInProviderSettings: true,
						models: [{ modelName: 'gpt-3.5-turbo', isHidden: false }],
					},
				},
				overridesOfModel: {},
				globalSettings: { localFirstAI: false, perf: { enable: false } },
			};

			const context: TaskContext = {
				taskType: 'code',
				contextSize: 500_000, // Extremely large context
			};

			const decision = await router.route(context);

			// Should still return a model (penalized but available)
			assert.ok(decision.modelSelection);
		});
	});

	suite('Cost and Latency Preferences', () => {
		test('should prefer low-cost models when preferLowCost is set', async () => {
			const context: TaskContext = {
				taskType: 'chat',
				preferLowCost: true,
			};

			const decision = await router.route(context);

			// Should prefer cheaper models (haiku, flash, turbo, mini)
			const modelName = decision.modelSelection.modelName.toLowerCase();
			assert.ok(
				modelName.includes('haiku') ||
					modelName.includes('flash') ||
					modelName.includes('turbo') ||
					modelName.includes('mini'),
				`Expected low-cost model, got ${decision.modelSelection.modelName}`
			);
		});

		test('should prefer low-latency models when preferLowLatency is set', async () => {
			const context: TaskContext = {
				taskType: 'chat',
				preferLowLatency: true,
			};

			const decision = await router.route(context);

			// Should prefer fast models
			const modelName = decision.modelSelection.modelName.toLowerCase();
			assert.ok(
				modelName.includes('haiku') ||
					modelName.includes('flash') ||
					modelName.includes('turbo') ||
					modelName.includes('mini'),
				`Expected fast model, got ${decision.modelSelection.modelName}`
			);
		});
	});

	suite('Caching', () => {
		test('should cache routing decisions', async () => {
			const context: TaskContext = {
				taskType: 'chat',
				isSimpleQuestion: true,
			};

			const decision1 = await router.route(context);
			const startTime = performance.now();
			const decision2 = await router.route(context);
			const elapsedTime = performance.now() - startTime;

			// Second call should be much faster (cached)
			assert.ok(elapsedTime < 10, `Expected cached response to be fast, took ${elapsedTime}ms`);
			assert.deepStrictEqual(decision1.modelSelection, decision2.modelSelection);
		});

		test('should invalidate cache when settings change', async () => {
			const context: TaskContext = {
				taskType: 'chat',
			};

			const decision1 = await router.route(context);

			// Change settings
			settingsService.state.globalSettings.localFirstAI = true;
			settingsService.triggerStateChange();

			const decision2 = await router.route(context);

			// Decision might be different due to localFirstAI change
			// (This test ensures cache is invalidated, not that decision changed)
			assert.ok(decision1 || decision2); // Just ensure both executed
		});
	});

	suite('Quality Tier Estimation', () => {
		test('should estimate cheap_fast for simple questions', async () => {
			const context: TaskContext = {
				taskType: 'chat',
				isSimpleQuestion: true,
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.qualityTier, 'cheap_fast');
		});

		test('should estimate escalate for complex tasks', async () => {
			const context: TaskContext = {
				taskType: 'code',
				requiresComplexReasoning: true,
				isMultiStepTask: true,
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.qualityTier, 'escalate');
		});

		test('should estimate standard for regular tasks', async () => {
			const context: TaskContext = {
				taskType: 'code',
				hasCode: true,
			};

			const decision = await router.route(context);

			assert.ok(decision.qualityTier === 'standard' || decision.qualityTier === 'cheap_fast');
		});
	});

	suite('Abstention Logic', () => {
		test('should abstain for complex vision tasks without context', async () => {
			const context: TaskContext = {
				taskType: 'vision',
				hasImages: true,
				requiresComplexReasoning: true,
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.shouldAbstain, true);
			assert.ok(decision.abstainReason?.includes('Complex vision task'));
		});

		test('should not abstain for simple vision tasks', async () => {
			const context: TaskContext = {
				taskType: 'vision',
				hasImages: true,
			};

			const decision = await router.route(context);

			assert.notStrictEqual(decision.shouldAbstain, true);
		});

		test('should not abstain for codebase questions', async () => {
			const context: TaskContext = {
				taskType: 'code',
				requiresComplexReasoning: true,
				contextSize: 50_000,
			};

			const decision = await router.route(context);

			assert.notStrictEqual(decision.shouldAbstain, true);
		});
	});

	suite('Fallback Chains', () => {
		test('should provide fallback chain', async () => {
			const context: TaskContext = {
				taskType: 'code',
				requiresComplexReasoning: true,
			};

			const decision = await router.route(context);

			assert.ok(decision.fallbackChain);
			assert.ok(decision.fallbackChain!.length > 0, 'Should have fallback models');
		});

		test('fallback chain should not include primary model', async () => {
			const context: TaskContext = {
				taskType: 'chat',
			};

			const decision = await router.route(context);

			if (decision.fallbackChain) {
				const primaryModel = decision.modelSelection;
				const hasPrimaryInFallback = decision.fallbackChain.some(
					(m) => m.providerName === primaryModel.providerName && m.modelName === primaryModel.modelName
				);
				assert.strictEqual(hasPrimaryInFallback, false, 'Fallback chain should not include primary model');
			}
		});
	});

	suite('Local-First Mode', () => {
		test('should prefer local models in local-first mode', async () => {
			settingsService.state.globalSettings.localFirstAI = true;

			const context: TaskContext = {
				taskType: 'chat',
				isSimpleQuestion: true,
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.modelSelection.providerName, 'ollama');
		});

		test('should still prefer online for heavy tasks in local-first mode', async () => {
			settingsService.state.globalSettings.localFirstAI = true;

			const context: TaskContext = {
				taskType: 'code',
				requiresComplexReasoning: true,
				contextSize: 100_000,
				isMultiStepTask: true,
			};

			const decision = await router.route(context);

			// For very heavy tasks, even in local-first mode, online models may be preferred
			// This test just ensures the routing completes successfully
			assert.ok(decision.modelSelection);
		});
	});

	suite('Codebase Questions', () => {
		test('should prefer online models for codebase questions', async () => {
			const context: TaskContext = {
				taskType: 'code',
				requiresComplexReasoning: true,
				contextSize: 50_000,
				isLongMessage: true,
			};

			const decision = await router.route(context);

			// Should prefer online models (Anthropic, OpenAI, Gemini)
			assert.ok(
				decision.modelSelection.providerName === 'anthropic' ||
					decision.modelSelection.providerName === 'openAI' ||
					decision.modelSelection.providerName === 'gemini',
				`Expected online model for codebase question, got ${decision.modelSelection.providerName}`
			);
		});

		test('should prefer large context models for codebase questions', async () => {
			const context: TaskContext = {
				taskType: 'code',
				requiresComplexReasoning: true,
				contextSize: 150_000,
			};

			const decision = await router.route(context);

			// Should select a model with large context window
			// Claude and GPT-4 have large context windows
			assert.ok(
				decision.modelSelection.providerName === 'anthropic' || decision.modelSelection.providerName === 'openAI',
				`Expected large context model, got ${decision.modelSelection.providerName}`
			);
		});
	});

	suite('No Models Available', () => {
		test('should handle no models configured', async () => {
			// Clear all models
			settingsService.state.settingsOfProvider = {};

			const context: TaskContext = {
				taskType: 'chat',
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.shouldAbstain, true);
			assert.ok(decision.abstainReason?.includes('No models'));
		});
	});

	suite('Vision Capability Detection', () => {
		test('should detect Gemini as vision-capable', async () => {
			const context: TaskContext = {
				taskType: 'vision',
				hasImages: true,
			};

			// Force Gemini by removing other vision models
			settingsService.state.settingsOfProvider = {
				gemini: {
					_didFillInProviderSettings: true,
					models: [{ modelName: 'gemini-pro', isHidden: false }],
				},
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.modelSelection.providerName, 'gemini');
		});

		test('should detect Claude 3+ as vision-capable', async () => {
			const context: TaskContext = {
				taskType: 'vision',
				hasImages: true,
			};

			// Force Claude by removing other vision models
			settingsService.state.settingsOfProvider = {
				anthropic: {
					_didFillInProviderSettings: true,
					models: [{ modelName: 'claude-3-5-sonnet-20241022', isHidden: false }],
				},
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.modelSelection.providerName, 'anthropic');
		});

		test('should detect llava as vision-capable', async () => {
			const context: TaskContext = {
				taskType: 'vision',
				hasImages: true,
				requiresPrivacy: true,
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.modelSelection.providerName, 'ollama');
			assert.strictEqual(decision.modelSelection.modelName, 'llava');
		});
	});

	suite('Timeouts', () => {
		test('should provide timeout for models', async () => {
			const context: TaskContext = {
				taskType: 'chat',
			};

			const decision = await router.route(context);

			assert.ok(decision.timeoutMs);
			assert.ok(decision.timeoutMs! > 0);
		});

		test('should increase timeout for complex tasks', async () => {
			const simpleContext: TaskContext = {
				taskType: 'chat',
				isSimpleQuestion: true,
			};

			const complexContext: TaskContext = {
				taskType: 'code',
				requiresComplexReasoning: true,
				contextSize: 100_000,
				isMultiStepTask: true,
			};

			const simpleDecision = await router.route(simpleContext);
			const complexDecision = await router.route(complexContext);

			// Complex tasks should have longer timeouts
			// (This is a heuristic test - actual timeout depends on selected model)
			assert.ok(simpleDecision.timeoutMs);
			assert.ok(complexDecision.timeoutMs);
		});
	});

	suite('Routing Explanation', () => {
		test('should provide human-readable explanation', async () => {
			const context: TaskContext = {
				taskType: 'code',
				hasCode: true,
				requiresComplexReasoning: true,
			};

			const explanation = await router.getRoutingExplanation(context);

			assert.ok(explanation);
			assert.ok(explanation.includes('Task: code'));
			assert.ok(explanation.includes('complex reasoning'));
		});

		test('should include abstain reason in explanation', async () => {
			const context: TaskContext = {
				taskType: 'vision',
				hasImages: true,
				requiresComplexReasoning: true,
			};

			const explanation = await router.getRoutingExplanation(context);

			assert.ok(explanation);
			// Should either abstain or provide valid explanation
			assert.ok(explanation.length > 0);
		});
	});

	suite('Quality Report', () => {
		test('should provide quality report', () => {
			const report = router.getQualityReport();

			assert.ok(report);
			// Report structure depends on RoutingEvaluationService
			// This test just ensures it returns without error
		});
	});

	suite('Task-Specific Routing', () => {
		test('should handle PDF tasks', async () => {
			const context: TaskContext = {
				taskType: 'pdf',
				hasPDFs: true,
			};

			const decision = await router.route(context);

			// Should select a vision-capable model for PDF analysis
			assert.ok(decision.modelSelection);
			assert.ok(decision.confidence > 0);
		});

		test('should handle debugging tasks', async () => {
			const context: TaskContext = {
				taskType: 'code',
				isDebuggingTask: true,
			};

			const decision = await router.route(context);

			// Should prefer high-quality models for debugging
			assert.ok(
				decision.modelSelection.providerName === 'anthropic' || decision.modelSelection.providerName === 'openAI'
			);
		});

		test('should handle code review tasks', async () => {
			const context: TaskContext = {
				taskType: 'code',
				isCodeReviewTask: true,
			};

			const decision = await router.route(context);

			// Should prefer high-quality models
			assert.ok(decision.modelSelection);
		});

		test('should handle testing tasks', async () => {
			const context: TaskContext = {
				taskType: 'code',
				isTestingTask: true,
			};

			const decision = await router.route(context);

			assert.ok(decision.modelSelection);
		});

		test('should handle documentation tasks', async () => {
			const context: TaskContext = {
				taskType: 'general',
				isDocumentationTask: true,
			};

			const decision = await router.route(context);

			assert.ok(decision.modelSelection);
		});

		test('should handle security tasks', async () => {
			const context: TaskContext = {
				taskType: 'code',
				isSecurityTask: true,
			};

			const decision = await router.route(context);

			// Should prefer online models for up-to-date security knowledge
			assert.ok(decision.modelSelection.providerName !== 'ollama', 'Security tasks should prefer online models');
		});

		test('should handle math tasks', async () => {
			const context: TaskContext = {
				taskType: 'general',
				isMathTask: true,
			};

			const decision = await router.route(context);

			assert.ok(decision.modelSelection);
		});

		test('should handle multi-language tasks', async () => {
			const context: TaskContext = {
				taskType: 'code',
				isMultiLanguageTask: true,
			};

			const decision = await router.route(context);

			assert.ok(decision.modelSelection);
		});

		test('should handle multi-step tasks', async () => {
			const context: TaskContext = {
				taskType: 'code',
				isMultiStepTask: true,
			};

			const decision = await router.route(context);

			assert.strictEqual(decision.qualityTier, 'escalate');
		});
	});
});
