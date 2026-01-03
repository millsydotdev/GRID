import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface InputBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const InputBox: React.FC<InputBoxProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Type your message...',
}) => {
  const [cursorPosition, setCursorPosition] = useState(0);

  useInput(
    (input, key) => {
      if (disabled) return;

      if (key.return) {
        onSubmit(value);
        setCursorPosition(0);
        return;
      }

      if (key.backspace || key.delete) {
        if (cursorPosition > 0) {
          const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
          onChange(newValue);
          setCursorPosition(cursorPosition - 1);
        }
        return;
      }

      if (key.leftArrow) {
        setCursorPosition(Math.max(0, cursorPosition - 1));
        return;
      }

      if (key.rightArrow) {
        setCursorPosition(Math.min(value.length, cursorPosition + 1));
        return;
      }

      if (key.home) {
        setCursorPosition(0);
        return;
      }

      if (key.end) {
        setCursorPosition(value.length);
        return;
      }

      // Regular character input
      if (input && !key.ctrl && !key.meta) {
        const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition + input.length);
      }
    },
    { isActive: !disabled }
  );

  const displayValue = value || placeholder;
  const isPlaceholder = !value;

  return (
    <Box
      borderStyle="round"
      borderColor={disabled ? 'gray' : 'green'}
      paddingX={1}
    >
      <Text color="green">❯ </Text>
      <Text color={isPlaceholder ? 'gray' : 'white'}>
        {displayValue}
        {!disabled && !isPlaceholder && cursorPosition === value.length && (
          <Text backgroundColor="white" color="black">
            {' '}
          </Text>
        )}
      </Text>
    </Box>
  );
};
