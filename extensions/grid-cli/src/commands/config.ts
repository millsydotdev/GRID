import { writeFileSync, readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync } from 'fs';

const CONFIG_FILE = join(homedir(), '.grid', 'cli-config.json');

interface CLIConfig {
  defaultModel?: string;
  defaultProvider?: string;
  apiKeys?: Record<string, string>;
  wsUrl?: string;
  theme?: string;
}

interface ConfigOptions {
  key?: string;
  value?: string;
}

export function config(action?: string, options?: ConfigOptions) {
  // Ensure config directory exists
  const configDir = join(homedir(), '.grid');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  switch (action) {
    case 'show':
      showConfig();
      break;
    case 'set':
      if (!options?.key || !options?.value) {
        console.error('Error: Both --key and --value are required for set action');
        process.exit(1);
      }
      setConfig(options.key, options.value);
      break;
    case 'reset':
      resetConfig();
      break;
    default:
      showConfig();
  }
}

function loadConfig(): CLIConfig {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
}

function saveConfig(config: CLIConfig) {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function showConfig() {
  const config = loadConfig();

  if (Object.keys(config).length === 0) {
    console.log('No configuration set. Use "grid config set" to configure.');
    return;
  }

  console.log('GRID CLI Configuration:\n');
  console.log(JSON.stringify(config, null, 2));
}

function setConfig(key: string, value: string) {
  const config = loadConfig();

  // Handle nested keys (e.g., apiKeys.openai)
  const keys = key.split('.');
  let current: any = config;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;

  saveConfig(config);
  console.log(`✓ Set ${key} = ${value}`);
}

function resetConfig() {
  if (existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, '{}');
    console.log('✓ Configuration reset');
  } else {
    console.log('No configuration file found');
  }
}
