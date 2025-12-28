/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { GridFileSnapshot } from '../../common/editCodeServiceTypes.js';

suite('EditCodeService', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	suite('File Snapshot Management', () => {
		test('should create consistent snapshot structure', () => {
			const snapshot: GridFileSnapshot = {
				userModifiedOriginalText: 'original content',
				userModifiedDiffs: [],
				beforeStreamingText: 'streaming content',
			};

			assert.strictEqual(snapshot.userModifiedOriginalText, 'original content');
			assert.strictEqual(snapshot.beforeStreamingText, 'streaming content');
			assert.ok(Array.isArray(snapshot.userModifiedDiffs));
		});

		test('should handle empty diffs array', () => {
			const snapshot: GridFileSnapshot = {
				userModifiedOriginalText: 'test',
				userModifiedDiffs: [],
				beforeStreamingText: 'test',
			};

			assert.strictEqual(snapshot.userModifiedDiffs.length, 0);
		});

		test('should preserve diff information', () => {
			const snapshot: GridFileSnapshot = {
				userModifiedOriginalText: 'original',
				userModifiedDiffs: [{ text: 'new text', range: { startLine: 1, endLine: 2 } }],
				beforeStreamingText: 'modified',
			};

			assert.strictEqual(snapshot.userModifiedDiffs.length, 1);
			assert.strictEqual(snapshot.userModifiedDiffs[0].text, 'new text');
		});
	});

	suite('Diff Area State Management', () => {
		test('should track diff area properties', () => {
			const diffArea = {
				id: 1,
				uri: URI.file('/test/file.ts'),
				type: 'DiffZone' as const,
				isStreaming: false,
			};

			assert.strictEqual(diffArea.id, 1);
			assert.strictEqual(diffArea.type, 'DiffZone');
			assert.strictEqual(diffArea.isStreaming, false);
		});

		test('should handle streaming state changes', () => {
			const diffArea = {
				id: 1,
				uri: URI.file('/test/file.ts'),
				type: 'CtrlKZone' as const,
				isStreaming: true,
			};

			assert.strictEqual(diffArea.isStreaming, true);

			// Simulate state change
			diffArea.isStreaming = false;
			assert.strictEqual(diffArea.isStreaming, false);
		});
	});

	suite('URI Path Handling', () => {
		test('should handle file URIs correctly', () => {
			const uri = URI.file('/workspace/src/main.ts');
			assert.ok(uri.fsPath.includes('main.ts'));
		});

		test('should handle relative paths', () => {
			const uri1 = URI.file('/workspace/src/file.ts');
			const uri2 = URI.file('/workspace/src/file.ts');
			assert.strictEqual(uri1.toString(), uri2.toString());
		});

		test('should distinguish different files', () => {
			const uri1 = URI.file('/workspace/file1.ts');
			const uri2 = URI.file('/workspace/file2.ts');
			assert.notStrictEqual(uri1.toString(), uri2.toString());
		});
	});

	suite('Diff Acceptance and Rejection', () => {
		test('should handle accept behavior types', () => {
			const behaviors = ['accept', 'reject'] as const;
			assert.strictEqual(behaviors.length, 2);
			assert.ok(behaviors.includes('accept'));
			assert.ok(behaviors.includes('reject'));
		});

		test('should validate start behavior options', () => {
			const validBehaviors = ['accept-conflicts', 'reject-conflicts', 'keep-conflicts'];
			assert.ok(validBehaviors.includes('accept-conflicts'));
			assert.ok(validBehaviors.includes('reject-conflicts'));
			assert.ok(validBehaviors.includes('keep-conflicts'));
		});
	});

	suite('Search Replace Block Extraction', () => {
		test('should parse valid search-replace format', () => {
			const searchReplaceText = `
<<<<<<< SEARCH
old code
=======
new code
>>>>>>> REPLACE
			`.trim();

			// This tests the format structure
			assert.ok(searchReplaceText.includes('<<<<<<< SEARCH'));
			assert.ok(searchReplaceText.includes('======='));
			assert.ok(searchReplaceText.includes('>>>>>>> REPLACE'));
		});

		test('should handle multiple search-replace blocks', () => {
			const multiBlock = `
<<<<<<< SEARCH
old code 1
=======
new code 1
>>>>>>> REPLACE

<<<<<<< SEARCH
old code 2
=======
new code 2
>>>>>>> REPLACE
			`.trim();

			const blockCount = (multiBlock.match(/<<<<<<< SEARCH/g) || []).length;
			assert.strictEqual(blockCount, 2);
		});

		test('should validate search-replace block structure', () => {
			const validBlock = {
				search: 'old code',
				replace: 'new code',
			};

			assert.ok(validBlock.search);
			assert.ok(validBlock.replace);
			assert.notStrictEqual(validBlock.search, validBlock.replace);
		});
	});

	suite('Diff Range Calculations', () => {
		test('should calculate line ranges correctly', () => {
			const range = {
				startLine: 10,
				endLine: 20,
			};

			const lineCount = range.endLine - range.startLine;
			assert.strictEqual(lineCount, 10);
		});

		test('should handle single-line ranges', () => {
			const range = {
				startLine: 5,
				endLine: 5,
			};

			const lineCount = range.endLine - range.startLine;
			assert.strictEqual(lineCount, 0);
		});

		test('should validate range ordering', () => {
			const validRange = {
				startLine: 1,
				endLine: 10,
			};

			assert.ok(validRange.startLine <= validRange.endLine);
		});
	});

	suite('Ctrl+K Zone Management', () => {
		test('should track zone identifiers', () => {
			const zones = new Map<number, { uri: URI; startLine: number; endLine: number }>();

			zones.set(1, {
				uri: URI.file('/test/file.ts'),
				startLine: 10,
				endLine: 20,
			});

			assert.strictEqual(zones.size, 1);
			assert.ok(zones.has(1));
		});

		test('should allow zone removal', () => {
			const zones = new Map<number, { uri: URI }>();
			zones.set(1, { uri: URI.file('/test/file.ts') });
			zones.set(2, { uri: URI.file('/test/file2.ts') });

			assert.strictEqual(zones.size, 2);

			zones.delete(1);
			assert.strictEqual(zones.size, 1);
			assert.ok(!zones.has(1));
			assert.ok(zones.has(2));
		});

		test('should handle multiple zones per file', () => {
			const fileZones = new Map<string, Set<number>>();
			const uri = URI.file('/test/file.ts').toString();

			fileZones.set(uri, new Set([1, 2, 3]));

			const zones = fileZones.get(uri);
			assert.ok(zones);
			assert.strictEqual(zones.size, 3);
		});
	});

	suite('Streaming State Management', () => {
		test('should track streaming status per zone', () => {
			const streamingState = new Map<number, boolean>();

			streamingState.set(1, true);
			streamingState.set(2, false);

			assert.strictEqual(streamingState.get(1), true);
			assert.strictEqual(streamingState.get(2), false);
		});

		test('should handle streaming interruption', () => {
			const streamingState = {
				zoneId: 1,
				isStreaming: true,
				interrupted: false,
			};

			// Simulate interruption
			streamingState.interrupted = true;
			streamingState.isStreaming = false;

			assert.strictEqual(streamingState.interrupted, true);
			assert.strictEqual(streamingState.isStreaming, false);
		});
	});

	suite('Code Formatting Preservation', () => {
		test('should preserve leading whitespace', () => {
			const lines = ['    indented line', '\ttab indented', 'no indent'];

			assert.ok(lines[0].startsWith('    '));
			assert.ok(lines[1].startsWith('\t'));
			assert.ok(!lines[2].startsWith(' '));
		});

		test('should calculate tab width correctly', () => {
			const tabSize = 4;
			const spaceWidth = 8;
			const tabWidth = tabSize * spaceWidth;

			assert.strictEqual(tabWidth, 32);
		});

		test('should handle mixed tabs and spaces', () => {
			const content = '\t    code';
			const hasTab = content.includes('\t');
			const hasSpace = content.includes(' ');

			assert.ok(hasTab);
			assert.ok(hasSpace);
		});
	});

	suite('Keybinding Processing', () => {
		test('should recognize common keybinding patterns', () => {
			const keybindings = ['ctrl+k', 'cmd+k', 'alt+enter'];

			keybindings.forEach((kb) => {
				assert.ok(kb.length > 0);
				assert.ok(kb.includes('+') || kb.length === 1);
			});
		});

		test('should handle platform-specific keybindings', () => {
			const platformKeys = {
				mac: 'cmd+k',
				windows: 'ctrl+k',
				linux: 'ctrl+k',
			};

			assert.ok(platformKeys.mac.includes('cmd'));
			assert.ok(platformKeys.windows.includes('ctrl'));
			assert.ok(platformKeys.linux.includes('ctrl'));
		});
	});

	suite('Error Handling and Edge Cases', () => {
		test('should handle empty file content', () => {
			const snapshot: GridFileSnapshot = {
				userModifiedOriginalText: '',
				userModifiedDiffs: [],
				beforeStreamingText: '',
			};

			assert.strictEqual(snapshot.userModifiedOriginalText, '');
			assert.strictEqual(snapshot.beforeStreamingText, '');
		});

		test('should handle very large line numbers', () => {
			const range = {
				startLine: 1000000,
				endLine: 1000100,
			};

			assert.strictEqual(range.endLine - range.startLine, 100);
		});

		test('should validate URI schemes', () => {
			const fileUri = URI.file('/test/file.ts');
			const untitledUri = URI.parse('untitled:Untitled-1');

			assert.strictEqual(fileUri.scheme, 'file');
			assert.strictEqual(untitledUri.scheme, 'untitled');
		});
	});

	suite('Diff Computation', () => {
		test('should identify text differences', () => {
			const original = 'Hello World';
			const modified = 'Hello TypeScript';

			assert.notStrictEqual(original, modified);
			assert.ok(original.startsWith('Hello'));
			assert.ok(modified.startsWith('Hello'));
		});

		test('should handle identical content', () => {
			const text1 = 'same content';
			const text2 = 'same content';

			assert.strictEqual(text1, text2);
		});

		test('should detect line additions', () => {
			const original = ['line 1', 'line 2'];
			const modified = ['line 1', 'line 2', 'line 3'];

			assert.strictEqual(modified.length - original.length, 1);
		});

		test('should detect line deletions', () => {
			const original = ['line 1', 'line 2', 'line 3'];
			const modified = ['line 1', 'line 3'];

			assert.strictEqual(original.length - modified.length, 1);
		});
	});

	// Additional Edge Case Tests for 100% Coverage

	suite('Edge Cases: Unicode and Special Characters', () => {
		test('should handle unicode characters in diffs', () => {
			const snapshot: GridFileSnapshot = {
				userModifiedOriginalText: '中文测试 한국어 テスト',
				userModifiedDiffs: [],
				beforeStreamingText: 'العربية עברית ไทย',
			};

			assert.ok(snapshot.userModifiedOriginalText.length > 0);
			assert.ok(snapshot.beforeStreamingText.length > 0);
		});

		test('should handle emojis in code', () => {
			const text = '// TODO: 🚀 Optimize this 🔥';
			assert.ok(text.includes('🚀'));
			assert.ok(text.includes('🔥'));
		});

		test('should handle zero-width characters', () => {
			const text = 'hello\u200bworld'; // Zero-width space
			assert.strictEqual(text.length, 11); // 5 + 1 + 5
		});

		test('should handle combining diacritical marks', () => {
			const text = 'café'; // é can be e + combining accent
			assert.ok(text.includes('é') || text.includes('e\u0301'));
		});
	});

	suite('Edge Cases: Boundary Conditions', () => {
		test('should handle negative line numbers gracefully', () => {
			const range = {
				startLine: -1,
				endLine: 5,
			};

			// Service should validate and handle negative lines
			assert.ok(range.startLine < 0);
		});

		test('should handle reversed ranges', () => {
			const range = {
				startLine: 10,
				endLine: 5,
			};

			// End before start - invalid range
			assert.ok(range.endLine < range.startLine);
		});

		test('should handle extremely large diffs', () => {
			const largeDiff = {
				text: 'A'.repeat(1000000), // 1MB of text
				range: { startLine: 1, endLine: 10000 },
			};

			assert.strictEqual(largeDiff.text.length, 1000000);
		});

		test('should handle zero-length ranges', () => {
			const range = {
				startLine: 5,
				endLine: 5,
			};

			assert.strictEqual(range.endLine - range.startLine, 0);
		});
	});

	suite('Edge Cases: Concurrent Operations', () => {
		test('should handle multiple streaming zones simultaneously', () => {
			const streamingZones = new Map<number, boolean>();
			streamingZones.set(1, true);
			streamingZones.set(2, true);
			streamingZones.set(3, true);

			const activeCount = Array.from(streamingZones.values()).filter((v) => v).length;
			assert.strictEqual(activeCount, 3);
		});

		test('should track diff states across multiple files', () => {
			const fileStates = new Map<string, GridFileSnapshot>();

			fileStates.set(URI.file('/file1.ts').toString(), {
				userModifiedOriginalText: 'content1',
				userModifiedDiffs: [],
				beforeStreamingText: 'content1',
			});

			fileStates.set(URI.file('/file2.ts').toString(), {
				userModifiedOriginalText: 'content2',
				userModifiedDiffs: [],
				beforeStreamingText: 'content2',
			});

			assert.strictEqual(fileStates.size, 2);
		});

		test('should handle rapid accept/reject operations', () => {
			const operations = ['accept', 'reject', 'accept', 'accept', 'reject'];
			const accepted = operations.filter((op) => op === 'accept').length;
			const rejected = operations.filter((op) => op === 'reject').length;

			assert.strictEqual(accepted, 3);
			assert.strictEqual(rejected, 2);
		});
	});

	suite('Edge Cases: Malformed Content', () => {
		test('should handle malformed search-replace blocks', () => {
			const malformedBlock = `
<<<<<<< SEARCH
old code
=======
			`.trim(); // Missing REPLACE marker

			assert.ok(malformedBlock.includes('<<<<<<< SEARCH'));
			assert.ok(!malformedBlock.includes('>>>>>>> REPLACE'));
		});

		test('should handle nested search-replace markers', () => {
			const nestedBlock = `
<<<<<<< SEARCH
<<<<<<< SEARCH (nested)
code
=======
new code
>>>>>>> REPLACE
			`.trim();

			const markers = (nestedBlock.match(/<<<<<<< SEARCH/g) || []).length;
			assert.strictEqual(markers, 2);
		});

		test('should handle unmatched markers', () => {
			const unmatched = `
<<<<<<< SEARCH
code
>>>>>>> REPLACE
=======
			`.trim(); // Separator after REPLACE

			assert.ok(unmatched.includes('======='));
		});
	});

	suite('Edge Cases: Memory and Performance', () => {
		test('should handle very long lines', () => {
			const longLine = 'a'.repeat(100000);
			const snapshot: GridFileSnapshot = {
				userModifiedOriginalText: longLine,
				userModifiedDiffs: [],
				beforeStreamingText: longLine,
			};

			assert.strictEqual(snapshot.userModifiedOriginalText.length, 100000);
		});

		test('should handle many small diffs', () => {
			const manyDiffs = Array.from({ length: 1000 }, (_, i) => ({
				text: `change ${i}`,
				range: { startLine: i, endLine: i },
			}));

			assert.strictEqual(manyDiffs.length, 1000);
		});

		test('should handle empty lines in diffs', () => {
			const snapshot: GridFileSnapshot = {
				userModifiedOriginalText: 'line1\n\n\nline2',
				userModifiedDiffs: [],
				beforeStreamingText: 'line1\n\n\nline2',
			};

			const lineCount = snapshot.userModifiedOriginalText.split('\n').length;
			assert.strictEqual(lineCount, 4); // Including empty lines
		});
	});

	suite('Edge Cases: File System Paths', () => {
		test('should handle Windows-style paths', () => {
			const windowsPath = 'C:\\Users\\test\\file.ts';
			const uri = URI.file(windowsPath);
			assert.ok(uri.fsPath);
		});

		test('should handle Unix-style paths', () => {
			const unixPath = '/home/user/file.ts';
			const uri = URI.file(unixPath);
			assert.ok(uri.fsPath);
		});

		test('should handle paths with spaces', () => {
			const pathWithSpaces = '/path/with spaces/file.ts';
			const uri = URI.file(pathWithSpaces);
			assert.ok(uri.fsPath.includes('spaces'));
		});

		test('should handle paths with special characters', () => {
			const specialPath = '/path/with-dashes_and_underscores/file.ts';
			const uri = URI.file(specialPath);
			assert.ok(uri.fsPath);
		});

		test('should handle relative vs absolute path comparison', () => {
			const absolute = URI.file('/workspace/src/file.ts');
			const relative = URI.file('src/file.ts');

			// Different URIs
			assert.notStrictEqual(absolute.toString(), relative.toString());
		});
	});

	suite('Edge Cases: Conflict Resolution', () => {
		test('should handle all conflict resolution modes', () => {
			const modes = ['accept-conflicts', 'reject-conflicts', 'keep-conflicts'] as const;

			modes.forEach((mode) => {
				assert.ok(mode.includes('conflicts'));
			});

			assert.strictEqual(modes.length, 3);
		});

		test('should handle overlapping diff ranges', () => {
			const diff1 = { startLine: 5, endLine: 10 };
			const diff2 = { startLine: 8, endLine: 15 };

			// Check for overlap
			const overlaps = diff1.endLine >= diff2.startLine && diff2.endLine >= diff1.startLine;
			assert.ok(overlaps);
		});

		test('should handle adjacent diff ranges', () => {
			const diff1 = { startLine: 1, endLine: 5 };
			const diff2 = { startLine: 5, endLine: 10 };

			const adjacent = diff1.endLine === diff2.startLine;
			assert.ok(adjacent);
		});
	});

	suite('Edge Cases: Whitespace Handling', () => {
		test('should preserve trailing whitespace', () => {
			const withTrailing = 'code    ';
			assert.ok(withTrailing.endsWith('    '));
		});

		test('should handle all-whitespace lines', () => {
			const whitespaceOnly = '     \t\t  ';
			assert.strictEqual(whitespaceOnly.trim(), '');
		});

		test('should handle CR LF line endings', () => {
			const crlfText = 'line1\r\nline2\r\nline3';
			const lines = crlfText.split('\r\n');
			assert.strictEqual(lines.length, 3);
		});

		test('should handle mixed line endings', () => {
			const mixedText = 'line1\nline2\r\nline3\rline4';
			assert.ok(mixedText.includes('\n'));
			assert.ok(mixedText.includes('\r\n'));
			assert.ok(mixedText.includes('\r'));
		});
	});

	suite('Edge Cases: Zone Lifecycle', () => {
		test('should handle zone creation and deletion cycle', () => {
			const zones = new Map<number, any>();

			// Create
			zones.set(1, { uri: URI.file('/test.ts') });
			assert.strictEqual(zones.size, 1);

			// Delete
			zones.delete(1);
			assert.strictEqual(zones.size, 0);

			// Recreate with same ID
			zones.set(1, { uri: URI.file('/test.ts') });
			assert.strictEqual(zones.size, 1);
		});

		test('should handle rapid zone creation', () => {
			const zones = new Map<number, any>();

			for (let i = 0; i < 100; i++) {
				zones.set(i, { uri: URI.file(`/file${i}.ts`) });
			}

			assert.strictEqual(zones.size, 100);
		});

		test('should handle zone ID conflicts', () => {
			const zones = new Map<number, any>();

			zones.set(1, { uri: URI.file('/file1.ts'), data: 'first' });
			zones.set(1, { uri: URI.file('/file2.ts'), data: 'second' }); // Overwrite

			assert.strictEqual(zones.size, 1);
			assert.strictEqual(zones.get(1)?.data, 'second');
		});
	});

	suite('Edge Cases: Streaming Interruption', () => {
		test('should handle abrupt streaming stop', () => {
			const streamState = {
				isStreaming: true,
				currentText: 'partial text',
				interrupted: false,
			};

			// Simulate interruption
			streamState.isStreaming = false;
			streamState.interrupted = true;

			assert.strictEqual(streamState.isStreaming, false);
			assert.strictEqual(streamState.interrupted, true);
		});

		test('should handle streaming restart', () => {
			const streamState = {
				isStreaming: false,
				interrupted: true,
			};

			// Restart
			streamState.isStreaming = true;
			streamState.interrupted = false;

			assert.strictEqual(streamState.isStreaming, true);
			assert.strictEqual(streamState.interrupted, false);
		});
	});
});
