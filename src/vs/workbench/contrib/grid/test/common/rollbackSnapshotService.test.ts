/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { suite, test } from 'mocha';
import * as assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { IFileService, FileType } from '../../../../../platform/files/common/files.js';
import { ITextModelService, IResolvedTextEditorModel } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IAuditLogService } from '../../common/auditLogService.js';
import { IRollbackSnapshotService } from '../../common/rollbackSnapshotService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { Event } from '../../../../../base/common/event.js';

// Mock services
class MockFileService {
	private _files = new Map<string, { content: string; mtime: number }>();

	setFile(path: string, content: string, mtime: number = Date.now()): void {
		this._files.set(path, { content, mtime });
	}

	async stat(resource: URI) {
		const path = resource.fsPath;
		const file = this._files.get(path);
		if (!file) {
			throw new Error(`File not found: ${path}`);
		}
		return {
			type: FileType.File,
			mtime: file.mtime,
			ctime: 0,
			size: file.content.length,
			name: path.split('/').pop()!,
			resource,
		};
	}

	async readFile(resource: URI) {
		const path = resource.fsPath;
		const file = this._files.get(path);
		if (!file) {
			throw new Error(`File not found: ${path}`);
		}
		return {
			value: VSBuffer.fromString(file.content),
			resource,
		};
	}

	async writeFile(resource: URI, content: VSBuffer) {
		const path = resource.fsPath;
		this._files.set(path, {
			content: content.toString(),
			mtime: Date.now(),
		});
	}

	getFileContent(path: string): string | undefined {
		return this._files.get(path)?.content;
	}
}

class MockTextModel {
	private _disposed = false;

	constructor(private _value: string) {}

	getValue(): string {
		return this._value;
	}

	setValue(value: string): void {
		this._value = value;
	}

	isDisposed(): boolean {
		return this._disposed;
	}

	dispose(): void {
		this._disposed = true;
	}
}

class MockResolvedTextEditorModel {
	textEditorModel: ITextModel;
	isReadonly: boolean = false;
	readonly onDidChangeReadonly = Event.None;
	readonly onWillDispose = Event.None;

	constructor(content: string) {
		this.textEditorModel = new MockTextModel(content) as unknown as ITextModel;
	}

	dispose(): void {
		this.textEditorModel.dispose();
	}

	load(): Promise<IResolvedTextEditorModel> {
		return Promise.resolve(this as any);
	}

	save(): Promise<void> {
		return Promise.resolve();
	}

	revert(): Promise<void> {
		return Promise.resolve();
	}

	createSnapshot(): any {
		return null;
	}
}

class MockTextModelService {
	private _models = new Map<string, MockResolvedTextEditorModel>();

	setModel(path: string, content: string): void {
		this._models.set(path, new MockResolvedTextEditorModel(content));
	}

	async createModelReference(resource: URI) {
		const path = resource.fsPath;
		const model = this._models.get(path);

		// Return a reference with the model and a dispose method
		return {
			object: model || new MockResolvedTextEditorModel(''),
			dispose: () => {
				// Reference disposal
			},
		};
	}

	getModelContent(path: string): string | undefined {
		const model = this._models.get(path);
		return model ? model.textEditorModel.getValue() : undefined;
	}
}

class MockConfigurationService {
	private _config = new Map<string, any>();

	onDidChangeConfiguration = Event.None;

	getValue<T>(key: string): T | undefined {
		return this._config.get(key);
	}

	setValue(key: string, value: any): void {
		this._config.set(key, value);
	}
}

class MockAuditLogService {
	private _entries: any[] = [];

	isEnabled(): boolean {
		return true;
	}

	async append(entry: any): Promise<void> {
		this._entries.push(entry);
	}

	getEntries(): any[] {
		return this._entries;
	}
}

