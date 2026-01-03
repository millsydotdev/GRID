# GRID Protocol-Based Architecture

Type-safe message passing system for communication between GRID components.

## Overview

The protocol system provides:

- **Type Safety**: Full TypeScript type checking for all messages
- **Bidirectional Communication**: Request/response and event patterns
- **Streaming Support**: Built-in support for async generators
- **Error Handling**: Comprehensive error handling and timeouts
- **Separation of Concerns**: Clear protocol boundaries between components

## Architecture

```
┌─────────────┐                  ┌──────────────┐
│   Editor    │◄────Protocol────►│ AI Service   │
└─────────────┘                  └──────────────┘
      │
      │ Protocol
      ▼
┌─────────────┐                  ┌──────────────┐
│  Terminal   │◄────Protocol────►│  Security    │
└─────────────┘                  └──────────────┘
      │
      │ Protocol
      ▼
┌─────────────┐                  ┌──────────────┐
│ File System │◄────Protocol────►│   Indexing   │
└─────────────┘                  └──────────────┘
```

## Core Concepts

### Protocol Definition

A protocol is a TypeScript type mapping message names to `[request, response]` tuples:

```typescript
type MyProtocol = {
  'message/name': [RequestType, ResponseType];
  'another/message': [AnotherRequest, AnotherResponse];
};
```

### Messenger

The `IMessenger<TSend, TReceive>` interface provides type-safe communication:

- `send(type, data)`: Fire-and-forget message
- `request(type, data)`: Request with response
- `on(type, handler)`: Register message handler

## Usage Examples

### 1. Define Your Protocol

```typescript
// myProtocol.ts
import { IProtocol } from './messenger';

export type ToMyServiceProtocol = {
  'task/execute': [{ taskId: string }, { result: string }];
  'task/cancel': [{ taskId: string }, void];
};

export type FromMyServiceProtocol = {
  'task/progress': [{ taskId: string; progress: number }, void];
  'task/complete': [{ taskId: string }, void];
};
```

### 2. Create Messengers

```typescript
import { createMessengerPair } from './inProcessMessenger';
import { ToMyServiceProtocol, FromMyServiceProtocol } from './myProtocol';

// Create connected pair
const [clientMessenger, serviceMessenger] = createMessengerPair<
  ToMyServiceProtocol,
  FromMyServiceProtocol
>();
```

### 3. Register Handlers

```typescript
// On the service side
serviceMessenger.on('task/execute', async (message) => {
  const { taskId } = message.data;

  // Do work
  const result = await doWork(taskId);

  // Return response
  return { result };
});

// Listen for errors
serviceMessenger.onError((message, error) => {
  console.error('Error handling message:', message.messageType, error);
});
```

### 4. Send Messages

```typescript
// Fire and forget
clientMessenger.send('task/cancel', { taskId: '123' });

// Request with response
const response = await clientMessenger.request('task/execute', {
  taskId: '456'
});
console.log('Result:', response.result);
```

### 5. Streaming Responses

```typescript
// Service side - return async generator
serviceMessenger.on('data/stream', async function* (message) {
  for (let i = 0; i < 10; i++) {
    await sleep(100);
    yield { chunk: i };
  }
});

// Client side - receive stream
clientMessenger.on('data/stream', async (message) => {
  // Streaming responses come in multiple messages
  if (!message.done) {
    console.log('Chunk:', message.data.chunk);
  } else {
    console.log('Stream complete');
  }
});
```

## Available Protocols

### AI Service Protocol

**Purpose**: Communication between editor and AI service

**Messages**:
- `chat/send`: Send chat messages
- `autocomplete/request`: Request autocomplete
- `diff/generate`: Generate code diffs
- `edit/request`: Request code edits

**File**: `aiService.ts`

### Terminal Security Protocol

**Purpose**: Communication between terminal and security service

**Messages**:
- `command/evaluate`: Evaluate command safety
- `permission/request`: Request permission for risky command
- `allowlist/add`: Add command to allowlist

**File**: `terminalSecurity.ts`

### File Indexing Protocol

**Purpose**: Communication between file system and indexing service

**Messages**:
- `index/file`: Index a file
- `index/query`: Query the index
- `index/addTag`: Add tag to file
- `index/stats`: Get index statistics

