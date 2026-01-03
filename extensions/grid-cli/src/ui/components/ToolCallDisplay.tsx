import React from 'react';
import { Box, Text } from 'ink';
import { ToolCall } from '../../services/GridCLIClient.js';

interface ToolCallDisplayProps {
  toolCalls: ToolCall[];
}

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ toolCalls }) => {
  return (
    <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="blue" paddingX={1}>
      <Text bold color="blue">
        Tool Calls
      </Text>
      {toolCalls.map((toolCall, index) => (
        <Box key={toolCall.id} marginTop={index > 0 ? 1 : 0} flexDirection="column">
          <Box>
            <Text color="cyan">
              {getStatusIcon(toolCall.status)} {toolCall.name}
            </Text>
          </Box>
          {toolCall.args && (
            <Box paddingLeft={2}>
              <Text dimColor>
                Args: {JSON.stringify(toolCall.args, null, 2)}
              </Text>
            </Box>
          )}
          {toolCall.result && (
            <Box paddingLeft={2}>
              <Text color="green">
                Result: {typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result)}
              </Text>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};

function getStatusIcon(status?: ToolCall['status']): string {
  switch (status) {
    case 'pending':
      return '○';
    case 'running':
      return '◐';
    case 'completed':
      return '●';
    case 'failed':
      return '✗';
    default:
      return '○';
  }
}
