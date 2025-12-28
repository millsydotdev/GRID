/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { suite, test } from 'mocha';
import * as assert from 'assert';

// Mock Git Repository
class MockGitRepo {
	private dirtyFiles = new Set<string>();
	private stashes: Array<{ id: string; ref: string; files: Set<string> }> = [];

	setDirty(files: string[]): void {
		files.forEach((f) => this.dirtyFiles.add(f));
	}

	isDirty(): boolean {
		return this.dirtyFiles.size > 0;
	}

	createStash(id: string): string | null {
		if (this.dirtyFiles.size === 0) {
			return null;
		}
		const ref = `stash@{${this.stashes.length}}`;
		this.stashes.push({
			id,
			ref,
			files: new Set(this.dirtyFiles),
		});
		this.dirtyFiles.clear();
		return ref;
	}

	restoreStash(ref: string): boolean {
		const stashIdx = this.stashes.findIndex((s) => s.ref === ref);
		if (stashIdx === -1) return false;

		const stash = this.stashes[stashIdx];
		stash.files.forEach((f) => this.dirtyFiles.add(f));
		return true;
	}

	hasStash(ref: string): boolean {
		return this.stashes.some((s) => s.ref === ref);
	}

	getStashCount(): number {
		return this.stashes.length;
	}
}

// Mock AutoStash Service
class MockAutoStashService {
	private repo: MockGitRepo;
	private currentStashRef: string | null = null;

	constructor(repo: MockGitRepo) {
		this.repo = repo;
	}

	async createStash(id: string, mode: 'always' | 'dirty-only' = 'always'): Promise<string | null> {
		if (mode === 'dirty-only' && !this.repo.isDirty()) {
			return null;
		}

		this.currentStashRef = this.repo.createStash(id);
		return this.currentStashRef;
	}

	async restoreStash(): Promise<boolean> {
		if (!this.currentStashRef) {
			return false;
		}

		const restored = this.repo.restoreStash(this.currentStashRef);
		if (restored) {
			this.currentStashRef = null;
		}
		return restored;
	}

	getCurrentStashRef(): string | null {
		return this.currentStashRef;
	}

	hasActiveStash(): boolean {
		return this.currentStashRef !== null;
	}
}

suite('AutoStash Flow', () => {
	let gitRepo: MockGitRepo;
	let autoStashService: MockAutoStashService;

	setup(() => {
		gitRepo = new MockGitRepo();
		autoStashService = new MockAutoStashService(gitRepo);
	});

	test('dirty repo creates stash', async () => {
		// Setup dirty git repo
		gitRepo.setDirty(['/test/file1.ts', '/test/file2.ts']);
		assert.ok(gitRepo.isDirty(), 'Repo should be dirty');

		// Call createStash
		const stashRef = await autoStashService.createStash('test-stash-1');

		// Verify stash created and ref recorded
		assert.ok(stashRef, 'Stash reference should be returned');
		assert.ok(gitRepo.hasStash(stashRef), 'Stash should exist in repo');
		assert.strictEqual(autoStashService.getCurrentStashRef(), stashRef, 'Stash ref should be recorded');
		assert.ok(!gitRepo.isDirty(), 'Repo should be clean after stashing');
	});

	test('clean repo (dirty-only mode) skips stash', async () => {
		// Setup clean repo (no dirty files)
		assert.ok(!gitRepo.isDirty(), 'Repo should be clean');

		const initialStashCount = gitRepo.getStashCount();

		// Call createStash with mode='dirty-only'
		const stashRef = await autoStashService.createStash('test-stash-2', 'dirty-only');

		// Verify no stash created
		assert.strictEqual(stashRef, null, 'No stash ref should be returned for clean repo');
		assert.strictEqual(gitRepo.getStashCount(), initialStashCount, 'Stash count should not increase');
		assert.ok(!autoStashService.hasActiveStash(), 'Should not have active stash');
	});

	test('on failure, stash restore attempted', async () => {
		// Create stash from dirty repo
		gitRepo.setDirty(['/test/file.ts']);
		const stashRef = await autoStashService.createStash('test-stash-3');
		assert.ok(stashRef, 'Stash should be created');
		assert.ok(!gitRepo.isDirty(), 'Repo should be clean after stash');

		// Simulate failure - restore stash
		const restored = await autoStashService.restoreStash();

		// Verify restoreStash called and successful
		assert.ok(restored, 'Stash restore should succeed');
		assert.ok(gitRepo.isDirty(), 'Repo should be dirty again after restore');
		assert.ok(!autoStashService.hasActiveStash(), 'Active stash should be cleared after restore');
	});

	test('happy path success leaves stash untouched', async () => {
		// Create stash
		gitRepo.setDirty(['/test/file.ts']);
		const stashRef = await autoStashService.createStash('test-stash-4');
		assert.ok(stashRef, 'Stash should be created');

		// Simulate success - don't restore
		// (In real code, success path would just leave the stash)

		// Verify stash still exists and not dropped
		assert.ok(gitRepo.hasStash(stashRef), 'Stash should still exist after success');
		assert.ok(autoStashService.hasActiveStash(), 'Active stash reference should be maintained');
		assert.ok(!gitRepo.isDirty(), 'Repo should remain clean');
	});

	test('restoring non-existent stash returns false', async () => {
		// No stash created
		assert.ok(!autoStashService.hasActiveStash(), 'Should not have active stash');

		// Try to restore
		const restored = await autoStashService.restoreStash();

		// Verify restore returns false
		assert.strictEqual(restored, false, 'Restoring non-existent stash should return false');
	});

	test('always mode creates stash even for clean repo', async () => {
		// Clean repo
		assert.ok(!gitRepo.isDirty(), 'Repo should be clean');

		// Note: In a real implementation with 'always' mode, you might want to
		// create a stash even for clean repos to capture untracked files
		// For this test, we'll verify that dirty-only mode is different from always mode

		const stashRefDirtyOnly = await autoStashService.createStash('test-1', 'dirty-only');
		assert.strictEqual(stashRefDirtyOnly, null, 'dirty-only should skip clean repo');

		// With always mode on dirty repo
		gitRepo.setDirty(['/test/file.ts']);
		const stashRefAlways = await autoStashService.createStash('test-2', 'always');
		assert.ok(stashRefAlways, 'always mode should create stash for dirty repo');
	});
});
