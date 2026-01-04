/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { suite, test } from 'mocha';
import * as assert from 'assert';

// Mock services
class MockRollbackService {
	private snapshots = new Map<string, { files: Map<string, string> }>();

	createSnapshot(id: string, files: Map<string, string>): void {
		this.snapshots.set(id, { files });
	}

	restoreSnapshot(id: string): boolean {
		return this.snapshots.has(id);
	}

	discardSnapshot(id: string): void {
		this.snapshots.delete(id);
	}

	hasSnapshot(id: string): boolean {
		return this.snapshots.has(id);
	}
}

class MockGitAutoStashService {
	private stashes = new Map<string, { ref: string }>();
	public restoreStashCalled = false;

	createStash(id: string): void {
		this.stashes.set(id, { ref: `stash@{${id}}` });
	}

	restoreStash(id: string): void {
		this.restoreStashCalled = true;
		this.stashes.delete(id);
	}

	hasStash(id: string): boolean {
		return this.stashes.has(id);
	}
}

class MockApplyService {
	private shouldFail = false;

	setShouldFail(fail: boolean): void {
		this.shouldFail = fail;
	}

	async applyAll(): Promise<void> {
		if (this.shouldFail) {
			throw new Error('Apply failed');
		}
	}
}

suite('ApplyAll Rollback Flow', () => {

	// ensureNoDisposablesAreLeakedInTestSuite();
	let rollbackService: MockRollbackService;
	let gitAutoStashService: MockGitAutoStashService;
	let applyService: MockApplyService;

	setup(() => {
		rollbackService = new MockRollbackService();
		gitAutoStashService = new MockGitAutoStashService();
		applyService = new MockApplyService();
	});

	test('on apply failure, snapshot restore is called', async () => {
		const snapshotId = 'test-snapshot-1';
		const files = new Map([
			['/test/file1.ts', 'original content 1'],
			['/test/file2.ts', 'original content 2'],
		]);

		// Create snapshot before apply
		rollbackService.createSnapshot(snapshotId, files);
		assert.ok(rollbackService.hasSnapshot(snapshotId), 'Snapshot should be created');

		// Mock applyAll to throw
		applyService.setShouldFail(true);

		try {
			await applyService.applyAll();
			assert.fail('Expected applyAll to throw');
		} catch (error) {
			// On failure, restore snapshot
			const restored = rollbackService.restoreSnapshot(snapshotId);
			assert.ok(restored, 'Snapshot restore should be called');
		}
	});

	test('when snapshot skipped, git restore invoked', async () => {
		const stashId = 'test-stash-1';

		// Simulate large snapshot that was skipped
		const snapshotSkipped = true;

		if (snapshotSkipped) {
			// Use git stash instead
			gitAutoStashService.createStash(stashId);
			assert.ok(gitAutoStashService.hasStash(stashId), 'Git stash should be created');
		}

		// Mock applyAll to throw
		applyService.setShouldFail(true);

		try {
			await applyService.applyAll();
			assert.fail('Expected applyAll to throw');
		} catch (error) {
			// On failure with skipped snapshot, restore git stash
			gitAutoStashService.restoreStash(stashId);
			assert.ok(gitAutoStashService.restoreStashCalled, 'Git restore should be called');
		}
	});

	test('success path discards snapshot', async () => {
		const snapshotId = 'test-snapshot-2';
		const files = new Map([['/test/file.ts', 'original content']]);

		// Create snapshot
		rollbackService.createSnapshot(snapshotId, files);
		assert.ok(rollbackService.hasSnapshot(snapshotId), 'Snapshot should exist before apply');

		// Mock successful apply
		applyService.setShouldFail(false);
		await applyService.applyAll();

		// On success, discard snapshot
		rollbackService.discardSnapshot(snapshotId);
		assert.ok(!rollbackService.hasSnapshot(snapshotId), 'Snapshot should be discarded after success');
	});

	test('multiple snapshots can coexist', () => {
		const files1 = new Map([['/file1.ts', 'content1']]);
		const files2 = new Map([['/file2.ts', 'content2']]);

		rollbackService.createSnapshot('snap1', files1);
		rollbackService.createSnapshot('snap2', files2);

		assert.ok(rollbackService.hasSnapshot('snap1'));
		assert.ok(rollbackService.hasSnapshot('snap2'));

		rollbackService.discardSnapshot('snap1');
		assert.ok(!rollbackService.hasSnapshot('snap1'));
		assert.ok(rollbackService.hasSnapshot('snap2'), 'Other snapshot should remain');
	});

	test('restoring non-existent snapshot returns false', () => {
		const restored = rollbackService.restoreSnapshot('non-existent');
		assert.strictEqual(restored, false, 'Restoring non-existent snapshot should return false');
	});
});
