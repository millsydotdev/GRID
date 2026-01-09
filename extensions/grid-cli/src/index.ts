#!/usr/bin/env node

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Command } from 'commander';
import { chat } from './commands/chat.js';
import { agent } from './commands/agent.js';
import { config } from './commands/config.js';

const program = new Command();

program
	.name('grid')
	.description('GRID CLI - AI-powered development assistant for the terminal')
	.version('1.0.0');

// Default command - start interactive chat
program
	.argument('[prompt]', 'Optional initial prompt to send')
	.option('-p, --print', 'Print response and exit (non-interactive/headless mode)')
	.option('-m, --model <model>', 'Specify the model to use')
	.option('-a, --agent <mode>', 'Agent mode: build|plan|explore|review|debug')
	.option('--api-key <key>', 'API key for the model provider')
	.option('--provider <provider>', 'Model provider (openai, anthropic, etc.)')
	.option('--headless', 'Run in headless mode (no TUI, for CI/CD)')
	.option('--json', 'Output in JSON format (headless mode only)')
	.action(chat);

// Agent command - run agents in background
program
	.command('agent')
	.description('Run or manage background agents')
	.argument('[prompt]', 'Prompt for the agent')
	.option('-m, --mode <mode>', 'Agent mode: build|plan|explore|review|debug', 'build')
	.option('--schedule <cron>', 'Cron schedule for recurring execution')
	.option('--on-pr', 'Trigger on PR opens')
	.option('--webhook <url>', 'Webhook URL for event triggers')
	.option('--list', 'List running agents')
	.option('--stop <id>', 'Stop a running agent')
	.action(agent);

// Config command - manage configuration
program
	.command('config')
	.description('Manage GRID CLI configuration')
	.argument('[action]', 'Action: show|set|reset')
	.option('--key <key>', 'Configuration key')
	.option('--value <value>', 'Configuration value')
	.action(config);

// Parse and execute
program.parse();