**File**: `fileIndexing.ts`

## Best Practices

### 1. Keep Protocols Focused

Each protocol should handle communication for a specific domain:

```typescript
// Good - focused protocol
type AuthProtocol = {
  'auth/login': [LoginRequest, LoginResponse];
  'auth/logout': [void, void];
};

// Bad - mixing concerns
type MixedProtocol = {
  'auth/login': [LoginRequest, LoginResponse];
  'file/read': [FileRequest, FileResponse]; // Wrong domain
};
```

### 2. Use Meaningful Message Names

```typescript
// Good
'autocomplete/request'
'diff/generate'
'terminal/execute'

// Bad
'doThing'
'process'
'handle'
```

### 3. Handle Errors Gracefully

```typescript
messenger.on('task/execute', async (message) => {
  try {
    const result = await doWork(message.data);
    return { success: true, result };
  } catch (error) {
    // Let the messenger handle error propagation
    throw error;
  }
});

messenger.onError((message, error) => {
  // Log and handle errors
  logError(message.messageType, error);
});
```

### 4. Set Appropriate Timeouts

```typescript
class MyMessenger extends BaseMessenger<TSend, TReceive> {
  // Override timeout for long-running operations
  protected readonly requestTimeout = 60000; // 60 seconds
}
```

### 5. Clean Up Resources

```typescript
// Always dispose messengers when done
const messenger = new InProcessMessenger(...);
// ... use messenger
messenger.dispose(); // Cleans up handlers and pending requests
```

## Implementation Details

### Message Flow

1. **Client** calls `request(type, data)`
2. **BaseMessenger** generates unique message ID
3. Message sent via `sendMessage()` (implemented by subclass)
4. **Server** receives message via `handleIncomingMessage()`
5. **Server** finds and executes registered handlers
6. Handler returns response (or throws error)
7. **BaseMessenger** sends response back
8. **Client** receives response and resolves promise

### Timeout Handling

- Each request has a 30-second timeout (configurable)
- Timeout triggers promise rejection
- Pending requests cleaned up on dispose

### Streaming

- Handlers can return `AsyncGenerator`
- Each yielded value sent as separate message
- Final message marks stream complete
- Supports backpressure naturally

## Extension Points

### Custom Transport

Extend `BaseMessenger` to implement custom transport:

```typescript
class WebSocketMessenger extends BaseMessenger<TSend, TReceive> {
  constructor(private ws: WebSocket) {
    super();

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleIncomingMessage(message);
    };
  }

  protected sendMessage(message: IMessage): void {
    this.ws.send(JSON.stringify(message));
  }
}
```

### Custom Error Handling

Override error handling behavior:

```typescript
class MyMessenger extends BaseMessenger<TSend, TReceive> {
  protected async handleIncomingMessage(message: IMessage): Promise<void> {
    try {
      await super.handleIncomingMessage(message);
    } catch (error) {
      // Custom error handling
      this.logError(error);
      throw error;
    }
  }
}
```

## Testing

### Mock Messengers

```typescript
// Create mock for testing
const mockMessenger = new InProcessMessenger<MyProtocol, {}>();

// Register test handler
mockMessenger.on('test/message', async (msg) => {
  return { success: true };
});

// Test
const response = await mockMessenger.request('test/message', { data: 'test' });
expect(response.success).toBe(true);
```

### Test Streaming

```typescript
const chunks: any[] = [];

messenger.on('stream/test', async (msg) => {
  if (!msg.done) {
    chunks.push(msg.data);
  } else {
    // Stream complete
    expect(chunks).toHaveLength(10);
  }
});
```

## Performance Considerations

- **In-Process**: Minimal overhead, uses `setImmediate` for async delivery
- **Message Size**: No built-in size limits, be mindful of large payloads
- **Handler Execution**: Handlers run sequentially, don't block
- **Memory**: Pending requests stored in Map, cleaned up on response/timeout

## Future Enhancements

Potential improvements:

- [ ] Message compression for large payloads
- [ ] Built-in retry logic for failed requests
- [ ] Message priority queues
- [ ] Request cancellation tokens
- [ ] Metrics and monitoring hooks
- [ ] Message versioning for backwards compatibility
