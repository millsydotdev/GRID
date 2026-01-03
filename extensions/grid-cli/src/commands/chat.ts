import React from 'react';
import { render } from 'ink';
import { TUIChat } from '../ui/TUIChat.js';
import { GridCLIClient } from '../services/GridCLIClient.js';

interface ChatOptions {
  print?: boolean;
  model?: string;
  agent?: string;
  apiKey?: string;
  provider?: string;
  headless?: boolean;
  json?: boolean;
}

export async function chat(prompt?: string, options?: ChatOptions) {
  const client = new GridCLIClient({
    model: options?.model,
    provider: options?.provider,
    apiKey: options?.apiKey,
  });

  // Headless mode - print response and exit
  if (options?.print || options?.headless) {
    try {
      const response = await client.sendMessage(prompt || '', {
        agentMode: options?.agent,
        stream: false,
      });

      if (options?.json) {
        console.log(JSON.stringify(response, null, 2));
      } else {
        console.log(response.content);
      }
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  // Interactive TUI mode
  const { waitUntilExit, unmount } = render(
    React.createElement(TUIChat, {
      client,
      initialPrompt: prompt,
      agentMode: options?.agent,
    })
  );

  // Handle graceful shutdown
  const cleanup = () => {
    unmount();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Wait for TUI to exit
  await waitUntilExit();
}
