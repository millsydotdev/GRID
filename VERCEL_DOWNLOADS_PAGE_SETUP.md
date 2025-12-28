# Vercel Website Downloads Page Setup

## Current Status

**Problem:** The `/download` page returns 404 - it doesn't exist yet!

**Website:** https://grid-website-millsydotdev-grid-editor.vercel.app
**Framework:** Next.js
**Deployment:** Vercel (under team `grid-editor`)

## What Needs to Be Done

Create a `/download` page that:
1. Fetches latest release metadata from `GRID-NETWORK-REPO/versions` repository
2. Detects user's platform (Linux/Mac/Windows)
3. Shows download buttons linking to `GRID-NETWORK-REPO/binaries` releases
4. Displays version information and checksums

---

## Download Page Implementation

### File Structure

```
grid-website/
├── app/
│   └── download/
│       └── page.tsx          # New download page
├── lib/
│   ├── github.ts             # GitHub API helpers
│   └── platform-detect.ts    # Platform detection
└── components/
    └── DownloadButton.tsx    # Download button component
```

### 1. Create Download Page (`app/download/page.tsx`)

```tsx
import { Suspense } from 'react';
import { DownloadSection } from '@/components/DownloadSection';

export const metadata = {
  title: 'Download GRID | AI-Native Code Editor',
  description: 'Download GRID for Linux, macOS, or Windows. Free and open source.',
};

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-[1300px] mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
            Download GRID
          </h1>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
            Free, open-source AI code editor. Choose your platform.
          </p>
        </div>

        <Suspense fallback={<DownloadSkeleton />}>
          <DownloadSection />
        </Suspense>
      </div>
    </main>
  );
}

function DownloadSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-2xl animate-pulse">
          <div className="h-16 bg-white/10 rounded mb-4"></div>
          <div className="h-8 bg-white/10 rounded mb-2"></div>
          <div className="h-6 bg-white/10 rounded"></div>
        </div>
      ))}
    </div>
  );
}
```

### 2. Fetch Release Data (`lib/github.ts`)

```typescript
const GITHUB_API = 'https://api.github.com';
const VERSIONS_REPO = 'GRID-NETWORK-REPO/versions';

export interface ReleaseArtifact {
  name: string;
  type: 'deb' | 'rpm' | 'tar.gz' | 'dmg' | 'exe' | 'zip';
  url: string;
  size: number;
  checksum: {
    sha256: string;
  };
}

export interface PlatformRelease {
  version: string;
  gridVersion: string;
  gridRelease: string;
  releaseDate: string;
  platform: string;
  arch: string;
  artifacts: ReleaseArtifact[];
}

export async function getLatestRelease(
  platform: 'linux' | 'darwin' | 'windows',
  arch: 'x86_64' | 'aarch64' | 'arm64' | 'x64'
): Promise<PlatformRelease | null> {
  try {
    const normalizedArch = normalizeArch(platform, arch);
    const url = `https://raw.githubusercontent.com/${VERSIONS_REPO}/main/stable/${platform}/${normalizedArch}/latest.json`;

    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`Failed to fetch release for ${platform}/${arch}:`, response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching release:', error);
    return null;
  }
}

function normalizeArch(platform: string, arch: string): string {
  // Map browser arch to repo arch naming
  if (arch === 'arm64') return 'aarch64';
  if (arch === 'x64') return 'x86_64';
  return arch;
}

export async function getAllReleases(): Promise<{
  linux: PlatformRelease | null;
  macos: PlatformRelease | null;
  macosArm: PlatformRelease | null;
  windows: PlatformRelease | null;
}> {
  const [linux, macos, macosArm, windows] = await Promise.all([
    getLatestRelease('linux', 'x86_64'),
    getLatestRelease('darwin', 'x86_64'),
    getLatestRelease('darwin', 'aarch64'),
    getLatestRelease('windows', 'x64'),
  ]);

  return { linux, macos, macosArm, windows };
}
```

### 3. Platform Detection (`lib/platform-detect.ts`)

```typescript
export function detectPlatform(): {
  os: 'linux' | 'darwin' | 'windows' | 'unknown';
  arch: 'x86_64' | 'aarch64' | 'arm64' | 'unknown';
} {
  if (typeof window === 'undefined') {
    return { os: 'unknown', arch: 'unknown' };
  }

  const userAgent = window.navigator.userAgent.toLowerCase();

  let os: 'linux' | 'darwin' | 'windows' | 'unknown' = 'unknown';
  if (userAgent.includes('mac')) os = 'darwin';
  else if (userAgent.includes('win')) os = 'windows';
  else if (userAgent.includes('linux')) os = 'linux';

  // Detect architecture (ARM vs x86)
  let arch: 'x86_64' | 'aarch64' | 'arm64' | 'unknown' = 'x86_64';
  if (userAgent.includes('arm') || userAgent.includes('aarch64')) {
    arch = os === 'darwin' ? 'aarch64' : 'arm64';
  }

  return { os, arch };
}

