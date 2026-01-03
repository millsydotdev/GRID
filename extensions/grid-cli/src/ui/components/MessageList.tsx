import React from 'react';
import { Box, Text } from 'ink';
import { Message } from '../../services/GridCLIClient.js';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';

// Configure marked for terminal output
marked.use(markedTerminal() as any);

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <Box flexDirection="column">
      {messages.map((message, index) => (
        <MessageItem key={index} message={message} />
      ))}
    </Box>
  );
};

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const color = isUser ? 'cyan' : 'green';
  const prefix = isUser ? '❯' : '●';

  // Render markdown for assistant messages
  const content =
    !isUser && message.content
      ? marked.parse(message.content, { async: false }) as string
      : message.content;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color={color}>
          {prefix} {isUser ? 'You' : 'Assistant'}
        </Text>
        {message.timestamp && (
          <Text dimColor> {new Date(message.timestamp).toLocaleTimeString()}</Text>
        )}
      </Box>
      <Box paddingLeft={2}>
        <Text>{content}</Text>
      </Box>
      {message.toolCalls && message.toolCalls.length > 0 && (
        <Box paddingLeft={2} marginTop={1}>
          <Text dimColor>
            {message.toolCalls.length} tool call(s) executed
          </Text>
        </Box>
      )}
    </Box>
  );
};
