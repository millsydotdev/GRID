import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  isConnected: boolean;
  isLoading: boolean;
  messageCount: number;
  showExitHint?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isConnected,
  isLoading,
  messageCount,
  showExitHint = false,
}) => {
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Box flexGrow={1}>
        {/* Connection status */}
        <Text dimColor>
          {isConnected ? (
            <Text color="green">● Connected</Text>
          ) : (
            <Text color="red">● Disconnected</Text>
          )}
        </Text>

        {/* Loading indicator */}
        {isLoading && (
          <Text dimColor color="yellow">
            {' '}
            | Processing...
          </Text>
        )}

        {/* Message count */}
        <Text dimColor> | Messages: {messageCount}</Text>
      </Box>

      {/* Keyboard shortcuts */}
      <Box>
        {showExitHint ? (
          <Text color="yellow" bold>
            Press Ctrl+C again to exit
          </Text>
        ) : (
          <Text dimColor>
            Ctrl+C×2: Exit | Ctrl+D: Stop | Ctrl+L: Clear
          </Text>
        )}
      </Box>
    </Box>
  );
};
