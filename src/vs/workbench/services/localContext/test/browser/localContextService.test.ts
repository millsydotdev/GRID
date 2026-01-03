/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { LocalContextService } from '../browser/localContextService.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NullLogService } from '../../../../platform/log/common/log.js';

suite('LocalContextService', () => {

	ensureNoDisposablesAreLeakedInTestSuite();
    let service: LocalContextService;
    let instantiationService: TestInstantiationService;

    setup(() => {
        instantiationService = new TestInstantiationService();
        service = new LocalContextService(new NullLogService(), instantiationService);
    });

    teardown(() => {
        service.dispose();
        instantiationService.dispose();
    });

    test('instantiates successfully', () => {
        assert.ok(service);
        assert.strictEqual(service.isIndexing, false);
    });

    test('can retrieve embeddings (mock pipeline)', async () => {
        // Mock the pipeline since we can't easily load the real model in this unit test env without heavy setup
        (service as any)._pipeline = async (text: string) => {
            return { data: new Float32Array([0.1, 0.2, 0.3]) };
        };
        (service as any)._vectors = [
            { text: 'test', vector: [0.1, 0.2, 0.3], uri: URI.file('/test') }
        ];

        const results = await service.retrieve('query');
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].text, 'test');
    });
});