export function getPlatformName(os: string, arch?: string): string {
  if (os === 'darwin') {
    return arch === 'aarch64' ? 'macOS (Apple Silicon)' : 'macOS (Intel)';
  }
  if (os === 'windows') return 'Windows';
  if (os === 'linux') return 'Linux';
  return 'Unknown';
}
```

### 4. Download Section Component (`components/DownloadSection.tsx`)

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getAllReleases, type PlatformRelease } from '@/lib/github';
import { detectPlatform, getPlatformName } from '@/lib/platform-detect';

export function DownloadSection() {
  const [releases, setReleases] = useState<any>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<any>(null);

  useEffect(() => {
    setDetectedPlatform(detectPlatform());
    getAllReleases().then(setReleases);
  }, []);

  if (!releases) return <DownloadSkeleton />;

  const platforms = [
    { key: 'linux', data: releases.linux, icon: '🐧', name: 'Linux' },
    { key: 'macos', data: releases.macos, icon: '🍎', name: 'macOS (Intel)' },
    { key: 'macosArm', data: releases.macosArm, icon: '🍎', name: 'macOS (Apple Silicon)' },
    { key: 'windows', data: releases.windows, icon: '🪟', name: 'Windows' },
  ];

  return (
    <div className="space-y-12">
      {/* Recommended Download */}
      {detectedPlatform && detectedPlatform.os !== 'unknown' && (
        <div className="text-center">
          <p className="text-sm text-neutral-500 mb-4">Recommended for your system:</p>
          <RecommendedDownload
            platform={detectedPlatform.os}
            release={releases[getPlatformKey(detectedPlatform.os, detectedPlatform.arch)]}
          />
        </div>
      )}

      {/* All Platforms */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {platforms.map(({ key, data, icon, name }) => (
          <PlatformCard key={key} icon={icon} name={name} release={data} />
        ))}
      </div>

      {/* Installation Instructions */}
      <div className="mt-16 p-8 bg-white/5 border border-white/10 rounded-2xl">
        <h2 className="text-2xl font-bold mb-6">Installation</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div>
            <h3 className="font-bold text-red-500 mb-2">Linux</h3>
            <code className="block bg-black/50 p-3 rounded text-xs">
              # Debian/Ubuntu<br/>
              sudo dpkg -i grid-*.deb<br/><br/>
              # Fedora/RHEL<br/>
              sudo rpm -i grid-*.rpm
            </code>
          </div>
          <div>
            <h3 className="font-bold text-red-500 mb-2">macOS</h3>
            <code className="block bg-black/50 p-3 rounded text-xs">
              # Open DMG and drag to Applications<br/>
              open grid-*.dmg
            </code>
          </div>
          <div>
            <h3 className="font-bold text-red-500 mb-2">Windows</h3>
            <code className="block bg-black/50 p-3 rounded text-xs">
              # Run installer<br/>
              grid-setup.exe
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformCard({ icon, name, release }: any) {
  if (!release) {
    return (
      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl opacity-50">
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-lg font-bold mb-2">{name}</h3>
        <p className="text-sm text-neutral-500">Coming soon</p>
      </div>
    );
  }

  const mainArtifact = release.artifacts[0];

  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-red-500/30 transition-all">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold mb-2">{name}</h3>
      <p className="text-xs text-neutral-500 mb-4">v{release.version}</p>
      <a
        href={mainArtifact.url}
        className="block w-full py-2 px-4 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-bold text-center transition-colors"
      >
        Download {mainArtifact.type.toUpperCase()}
      </a>
      <p className="text-xs text-neutral-600 mt-2 text-center">
        {(mainArtifact.size / 1024 / 1024).toFixed(0)} MB
      </p>
    </div>
  );
}

function RecommendedDownload({ platform, release }: any) {
  if (!release) return null;

  const mainArtifact = release.artifacts[0];

  return (
    <a
      href={mainArtifact.url}
      className="inline-flex items-center gap-3 px-8 py-4 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-lg transition-all"
    >
      Download for {getPlatformName(platform)}
      <span className="text-sm opacity-75">v{release.version}</span>
    </a>
  );
}

function getPlatformKey(os: string, arch: string) {
  if (os === 'darwin') return arch === 'aarch64' ? 'macosArm' : 'macos';
  return os;
}

function DownloadSkeleton() {
  return <div className="text-center text-neutral-500">Loading...</div>;
}
```

