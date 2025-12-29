/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';
import { Event } from '../../../../base/common/event.js';

export const ILocalContextService = createDecorator<ILocalContextService>('localContextService');

export interface IEmbedding {
    vector: number[];
    text: string;
    uri: URI;
}

export interface ILocalContextService {
    readonly _serviceBrand: undefined;

    /**
     * Status of the local indexing process
     */
    readonly isIndexing: boolean;
    readonly onDidChangeStatus: Event<void>;

    /**
     * Retrieve relevant context for a query
     */
    retrieve(query: string, limit?: number): Promise<IEmbedding[]>;

    /**
     * Index a file or workspace
     */
    indexWorkspace(workspaceUri: URI): Promise<void>;
}
