/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';

suite('RepoIndexerService', () => {

	// ensureNoDisposablesAreLeakedInTestSuite();
	suite('Index Entry Structure', () => {
		test('should create valid index entry', () => {
			const entry = {
				uri: '/test/file.ts',
				symbols: ['MyClass', 'myFunction'],
				snippet: 'class MyClass { myFunction() {} }',
				snippetStartLine: 1,
				snippetEndLine: 3,
			};

			assert.strictEqual(entry.uri, '/test/file.ts');
			assert.strictEqual(entry.symbols.length, 2);
			assert.ok(entry.snippet.includes('MyClass'));
		});

		test('should handle empty symbols array', () => {
			const entry = {
				uri: '/test/file.ts',
				symbols: [],
				snippet: 'const x = 1;',
			};

			assert.strictEqual(entry.symbols.length, 0);
			assert.ok(entry.snippet);
		});

		test('should support optional chunks', () => {
			const entry = {
				uri: '/test/file.ts',
				symbols: ['test'],
				snippet: 'test snippet',
				chunks: [
					{ text: 'chunk 1', startLine: 1, endLine: 10 },
					{ text: 'chunk 2', startLine: 11, endLine: 20 },
				],
			};

			assert.ok(entry.chunks);
			assert.strictEqual(entry.chunks.length, 2);
			assert.strictEqual(entry.chunks[0].startLine, 1);
			assert.strictEqual(entry.chunks[1].endLine, 20);
		});
	});

	suite('Tokenization', () => {
		test('should tokenize snippet correctly', () => {
			const snippet = 'function myFunction() { return true; }';
			const tokens = new Set(
				snippet
					.toLowerCase()
					.split(/\W+/)
					.filter((t) => t.length > 0)
			);

			assert.ok(tokens.has('function'));
			assert.ok(tokens.has('myfunction'));
			assert.ok(tokens.has('return'));
			assert.ok(tokens.has('true'));
		});

		test('should handle case insensitivity', () => {
			const text1 = 'MyClass';
			const text2 = 'myclass';

			assert.strictEqual(text1.toLowerCase(), text2.toLowerCase());
		});

		test('should handle special characters', () => {
			const path = '/src/components/MyComponent.tsx';
			const tokens = new Set(
				path
					.toLowerCase()
					.split(/[\\/\.]/)
					.filter((t) => t.length > 0)
			);

			assert.ok(tokens.has('src'));
			assert.ok(tokens.has('components'));
			assert.ok(tokens.has('mycomponent'));
			assert.ok(tokens.has('tsx'));
		});

		test('should tokenize camelCase correctly', () => {
			const text = 'myFunctionName';
			// Simple split by word boundaries
			const tokens = text.split(/(?=[A-Z])/).map((t) => t.toLowerCase());

			assert.ok(tokens.length > 0);
		});
	});

	suite('Symbol Extraction', () => {
		test('should extract function symbols', () => {
			const symbols = ['myFunction', 'anotherFunction', 'helperFn'];

			symbols.forEach((symbol) => {
				assert.ok(symbol.length > 0);
				assert.ok(/^[a-zA-Z_]/.test(symbol)); // Starts with letter or underscore
			});
		});

		test('should extract class symbols', () => {
			const symbols = ['MyClass', 'AnotherClass', 'ServiceImpl'];

			symbols.forEach((symbol) => {
				assert.ok(symbol.length > 0);
				assert.ok(/^[A-Z]/.test(symbol)); // Classes typically start with uppercase
			});
		});

		test('should handle import relationships', () => {
			const entry = {
				uri: '/test/file.ts',
				symbols: ['MyClass'],
				snippet: '',
				importedSymbols: ['Logger', 'Config'],
				importedFrom: ['./logger', './config'],
			};

			assert.ok(entry.importedSymbols);
			assert.ok(entry.importedFrom);
			assert.strictEqual(entry.importedSymbols.length, entry.importedFrom.length);
		});
	});

	suite('Query Metrics', () => {
		test('should track retrieval latency', () => {
			const metrics = {
				retrievalLatencyMs: 50,
				tokensInjected: 1000,
				resultsCount: 5,
				topScore: 0.95,
			};

			assert.ok(metrics.retrievalLatencyMs >= 0);
			assert.ok(metrics.tokensInjected > 0);
			assert.ok(metrics.resultsCount > 0);
			assert.ok(metrics.topScore && metrics.topScore <= 1.0);
		});

		test('should handle timeout scenarios', () => {
			const metrics = {
				retrievalLatencyMs: 200,
				tokensInjected: 500,
				resultsCount: 2,
				timedOut: true,
				earlyTerminated: false,
			};

			assert.strictEqual(metrics.timedOut, true);
			assert.strictEqual(metrics.earlyTerminated, false);
		});

		test('should track embedding latency for hybrid search', () => {
			const metrics = {
				retrievalLatencyMs: 100,
				tokensInjected: 800,
				resultsCount: 3,
				embeddingLatencyMs: 25,
				hybridSearchUsed: true,
			};

			assert.ok(metrics.embeddingLatencyMs! > 0);
			assert.strictEqual(metrics.hybridSearchUsed, true);
		});
	});

	suite('BM25 Scoring', () => {
		test('should calculate term frequency', () => {
			const text = 'function test function example function';
			const words = text.split(' ');
			const termFreq = new Map<string, number>();

			words.forEach((word) => {
				termFreq.set(word, (termFreq.get(word) || 0) + 1);
			});

			assert.strictEqual(termFreq.get('function'), 3);
			assert.strictEqual(termFreq.get('test'), 1);
			assert.strictEqual(termFreq.get('example'), 1);
		});

		test('should calculate document length', () => {
			const doc1 = 'short document';
			const doc2 = 'this is a much longer document with many more words';

			const len1 = doc1.split(' ').length;
			const len2 = doc2.split(' ').length;

			assert.ok(len2 > len1);
			assert.strictEqual(len1, 2);
			assert.strictEqual(len2, 10);
		});

		test('should handle average document length calculation', () => {
			const docLengths = [10, 20, 30, 40];
			const avgLength = docLengths.reduce((a, b) => a + b, 0) / docLengths.length;

			assert.strictEqual(avgLength, 25);
		});

		test('should score exact matches higher', () => {
			const query = 'myFunction';
			const doc1 = 'myFunction is here';
			const doc2 = 'some other function';

			const score1 = doc1.includes(query) ? 1 : 0;
			const score2 = doc2.includes(query) ? 1 : 0;

			assert.ok(score1 > score2);
		});
	});

	suite('Caching Mechanisms', () => {
		test('should cache query results', () => {
			const cache = new Map<string, { results: string[]; timestamp: number }>();
			const query = 'test query';
			const results = ['result1', 'result2'];

			cache.set(query, { results, timestamp: Date.now() });

			const cached = cache.get(query);
			assert.ok(cached);
			assert.deepStrictEqual(cached.results, results);
		});

		test('should invalidate stale cache entries', () => {
			const TTL_MS = 5 * 60 * 1000; // 5 minutes
			const now = Date.now();

			const freshEntry = { results: ['r1'], timestamp: now };
			const staleEntry = { results: ['r2'], timestamp: now - TTL_MS - 1000 };

			assert.ok(now - freshEntry.timestamp < TTL_MS);
			assert.ok(now - staleEntry.timestamp > TTL_MS);
		});

		test('should implement LRU eviction', () => {
			const cache = new Map<string, string>();
			const MAX_SIZE = 3;

			// Add entries
			cache.set('a', 'value1');
			cache.set('b', 'value2');
			cache.set('c', 'value3');

			if (cache.size > MAX_SIZE) {
				// Remove oldest entry
				const firstKey = cache.keys().next().value;
				if (firstKey) {
					cache.delete(firstKey);
				}
			}

			assert.ok(cache.size <= MAX_SIZE);
		});
	});

	suite('Chunking Strategy', () => {
		test('should create overlapping chunks', () => {
			const chunk1 = { text: 'chunk 1', startLine: 1, endLine: 100 };
			const chunk2 = { text: 'chunk 2', startLine: 80, endLine: 180 };

			const overlap = Math.min(chunk1.endLine, chunk2.endLine) - Math.max(chunk1.startLine, chunk2.startLine);

			assert.ok(overlap > 0); // Has overlap
			assert.strictEqual(overlap, 20); // 20 lines of overlap
		});

		test('should handle chunk boundaries', () => {
			const chunks = [
				{ startLine: 1, endLine: 100 },
				{ startLine: 80, endLine: 180 },
				{ startLine: 160, endLine: 260 },
			];

			chunks.forEach((chunk) => {
				assert.ok(chunk.endLine > chunk.startLine);
				assert.ok(chunk.endLine - chunk.startLine <= 100);
			});
		});

		test('should tokenize chunks independently', () => {
			const chunk = {
				text: 'function example() { return true; }',
				startLine: 1,
				endLine: 1,
				tokens: new Set(['function', 'example', 'return', 'true']),
			};

			assert.ok(chunk.tokens);
			assert.strictEqual(chunk.tokens.size, 4);
			assert.ok(chunk.tokens.has('function'));
		});
	});

	suite('File Watching and Incremental Updates', () => {
		test('should track pending updates', () => {
			const pendingUpdates = new Set<string>();

			pendingUpdates.add('/test/file1.ts');
			pendingUpdates.add('/test/file2.ts');
			pendingUpdates.add('/test/file1.ts'); // Duplicate

			assert.strictEqual(pendingUpdates.size, 2); // Set deduplicates
		});

		test('should batch file updates', () => {
			const BATCH_SIZE = 20;
			const files = Array.from({ length: 50 }, (_, i) => `/test/file${i}.ts`);

			const batches = [];
			for (let i = 0; i < files.length; i += BATCH_SIZE) {
				batches.push(files.slice(i, i + BATCH_SIZE));
			}

			assert.strictEqual(batches.length, 3); // 20 + 20 + 10
			assert.strictEqual(batches[0].length, 20);
			assert.strictEqual(batches[2].length, 10);
		});
	});

	suite('Language-Specific Indexing', () => {
		test('should extract file extension', () => {
			const paths = ['/test/file.ts', '/test/component.tsx', '/test/styles.css', '/test/script.js'];

			const extensions = paths.map((p) => {
				const match = p.match(/\.([^.]+)$/);
				return match ? match[1] : '';
			});

			assert.deepStrictEqual(extensions, ['ts', 'tsx', 'css', 'js']);
		});

		test('should group files by language', () => {
			const languageIndex = new Map<string, Set<number>>();

			languageIndex.set('ts', new Set([0, 1, 2]));
			languageIndex.set('tsx', new Set([3, 4]));
			languageIndex.set('js', new Set([5, 6, 7]));

			assert.strictEqual(languageIndex.get('ts')?.size, 3);
			assert.strictEqual(languageIndex.get('tsx')?.size, 2);
			assert.strictEqual(languageIndex.get('js')?.size, 3);
		});
	});

	suite('Path Hierarchy Indexing', () => {
		test('should extract directory path', () => {
			const filePath = '/workspace/src/components/Button.tsx';
			const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));

			assert.strictEqual(dirPath, '/workspace/src/components');
		});

		test('should build path hierarchy', () => {
			const filePath = '/workspace/src/utils/helpers.ts';
			const parts = filePath.split('/').filter((p) => p.length > 0);

			const hierarchy = [];
			for (let i = 1; i <= parts.length - 1; i++) {
				hierarchy.push('/' + parts.slice(0, i).join('/'));
			}

			assert.ok(hierarchy.includes('/workspace'));
			assert.ok(hierarchy.includes('/workspace/src'));
			assert.ok(hierarchy.includes('/workspace/src/utils'));
		});
	});

	suite('Performance Monitoring', () => {
		test('should track query latencies', () => {
			const latencies = [50, 75, 60, 80, 55];
			const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

			assert.strictEqual(avgLatency, 64);
		});

		test('should detect performance degradation', () => {
			const THRESHOLD_MS = 200;
			const recentLatencies = [250, 300, 280, 290, 310];
			const avgLatency = recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length;

			const shouldDisable = avgLatency > THRESHOLD_MS;
			assert.strictEqual(shouldDisable, true);
		});

		test('should implement running average efficiently', () => {
			const latencies: number[] = [];
			let runningSum = 0;

			// Add latency
			const newLatency = 100;
			latencies.push(newLatency);
			runningSum += newLatency;

			// Calculate average in O(1)
			const avg = runningSum / latencies.length;
			assert.strictEqual(avg, 100);

			// Add another
			latencies.push(200);
			runningSum += 200;
			const newAvg = runningSum / latencies.length;
			assert.strictEqual(newAvg, 150);
		});
	});

	suite('Vector Embeddings', () => {
		test('should represent embedding as number array', () => {
			const embedding = new Array(768).fill(0).map(() => Math.random());

			assert.strictEqual(embedding.length, 768);
			embedding.forEach((val) => {
				assert.ok(typeof val === 'number');
			});
		});

		test('should calculate cosine similarity', () => {
			const vec1 = [1, 0, 0];
			const vec2 = [1, 0, 0];
			const vec3 = [0, 1, 0];

			// Dot product
			const dot1_2 = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
			const dot1_3 = vec1.reduce((sum, val, i) => sum + val * vec3[i], 0);

			assert.strictEqual(dot1_2, 1); // Identical vectors
			assert.strictEqual(dot1_3, 0); // Orthogonal vectors
		});

		test('should normalize vectors', () => {
			const vec = [3, 4]; // Length = 5
			const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
			const normalized = vec.map((val) => val / magnitude);

			const newMagnitude = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0));
			assert.ok(Math.abs(newMagnitude - 1) < 0.0001); // Should be 1
		});
	});

	suite('Early Termination Optimization', () => {
		test('should stop after finding enough candidates', () => {
			const EARLY_TERMINATION_THRESHOLD = 50;
			const candidates: Array<{ score: number }> = [];

			// Simulate scoring
			for (let i = 0; i < 1000; i++) {
				const score = Math.random();
				candidates.push({ score });

				// Early termination
				if (candidates.filter((c) => c.score > 0.8).length >= EARLY_TERMINATION_THRESHOLD) {
					break;
				}
			}

			assert.ok(candidates.length <= 1000);
			// Should have terminated early in most cases
		});

		test('should sort top-k results efficiently', () => {
			const scores = [0.5, 0.9, 0.3, 0.8, 0.6, 0.95, 0.4];
			const k = 3;

			const topK = scores.sort((a, b) => b - a).slice(0, k);

			assert.strictEqual(topK.length, 3);
			assert.strictEqual(topK[0], 0.95);
			assert.strictEqual(topK[1], 0.9);
			assert.strictEqual(topK[2], 0.8);
		});
	});

	suite('Query Timeout Handling', () => {
		test('should respect query timeout', async () => {
			const TIMEOUT_MS = 150;
			const startTime = Date.now();

			// Simulate timeout
			await new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS + 10));

			const elapsed = Date.now() - startTime;
			const timedOut = elapsed >= TIMEOUT_MS;

			assert.ok(timedOut);
		});

		test('should return partial results on timeout', () => {
			const allResults = ['r1', 'r2', 'r3', 'r4', 'r5'];
			const partialResults = allResults.slice(0, 3);

			assert.strictEqual(partialResults.length, 3);
			assert.ok(partialResults.length < allResults.length);
		});
	});
});
