/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { CountTokensCallback, IToolData, IToolImpl, IToolInvocation, IToolResult, ToolDataSource, ToolProgress } from '../../common/languageModelToolsService.js';

interface IBrowserSubagentToolParameters {
    query: string;
    searchDepth?: 'basic' | 'advanced';
    maxResults?: number;
}

// --- Response Interfaces ---
interface ITavilySearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
}

interface ITavilyResponse {
    results: ITavilySearchResult[];
    answer?: string;
}

interface ISerperResult {
    title: string;
    link: string;
    snippet: string;
}

interface ISerperResponse {
    organic: ISerperResult[];
    answerBox?: { answer?: string };
}

interface IBraveResult {
    title: string;
    url: string;
    description: string;
}

interface IBraveResponse {
    web?: { results: IBraveResult[] };
}

type SearchProvider = 'auto' | 'tavily' | 'brave' | 'serper' | 'serpapi' | 'exa' | 'perplexity' | 'firecrawl' | 'jina' | 'duckduckgo';

export const BrowserSubagentToolId = 'grid_browserSubagent';

export const BrowserSubagentToolData: IToolData = {
    id: BrowserSubagentToolId,
    toolReferenceName: 'browserSubagent',
    displayName: localize('browserSubagent.displayName', "Browser Subagent"),
    modelDescription: localize('browserSubagent.modelDescription', "Autonomous web research using multiple search providers (Tavily, Serper, Brave, etc.). Use for researching topics, finding documentation, or answering questions that require up-to-date web information."),
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: localize('browserSubagent.query.description', "The research query to search the web.")
            },
            searchDepth: {
                type: 'string',
                enum: ['basic', 'advanced'],
                description: localize('browserSubagent.searchDepth.description', "Search depth: 'basic' for quick results, 'advanced' for deeper research.")
            },
            maxResults: {
                type: 'number',
                description: localize('browserSubagent.maxResults.description', "Maximum number of results to return (1-10).")
            }
        },
        required: ['query']
    }
};

export class BrowserSubagentTool implements IToolImpl {

    constructor(
        @IConfigurationService private readonly configurationService: IConfigurationService
    ) { }

    async invoke(invocation: IToolInvocation, _countTokens: CountTokensCallback, _progress: ToolProgress, _token: CancellationToken): Promise<IToolResult> {
        const parameters = invocation.parameters as IBrowserSubagentToolParameters;
        const query = parameters.query;
        const searchDepth = parameters.searchDepth || 'basic';
        const maxResults = Math.min(Math.max(parameters.maxResults || 5, 1), 10);

        if (!query) {
            return { content: [{ kind: 'text', value: 'No query provided.' }] };
        }

        // Determine which provider to use
        const provider = this.selectProvider();

        switch (provider) {
            case 'tavily':
                return this.searchTavily(query, searchDepth, maxResults);
            case 'serper':
                return this.searchSerper(query, maxResults);
            case 'brave':
                return this.searchBrave(query, maxResults);
            case 'duckduckgo':
            default:
                return this.searchDuckDuckGo(query);
        }
    }

    private selectProvider(): SearchProvider {
        const preferred = this.configurationService.getValue<SearchProvider>('grid.browserSubagent.preferredProvider') || 'auto';

        if (preferred !== 'auto') {
            // Check if the preferred provider has an API key configured
            const keyMap: Record<SearchProvider, string> = {
                'tavily': 'grid.browserSubagent.tavilyApiKey',
                'brave': 'grid.browserSubagent.braveApiKey',
                'serper': 'grid.browserSubagent.serperApiKey',
                'serpapi': 'grid.browserSubagent.serpApiKey',
                'exa': 'grid.browserSubagent.exaApiKey',
                'perplexity': 'grid.browserSubagent.perplexityApiKey',
                'firecrawl': 'grid.browserSubagent.firecrawlApiKey',
                'jina': 'grid.browserSubagent.jinaApiKey',
                'duckduckgo': '',
                'auto': '',
            };

            if (preferred === 'duckduckgo' || this.configurationService.getValue<string>(keyMap[preferred])) {
                return preferred;
            }
        }

        // Auto-select: use first configured provider
        const providerPriority: SearchProvider[] = ['tavily', 'serper', 'brave', 'exa', 'perplexity'];
        for (const p of providerPriority) {
            const keyPath = `grid.browserSubagent.${p === 'tavily' ? 'tavilyApiKey' : p === 'brave' ? 'braveApiKey' : p + 'ApiKey'}`;
            if (this.configurationService.getValue<string>(keyPath)) {
                return p;
            }
        }

        return 'duckduckgo';
    }

    // --- Provider Implementations ---

