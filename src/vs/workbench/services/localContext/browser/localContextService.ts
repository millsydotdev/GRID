/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILocalContextService, IEmbedding } from '../common/localContext.js';
import { Emitter } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { joinPath } from '../../../../base/common/resources.js';

export class LocalContextService extends Disposable implements ILocalContextService {
    declare readonly _serviceBrand: undefined;

    private _isIndexing = false;
    private readonly _onDidChangeStatus = this._register(new Emitter<void>());
    readonly onDidChangeStatus = this._onDidChangeStatus.event;

    private _vectors: IEmbedding[] = [];
    private _pipeline: any = null;

    constructor(
        @ILogService private readonly logService: ILogService,
        @IFileService private readonly fileService: IFileService
    ) {
        super();
        queueMicrotask(() => {
            void this._initializeModel().catch(error => this.logService.error('LocalContextService: Failed to initialize model', error));
        });
    }

    get isIndexing(): boolean {
        return this._isIndexing;
    }

    private async _initializeModel() {
        try {
            const { pipeline } = await import('@xenova/transformers');
            this.logService.info('LocalContextService: Loading embedding model...');
            this._pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            this.logService.info('LocalContextService: Model loaded.');
        } catch (error) {
            this.logService.error('LocalContextService: Failed to load model', error);
        }
    }

    private async _loadVectors(workspaceUri: URI) {
        const vectorFile = joinPath(workspaceUri, '.grid', 'vectors.json');
        try {
            if (await this.fileService.exists(vectorFile)) {
                const content = await this.fileService.readFile(vectorFile);
                const json = content.value.toString();
                this._vectors = JSON.parse(json);
                this.logService.info(`LocalContextService: Loaded ${this._vectors.length} vectors.`);
            }
        } catch (e) {
            this.logService.error('LocalContextService: Failed to load vectors', e);
        }
    }

    private async _saveVectors(workspaceUri: URI) {
        const vectorDir = joinPath(workspaceUri, '.grid');
        const vectorFile = joinPath(vectorDir, 'vectors.json');
        try {
            if (!await this.fileService.exists(vectorDir)) {
                await this.fileService.createFolder(vectorDir);
            }
            const json = JSON.stringify(this._vectors, null, 2);
            await this.fileService.writeFile(vectorFile, VSBuffer.fromString(json));
            this.logService.info('LocalContextService: Saved vectors.');
        } catch (e) {
            this.logService.error('LocalContextService: Failed to save vectors', e);
        }
    }

    private async _processFile(resource: URI): Promise<void> {
        // Check if already indexed
        const existing = this._vectors.find(v => v.uri.toString() === resource.toString());
        if (!existing && this._pipeline) {
            // Read file content
            try {
                const content = await this.fileService.readFile(resource);
                const text = content.value.toString().substring(0, 1000); // Limit context for now
                if (text.trim().length > 0) {
                    const output = await this._pipeline(text, { pooling: 'mean', normalize: true });
                    const vector = Array.from(output.data) as unknown as number[];
                    this._vectors.push({ vector, text, uri: resource });
                }
            } catch (e) {
                // Ignore read errors
                this.logService.trace(`LocalContextService: Could not read file ${resource.toString()}`, e);
            }
        }
    }

    async indexWorkspace(workspaceUri: URI): Promise<void> {
        if (this._isIndexing) {return;}

        this._isIndexing = true;
        this._onDidChangeStatus.fire();

        try {
            this.logService.info(`LocalContextService: Indexing workspace ${workspaceUri.fsPath}`);
            await this._loadVectors(workspaceUri);

            // Recursive Scanning
            const processDirectory = async (dir: URI) => {
                try {
                    const stat = await this.fileService.resolve(dir);
                    if (!stat.children) {return;}

                    for (const child of stat.children) {
                        if (child.name.startsWith('.') || child.name === 'node_modules') {continue;}

                        if (child.isDirectory) {
                            await processDirectory(child.resource);
                        } else {
                            await this._processFile(child.resource);
                        }
                    }
                } catch (e) {
                    this.logService.error(`LocalContextService: Error scanning ${dir.fsPath}`, e);
                }
            };

            await processDirectory(workspaceUri);
            await this._saveVectors(workspaceUri);

        } finally {
            this._isIndexing = false;
            this._onDidChangeStatus.fire();
            this.logService.info('LocalContextService: Indexing complete.');
        }
    }

    async retrieve(query: string, limit: number = 5): Promise<IEmbedding[]> {
        if (!this._pipeline) {
            return [];
        }

        try {
            const output = await this._pipeline(query, { pooling: 'mean', normalize: true });
            const queryVector = Array.from(output.data) as unknown as number[];

            const scored = this._vectors.map(item => ({
                item,
                score: this.cosineSimilarity(queryVector, item.vector)
            }));

            scored.sort((a, b) => b.score - a.score);
            return scored.slice(0, limit).map(s => s.item);
        } catch (e) {
            this.logService.error('LocalContextService: Retrieve failed', e);
            return [];
        }
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        let dot = 0;
        let magA = 0;
        let magB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    }
}

registerSingleton(ILocalContextService, LocalContextService, 1 /* InstantiationType.Delayed */);
