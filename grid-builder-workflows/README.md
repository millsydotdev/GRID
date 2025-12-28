# Grid-Builder Workflow Files

These are updated workflow files for the **grid-builder** repository.

## Files

- `stable-linux.yml` - Linux build workflow (fixed)
- `stable-macos.yml` - macOS build workflow (to be created)
- `stable-windows.yml` - Windows build workflow (to be created)

## Key Changes

### 1. Dynamic Node Version

Instead of hardcoding Node v20, workflows now read from GRID's `.nvmrc`:

```yaml
- name: Get Node version from GRID
  id: node-version
  run: |
    NODE_VER=$(cat vscode/.nvmrc)
    echo "NODE_VERSION=$NODE_VER" >> $GITHUB_OUTPUT

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: ${{ steps.node-version.outputs.NODE_VERSION }}
```

This ensures the builder always uses the correct Node version that GRID requires.

### 2. Compatibility Fixes

With the `package.json` overrides in GRID repo, `@electron/get` will be forced to v2.0.3, resolving the ESM error.

## Installation in grid-builder

1. Copy these workflow files to grid-builder repo:
```bash
cd /path/to/grid-builder
cp /path/to/GRID/grid-builder-workflows/*.yml .github/workflows/
```

2. Commit and push:
```bash
git add .github/workflows/
git commit -m "fix: Update workflows to use dynamic Node version from GRID"
git push
```

3. Test the build:
```bash
gh workflow run stable-linux.yml --repo GRID-Editor/grid-builder
```

## Monitoring

Watch the build:
```bash
gh run watch --repo GRID-Editor/grid-builder
```

View logs:
```bash
gh run view --log --repo GRID-Editor/grid-builder
```

## Expected Results

After these changes:
- ✅ Builds use Node 22.20.0 (from .nvmrc)
- ✅ No EBADENGINE warnings
- ✅ No ERR_REQUIRE_ESM errors
- ✅ Successful compilation
- ✅ Artifacts uploaded

## Troubleshooting

If builds still fail:

1. **Check Node version in logs:**
   Look for "Using Node version: X.X.X" in the logs

2. **Verify @electron/get version:**
   Check that it shows v2.0.3 in npm install logs

3. **Check package-lock.json in GRID:**
   Make sure overrides are applied:
   ```bash
   grep -A5 "@electron/get" package-lock.json
   ```

4. **Clear npm cache in workflow:**
   Add before build:
   ```yaml
   - name: Clear npm cache
     run: npm cache clean --force
   ```
