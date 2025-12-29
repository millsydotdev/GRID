# GRID IDE Bridge for Unreal Engine

> **Requires GRID IDE** - Get it at [grideditor.com](https://grideditor.com)

AI-powered development directly inside Unreal Engine via GRID IDE.

## Compatibility

- **Unreal Engine**: Any version (4.27+, 5.0+, 5.1+, 5.2+, 5.3+, 5.4+, 5.5+)
- **Platforms**: Windows, macOS, Linux
- **Required**: GRID IDE (this plugin does nothing without it)

## Features

- **Blueprint Manipulation**: Create, compile, modify blueprints via AI
- **Actor Management**: List, spawn, transform, property access
- **Material Editing**: Create materials, instances, node graphs
- **Widget Control**: UMG widget creation and styling
- **Asset Operations**: Search, import, save, reference management
- **Enhanced Input**: Action/mapping context creation

## Installation

### Option 1: Automatic (Recommended)

1. Open your Unreal project in GRID IDE
2. GRID prompts to install the plugin
3. Click "Install" - done!

### Option 2: Marketplace

1. Get from Unreal Marketplace (when available)
2. Enable in Plugins menu

### Option 3: Manual

1. Copy the `GRID` folder to `Engine/Plugins/Marketplace/GRID/`
2. Restart Unreal Editor

## How It Works

1. Plugin starts TCP server on dynamic port
2. Writes port to `Saved/Config/GRID/Port.txt`
3. GRID IDE reads port file and connects
4. AI sends JSON commands, plugin executes them

## Requirements

- **GRID IDE** (required - plugin is useless without it)
- Unreal Engine (any version with Editor module support)

## License

Copyright 2025 GRID. All Rights Reserved.
