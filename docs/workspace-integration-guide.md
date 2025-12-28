# Workspace Management Integration Guide

## Overview

This document explains how the workspace management system integrates with GRID's existing AI and chat services to provide context-aware AI operations.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  GRID IDE Application                         │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼────────┐
│   Workspace    │  │   Workspace    │  │   Workspace   │
│    Manager     │  │    Context     │  │  Chat         │
│    Service     │  │    Manager     │  │  Integration  │
└───────┬────────┘  └───────┬────────┘  └──────┬────────┘
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────────────────────────────────────────────┐
│         GRID AI Services (LLM, Chat, Agents)          │
└───────────────────────────────────────────────────────┘
```

## Key Components

### 1. Workspace Manager Service

**Location:** `src/vs/workbench/services/workspaceManager/browser/workspaceManagerService.ts`

**Responsibilities:**
- Create/Read/Update/Delete workspaces
- Manage workspace templates
- Persist workspace state (open files, UI layout)
- Handle workspace switching

**Key Methods:**
```typescript
// Create a new workspace
await workspaceManager.createWorkspace({
  name: 'My Project',
  parentDirectory: URI.file('/path/to/parent'),
  template: 'web-app',
  openAfterCreate: true
});

// Switch workspaces
await workspaceManager.switchWorkspace(workspaceId);

// Save/restore state
await workspaceManager.saveWorkspaceState();
const state = await workspaceManager.loadWorkspaceState(workspaceId);
```

### 2. Workspace Context Manager Service

**Location:** `src/vs/workbench/services/workspaceManager/browser/workspaceContextManagerService.ts`

**Responsibilities:**
- Manage parallel workspace instances
- Track AI agent sessions per instance
- Prevent cross-instance interference
- Maintain instance-specific state

**Key Methods:**
```typescript
// Create parallel instance
const instance = await contextManager.createInstance({
  workspaceId: 'my-workspace',
  displayName: 'Feature A Development',
  makePrimary: false
});

// Create agent session
const session = await contextManager.createAgentSession({
  instanceId: instance.instanceId,
  agentName: 'code-assistant',
  task: 'Refactor authentication'
});

// Get current context
const context = await contextManager.getCurrentContext();
```

### 3. Workspace Chat Integration Service

**Location:** `src/vs/workbench/contrib/grid/browser/workspaceChatIntegration.ts`

**Responsibilities:**
- Scope chat threads to workspace instances
- Associate agents with specific workspaces
- Enrich AI requests with workspace context
- Manage thread lifecycle

**Key Methods:**
```typescript
// Create workspace-scoped chat thread
const threadId = await chatIntegration.createWorkspaceChatThread(
  instanceId,
  'Feature Development Chat'
);

// Get context for AI request
const context = await chatIntegration.getCurrentWorkspaceContext();

// Enrich AI request with workspace context
const enrichedRequest = await chatIntegration.enrichAIRequest({
  message: 'Help me fix the auth bug',
  // ... other properties
});
```

## Integration Points

### AI Service Integration

When making AI requests, workspace context is automatically injected:

```typescript
// In your AI service
import { IWorkspaceChatIntegrationService } from '...';

class MyAIService {
  constructor(
    @IWorkspaceChatIntegrationService private readonly workspaceChat: IWorkspaceChatIntegrationService
  ) {}

  async processAIRequest(request: any) {
    // Enrich with workspace context
    const enrichedRequest = await this.workspaceChat.enrichAIRequest(request);

    // enrichedRequest now includes:
    // - workspaceId
    // - instanceId
    // - workspaceName
    // - workspaceRoot
    // - isParallelMode
    // - agentSessionId (if applicable)

    // Pass to LLM service
    return await this.llmService.sendMessage(enrichedRequest);
  }
}
```

### Chat Thread Scoping

Chat threads are automatically scoped to workspace instances:

```typescript
// Threads are created with workspace context
const threadId = await chatIntegration.createWorkspaceChatThread(instanceId);

// Retrieve threads for a specific instance
const threads = await chatIntegration.getChatThreadsForInstance(instanceId);

// Get workspace context for a thread
const context = await chatIntegration.getWorkspaceContextForThread(threadId);
```

### Agent Session Management

Agent sessions are tracked per workspace instance:

```typescript
// Create agent session
const session = await contextManager.createAgentSession({
  instanceId: instance.instanceId,
  agentName: 'code-assistant',
  task: 'Refactor module',
  chatThreadId: threadId
});

