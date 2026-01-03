import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface AgentOptions {
  mode?: string;
  schedule?: string;
  onPr?: boolean;
  webhook?: string;
  list?: boolean;
  stop?: string;
}

const AGENTS_FILE = join(homedir(), '.grid', 'agents.json');

interface BackgroundAgent {
  id: string;
  prompt: string;
  mode: string;
  trigger: {
    type: 'schedule' | 'pr_open' | 'webhook';
    config: any;
  };
  status: 'running' | 'stopped' | 'failed';
  pid?: number;
  startedAt: number;
  lastRun?: number;
}

export async function agent(prompt?: string, options?: AgentOptions) {
  // List running agents
  if (options?.list) {
    listAgents();
    return;
  }

  // Stop an agent
  if (options?.stop) {
    stopAgent(options.stop);
    return;
  }

  // Create and run a new background agent
  if (!prompt) {
    console.error('Error: Prompt is required for creating an agent');
    process.exit(1);
  }

  const agentId = `agent-${Date.now()}`;
  const agent: BackgroundAgent = {
    id: agentId,
    prompt,
    mode: options?.mode || 'build',
    trigger: getTriggerConfig(options),
    status: 'running',
    startedAt: Date.now(),
  };

  // Start the agent in background
  startBackgroundAgent(agent);

  console.log(`✓ Agent ${agentId} started in background`);
  console.log(`  Mode: ${agent.mode}`);
  console.log(`  Trigger: ${agent.trigger.type}`);
  console.log(`\nRun 'grid agent --list' to see all agents`);
  console.log(`Run 'grid agent --stop ${agentId}' to stop this agent`);
}

function getTriggerConfig(options?: AgentOptions) {
  if (options?.schedule) {
    return {
      type: 'schedule' as const,
      config: { cron: options.schedule },
    };
  }
  if (options?.onPr) {
    return {
      type: 'pr_open' as const,
      config: {},
    };
  }
  if (options?.webhook) {
    return {
      type: 'webhook' as const,
      config: { url: options.webhook },
    };
  }
  // Default: manual trigger
  return {
    type: 'schedule' as const,
    config: { cron: '0 * * * *' }, // Hourly by default
  };
}

function startBackgroundAgent(agent: BackgroundAgent) {
  // Spawn a detached process that will run the agent
  const child = spawn(
    process.execPath,
    [
      join(__dirname, '..', 'services', 'agent-runner.js'),
      '--agent-id',
      agent.id,
      '--prompt',
      agent.prompt,
      '--mode',
      agent.mode,
    ],
    {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        GRID_AGENT_TRIGGER: JSON.stringify(agent.trigger),
      },
    }
  );

  child.unref();
  agent.pid = child.pid;

  // Save agent to registry
  saveAgent(agent);
}

function saveAgent(agent: BackgroundAgent) {
  const agents = loadAgents();
  agents[agent.id] = agent;
  writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

function loadAgents(): Record<string, BackgroundAgent> {
  if (!existsSync(AGENTS_FILE)) {
    return {};
  }
  return JSON.parse(readFileSync(AGENTS_FILE, 'utf-8'));
}

function listAgents() {
  const agents = loadAgents();
  const agentList = Object.values(agents);

  if (agentList.length === 0) {
    console.log('No background agents running');
    return;
  }

  console.log('Background Agents:\n');
  agentList.forEach((agent) => {
    const uptime = agent.startedAt
      ? formatUptime(Date.now() - agent.startedAt)
      : 'N/A';
    console.log(`  ${agent.id}:`);
    console.log(`    Status: ${agent.status}`);
    console.log(`    Mode: ${agent.mode}`);
    console.log(`    Trigger: ${agent.trigger.type}`);
    console.log(`    Uptime: ${uptime}`);
    console.log(`    PID: ${agent.pid || 'N/A'}`);
    console.log('');
  });
}

function stopAgent(agentId: string) {
  const agents = loadAgents();
  const agent = agents[agentId];

  if (!agent) {
    console.error(`Agent ${agentId} not found`);
    process.exit(1);
  }

  if (agent.pid) {
    try {
      process.kill(agent.pid, 'SIGTERM');
      console.log(`✓ Agent ${agentId} stopped`);
    } catch (error) {
      console.error(`Failed to stop agent: ${error}`);
    }
  }

  // Remove from registry
  delete agents[agentId];
  writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
