import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { GridCLIClient, Message, ToolCall } from '../services/GridCLIClient.js';
import { MessageList } from './components/MessageList.js';
import { InputBox } from './components/InputBox.js';
import { StatusBar } from './components/StatusBar.js';
import { ToolCallDisplay } from './components/ToolCallDisplay.js';

interface TUIChatProps {
  client: GridCLIClient;
  initialPrompt?: string;
  agentMode?: string;
}

export const TUIChat: React.FC<TUIChatProps> = ({ client, initialPrompt, agentMode }) => {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentDelta, setCurrentDelta] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([]);
  const [ctrlCCount, setCtrlCCount] = useState(0);
  const lastCtrlCTime = useRef<number>(0);

  // Initialize connection
  useEffect(() => {
    client
      .connect()
      .then(() => setIsConnected(true))
      .catch((err) => {
        setError(`Failed to connect: ${err.message}`);
        setIsConnected(false);
      });

    // Listen for client events
    client.on('message:delta', (delta: string) => {
      setCurrentDelta((prev) => prev + delta);
    });

    client.on('message:complete', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      setCurrentDelta('');
      setIsLoading(false);
      setActiveToolCalls([]);
    });

    client.on('message:error', (err: string) => {
      setError(err);
      setIsLoading(false);
    });

    client.on('tool:call', (toolCall: ToolCall) => {
      setActiveToolCalls((prev) => [...prev, toolCall]);
    });

    client.on('tool:result', (data: any) => {
      setActiveToolCalls((prev) =>
        prev.map((tc) =>
          tc.id === data.toolCallId
            ? { ...tc, result: data.result, status: 'completed' }
            : tc
        )
      );
    });

    client.on('disconnected', () => {
      setIsConnected(false);
    });

    client.on('reconnect:failed', () => {
      setError('Failed to reconnect after multiple attempts');
    });

    // Send initial prompt if provided
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }

    return () => {
      client.removeAllListeners();
      client.disconnect();
    };
  }, []);

  // Handle sending messages
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = {
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      setError(null);

      try {
        await client.sendMessage(content, {
          agentMode,
          stream: true,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      }
    },
    [client, agentMode, isLoading]
  );

  // Handle input events
  useInput((input, key) => {
    // Double Ctrl+C to exit
    if (key.ctrl && input === 'c') {
      const now = Date.now();
      if (now - lastCtrlCTime.current < 1000) {
        exit();
      } else {
        lastCtrlCTime.current = now;
        setCtrlCCount(1);
        setTimeout(() => setCtrlCCount(0), 1000);
      }
      return;
    }

    // Stop generation with Ctrl+D
    if (key.ctrl && input === 'd' && isLoading) {
      client.emit('stop:generation');
      setIsLoading(false);
      return;
    }

    // Clear screen with Ctrl+L
    if (key.ctrl && input === 'l') {
      setMessages([]);
      setCurrentDelta('');
      setError(null);
      client.clearHistory();
      return;
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">
          GRID AI Chat
        </Text>
        {agentMode && (
          <Text color="yellow"> [{agentMode.toUpperCase()} Mode]</Text>
        )}
      </Box>

      {/* Messages */}
      <Box flexGrow={1} flexDirection="column" paddingX={1} paddingY={1}>
        <MessageList messages={messages} />

        {/* Streaming delta */}
        {isLoading && currentDelta && (
          <Box marginTop={1}>
            <Text color="green">● </Text>
            <Text>{currentDelta}</Text>
          </Box>
        )}

        {/* Tool calls */}
        {activeToolCalls.length > 0 && (
          <ToolCallDisplay toolCalls={activeToolCalls} />
        )}

        {/* Error display */}
        {error && (
          <Box marginTop={1} borderStyle="round" borderColor="red" paddingX={1}>
            <Text color="red">Error: {error}</Text>
          </Box>
        )}
      </Box>

      {/* Input Box */}
      <Box flexDirection="column">
        <InputBox
          value={input}
          onChange={setInput}
          onSubmit={handleSendMessage}
          disabled={isLoading || !isConnected}
          placeholder={
            !isConnected
              ? 'Connecting...'
              : isLoading
              ? 'Processing...'
              : 'Type your message...'
          }
        />

        {/* Status Bar */}
        <StatusBar
          isConnected={isConnected}
          isLoading={isLoading}
          messageCount={messages.length}
          showExitHint={ctrlCCount > 0}
        />
      </Box>
    </Box>
  );
};
