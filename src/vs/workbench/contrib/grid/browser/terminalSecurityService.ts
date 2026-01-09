/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const ITerminalSecurityService = createDecorator<ITerminalSecurityService>('terminalSecurityService');

/**
 * Security policy for terminal commands
 */
export enum SecurityPolicy {
	/** Command is blocked and will not execute */
	Blocked = 'blocked',
	/** Command requires user permission before executing */
	RequiresPermission = 'requires_permission',
	/** Command is safe to execute without asking */
	Allowed = 'allowed',
}

/**
 * Type of security risk detected
 */
export enum RiskType {
	Destructive = 'destructive',
	PrivilegeEscalation = 'privilege_escalation',
	NetworkOperation = 'network_operation',
	PackageInstall = 'package_install',
	ScriptExecution = 'script_execution',
	SystemModification = 'system_modification',
	CredentialExposure = 'credential_exposure',
	Obfuscation = 'obfuscation',
}

/**
 * Security risk detected in a command
 */
export interface ISecurityRisk {
	type: RiskType;
	severity: 'critical' | 'high' | 'medium' | 'low';
	reason: string;
	pattern?: string;
}

/**
 * Result of security evaluation
 */
export interface ISecurityEvaluation {
	policy: SecurityPolicy;
	risks: ISecurityRisk[];
	command: string;
}

/**
 * Terminal Security Service
 *
 * Scans terminal commands for security risks before execution.
 * Protects users from destructive or malicious commands.
 */
export interface ITerminalSecurityService {
	readonly _serviceBrand: undefined;

	/**
	 * Evaluate the security of a terminal command
	 */
	evaluateCommand(command: string): ISecurityEvaluation;

	/**
	 * Check if a command should be allowed
	 */
	shouldAllowCommand(command: string): boolean;

	/**
	 * Get risks for a command without evaluating policy
	 */
	scanForRisks(command: string): ISecurityRisk[];
}

export class TerminalSecurityService extends Disposable implements ITerminalSecurityService {
	readonly _serviceBrand: undefined;

	constructor() {
		super();
	}

	/**
	 * Evaluate command security
	 */
	evaluateCommand(command: string): ISecurityEvaluation {
		const risks = this.scanForRisks(command);

		// Determine policy based on risks
		let policy = SecurityPolicy.Allowed;

		if (risks.length > 0) {
			// Any critical risk = blocked
			if (risks.some((r) => r.severity === 'critical')) {
				policy = SecurityPolicy.Blocked;
			}
			// High/medium risks = require permission
			else if (risks.some((r) => r.severity === 'high' || r.severity === 'medium')) {
				policy = SecurityPolicy.RequiresPermission;
			}
		}

		return {
			policy,
			risks,
			command,
		};
	}

	/**
	 * Quick check if command should be allowed
	 */
	shouldAllowCommand(command: string): boolean {
		const evaluation = this.evaluateCommand(command);
		return evaluation.policy === SecurityPolicy.Allowed;
	}

	/**
	 * Scan for security risks
	 */
	scanForRisks(command: string): ISecurityRisk[] {
		const risks: ISecurityRisk[] = [];

		if (!command || command.trim() === '') {
			return risks;
		}

		const normalized = command.trim().toLowerCase();

		// Check for destructive operations
		const destructiveRisks = this.checkDestructiveOperations(command, normalized);
		risks.push(...destructiveRisks);

		// Check for privilege escalation
		const privEscRisks = this.checkPrivilegeEscalation(normalized);
		risks.push(...privEscRisks);

		// Check for network operations
		const networkRisks = this.checkNetworkOperations(normalized);
		risks.push(...networkRisks);

		// Check for package installations
		const packageRisks = this.checkPackageInstallations(normalized);
		risks.push(...packageRisks);

		// Check for script execution
		const scriptRisks = this.checkScriptExecution(command, normalized);
		risks.push(...scriptRisks);

		// Check for system modifications
		const systemRisks = this.checkSystemModifications(normalized);
		risks.push(...systemRisks);

		// Check for credential exposure
		const credentialRisks = this.checkCredentialExposure(command);
		risks.push(...credentialRisks);

		// Check for obfuscation
		const obfuscationRisks = this.checkObfuscation(command);
		risks.push(...obfuscationRisks);

		return risks;
	}

