# Voice Input Implementation Guide

GRID now includes built-in voice input functionality using the Web Speech API!

## 🎤 Features

- **Real-time Speech-to-Text** using browser's Web Speech API
- **Visual feedback** with animated microphone icon
- **Continuous recognition** for natural dictation
- **Auto-append** transcribed text to chat input
- **Browser compatibility** check included

## 📦 Components Added

### 1. `ButtonVoice` - Microphone Button Component
A styled button with microphone icon that shows recording state with visual feedback.

### 2. `useVoiceInput` - Voice Input Hook
React hook that manages Web Speech API integration and provides recording controls.

### 3. `IconMicrophone` - Microphone SVG Icon
Animated icon with visual recording indicator.

## 🚀 How to Use

### Basic Integration

```tsx
import { ButtonVoice, useVoiceInput } from './SidebarChat';

function MyChatComponent() {
  const [inputText, setInputText] = useState('');

  // Initialize voice input hook
  const { isRecording, isSupported, toggleRecording } = useVoiceInput((transcript) => {
    // Append transcribed text to input
    setInputText(prev => prev + ' ' + transcript);
  });

  return (
    <div>
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />

      {/* Voice input button */}
      {isSupported && (
        <ButtonVoice
          isRecording={isRecording}
          disabled={false}
          onClick={toggleRecording}
        />
      )}

      <button onClick={() => sendMessage(inputText)}>Send</button>
    </div>
  );
}
```

### Full Example with GridChatArea

To enable voice input in GridChatArea, uncomment the voice button in `SidebarChat.tsx` (line ~585):

```tsx
// In your chat component:
const [message, setMessage] = useState('');

const { isRecording, isSupported, toggleRecording } = useVoiceInput((transcript) => {
  setMessage(prev => (prev + ' ' + transcript).trim());
});

// Pass to GridChatArea:
<GridChatArea
  onSubmit={handleSubmit}
  onAbort={handleAbort}
  isStreaming={isStreaming}
  // ... other props
>
  <YourInputComponent
    value={message}
    onChange={setMessage}
    // Voice button is already integrated in GridChatArea
    // Just uncomment it in the source!
  />
</GridChatArea>
```

## 🔧 API Reference

### `useVoiceInput(onTranscript)`

**Parameters:**
- `onTranscript: (text: string) => void` - Callback called when speech is recognized

**Returns:**
```typescript
{
  isRecording: boolean;     // Current recording state
  isSupported: boolean;     // Whether Web Speech API is available
  startRecording: () => void;   // Start voice recognition
  stopRecording: () => void;    // Stop voice recognition
  toggleRecording: () => void;  // Toggle recording state
}
```

### `ButtonVoice`

**Props:**
```typescript
{
  isRecording?: boolean;    // Shows recording state with animation
  disabled: boolean;        // Disable the button
  onClick: () => void;      // Click handler
  className?: string;       // Additional CSS classes
}
```

## 🌐 Browser Compatibility

Web Speech API is supported in:
- ✅ **Chrome/Edge** - Full support
- ✅ **Safari** - Full support (iOS 14.5+)
- ⚠️ **Firefox** - Partial support (may require enabling in `about:config`)
- ❌ **Opera** - Limited support

The hook automatically checks `isSupported` and only enables voice input if available.

## 🎨 Customization

### Change Language

Edit the `lang` property in `useVoiceInput`:

```typescript
recognition.lang = 'es-ES';  // Spanish
recognition.lang = 'fr-FR';  // French
recognition.lang = 'de-DE';  // German
```

### Continuous vs Single Recognition

```typescript
recognition.continuous = false;  // Stop after one sentence
recognition.interimResults = false;  // Only return final results
```

### Custom Button Style

```tsx
<ButtonVoice
  className="w-10 h-10 my-custom-class"
  // ... other props
/>
```

## 🐛 Troubleshooting

**Voice input not working?**
1. Check browser compatibility
2. Ensure HTTPS (required for Web Speech API)
3. Grant microphone permissions
4. Check console for errors

**Text not appearing?**
- Make sure `onTranscript` callback updates your input state
- Check if recognition events are firing (check console logs)

**Button appears but nothing happens?**
- Verify `onClick` is connected to `toggleRecording`
- Check if `isSupported` is `true`

## 📝 Notes

- Voice input requires **microphone permissions** from the browser
- Works best in **quiet environments**
- Automatically **appends** to existing text (doesn't replace)
- Recognition **auto-stops** after periods of silence
- Results are **real-time** with both interim and final transcripts

## 🔜 Future Enhancements

Potential improvements:
- [ ] Multi-language selection UI
- [ ] Voice commands (e.g., "send message", "new line")
- [ ] Offline speech recognition (using TensorFlow.js)
- [ ] Custom wake words
- [ ] Voice activity detection visualization
- [ ] Transcription history/editing

---

**Made with ❤️ for GRID IDE**