suite('RollbackSnapshotService', () => {

	// ensureNoDisposablesAreLeakedInTestSuite();
	let instantiationService: TestInstantiationService;
	let fileService: MockFileService;
	let textModelService: MockTextModelService;
	let configService: MockConfigurationService;
	let auditLogService: MockAuditLogService;
	let rollbackService: IRollbackSnapshotService;

	function setupServices() {
		instantiationService = new TestInstantiationService();
		fileService = new MockFileService();
		textModelService = new MockTextModelService();
		configService = new MockConfigurationService();
		auditLogService = new MockAuditLogService();

		// Enable the service by default
		configService.setValue('grid.safety.rollback.enable', true);
		configService.setValue('grid.safety.rollback.maxSnapshotBytes', 5_000_000);

		instantiationService.stub(IFileService, fileService as any);
		instantiationService.stub(ITextModelService, textModelService as any);
		instantiationService.stub(IConfigurationService, configService as any);
		instantiationService.stub(ILogService, new NullLogService());
		instantiationService.stub(IAuditLogService, auditLogService as any);

		rollbackService = instantiationService.createInstance(
			require('../../common/rollbackSnapshotService.js').RollbackSnapshotService
		) as IRollbackSnapshotService;
	}

	test('creates snapshot of N files', async () => {
		setupServices();

		// Create 3 test files
		const file1 = '/test/file1.ts';
		const file2 = '/test/file2.ts';
		const file3 = '/test/file3.ts';

		fileService.setFile(file1, 'console.log("file1");', 1000);
		fileService.setFile(file2, 'console.log("file2");', 2000);
		fileService.setFile(file3, 'console.log("file3");', 3000);

		// Call createSnapshot
		const snapshot = await rollbackService.createSnapshot([file1, file2, file3]);

		// Assert snapshot contains all 3 files with correct content
		assert.strictEqual(snapshot.files.length, 3, 'Snapshot should contain 3 files');
		assert.strictEqual(snapshot.files[0].path, file1);
		assert.strictEqual(snapshot.files[0].content, 'console.log("file1");');
		assert.strictEqual(snapshot.files[1].path, file2);
		assert.strictEqual(snapshot.files[1].content, 'console.log("file2");');
		assert.strictEqual(snapshot.files[2].path, file3);
		assert.strictEqual(snapshot.files[2].content, 'console.log("file3");');
		assert.strictEqual(snapshot.skipped, false, 'Snapshot should not be skipped');
	});

	test('reads from dirty buffer if available', async () => {
		setupServices();

		const filePath = '/test/dirty.ts';
		const diskContent = 'console.log("on disk");';
		const bufferContent = 'console.log("in buffer - modified");';

		// Set file on disk
		fileService.setFile(filePath, diskContent, 1000);

		// Set modified buffer content
		textModelService.setModel(filePath, bufferContent);

		// Create snapshot
		const snapshot = await rollbackService.createSnapshot([filePath]);

		// Assert snapshot contains modified buffer content, not disk content
		assert.strictEqual(snapshot.files.length, 1);
		assert.strictEqual(snapshot.files[0].content, bufferContent, 'Should use buffer content, not disk content');
	});

	test('guards on maxSnapshotBytes', async () => {
		setupServices();

		// Set a small max size
		configService.setValue('grid.safety.rollback.maxSnapshotBytes', 50);

		// Recreate service to pick up new config
		rollbackService = instantiationService.createInstance(
			require('../../common/rollbackSnapshotService.js').RollbackSnapshotService
		) as IRollbackSnapshotService;

		// Create files that will exceed limit
		const file1 = '/test/small.ts';
		const file2 = '/test/large.ts';

		fileService.setFile(file1, 'small', 1000); // 5 bytes
		fileService.setFile(file2, 'this is a very large file content that exceeds the limit', 2000); // > 50 bytes

		// Call createSnapshot
		const snapshot = await rollbackService.createSnapshot([file1, file2]);

		// Assert snapshot.skipped === true
		assert.strictEqual(snapshot.skipped, true, 'Snapshot should be marked as skipped');

		// Assert only files within limit are included
		assert.strictEqual(snapshot.files.length, 1, 'Only one file should be included');
		assert.strictEqual(snapshot.files[0].path, file1, 'First small file should be included');
	});

	test('restoreSnapshot restores files', async () => {
		setupServices();

		const file1 = '/test/restore1.ts';
		const file2 = '/test/restore2.ts';
		const originalContent1 = 'original content 1';
		const originalContent2 = 'original content 2';
		const modifiedContent1 = 'modified content 1';
		const modifiedContent2 = 'modified content 2';

		// Set original files
		fileService.setFile(file1, originalContent1, 1000);
		fileService.setFile(file2, originalContent2, 2000);

		// Create snapshot
		const snapshot = await rollbackService.createSnapshot([file1, file2]);

		// Modify files (both on disk and in buffer)
		fileService.setFile(file1, modifiedContent1, 3000);
		fileService.setFile(file2, modifiedContent2, 4000);
		textModelService.setModel(file1, modifiedContent1);
		textModelService.setModel(file2, modifiedContent2);

		// Verify files are modified
		assert.strictEqual(fileService.getFileContent(file1), modifiedContent1);
		assert.strictEqual(fileService.getFileContent(file2), modifiedContent2);

		// Restore snapshot
		await rollbackService.restoreSnapshot(snapshot.id);

		// Assert files match snapshot content
		assert.strictEqual(fileService.getFileContent(file1), originalContent1, 'File 1 should be restored');
		assert.strictEqual(fileService.getFileContent(file2), originalContent2, 'File 2 should be restored');
		assert.strictEqual(textModelService.getModelContent(file1), originalContent1, 'Buffer 1 should be restored');
		assert.strictEqual(textModelService.getModelContent(file2), originalContent2, 'Buffer 2 should be restored');
	});

	test('getLastSnapshot returns most recent snapshot', async () => {
		setupServices();

		const file = '/test/file.ts';
		fileService.setFile(file, 'content', 1000);

		// Create first snapshot
		const snapshot1 = await rollbackService.createSnapshot([file]);
		assert.strictEqual(rollbackService.getLastSnapshot()?.id, snapshot1.id);

		// Create second snapshot
		const snapshot2 = await rollbackService.createSnapshot([file]);
		assert.strictEqual(rollbackService.getLastSnapshot()?.id, snapshot2.id);
	});

	test('discardSnapshot removes snapshot', async () => {
		setupServices();

		const file = '/test/file.ts';
		fileService.setFile(file, 'content', 1000);

		const snapshot = await rollbackService.createSnapshot([file]);
		assert.ok(rollbackService.getLastSnapshot(), 'Snapshot should exist');

		await rollbackService.discardSnapshot(snapshot.id);
		assert.strictEqual(rollbackService.getLastSnapshot(), undefined, 'Snapshot should be discarded');
	});

	test('throws when disabled', async () => {
		setupServices();

		// Disable the service
		configService.setValue('grid.safety.rollback.enable', false);

		// Recreate service to pick up new config
		rollbackService = instantiationService.createInstance(
			require('../../common/rollbackSnapshotService.js').RollbackSnapshotService
		) as IRollbackSnapshotService;

		const file = '/test/file.ts';
		fileService.setFile(file, 'content', 1000);

		// Should throw when trying to create snapshot
		await assert.rejects(
			async () => await rollbackService.createSnapshot([file]),
			/disabled/i,
			'Should throw error when service is disabled'
		);
	});
});
