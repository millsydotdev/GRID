# Workspace Management System

## Overview

GRID's Workspace Management System allows users to create, manage, and work on multiple isolated workspaces simultaneously. Inspired by Google Antigravity's parallel workspace approach, this system ensures AI agents and user workflows remain isolated and don't interfere with each other.

## Key Features

### 🎯 Core Capabilities

1. **Multiple Workspaces** - Create unlimited workspaces, each with its own dedicated folder and configuration
2. **Parallel Execution** - Work on multiple workspaces simultaneously without conflicts
3. **AI Context Isolation** - Each workspace maintains separate AI chat threads and agent sessions
4. **State Persistence** - Automatically saves and restores workspace state (open files, editor positions, UI layout)
5. **Workspace Templates** - Quick-start templates for common project types
6. **Flexible Organization** - Tag, color-code, and search workspaces

### 🔄 Parallel Workspace Mode

The most powerful feature is **parallel workspace mode**, which allows:

- **Multiple instances of the same or different workspaces** running simultaneously
- **Independent AI agents** working in each workspace without confusion
- **Isolated chat histories** and context per workspace instance
- **No cross-contamination** between workspace states

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                   Workspace Manager UI                       │
│  (List, create, edit, switch between workspaces)           │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼────────────────┐          ┌──────────▼────────────────┐
│ Workspace Manager      │          │ Workspace Context Manager │
│ Service                │          │ Service                   │
│                        │          │                           │
│ • CRUD operations      │          │ • Parallel instances      │
│ • Templates            │          │ • AI context isolation    │
│ • State persistence    │          │ • Agent sessions          │
└────────────────────────┘          └───────────────────────────┘
```

### Data Models

#### Workspace Metadata

```typescript
interface IWorkspaceMetadata {
  id: string;                    // Unique workspace identifier
  name: string;                  // Display name
  description?: string;          // Optional description
  rootUri: URI;                  // Folder where workspace data is stored
  workspaceFile: URI;            // Path to .code-workspace file
  createdAt: number;            // Creation timestamp
  lastAccessedAt: number;       // Last accessed timestamp
  lastModifiedAt: number;       // Last modified timestamp
  color?: string;               // Color for visual identification
  icon?: string;                // Icon identifier
  tags?: string[];              // Tags for categorization
  template?: string;            // Template used to create workspace
  pinned?: boolean;             // Whether workspace is pinned
  properties?: Record<string, any>; // Custom properties
}
```

#### Workspace Context (for Parallel Mode)

```typescript
interface IWorkspaceContext {
  workspaceId: string;          // Base workspace ID
  instanceId: string;           // Unique instance identifier
  displayName: string;          // Instance display name
  isPrimary: boolean;           // Whether this is the primary instance
  chatThreadIds: string[];      // Chat threads for this instance
  agentSessions: IAgentSession[]; // Active AI agents in this instance
  settings?: Record<string, any>; // Instance-specific settings
  createdAt: number;
  lastActivityAt: number;
  properties?: Record<string, any>;
}
```

#### Agent Session

```typescript
interface IAgentSession {
  id: string;                   // Session identifier
  agentName: string;            // Agent type/name
  currentTask?: string;         // What the agent is working on
  state: 'idle' | 'working' | 'paused' | 'completed' | 'error';
  chatThreadId?: string;        // Associated chat thread
  workingFiles?: string[];      // Files being modified
  metadata?: Record<string, any>;
  startedAt: number;
  updatedAt: number;
}
```

## Usage

### Creating a Workspace

```typescript
// Get the workspace manager service
const workspaceManager = accessor.get('IWorkspaceManagerService');

// Create a new workspace
const workspace = await workspaceManager.createWorkspace({
  name: 'My Web App',
  description: 'A new web application project',
  parentDirectory: URI.file('/path/to/projects'),
  template: 'web-app',  // Use the web-app template
  color: '#3b82f6',
  tags: ['frontend', 'react'],
  openAfterCreate: true  // Open immediately after creation
});
```

### Switching Workspaces

```typescript
// Switch to a different workspace
await workspaceManager.switchWorkspace(workspaceId);

