/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { CountTokensCallback, IToolData, IToolInvocation, IToolResult, ToolDataSource, ToolProgress } from '../../common/languageModelToolsService.js';
import { localize } from '../../../../../nls.js';

interface IWebSearchToolParameters {
    query: string;
}

export const WebSearchToolData: IToolData = {
	id: 'workbench.tools.webSearch',
	displayName: localize('webSearch.displayName', "Web Search"),
	modelDescription: localize('webSearch.description', "Search the web for information using DuckDuckGo."),
	source: ToolDataSource.Internal,
	inputSchema: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: localize('webSearch.query.description', "The search query to send to DuckDuckGo.")
			}
		},
		required: ['query']
	}
};

export class WebSearchTool {

    constructor(
    ) { }

    async invoke(invocation: IToolInvocation, _countTokens: CountTokensCallback, _progress: ToolProgress, token: CancellationToken): Promise<IToolResult> {
        const parameters = invocation.parameters as IWebSearchToolParameters;
        const query = parameters.query;

        if (!query) {
            return {
                content: [{
                    type: 'text',
                    text: 'No query provided.'
                }]
            };
        }

        try {
            // Use lite.duckduckgo.com for HTML-only, no-JS search
            const response = await fetch('https://lite.duckduckgo.com/lite/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `q=${encodeURIComponent(query)}`
            });

            if (!response.ok) {
                return {
                    content: [{
                        type: 'text',
                        text: `Web search failed: ${response.status} ${response.statusText}`
                    }]
                };
            }

            const html = await response.text();
            const results = this.parseDuckDuckGoLite(html);

            return {
                content: [{
                    type: 'text',
                    text: results.length > 0 ? results.join('\n\n') : 'No results found.'
                }]
            };

        } catch (error) {
            return {
                content: [{
                    type: 'text',
                    text: `Web search error: ${error instanceof Error ? error.message : String(error)}`
                }]
            };
        }
    }

    private parseDuckDuckGoLite(html: string): string[] {
        // Simple regex-based parsing for DuckDuckGo Lite
        // DDG Lite structure usually involves tables, but we look for result links and snippets.
        // This is a heuristic and might need adjustment if DDG changes markup.

        const results: string[] = [];

        // Split by result rows (heuristically) using <tr class="result-..">
        // But regex on full HTML is fragile. Let's try to match specific patterns.

        // Pattern for link text: <a class="result-link" href="...">TEXT</a>
        // Pattern for snippet: <td class="result-snippet">TEXT</td>

        // Matches sections that look like results
        const resultLinkRegex = /<a[^>]*class=["']result-link["'][^>]*>(.*?)<\/a>/g;
        const resultSnippetRegex = /<td[^>]*class=["']result-snippet["'][^>]*>(.*?)<\/td>/g;

        const links: string[] = [];
        let match;
        while ((match = resultLinkRegex.exec(html)) !== null) {
            // Clean tags
            links.push(match[1].replace(/<[^>]+>/g, '').trim());
        }

        const snippets: string[] = [];
        while ((match = resultSnippetRegex.exec(html)) !== null) {
            snippets.push(match[1].replace(/<[^>]+>/g, '').trim());
        }

        // Combine
        for (let i = 0; i < Math.min(links.length, snippets.length, 5); i++) { // Limit to 5 results
            if (links[i] && snippets[i]) {
                results.push(`**${links[i]}**\n${snippets[i]}`);
            }
        }

        return results;
    }
}