// Update session state
await contextManager.updateAgentSession(
  instanceId,
  session.id,
  {
    state: 'working',
    workingFiles: ['src/auth.ts', 'src/login.ts']
  }
);

// Get all sessions for instance
const sessions = await contextManager.getAgentSessions(instanceId);
```

## Helper Utilities

**Location:** `src/vs/workbench/services/workspaceManager/common/workspaceContextHelpers.ts`

Utility functions for working with workspace contexts:

```typescript
import {
  formatWorkspaceContextForAI,
  isFileInWorkspace,
  getFilesBeingModified,
  getFileConflictWarning
} from '...workspaceContextHelpers.js';

// Format context for AI prompt
const promptContext = formatWorkspaceContextForAI(context, workspace);

// Check if file is in workspace
const isInWorkspace = isFileInWorkspace(filePath, context.workspaceRoot);

// Get files being modified by agents
const modifiedFiles = getFilesBeingModified(context);

// Detect file conflicts across instances
const warning = getFileConflictWarning(
  'src/auth.ts',
  currentContext,
  allInstances
);
```

## User Interface Components

### 1. Workspace Manager Panel

**Location:** `src/vs/workbench/contrib/grid/browser/react/src/workspace-manager-tsx/WorkspaceManager.tsx`

Main UI for managing workspaces:
- Grid view of all workspaces
- Create workspace dialog with templates
- Search and filter
- Pin/tag/organize workspaces
- Visual indicators for parallel instances

**Access:** Press `F1` → "Workspaces: Open Workspace Manager"

### 2. Parallel Workspace Viewer

**Location:** `src/vs/workbench/contrib/grid/browser/react/src/workspace-manager-tsx/ParallelWorkspaceViewer.tsx`

View and manage parallel instances:
- Shows all instances for a workspace
- Agent session status per instance
- Chat thread counts
- Instance activity monitoring
- Create new instances
- Switch primary instance

**Access:** Click "Monitor" icon on workspace card (when multiple instances exist)

### 3. Status Bar Indicator

**Location:** `src/vs/workbench/contrib/workspaceManager/browser/workspaceStatusBar.ts`

Shows active workspace in status bar:
- Workspace name
- Instance count (if parallel mode)
- Active agent count
- Click to switch workspaces

## Event Handling

Subscribe to workspace events to stay synchronized:

```typescript
// Workspace changes
workspaceManager.onDidChangeActiveWorkspace((event) => {
  console.log('Switched to:', event.current?.name);
});

// Instance changes
contextManager.onDidChangePrimaryInstance((instance) => {
  console.log('Primary instance:', instance.displayName);
});

// Agent session updates
contextManager.onDidUpdateAgentSession((event) => {
  console.log('Agent updated:', event.session.agentName, event.session.state);
});

// Workspace context changes
chatIntegration.onDidChangeWorkspaceContext((context) => {
  console.log('Context changed:', context.workspaceName);
});
```

## Best Practices

### 1. Always Use Context Helpers

```typescript
// ✅ Good - Use helper
import { formatWorkspaceContextForAI } from '...';
const promptContext = formatWorkspaceContextForAI(context, workspace);

// ❌ Bad - Manual formatting
const promptContext = `Workspace: ${context.workspaceName}...`;
```

### 2. Check for File Conflicts

```typescript
// Before modifying a file in parallel mode
const warning = getFileConflictWarning(filePath, currentContext, allInstances);
if (warning) {
  // Show warning to user or handle conflict
  console.warn(warning);
}
```

### 3. Always Enrich AI Requests

```typescript
// ✅ Good - Enriched with context
const request = await chatIntegration.enrichAIRequest({
  message: userMessage
});
await llmService.sendMessage(request);

// ❌ Bad - Missing context
await llmService.sendMessage({ message: userMessage });
```

### 4. Track Agent Sessions

```typescript
// Start session when agent begins work
const session = await contextManager.createAgentSession({
  instanceId,
  agentName: 'code-assistant',
  task: 'Fix bug in auth module'
});

// Update as files are modified
await contextManager.updateAgentSession(instanceId, session.id, {
  state: 'working',
  workingFiles: ['src/auth.ts']
});