// This will:
// 1. Save current workspace state (open files, UI layout)
// 2. Close current workspace
// 3. Open the new workspace
// 4. Restore its previous state
```

### Parallel Workspace Mode

```typescript
// Get the workspace context manager
const contextManager = accessor.get('IWorkspaceContextManagerService');

// Create a new instance of the same workspace
const instance = await contextManager.createInstance({
  workspaceId: 'my-workspace-id',
  displayName: 'My Workspace - Window 2',
  makePrimary: false  // Don't make this the primary instance
});

// Now you have two instances of the same workspace running in parallel
```

### Managing AI Agents in Parallel Workspaces

```typescript
// Create an agent session in a specific workspace instance
const session = await contextManager.createAgentSession({
  instanceId: instance.instanceId,
  agentName: 'code-assistant',
  task: 'Refactor authentication module',
  chatThreadId: 'thread-abc-123'
});

// Update agent session as it works
await contextManager.updateAgentSession(
  instance.instanceId,
  session.id,
  {
    state: 'working',
    workingFiles: ['src/auth/login.ts', 'src/auth/signup.ts']
  }
);

// The AI knows to scope all operations to this specific instance
// and won't interfere with agents in other instances
```

### AI Context Isolation

The system ensures AI agents stay isolated through:

1. **Instance-scoped chat threads** - Each workspace instance has its own chat history
2. **Context markers** - All AI requests include the current instance ID
3. **File scope awareness** - Agents only see and modify files in their instance
4. **Session tracking** - Active agent sessions are tracked per instance

```typescript
// When making an AI request, the system automatically:
const currentContext = await contextManager.getCurrentContext();

// Passes the context to the AI service
const response = await aiService.chat({
  message: 'Fix the bug in login.ts',
  context: {
    workspaceInstanceId: currentContext.instanceId,
    workspaceId: currentContext.workspaceId,
    // ... other context
  }
});

// The AI knows to:
// - Only look at files in THIS workspace instance
// - Only modify files in THIS workspace instance
// - Keep chat history separate from other instances
// - Reference the correct project context
```

## Workspace Templates

Templates provide quick-start configurations for common project types.

### Built-in Templates

1. **Empty Workspace** - Blank workspace with no folders
2. **Web Application** - Frontend project structure (src/, public/, tests/)
3. **Python Project** - Python development (src/, tests/, docs/)
4. **Data Science** - Data analysis project (data/, notebooks/, scripts/, output/)

### Creating Custom Templates

```typescript
// Register a custom template
await workspaceManager.registerTemplate({
  id: 'my-template',
  name: 'Full Stack App',
  description: 'A full-stack application template',
  icon: '🚀',
  folders: [
    { name: 'frontend', path: 'frontend' },
    { name: 'backend', path: 'backend' },
    { name: 'shared', path: 'shared' }
  ],
  files: [
    {
      path: 'README.md',
      content: '# Full Stack Application\n\nYour project here.'
    },
    {
      path: '.gitignore',
      content: 'node_modules/\ndist/\n.env\n'
    }
  ],
  settings: {
    'files.exclude': {
      '**/node_modules': true,
      '**/dist': true
    }
  },
  extensions: [
    'dbaeumer.vscode-eslint',
    'esbenp.prettier-vscode'
  ]
});
```

## User Interface

### Workspace Manager View

The Workspace Manager provides a visual interface for:

- **Browsing all workspaces** with grid or list view
- **Searching and filtering** by name, tags, or properties
- **Quick actions** - Pin, edit, delete, export workspaces
- **Visual indicators** - Color coding, icons, activity status
- **Tabs** - All, Recent, Pinned workspaces

### Workspace Switcher

A quick dropdown to switch between workspaces:

- Shows recently accessed workspaces
- Indicates active workspace
- One-click switching
- Keyboard shortcuts

### Parallel Instance Viewer

Shows all active workspace instances:

- Visual representation of parallel workspaces
- Agent activity indicators
- Instance-specific settings
- Quick switch between instances

## Best Practices

### When to Use Multiple Workspaces

✅ **Good use cases:**
- Different projects/codebases
- Same project, different branches/features
- Client projects separation
- Different programming languages/stacks
- Personal vs. work projects

❌ **Avoid:**
- Using workspaces for different files in the same project (use folders instead)
- Creating too many workspaces (organize with tags)

### When to Use Parallel Mode

✅ **Good use cases:**
- Working on a feature while monitoring production
- Comparing different implementations
- Code review in one instance, development in another
- Running multiple AI agents on different tasks simultaneously

❌ **Avoid:**
- Editing the same files in multiple instances (conflicts)
- Running too many parallel instances (performance)

### AI Agent Best Practices

1. **One agent per task** - Don't start multiple agents for the same task
2. **Clear task descriptions** - Help agents understand their scope
3. **Monitor agent sessions** - Check agent status and progress
4. **Clean up completed sessions** - End sessions when tasks are done
5. **Use parallel instances wisely** - Leverage parallel mode for truly independent tasks

## Storage and Persistence

### Workspace Storage Structure

```
/path/to/workspaces/
└── my-workspace/
    ├── my-workspace.code-workspace    # Workspace configuration
    ├── .workspace-metadata.json       # Metadata (name, tags, etc.)
    ├── .workspace-state.json          # UI state (open files, layout)
    ├── src/                           # Project folders
    ├── tests/
    └── ...
