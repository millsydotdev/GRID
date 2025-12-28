# GRID Placeholders

**Status**: Text-based placeholders in use.

## Current Placeholders

GRID uses intentional, minimal text-based placeholders instead of generic graphics:

### Onboarding Screen
- **Location**: `src/vs/workbench/contrib/grid/browser/react/src/grid-onboarding/GridOnboarding.tsx`
- **Implementation**: "GRID" text in circular frame with border
- **Purpose**: Welcome screen placeholder until branding exists

### Editor Watermark
- **Location**: `src/vs/workbench/browser/parts/editor/editorGroupWatermark.ts`
- **Implementation**: "GRID" text placeholder with theme-aware opacity
- **Purpose**: Empty editor state visual

### README Header
- **Location**: `README.md`
- **Implementation**: Text-only, no visual
- **Purpose**: Project introduction without misleading graphics

## Philosophy

**Prefer absence over generic presence.**

Text placeholders are better than:
- Stock images that don't represent the product
- Generic AI/tech graphics
- Repurposed third-party visuals
- Legacy branding from forks

## Replacing Placeholders

When replacing text placeholders with real assets:

1. Create proper branding assets in `assets/branding/`
2. Add screenshots to `assets/screenshots/`
3. Update code references to point to new assets
4. Remove this note from documentation
5. Update README.md to showcase real visuals
