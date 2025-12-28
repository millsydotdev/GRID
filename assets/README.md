# GRID Assets

This directory contains all visual assets for the GRID project.

## Structure

- **`branding/`** - Logo, icons, and brand identity (coming soon)
- **`screenshots/`** - Product screenshots and demos (to be added)
- **`placeholders/`** - Temporary neutral placeholders

## Status

**Visual identity is intentionally minimal.** GRID does not yet have final branding or visual identity. This is by design.

### What's Missing (Intentionally)

- **Logo**: No official logo exists yet
- **Screenshots**: No product screenshots have been created yet
- **Marketing visuals**: Deferred until brand identity is established

### What Was Removed

The following legacy/generic visuals were removed during cleanup:

- Generic AI robot head images (not GRID-specific)
- Legacy branding from earlier versions
- Non-GRID placeholder images

## Contributing

When GRID's visual identity is ready:

1. Add logo files to `branding/`
2. Add product screenshots to `screenshots/`
3. Update `README.md` to reference new assets
4. Update `src/vs/workbench/contrib/grid/browser/react/src/grid-onboarding/GridOnboarding.tsx`
5. Update `src/vs/workbench/browser/parts/editor/editorGroupWatermark.ts`

Until then, the project uses text-based placeholders ("GRID" text).