	/**
	 * Check for destructive operations (rm -rf, etc.)
	 */
	private checkDestructiveOperations(command: string, normalized: string): ISecurityRisk[] {
		const risks: ISecurityRisk[] = [];

		// rm -rf with dangerous paths
		const rmRfPattern = /rm\s+.*(-rf|-fr|--recursive.*--force)/i;
		if (rmRfPattern.test(command)) {
			const dangerousPaths = ['/', '/*', '~', '/usr', '/etc', '/bin', '/sbin', '/var'];
			for (const path of dangerousPaths) {
				if (command.includes(path)) {
					risks.push({
						type: RiskType.Destructive,
						severity: 'critical',
						reason: `Dangerous rm -rf with critical path: ${path}`,
						pattern: 'rm -rf ' + path,
					});
					break;
				}
			}

			// Even without critical paths, rm -rf is high risk
			if (risks.length === 0) {
				risks.push({
					type: RiskType.Destructive,
					severity: 'high',
					reason: 'Recursive forced deletion (rm -rf)',
					pattern: 'rm -rf',
				});
			}
		}

		// Windows: del with /s and /q
		if (normalized.includes('del') && normalized.includes('/s') && normalized.includes('/q')) {
			risks.push({
				type: RiskType.Destructive,
				severity: 'high',
				reason: 'Recursive Windows file deletion',
				pattern: 'del /s /q',
			});
		}

		// Format command (Windows)
		if (normalized.match(/\bformat\b/)) {
			risks.push({
				type: RiskType.Destructive,
				severity: 'critical',
				reason: 'Disk formatting command detected',
				pattern: 'format',
			});
		}

		// dd command with device paths
		if (normalized.includes('dd') && /of=\/dev\//i.test(command)) {
			risks.push({
				type: RiskType.Destructive,
				severity: 'critical',
				reason: 'Direct disk write operation',
				pattern: 'dd of=/dev/',
			});
		}

		// mkfs (make filesystem) - always critical
		if (normalized.match(/\bmkfs/)) {
			risks.push({
				type: RiskType.Destructive,
				severity: 'critical',
				reason: 'Filesystem creation (will destroy data)',
				pattern: 'mkfs',
			});
		}

		return risks;
	}

	/**
	 * Check for privilege escalation
	 */
	private checkPrivilegeEscalation(normalized: string): ISecurityRisk[] {
		const risks: ISecurityRisk[] = [];

		const privEscCommands = ['sudo', 'su', 'doas', 'runas', 'gsudo', 'psexec'];

		for (const cmd of privEscCommands) {
			if (normalized.match(new RegExp(`\\b${cmd}\\b`))) {
				risks.push({
					type: RiskType.PrivilegeEscalation,
					severity: 'critical',
					reason: `Privilege escalation via ${cmd}`,
					pattern: cmd,
				});
				break;
			}
		}

		return risks;
	}

	/**
	 * Check for network operations
	 */
	private checkNetworkOperations(normalized: string): ISecurityRisk[] {
		const risks: ISecurityRisk[] = [];

		const networkCommands = [
			{ cmd: 'curl', severity: 'medium' as const },
			{ cmd: 'wget', severity: 'medium' as const },
			{ cmd: 'nc', severity: 'high' as const },
			{ cmd: 'netcat', severity: 'high' as const },
			{ cmd: 'telnet', severity: 'high' as const },
			{ cmd: 'ssh', severity: 'medium' as const },
			{ cmd: 'scp', severity: 'medium' as const },
			{ cmd: 'ftp', severity: 'medium' as const },
			{ cmd: 'sftp', severity: 'medium' as const },
		];

		for (const { cmd, severity } of networkCommands) {
			if (normalized.match(new RegExp(`\\b${cmd}\\b`))) {
				risks.push({
					type: RiskType.NetworkOperation,
					severity,
					reason: `Network operation: ${cmd}`,
					pattern: cmd,
				});
			}
		}

		return risks;
	}

	/**
	 * Check for package installations
	 */
	private checkPackageInstallations(normalized: string): ISecurityRisk[] {
		const risks: ISecurityRisk[] = [];

		const packageManagers = [
			{ pattern: /npm\s+(i|install)/, name: 'npm' },
			{ pattern: /yarn\s+add/, name: 'yarn' },
			{ pattern: /pnpm\s+(i|install|add)/, name: 'pnpm' },
			{ pattern: /pip3?\s+install/, name: 'pip' },
			{ pattern: /gem\s+install/, name: 'gem' },
			{ pattern: /cargo\s+install/, name: 'cargo' },
			{ pattern: /apt(-get)?\s+install/, name: 'apt' },
			{ pattern: /yum\s+install/, name: 'yum' },
			{ pattern: /brew\s+install/, name: 'brew' },
			{ pattern: /choco\s+install/, name: 'chocolatey' },
		];

		for (const { pattern, name } of packageManagers) {
			if (pattern.test(normalized)) {
				risks.push({
					type: RiskType.PackageInstall,
					severity: 'medium',
					reason: `Package installation via ${name}`,
					pattern: name + ' install',
				});
			}
		}

		return risks;
	}

