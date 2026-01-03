/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import React, { useState } from 'react';

export const ApiClient = () => {
    const [method, setMethod] = useState('GET');
    const [url, setUrl] = useState('');
    const [response, setResponse] = useState<string | null>(null);

    const handleSend = () => {
        // Placeholder for actual request logic
        setResponse(JSON.stringify({ message: "Request sent (mock)", method, url }, null, 2));
    };

    return (
        <div className="flex flex-col h-full w-full p-4 gap-4 text-foreground bg-background">
            <div className="text-xl font-bold">GRID API Client</div>

            <div className="flex gap-2">
                <select
                    aria-label="HTTP method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="bg-input text-foreground border border-border rounded px-2 py-1"
                >
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>DELETE</option>
                </select>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter request URL"
                    className="flex-1 bg-input text-foreground border border-border rounded px-2 py-1"
                />
                <button
                    onClick={handleSend}
                    className="bg-primary text-primary-foreground px-4 py-1 rounded hover:opacity-90"
                >
                    Send
                </button>
            </div>

            <div className="flex-1 border border-border rounded bg-muted/50 p-2 overflow-auto">
                {response ? (
                    <pre className="text-xs font-mono">{response}</pre>
                ) : (
                    <div className="text-muted-foreground text-center mt-10">
                        Enter a URL and click Send to see the response.
                    </div>
                )}
            </div>
        </div>
    );
};