```

### What Gets Saved

- **Workspace metadata** - Name, description, tags, color, etc.
- **UI state** - Open files, editor positions, sidebar state, panel state
- **Settings** - Workspace-specific settings and configurations
- **AI context** - Chat threads, agent sessions (per instance)
- **Project context** - Indexed files, dependencies (via GRID's project indexer)

### What Doesn't Get Saved

- Temporary files
- Build artifacts (unless explicitly configured)
- Node modules, virtual environments (standard .gitignore patterns)

## Integration with GRID Features

### Chat Threads

Each workspace instance maintains its own chat thread history:

```typescript
// Chat service automatically scopes to current workspace instance
const chatService = accessor.get('IChatThreadService');
const threads = await chatService.getThreadsForInstance(instanceId);
```

### Project Context

GRID's project indexer maintains separate indexes per workspace:

```typescript
const projectContext = accessor.get('IProjectContextService');
const index = await projectContext.getProjectIndex(workspaceId);
```

### Settings

Workspace-specific settings override global settings:

```
Global Settings
    ↓
User Profile Settings
    ↓
Workspace Settings          ← Workspace-level (shared by all instances)
    ↓
Workspace Instance Settings ← Instance-level (unique per instance)
```

## API Reference

### IWorkspaceManagerService

Main service for workspace CRUD operations.

```typescript
interface IWorkspaceManagerService {
  // Workspace management
  getWorkspaces(): Promise<IWorkspaceMetadata[]>;
  getWorkspace(id: string): Promise<IWorkspaceMetadata | undefined>;
  createWorkspace(options: ICreateWorkspaceOptions): Promise<IWorkspaceMetadata>;
  updateWorkspace(id: string, updates: Partial<IWorkspaceMetadata>): Promise<IWorkspaceMetadata>;
  deleteWorkspace(id: string, deleteFiles?: boolean): Promise<void>;
  switchWorkspace(id: string): Promise<void>;

  // State management
  saveWorkspaceState(workspaceId?: string): Promise<void>;
  loadWorkspaceState(workspaceId: string): Promise<IWorkspaceState | undefined>;

  // Templates
  getTemplates(): Promise<IWorkspaceTemplate[]>;
  registerTemplate(template: IWorkspaceTemplate): Promise<void>;
  unregisterTemplate(templateId: string): Promise<void>;