	/**
	 * Check for script execution
	 */
	private checkScriptExecution(command: string, normalized: string): ISecurityRisk[] {
		const risks: ISecurityRisk[] = [];

		// Script interpreters
		const interpreters = ['sh', 'bash', 'zsh', 'python', 'python3', 'ruby', 'perl', 'php', 'node', 'powershell', 'pwsh'];

		for (const interpreter of interpreters) {
			if (normalized.match(new RegExp(`\\b${interpreter}\\b`))) {
				// Allow --help and --version
				if (command.match(/--help|--version/)) {
					continue;
				}

				risks.push({
					type: RiskType.ScriptExecution,
					severity: 'high',
					reason: `Script execution via ${interpreter}`,
					pattern: interpreter,
				});
				break;
			}
		}

		// Direct script execution (./script.sh, etc.)
		if (command.match(/\.\/(.*?)\.(sh|py|rb|pl|ps1|bat|cmd)/)) {
			risks.push({
				type: RiskType.ScriptExecution,
				severity: 'high',
				reason: 'Direct script file execution',
				pattern: './script',
			});
		}

		// eval and exec
		if (normalized.match(/\b(eval|exec)\b/)) {
			risks.push({
				type: RiskType.ScriptExecution,
				severity: 'critical',
				reason: 'Dynamic code execution (eval/exec)',
				pattern: 'eval/exec',
			});
		}

		return risks;
	}

	/**
	 * Check for system modifications
	 */
	private checkSystemModifications(normalized: string): ISecurityRisk[] {
		const risks: ISecurityRisk[] = [];

		// chmod 777 or chmod +s (setuid)
		if (normalized.includes('chmod')) {
			if (normalized.match(/chmod\s+(777|776|775|\+s|u\+s|g\+s)/)) {
				risks.push({
					type: RiskType.SystemModification,
					severity: 'critical',
					reason: 'Dangerous permission modification',
					pattern: 'chmod 777/+s',
				});
			} else {
				risks.push({
					type: RiskType.SystemModification,
					severity: 'medium',
					reason: 'File permission modification',
					pattern: 'chmod',
				});
			}
		}

		// chown root
		if (normalized.includes('chown') && normalized.includes('root')) {
			risks.push({
				type: RiskType.SystemModification,
				severity: 'critical',
				reason: 'Changing ownership to root',
				pattern: 'chown root',
			});
		}

		// systemctl/service
		if (normalized.match(/\b(systemctl|service|launchctl)\b/)) {
			risks.push({
				type: RiskType.SystemModification,
				severity: 'high',
				reason: 'System service management',
				pattern: 'service management',
			});
		}

		// Windows registry
		if (normalized.match(/\b(reg|regedit|regsvr32)\b/)) {
			risks.push({
				type: RiskType.SystemModification,
				severity: 'critical',
				reason: 'Windows registry modification',
				pattern: 'registry',
			});
		}

		// crontab/scheduled tasks
		if (normalized.match(/\b(crontab|at|schtasks)\b/)) {
			risks.push({
				type: RiskType.SystemModification,
				severity: 'high',
				reason: 'Scheduled task modification',
				pattern: 'cron/scheduled task',
			});
		}

		return risks;
	}

	/**
	 * Check for credential exposure
	 */
	private checkCredentialExposure(command: string): ISecurityRisk[] {
		const risks: ISecurityRisk[] = [];

		// API keys and tokens in command
		const sensitivePatterns = [
			{ pattern: /api[_-]?key/i, name: 'API key' },
			{ pattern: /secret[_-]?key/i, name: 'Secret key' },
			{ pattern: /password/i, name: 'Password' },
			{ pattern: /token/i, name: 'Token' },
			{ pattern: /auth[_-]?token/i, name: 'Auth token' },
		];

		for (const { pattern, name } of sensitivePatterns) {
			if (pattern.test(command)) {
				risks.push({
					type: RiskType.CredentialExposure,
					severity: 'high',
					reason: `Potential ${name.toLowerCase()} in command`,
					pattern: name,
				});
			}
		}

		return risks;
	}

	/**
	 * Check for command obfuscation
	 */
	private checkObfuscation(command: string): ISecurityRisk[] {
		const risks: ISecurityRisk[] = [];

		// Base64 decoding
		if (command.match(/base64\s+(--decode|-d)/)) {
			risks.push({
				type: RiskType.Obfuscation,
				severity: 'high',
				reason: 'Base64 decoding detected',
				pattern: 'base64 -d',
			});
		}

		// Hex encoding
		if (command.match(/\\x[0-9a-f]{2}/i)) {
			risks.push({
				type: RiskType.Obfuscation,
				severity: 'high',
				reason: 'Hex-encoded characters detected',
				pattern: '\\x hex encoding',
			});
		}

		// Command substitution $(...)
		if (command.includes('$(')) {
			risks.push({
				type: RiskType.Obfuscation,
				severity: 'medium',
				reason: 'Command substitution detected',
				pattern: '$()',
			});
		}

		// Backtick substitution
		if (command.includes('`')) {
			risks.push({
				type: RiskType.Obfuscation,
				severity: 'medium',
				reason: 'Backtick command substitution',
				pattern: '`cmd`',
			});
		}

		return risks;
	}
}
