#!/usr/bin/env node

/**
 * Fix Copyright Headers - Replace Microsoft headers with correct Millsy.dev headers for GRID files
 */

const fs = require('fs');
const path = require('path');

const GRID_HEADER = `/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/`;

const MICROSOFT_HEADER_PATTERN = /\/\*-+\s*\n\s*\*\s*Copyright \(c\) Microsoft Corporation\. All rights reserved\.\s*\n\s*\*\s*Licensed under the MIT License\. See License\.txt in the project root for license information\.\s*\n\s*-+\*\//;

const GRID_FILES = [
	'dashboard-api/next.config.js',
	'dashboard-api/lib/auth.ts',
	'dashboard-api/lib/stripe.ts',
	'dashboard-api/lib/supabase.ts',
	'extensions/grid-enterprise/src/extension.ts',
	'dashboard-api/app/api/config/route.ts',
	'dashboard-api/app/api/user/route.ts',
	'dashboard-api/app/api/auth/validate/route.ts',
	'dashboard-api/app/api/billing/checkout/route.ts',
	'dashboard-api/app/api/webhooks/stripe/route.ts',
	'test/sonarqube-mcp/src/index.ts',
	'src/vs/workbench/contrib/grid/browser/autocompleteService.ts'
];

async function fixHeaders() {
	console.log('Fixing copyright headers...\n');
	let fixed = 0;

	for (const file of GRID_FILES) {
		const fullPath = path.join('/home/user/GRID', file);

		if (!fs.existsSync(fullPath)) {
			console.log(`  Skip (not found): ${file}`);
			continue;
		}

		try {
			let content = fs.readFileSync(fullPath, 'utf8');

			// Remove Microsoft header if present
			if (MICROSOFT_HEADER_PATTERN.test(content)) {
				content = content.replace(MICROSOFT_HEADER_PATTERN, '').trim();
				console.log(`  Removed Microsoft header from: ${file}`);
			}

			// Add GRID header if not already present
			if (!content.includes('Copyright (c) 2025 Millsy.dev')) {
				content = GRID_HEADER + '\n\n' + content.trim() + '\n';
				fs.writeFileSync(fullPath, content, 'utf8');
				console.log(`  ✓ Fixed: ${file}`);
				fixed++;
			} else {
				console.log(`  Skip (already has correct header): ${file}`);
			}
		} catch (error) {
			console.error(`  ✗ Error fixing ${file}:`, error.message);
		}
	}

	console.log(`\nFixed ${fixed} files with correct Millsy.dev headers\n`);
}

fixHeaders().catch(console.error);