    private async searchTavily(query: string, searchDepth: string, maxResults: number): Promise<IToolResult> {
        const apiKey = this.configurationService.getValue<string>('grid.browserSubagent.tavilyApiKey');
        try {
            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    query,
                    search_depth: searchDepth,
                    max_results: maxResults,
                    include_answer: true,
                    include_raw_content: false
                })
            });

            if (!response.ok) {
                return { content: [{ kind: 'text', value: `Tavily search failed: ${response.status}` }] };
            }

            const data = await response.json() as ITavilyResponse;
            return this.formatResults('Tavily', query, data.answer, data.results.map(r => ({ title: r.title, url: r.url, snippet: r.content })));
        } catch (error) {
            return { content: [{ kind: 'text', value: `Tavily error: ${error instanceof Error ? error.message : String(error)}` }] };
        }
    }

    private async searchSerper(query: string, maxResults: number): Promise<IToolResult> {
        const apiKey = this.configurationService.getValue<string>('grid.browserSubagent.serperApiKey');
        try {
            const response = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': apiKey || ''
                },
                body: JSON.stringify({ q: query, num: maxResults })
            });

            if (!response.ok) {
                return { content: [{ kind: 'text', value: `Serper search failed: ${response.status}` }] };
            }

            const data = await response.json() as ISerperResponse;
            const answer = data.answerBox?.answer;
            return this.formatResults('Serper', query, answer, (data.organic || []).map(r => ({ title: r.title, url: r.link, snippet: r.snippet })));
        } catch (error) {
            return { content: [{ kind: 'text', value: `Serper error: ${error instanceof Error ? error.message : String(error)}` }] };
        }
    }

    private async searchBrave(query: string, maxResults: number): Promise<IToolResult> {
        const apiKey = this.configurationService.getValue<string>('grid.browserSubagent.braveApiKey');
        try {
            const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': apiKey || ''
                }
            });

            if (!response.ok) {
                return { content: [{ kind: 'text', value: `Brave search failed: ${response.status}` }] };
            }

            const data = await response.json() as IBraveResponse;
            const results = data.web?.results || [];
            return this.formatResults('Brave', query, undefined, results.map(r => ({ title: r.title, url: r.url, snippet: r.description })));
        } catch (error) {
            return { content: [{ kind: 'text', value: `Brave error: ${error instanceof Error ? error.message : String(error)}` }] };
        }
    }

    private async searchDuckDuckGo(query: string): Promise<IToolResult> {
        try {
            const response = await fetch('https://lite.duckduckgo.com/lite/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `q=${encodeURIComponent(query)}`
            });

            if (!response.ok) {
                return { content: [{ kind: 'text', value: `DuckDuckGo search failed: ${response.status}` }] };
            }

            const html = await response.text();
            const results = this.parseDuckDuckGoLite(html);

            return {
                content: [{
                    kind: 'text',
                    value: results.length > 0
                        ? `## Search Results (DuckDuckGo - No API Key Required)\n\n${results.join('\n\n')}\n\n> **Tip**: Configure Tavily, Serper, or Brave API key in settings for better results.`
                        : 'No results found.'
                }]
            };
        } catch (error) {
            return { content: [{ kind: 'text', value: `DuckDuckGo error: ${error instanceof Error ? error.message : String(error)}` }] };
        }
    }

    // --- Helpers ---

    private formatResults(provider: string, query: string, answer: string | undefined, results: { title: string; url: string; snippet: string }[]): IToolResult {
        const parts: string[] = [];

        if (answer) {
            parts.push(`## Summary\n${answer}`);
        }

        if (results.length > 0) {
            parts.push(`## Search Results for "${query}" (via ${provider})\n`);
            for (const r of results) {
                parts.push(`### [${r.title}](${r.url})\n${r.snippet}\n`);
            }
        }

        return { content: [{ kind: 'text', value: parts.length > 0 ? parts.join('\n') : 'No results found.' }] };
    }

    private parseDuckDuckGoLite(html: string): string[] {
        const results: string[] = [];
        const resultLinkRegex = /<a[^>]*class=["']result-link["'][^>]*>(.*?)<\/a>/g;
        const resultSnippetRegex = /<td[^>]*class=["']result-snippet["'][^>]*>(.*?)<\/td>/g;

        const links: string[] = [];
        let match;
        while ((match = resultLinkRegex.exec(html)) !== null) {
            links.push(match[1].replace(/<[^>]+>/g, '').trim());
        }

        const snippets: string[] = [];
        while ((match = resultSnippetRegex.exec(html)) !== null) {
            snippets.push(match[1].replace(/<[^>]+>/g, '').trim());
        }

        for (let i = 0; i < Math.min(links.length, snippets.length, 5); i++) {
            if (links[i] && snippets[i]) {
                results.push(`**${links[i]}**\n${snippets[i]}`);
            }
        }

        return results;
    }
}