  // Utilities
  searchWorkspaces(query: string): Promise<IWorkspaceMetadata[]>;
  getRecentWorkspaces(limit?: number): Promise<IWorkspaceMetadata[]>;
  togglePinWorkspace(id: string): Promise<void>;
  exportWorkspace(id: string, destination: URI): Promise<void>;
  importWorkspace(source: URI, parentDirectory: URI): Promise<IWorkspaceMetadata>;

  // Events
  readonly onDidAddWorkspaces: Event<IWorkspacesAddedEvent>;
  readonly onDidRemoveWorkspaces: Event<IWorkspacesRemovedEvent>;
  readonly onDidUpdateWorkspace: Event<IWorkspaceUpdatedEvent>;
  readonly onDidChangeActiveWorkspace: Event<IActiveWorkspaceChangedEvent>;
}
```

### IWorkspaceContextManagerService

Service for managing parallel workspace instances and AI context isolation.

```typescript
interface IWorkspaceContextManagerService {
  // Instance management
  getActiveInstances(): Promise<IWorkspaceContext[]>;
  getInstance(instanceId: string): Promise<IWorkspaceContext | undefined>;
  getPrimaryInstance(): Promise<IWorkspaceContext | undefined>;
  createInstance(options: ICreateWorkspaceInstanceOptions): Promise<IWorkspaceContext>;
  closeInstance(instanceId: string, saveState?: boolean): Promise<void>;
  setPrimaryInstance(instanceId: string): Promise<void>;
  getInstancesForWorkspace(workspaceId: string): Promise<IWorkspaceContext[]>;

  // Agent session management
  createAgentSession(options: ICreateAgentSessionOptions): Promise<IAgentSession>;
  updateAgentSession(instanceId: string, sessionId: string, updates: Partial<IAgentSession>): Promise<IAgentSession>;
  endAgentSession(instanceId: string, sessionId: string): Promise<void>;
  getAgentSessions(instanceId: string): Promise<IAgentSession[]>;

  // Context management
  getCurrentContext(): Promise<IWorkspaceContext | undefined>;
  setCurrentContext(instanceId: string): Promise<void>;
  isInParallelMode(workspaceId: string): Promise<boolean>;
  getStatistics(): Promise<{ totalInstances: number; activeAgents: number; workspacesInParallelMode: number }>;

  // Events
  readonly onDidCreateInstance: Event<IWorkspaceInstanceCreatedEvent>;
  readonly onDidCloseInstance: Event<IWorkspaceInstanceClosedEvent>;
  readonly onDidChangePrimaryInstance: Event<IWorkspaceContext>;
  readonly onDidUpdateAgentSession: Event<IAgentSessionUpdatedEvent>;
}
```

## Examples

### Example 1: Create and Switch Workspaces

```typescript
import { IWorkspaceManagerService } from 'vs/workbench/services/workspaceManager/common/workspaceManager';

class MyComponent {
  constructor(
    @IWorkspaceManagerService private workspaceManager: IWorkspaceManagerService
  ) {}

  async createAndSwitch() {
    // Create a new workspace
    const workspace = await this.workspaceManager.createWorkspace({
      name: 'E-commerce Project',
      description: 'Online store application',
      parentDirectory: URI.file('/Users/me/projects'),
      template: 'web-app',
      color: '#10b981',
      tags: ['frontend', 'react', 'ecommerce'],
      openAfterCreate: true
    });

    console.log('Created workspace:', workspace.name);
  }
}
```

### Example 2: Parallel Workspaces with Multiple Agents

```typescript
import { IWorkspaceContextManagerService } from 'vs/workbench/services/workspaceManager/common/workspaceContext';

class ParallelWorkspaceDemo {
  constructor(
    @IWorkspaceContextManagerService private contextManager: IWorkspaceContextManagerService
  ) {}

