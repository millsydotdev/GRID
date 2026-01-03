#!/usr/bin/env node

/**
 * Background Agent Runner
 *
 * This script runs as a detached background process to execute GRID agents
 * based on triggers (schedule, PR opens, webhooks).
 */

import { GridCLIClient } from './GridCLIClient.js';
import { writeFileSync, appendFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const AGENT_LOG_DIR = join(homedir(), '.grid', 'agent-logs');

interface AgentConfig {
  agentId: string;
  prompt: string;
  mode: string;
  trigger: {
    type: 'schedule' | 'pr_open' | 'webhook';
    config: any;
  };
}

class AgentRunner {
  private config: AgentConfig;
  private client: GridCLIClient;
  private logFile: string;
  private running = true;

  constructor(config: AgentConfig) {
    this.config = config;
    this.client = new GridCLIClient();
    this.logFile = join(AGENT_LOG_DIR, `${config.agentId}.log`);

    this.setupSignalHandlers();
  }

  private setupSignalHandlers() {
    process.on('SIGTERM', () => {
      this.log('Received SIGTERM, shutting down...');
      this.running = false;
      this.client.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      this.log('Received SIGINT, shutting down...');
      this.running = false;
      this.client.disconnect();
      process.exit(0);
    });
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());

    try {
      appendFileSync(this.logFile, logMessage);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async start() {
    this.log(`Agent ${this.config.agentId} starting...`);
    this.log(`Mode: ${this.config.mode}`);
    this.log(`Trigger type: ${this.config.trigger.type}`);

    try {
      await this.client.connect();
      this.log('Connected to GRID');

      // Setup trigger-based execution
      this.setupTrigger();
    } catch (error) {
      this.log(`Failed to start agent: ${error}`);
      process.exit(1);
    }
  }

  private setupTrigger() {
    const { type, config } = this.config.trigger;

    switch (type) {
      case 'schedule':
        this.setupScheduleTrigger(config.cron);
        break;
      case 'pr_open':
        this.setupPRTrigger();
        break;
      case 'webhook':
        this.setupWebhookTrigger(config.url);
        break;
    }
  }

  private setupScheduleTrigger(cronSchedule: string) {
    this.log(`Setting up schedule trigger: ${cronSchedule}`);

    // Parse cron and calculate next run
    // For simplicity, using interval-based execution
    // In production, use a proper cron library like 'node-cron'

    const runInterval = this.parseCronToInterval(cronSchedule);

    setInterval(() => {
      if (this.running) {
        this.executeAgent();
      }
    }, runInterval);

    // Run immediately on start
    this.executeAgent();
  }

  private setupPRTrigger() {
    this.log('Setting up PR open trigger');

    // In production, this would:
    // 1. Connect to GitHub webhook API
    // 2. Listen for PR events
    // 3. Execute agent when PR is opened

    // For now, we'll poll for PR events
    setInterval(() => {
      if (this.running) {
        this.checkForPREvents();
      }
    }, 60000); // Check every minute
  }

  private setupWebhookTrigger(webhookUrl: string) {
    this.log(`Setting up webhook trigger: ${webhookUrl}`);

    // In production, this would:
    // 1. Start an HTTP server
    // 2. Listen on webhook endpoint
    // 3. Execute agent when webhook is triggered

    // For simplicity, we'll just log this
    this.log('Webhook trigger setup (not fully implemented in this version)');
  }

  private async executeAgent() {
    this.log('Executing agent...');

    try {
      const result = await this.client.sendMessage(this.config.prompt, {
        agentMode: this.config.mode,
        stream: false,
      });

      this.log('Agent execution completed');
      this.log(`Result: ${result.content.substring(0, 200)}...`);

      // Update last run time
      this.updateAgentStatus('completed', {
        lastRun: Date.now(),
        lastResult: result.content,
      });
    } catch (error) {
      this.log(`Agent execution failed: ${error}`);
      this.updateAgentStatus('failed', {
        lastRun: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async checkForPREvents() {
    // In production, check GitHub API for new PRs
    // For now, this is a placeholder
    this.log('Checking for PR events...');
  }

  private parseCronToInterval(cron: string): number {
    // Simple cron parser - converts common patterns to milliseconds
    // In production, use a proper cron library

    const patterns: Record<string, number> = {
      '* * * * *': 60000,       // Every minute
      '0 * * * *': 3600000,     // Every hour
      '0 0 * * *': 86400000,    // Every day
      '0 0 * * 0': 604800000,   // Every week
    };

    return patterns[cron] || 3600000; // Default to hourly
  }

  private updateAgentStatus(status: string, data: any) {
    const statusFile = join(homedir(), '.grid', 'agents.json');

    try {
      const agents = JSON.parse(require('fs').readFileSync(statusFile, 'utf-8'));
      if (agents[this.config.agentId]) {
        agents[this.config.agentId] = {
          ...agents[this.config.agentId],
          status,
          ...data,
        };
        writeFileSync(statusFile, JSON.stringify(agents, null, 2));
      }
    } catch (error) {
      this.log(`Failed to update agent status: ${error}`);
    }
  }
}

// Parse command line arguments
function parseArgs(): AgentConfig | null {
  const args = process.argv.slice(2);
  const config: Partial<AgentConfig> = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--agent-id':
        config.agentId = args[++i];
        break;
      case '--prompt':
        config.prompt = args[++i];
        break;
      case '--mode':
        config.mode = args[++i];
        break;
    }
  }

  // Get trigger from environment
  const triggerEnv = process.env.GRID_AGENT_TRIGGER;
  if (triggerEnv) {
    config.trigger = JSON.parse(triggerEnv);
  }

  if (!config.agentId || !config.prompt || !config.mode) {
    console.error('Missing required arguments');
    return null;
  }

  return config as AgentConfig;
}

// Main execution
(async () => {
  const config = parseArgs();
  if (!config) {
    process.exit(1);
  }

  const runner = new AgentRunner(config);
  await runner.start();
})();