// End when complete
await contextManager.endAgentSession(instanceId, session.id);
```

### 5. Clean Up on Instance Close

```typescript
// Cleanup is automatic, but you can listen for closure
contextManager.onDidCloseInstance(async (event) => {
  // Perform any custom cleanup
  await myService.cleanupForInstance(event.instanceId);
});
```

## Example: Full AI Request Flow

Here's a complete example of how an AI request flows through the workspace system:

```typescript
// 1. User sends a message in chat
async function handleUserMessage(message: string) {
  // 2. Get current workspace context
  const context = await chatIntegration.getCurrentWorkspaceContext();

  // 3. Create/get chat thread for this instance
  let threadId = context.chatThreadIds?.[0];
  if (!threadId) {
    threadId = await chatIntegration.createWorkspaceChatThread(
      context.instanceId!,
      'Chat with AI'
    );
  }

  // 4. Check if any agents are working on related files
  const modifiedFiles = getFilesBeingModified(context);
  const additionalContext = modifiedFiles.length > 0
    ? `\n\nNote: These files are currently being modified by agents: ${modifiedFiles.join(', ')}`
    : '';

  // 5. Format workspace context for AI
  const workspaceContext = formatWorkspaceContextForAI(
    context,
    await workspaceManager.getWorkspace(context.workspaceId!)
  );

  // 6. Build AI request
  const request = {
    message: message + additionalContext,
    threadId,
    systemPrompt: workspaceContext
  };

  // 7. Enrich with metadata
  const enrichedRequest = await chatIntegration.enrichAIRequest(request);

  // 8. Send to LLM
  const response = await llmService.sendMessage(enrichedRequest);

  // 9. If response includes file modifications, track them
  if (response.modifiedFiles) {
    // Create agent session if needed
    const session = await contextManager.createAgentSession({
      instanceId: context.instanceId!,
      agentName: 'chat-assistant',
      chatThreadId: threadId,
      task: 'Responding to user request'
    });

    // Update with working files
    await contextManager.updateAgentSession(
      context.instanceId!,
      session.id,
      {
        state: 'working',
        workingFiles: response.modifiedFiles
      }
    );
  }

  return response;
}
```

## Troubleshooting

### Issue: AI responses not scoped to correct workspace

**Solution:** Ensure you're enriching requests:
```typescript
const enrichedRequest = await chatIntegration.enrichAIRequest(request);
```

### Issue: File conflicts in parallel mode

**Solution:** Check for conflicts before modifying:
```typescript
const warning = getFileConflictWarning(file, context, allContexts);
if (warning) {
  await showWarningToUser(warning);
}
```

### Issue: Agent sessions not showing in UI

**Solution:** Make sure to update session state:
```typescript
await contextManager.updateAgentSession(instanceId, sessionId, {
  state: 'working',
  currentTask: 'Task description',
  workingFiles: files
});
```

### Issue: Chat threads not persisting

**Solution:** Threads are automatically saved. Ensure you're using the integration service:
```typescript
const threadId = await chatIntegration.createWorkspaceChatThread(instanceId);
```

## Performance Considerations

1. **Limit Active Instances:** Keep active instances ≤ 5 for optimal performance
2. **Clean Up Sessions:** End agent sessions when complete
3. **Cache Context:** Current context is cached, use `getCurrentWorkspaceContext()` liberally
4. **Lazy Load:** Templates and non-critical data are loaded on-demand

## Security Considerations

1. **Workspace Isolation:** Each instance has isolated storage
2. **File Access:** Always validate files are within workspace root
3. **Context Sanitization:** Use `createSafeWorkspaceContext()` when serializing
4. **Agent Permissions:** Agent sessions don't grant additional file permissions

## Future Enhancements

- [ ] Workspace collaboration (share with team)
- [ ] Cloud workspace sync
- [ ] Workspace snapshots/versioning
- [ ] Advanced agent coordination
- [ ] Resource limits per instance
- [ ] Workspace analytics

---

For more information, see:
- [Workspace Management Overview](./workspace-management.md)
- [API Reference](../src/vs/workbench/services/workspaceManager/common/workspaceManager.ts)
- [Helper Utilities](../src/vs/workbench/services/workspaceManager/common/workspaceContextHelpers.ts)
