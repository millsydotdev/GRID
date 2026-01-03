# GRID CLI

The official command-line interface for GRID - an AI-powered development assistant for the terminal.

## Features

### 🖥️ Interactive TUI Chat
- Beautiful terminal UI powered by Ink (React for terminals)
- Real-time streaming responses
- Tool call visualization
- Markdown rendering in terminal
- Keyboard shortcuts for productivity

### 🤖 Background Agents
- Run AI agents in the background
- Schedule agents with cron expressions
- Trigger on PR opens
- Webhook support for custom events
- Monitor and manage running agents

### ⚡ Headless Mode
- Non-interactive mode for CI/CD
- JSON output support
- Perfect for automation and scripts

### 🎯 Multiple Agent Modes
- **Build**: Generate code from scratch
- **Plan**: Create implementation plans
- **Explore**: Navigate and understand codebases
- **Review**: Automated code review
- **Debug**: Intelligent debugging assistance

## Installation

```bash
npm install -g @grid-editor/cli
```

Or install locally in your project:

```bash
npm install --save-dev @grid-editor/cli
```

## Quick Start

### Interactive Chat

Start an interactive AI chat session:

```bash
grid
```

With an initial prompt:

```bash
grid "Explain this codebase structure"
```

### Headless Mode

For scripts and CI/CD:

```bash
grid --print "Write tests for user authentication"
```

With JSON output:

```bash
grid --print --json "Analyze security vulnerabilities"
```

### Agent Modes

Run specific agent modes:

```bash
grid --agent build "Create a REST API for users"
grid --agent review "Review the auth module"
grid --agent debug "Fix the login bug"
```

## Background Agents

### Schedule an Agent

Run an agent every hour:

```bash
grid agent "Update dependencies and fix breaking changes" --schedule "0 * * * *"
```

### PR Review Agent

Automatically review PRs when opened:

```bash
grid agent "Review code quality and security" --on-pr
```

### List Running Agents

```bash
grid agent --list
```

### Stop an Agent

```bash
grid agent --stop agent-1234567890
```

## Configuration

### View Configuration

```bash
grid config show
```

### Set Configuration

```bash
grid config set --key defaultModel --value claude-4-5-sonnet
grid config set --key apiKeys.anthropic --value sk-ant-...
grid config set --key provider --value anthropic
```

### Reset Configuration

```bash
grid config reset
```

## Keyboard Shortcuts (TUI Mode)

- **Ctrl+C × 2**: Exit (press twice within 1 second)
- **Ctrl+D**: Stop current generation
- **Ctrl+L**: Clear chat history
- **Enter**: Send message
- **Arrow Keys**: Navigate input

## Configuration File

Configuration is stored in `~/.grid/cli-config.json`:

```json
{
  "defaultModel": "claude-4-5-sonnet",
  "defaultProvider": "anthropic",
  "apiKeys": {
    "anthropic": "sk-ant-...",
    "openai": "sk-..."
  },
  "wsUrl": "ws://localhost:9000/grid-ws"
}
```

## Environment Variables

- `GRID_API_KEY`: Default API key
- `GRID_MODEL`: Default model
- `GRID_PROVIDER`: Default provider
- `GRID_WS_URL`: WebSocket URL for GRID connection

## Examples

### Code Generation

```bash
grid --agent build "Create a user authentication system with JWT"
```

### Code Review

```bash
grid --agent review --print "Review src/auth/*.ts for security issues"
```

### Debugging

```bash
grid --agent debug "The login endpoint returns 500 error"
```

### Scheduled Maintenance

```bash
# Run dependency updates daily at midnight
grid agent "Update package dependencies and fix breaking changes" --schedule "0 0 * * *"
```

### CI/CD Integration

```bash
# In your CI pipeline
grid --print --headless "Review this PR for security vulnerabilities" > review.txt
```

## Architecture

The GRID CLI consists of three main components:

1. **TUI (Terminal UI)**: Interactive chat interface built with Ink
2. **CLI Client**: Communicates with GRID's backend via WebSocket or HTTP
3. **Agent Runner**: Background process for scheduled and event-triggered agents

### Communication Flow

```
┌─────────────┐
│   TUI/CLI   │
└─────┬───────┘
      │ WebSocket/HTTP
      ▼
┌─────────────┐
│ GRID Server │
└─────┬───────┘
      │
      ▼
┌─────────────┐
│   AI Model  │
└─────────────┘
```

## Advanced Features

### 1. **TUI Experience**
Beautiful terminal interface with real-time streaming and responsive design.

### 2. **Background Agents**
Run agents on schedules or event triggers for continuous automation.

### 3. **Headless Mode**
Perfect for CI/CD automation and scriptable workflows.

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Watch Mode

```bash
npm run watch
```

## Troubleshooting

### Connection Issues

If you can't connect to GRID:

1. Make sure GRID is running
2. Check the WebSocket URL in config
3. Verify firewall settings

```bash
# Test connection
curl http://localhost:9000/health
```

### Agent Not Starting

If background agents won't start:

1. Check agent logs: `~/.grid/agent-logs/<agent-id>.log`
2. Verify cron schedule syntax
3. Ensure sufficient permissions

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Credits

Built with:
- [Ink](https://github.com/vadimdemedes/ink) - React for terminals
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
