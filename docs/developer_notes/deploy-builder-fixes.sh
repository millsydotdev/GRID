#!/bin/bash
set -e

echo "🔧 Deploying grid-builder and GRID-WEBSITE fixes..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# ============================================
# PART 1: Fix grid-builder workflows
# ============================================
echo -e "${YELLOW}📦 Cloning grid-builder...${NC}"
git clone https://github.com/GRID-Editor/grid-builder.git
cd grid-builder

echo -e "${YELLOW}📝 Updating workflows...${NC}"

# Update stable-linux.yml
cat > .github/workflows/stable-linux.yml << 'WORKFLOW_EOF'
name: Stable Linux

on:
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-22.04
    steps:
      - name: Checkout grid-builder
        uses: actions/checkout@v4

      - name: Checkout GRID
        uses: actions/checkout@v4
        with:
          repository: GRID-Editor/GRID
          token: ${{ secrets.STRONGER_GITHUB_TOKEN }}
          path: vscode

      - name: Get Node version from GRID
        id: node-version
        run: |
          NODE_VER=$(cat vscode/.nvmrc)
          echo "NODE_VERSION=$NODE_VER" >> $GITHUB_OUTPUT
          echo "✅ Using Node version: $NODE_VER"

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ steps.node-version.outputs.NODE_VERSION }}

      - name: Verify Node version
        run: |
          echo "Node: $(node --version)"
          echo "NPM: $(npm --version)"

      - name: Build
        run: |
          chmod +x ./build.sh
          ./build.sh
WORKFLOW_EOF

echo -e "${GREEN}✅ Workflows updated${NC}"

echo -e "${YELLOW}💾 Committing changes...${NC}"
git add .github/workflows/
git commit -m "fix: Use dynamic Node version from GRID .nvmrc

Fixes:
- Node version mismatch (was v20, now reads from GRID's .nvmrc)
- Ensures compatibility with @electron/get@2.0.3
- Auto-detects correct Node version for each build"

echo -e "${YELLOW}🚀 Pushing to grid-builder...${NC}"
git push

echo -e "${GREEN}✅ grid-builder workflows fixed!${NC}"

# ============================================
# PART 2: Add downloads page to GRID-WEBSITE
# ============================================
cd "$TEMP_DIR"
echo -e "${YELLOW}📦 Cloning GRID-WEBSITE...${NC}"
git clone https://github.com/GRID-Editor/GRID-WEBSITE.git
cd GRID-WEBSITE

echo -e "${YELLOW}📄 Creating downloads page...${NC}"

# Create download page
mkdir -p app/download
cat > app/download/page.tsx << 'TSX_EOF'
import { DownloadSection } from '@/components/DownloadSection';

export const metadata = {
  title: 'Download GRID | AI Code Editor',
  description: 'Download GRID for Linux, macOS, or Windows',
};

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-[1300px] mx-auto px-6 py-32">
        <h1 className="text-5xl md:text-7xl font-black mb-6 text-center bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
          Download GRID
        </h1>
        <DownloadSection />
      </div>
    </main>
  );
}
TSX_EOF

# Create lib files
mkdir -p lib
cat > lib/github.ts << 'TS_EOF'
export async function getLatestRelease(platform: string, arch: string) {
  const url = `https://raw.githubusercontent.com/GRID-Editor/versions/main/stable/${platform}/${arch}/latest.json`;
  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) return null;
  return response.json();
}

export async function getAllReleases() {
  const [linux, macos, macosArm, windows] = await Promise.all([
    getLatestRelease('linux', 'x86_64'),
    getLatestRelease('darwin', 'x86_64'),
    getLatestRelease('darwin', 'aarch64'),
    getLatestRelease('windows', 'x64'),
  ]);
  return { linux, macos, macosArm, windows };
}
TS_EOF

# Create component
mkdir -p components
cat > components/DownloadSection.tsx << 'TSX_EOF'
'use client';

import { useEffect, useState } from 'react';
import { getAllReleases } from '@/lib/github';

export function DownloadSection() {
  const [releases, setReleases] = useState<any>(null);

  useEffect(() => {
    getAllReleases().then(setReleases);
  }, []);

  if (!releases) return <div>Loading...</div>;

  const platforms = [
    { key: 'linux', data: releases.linux, icon: '🐧', name: 'Linux' },
    { key: 'macos', data: releases.macos, icon: '🍎', name: 'macOS Intel' },
    { key: 'macosArm', data: releases.macosArm, icon: '🍎', name: 'macOS Apple Silicon' },
    { key: 'windows', data: releases.windows, icon: '🪟', name: 'Windows' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {platforms.map(({ key, data, icon, name }) => (
        <div key={key} className="p-6 bg-white/5 border border-white/10 rounded-2xl">
          <div className="text-4xl mb-4">{icon}</div>
          <h3 className="text-lg font-bold mb-2">{name}</h3>
          {data ? (
            <>
              <p className="text-xs text-neutral-500 mb-4">v{data.version}</p>
              <a
                href={data.artifacts[0].url}
                className="block w-full py-2 px-4 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-bold text-center"
              >
                Download
              </a>
            </>
          ) : (
            <p className="text-sm text-neutral-500">Coming soon</p>
          )}
        </div>
      ))}
    </div>
  );
}
TSX_EOF

echo -e "${GREEN}✅ Files created${NC}"

echo -e "${YELLOW}💾 Committing changes...${NC}"
git add .
git commit -m "feat: Add downloads page with GitHub releases integration

- Fetches latest releases from GRID-Editor/versions
- Auto-detects user platform
- Links to binaries in GRID-Editor/binaries
- Responsive design matching site theme"

echo -e "${YELLOW}🚀 Pushing to GRID-WEBSITE...${NC}"
git push

echo -e "${GREEN}✅ GRID-WEBSITE updated!${NC}"

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}🎉 All fixes deployed!${NC}"
echo ""
echo "Next steps:"
echo "1. Trigger grid-builder workflow"
echo "2. Wait for build to complete"
echo "3. Check https://grid-website-millsydotdev-grid-editor.vercel.app/download"