---

## Deployment Steps

### 1. Add Files to GRID-WEBSITE Repo

In the GRID-WEBSITE repository:

```bash
# Create download page
mkdir -p app/download
cat > app/download/page.tsx << 'EOF'
[paste page.tsx content]
EOF

# Create lib files
mkdir -p lib
cat > lib/github.ts << 'EOF'
[paste github.ts content]
EOF

cat > lib/platform-detect.ts << 'EOF'
[paste platform-detect.ts content]
EOF

# Create component
mkdir -p components
cat > components/DownloadSection.tsx << 'EOF'
[paste DownloadSection.tsx content]
EOF
```

### 2. Update Navigation

In your main layout or navigation component, update the Downloads link:

```tsx
<a href="/download">Downloads</a>
```

### 3. Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "feat: Add downloads page with GitHub releases integration"
git push

# Vercel will auto-deploy
# Or manually deploy:
vercel --prod
```

### 4. Verify

1. Visit `https://grid-website-millsydotdev-grid-editor.vercel.app/download`
2. Check that platform is detected correctly
3. Verify download links work
4. Test on different browsers/platforms

---

## Testing Checklist

- [ ] Page loads without 404
- [ ] Detects Linux correctly
- [ ] Detects macOS (Intel) correctly
- [ ] Detects macOS (Apple Silicon) correctly
- [ ] Detects Windows correctly
- [ ] Shows all 4 platform cards
- [ ] Download buttons link to binaries repo
- [ ] Version numbers display correctly
- [ ] File sizes show correctly
- [ ] Installation instructions visible
- [ ] Mobile responsive
- [ ] Loading states work
- [ ] Handles missing releases gracefully

---

## Environment Variables (Optional)

If you want to add a GitHub token for higher API rate limits:

```bash
# In Vercel project settings
GITHUB_TOKEN=ghp_your_token_here
```

Then update `lib/github.ts`:

```typescript
const response = await fetch(url, {
  headers: process.env.GITHUB_TOKEN
    ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` }
    : {},
  next: { revalidate: 300 },
});
```

---

## Integration with Builder

Once grid-builder is fixed and running:

1. **Builder creates release** → Uploads to `binaries` repo
2. **Builder updates metadata** → Updates `versions` repo
3. **Website fetches** → Gets latest from `versions` repo (cached 5 min)
4. **User downloads** → Clicks button → Downloads from `binaries` repo

---

## Troubleshooting

**404 on /download:**
- Make sure `app/download/page.tsx` exists
- Redeploy to Vercel
- Check build logs for errors

**Can't fetch releases:**
- Check CORS (GitHub raw should allow)
- Verify versions repo is public
- Check network tab for failed requests

**Wrong platform detected:**
- Check user agent parsing in `platform-detect.ts`
- Test with different browsers
- Add console.log to debug detection

---

## Next Steps

1. Create the page files in GRID-WEBSITE repo
2. Test locally with `npm run dev`
3. Commit and push
4. Vercel auto-deploys
5. Test the live /download page
6. Fix grid-builder (using fixes from GRID_BUILDER_FIXES.md)
7. Run a build
8. Verify downloads appear on website

---

**Status:** Ready to implement
**Estimated Time:** 30-60 minutes to code and deploy
