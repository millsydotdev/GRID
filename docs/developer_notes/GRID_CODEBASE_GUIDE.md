# GRID Codebase Guide

This guide orients you to key areas changed or added for GRID.

GRID is a direct fork of [microsoft/vscode](https://github.com/microsoft/vscode), built by Millsy.dev with advanced AI coding features.

## Key Areas

- Product metadata: `product.json`
- CLI wrappers: `scripts/grid*.{sh,bat}` and shell completions in `resources/completions/`
- Linux packaging: `resources/linux/grid.desktop`, `grid-url-handler.desktop`, `grid.appdata.xml`
- Provider configs: `resources/provider-config.example.json`
- LLM wiring: `src/vs/workbench/contrib/grid/*/llm*` (providers, settings, services)
- Settings UI: `src/vs/workbench/contrib/grid/browser/gridSettingsPane.ts`
- Chat and sidebar: `src/vs/workbench/contrib/grid/browser/sidebar*`
- Learning Engine: `src/vs/workbench/contrib/grid/common/gridLearningEngine.ts`
- React Components: `src/vs/workbench/contrib/grid/browser/react/src/`

## Architecture

GRID extends VS Code with:
- **5 Agent Modes**: Build, Plan, Explore, Review, Debug
- **Learning Engine**: Self-improving AI that learns from conversations
- **Multi-conversation Management**: Advanced Agent Manager UI
- **Direct Model Access**: No data retention, direct provider communication
