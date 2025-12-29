/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// --- Configuration ---
const WEBSITE_API_URL = process.env.GRID_WEBSITE_URL || 'https://grideditor.com';
const API_SECRET = process.env.GRID_API_SECRET;

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

if (!API_SECRET && !isDryRun) {
    console.warn('⚠️  GRID_API_SECRET is not set. Release will NOT be published to the website (unless --dry-run is used).');
    process.exit(0); // Exit gracefully if not configured, or exit(1) if strict
}

// --- Helpers ---

function postToApi(endpoint: string, data: any): Promise<any> {
    if (isDryRun) {
        console.log(`[DRY-RUN] Would POST to ${endpoint}:`, JSON.stringify(data, null, 2));
        return Promise.resolve({ success: true, dryRun: true });
    }

    return new Promise((resolve, reject) => {
        const url = new URL(`${WEBSITE_API_URL}${endpoint}`);
        const body = JSON.stringify(data);

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'Authorization': `Bearer ${API_SECRET}`
            }
        };

        const req = https.request(url, options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch (e) {
                        resolve(responseData); // fallback if not json
                    }
                } else {
                    reject(new Error(`API Error ${res.statusCode}: ${responseData}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(body);
        req.end();
    });
}

// --- Main ---

async function main() {
    const rootDir = path.join(__dirname, '..');
    const productJsonPath = path.join(rootDir, 'product.json');
    const packageJsonPath = path.join(rootDir, 'package.json');

    const product = JSON.parse(fs.readFileSync(productJsonPath, 'utf8'));
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Extract Info
    const version = pkg.version; // e.g., 0.9.2
    const commit = pkg.distro || 'unknown';
    const channel = 'stable'; // Default to stable, could be inferred from args
    const date = new Date().toISOString();

    console.log(`🚀 Publishing Release Info for ${version} (${commit})...`);
    if (isDryRun) console.log('🧪 DRY RUN MODE ENABLED');

    // 1. Publish Release Metadata (Win32 x64 example)
    // In a real scenario, this script might run per-platform or aggregate artifacts.
    // For now, let's assume we are publishing the Windows build info.
    // The download URL logic needs to match where your binaries are hosted (e.g., GitHub Releases or R2)

    // Construct Download URL (GitHub Releases Convention)
    // https://github.com/GRID-Editor/binaries/releases/download/v0.9.2/grid-0.9.2-windows-x86_64.msi
    const downloadUrl = `https://github.com/GRID-Editor/binaries/releases/download/v${version}/grid-${version}-windows-x86_64.msi`;

    // We can also compute SHA256 here if we have the file
    // const filePath = ...; const sha256 = ...;

    const releaseData = {
        version: version,
        channel: channel,
        platform: 'windows',
        arch: 'x64',
        url: downloadUrl,
        published_at: date
    };

    try {
        console.log('📤 Sending release metadata...');
        await postToApi('/api/releases', releaseData);
        console.log('✅ Release metadata updated.');
    } catch (e) {
        console.error('❌ Failed to update release metadata:', e);
        if (!isDryRun) process.exit(1);
    }

    // 2. Publish Changelog
    // Extract recent commits for changelog
    let changelogDesc = `Update to version ${version}.`;
    try {
        // Get last tag
        // const lastTag = require('child_process').execSync('git describe --tags --abbrev=0').toString().trim();
        // Log since last tag (or last 10 commits if no tag)
        // const logs = require('child_process').execSync(`git log ${lastTag}..HEAD --pretty=format:"- %s"`).toString();

        // Simpler approach for now: last 5 commits
        const logs = require('child_process').execSync('git log -n 5 --pretty=format:"- %s"').toString();
        changelogDesc = `Latest changes in v${version}:\n\n${logs}`;
    } catch (e) {
        console.warn('⚠️ Could not extract git logs, using default description.');
    }

    const changelogData = {
        version: version,
        title: `GRID ${version}`,
        description: changelogDesc,
        tags: ['Update', channel],
        published_at: date
    };

    try {
        console.log('📝 Sending changelog...');
        await postToApi('/api/changelog', changelogData);
        console.log('✅ Changelog published.');
    } catch (e) {
        console.error('❌ Failed to publish changelog:', e);
        // Don't fail build if changelog fails, maybe?
    }
}

main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