  async setupParallelWorkflow() {
    const workspaceId = 'my-project-id';

    // Create two instances of the same workspace
    const instance1 = await this.contextManager.createInstance({
      workspaceId,
      displayName: 'Development - Feature A',
      makePrimary: true
    });

    const instance2 = await this.contextManager.createInstance({
      workspaceId,
      displayName: 'Development - Feature B',
      makePrimary: false
    });

    // Start agent in first instance
    const agent1 = await this.contextManager.createAgentSession({
      instanceId: instance1.instanceId,
      agentName: 'code-assistant',
      task: 'Implement user authentication'
    });

    // Start agent in second instance
    const agent2 = await this.contextManager.createAgentSession({
      instanceId: instance2.instanceId,
      agentName: 'code-assistant',
      task: 'Build payment integration'
    });

    // Agents work independently without interfering with each other
    console.log('Parallel agents started!');
  }
}
```

### Example 3: Custom Template

```typescript
async function createCustomTemplate() {
  const workspaceManager = accessor.get('IWorkspaceManagerService');

  await workspaceManager.registerTemplate({
    id: 'microservices-app',
    name: 'Microservices Architecture',
    description: 'Multi-service backend application',
    icon: '🔧',
    folders: [
      { name: 'api-gateway', path: 'services/api-gateway' },
      { name: 'auth-service', path: 'services/auth' },
      { name: 'user-service', path: 'services/users' },
      { name: 'shared', path: 'shared' }
    ],
    files: [
      {
        path: 'docker-compose.yml',
        content: 'version: "3.8"\nservices:\n  # Add your services here\n'
      },
      {
        path: 'README.md',
        content: '# Microservices Application\n\n## Services\n- API Gateway\n- Auth Service\n- User Service\n'
      }
    ],
    settings: {
      'files.exclude': {
        '**/node_modules': true,
        '**/.git': true
      },
      'search.exclude': {
        '**/node_modules': true,
        '**/dist': true
      }
    },
    extensions: [
      'ms-azuretools.vscode-docker',
      'dbaeumer.vscode-eslint'
    ]
  });
}
```

## Troubleshooting

### Issue: AI agents getting confused between workspaces

**Solution:** Ensure you're using workspace context manager properly:

```typescript
// Always set context before AI operations
const context = await contextManager.getCurrentContext();
if (!context) {
  await contextManager.createInstance({
    workspaceId: currentWorkspaceId,
    makePrimary: true
  });
}
```

### Issue: Workspace state not persisting

**Solution:** Explicitly save workspace state:

```typescript
// Before closing or switching
await workspaceManager.saveWorkspaceState();
```

### Issue: Performance degradation with many parallel instances

**Solution:** Limit active instances and clean up unused ones:

```typescript
const stats = await contextManager.getStatistics();
if (stats.totalInstances > 5) {
  // Close inactive instances
  const instances = await contextManager.getActiveInstances();
  for (const instance of instances) {
    if (instance.lastActivityAt < Date.now() - 3600000) { // 1 hour
      await contextManager.closeInstance(instance.instanceId);
    }
  }
}
```

## Future Enhancements

- [ ] Workspace collaboration (share workspaces with team members)
- [ ] Cloud sync for workspaces
- [ ] Workspace snapshots and versioning
- [ ] Advanced agent coordination across instances
- [ ] Resource limits per workspace instance
- [ ] Workspace analytics and insights
- [ ] Import from other IDEs (VS Code, JetBrains, etc.)

## Contributing

To contribute to the workspace management system, see:
- Architecture documentation: `docs/architecture/workspace-management.md`
- Service implementation: `src/vs/workbench/services/workspaceManager/`
- UI components: `src/vs/workbench/contrib/grid/browser/react/src/workspace-manager-tsx/`

---

**Note:** This workspace management system is a powerful feature that enables true parallel development workflows. Use it wisely to maximize productivity without overwhelming your system resources.
