/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Run Comprehensive Performance Audit
 *
 * This script runs all audits and generates a comprehensive report
 * Run in browser console: gridRunAudit()
 */

import { printComprehensiveAuditReport, generateComprehensiveAuditReport } from './comprehensiveAudit.js';
import { startupAudit } from './startupAudit.js';
import { metricsCollector } from './metricsCollector.js';

/**
 * Run full audit and print report
 */
export function runAudit(): void {
	console.log('🔍 Running Comprehensive Performance Audit...\n');

	// Complete startup audit if not already done
	const startupMetrics = startupAudit.getMetrics();
	if (!startupMetrics) {
		startupAudit.complete();
	}

	// Print comprehensive report
	printComprehensiveAuditReport();

	// Additional diagnostics
	console.group('📊 Additional Diagnostics');
	console.log(`Chat Requests Collected: ${metricsCollector.getAll().length}`);
	console.log(`Startup Metrics Available: ${startupMetrics ? '✅' : '❌'}`);
	console.groupEnd();

	console.log('\n✅ Audit complete!');
}

/**
 * Get audit report as JSON
 */
export function getAuditReport(): ReturnType<typeof generateComprehensiveAuditReport> {
	return generateComprehensiveAuditReport();
}

// Expose globally
if (typeof window !== 'undefined') {
	(window as any).gridRunAudit = runAudit;
	(window as any).gridGetAuditReport = getAuditReport;
}
