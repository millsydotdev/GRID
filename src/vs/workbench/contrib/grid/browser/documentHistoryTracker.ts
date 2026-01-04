/*---------------------------------------------------------------------------------------------
 *  Copyright (c) GRID Editor. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITextModel } from '../../../../editor/common/model.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { INextEditService, IDocumentChange } from './nextEditService.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../../editor/common/core/range.js';

/**
 * Document History Tracker
 *
 * Tracks all document changes and feeds them to the NextEditService for analysis.
 */
export class DocumentHistoryTracker extends Disposable {
	private readonly trackedModels = new Map<string, ITextModel>();

	constructor(
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService,
		@INextEditService private readonly nextEditService: INextEditService
	) {
		super();

		// Start tracking all open editors
		this.initializeTracking();
	}

	/**
	 * Initialize tracking for all open editors
	 */
	private initializeTracking(): void {
		// Listen for new editors
		this._register(
			this.codeEditorService.onCodeEditorAdd((editor) => {
				const model = editor.getModel();
				if (model) {
					this.trackModel(model);
				}
			})
		);

		// Track existing editors
		for (const editor of this.codeEditorService.listCodeEditors()) {
			const model = editor.getModel();
			if (model) {
				this.trackModel(model);
			}
		}
	}

	/**
	 * Start tracking a text model for changes
	 */
	private trackModel(model: ITextModel): void {
		const uriKey = model.uri.toString();

		if (this.trackedModels.has(uriKey)) {
			return; // Already tracking
		}

		this.trackedModels.set(uriKey, model);

		// Listen for content changes
		const changeListener = model.onDidChangeContent((e: any) => {
			this.onModelContentChanged(model, e);
		});

		// Clean up when model is disposed
		const disposeListener = model.onWillDispose(() => {
			this.trackedModels.delete(uriKey);
			changeListener.dispose();
			disposeListener.dispose();
		});

		this._register(changeListener);
		this._register(disposeListener);
	}

	/**
	 * Handle model content changes
	 */
	private onModelContentChanged(model: ITextModel, event: any): void {
		// Convert VS Code change event to our IDocumentChange format
		const documentChange: IDocumentChange = {
			uri: model.uri,
			timestamp: Date.now(),
			versionId: model.getVersionId(),
			changes: event.changes.map((change: any) => ({
				range: new Range(
					change.range.startLineNumber,
					change.range.startColumn,
					change.range.endLineNumber,
					change.range.endColumn
				),
				rangeLength: change.rangeLength,
				text: change.text,
			})),
		};

		// Send to NextEditService for analysis
		this.nextEditService.trackChange(documentChange);
	}

	/**
	 * Stop tracking a model
	 */
	stopTracking(uri: URI): void {
		const uriKey = uri.toString();
		this.trackedModels.delete(uriKey);
	}

	/**
	 * Get all tracked models
	 */
	getTrackedModels(): ITextModel[] {
		return Array.from(this.trackedModels.values());
	}
}
