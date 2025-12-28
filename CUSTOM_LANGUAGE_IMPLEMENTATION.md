# Custom Language Support Implementation

## Overview

This document describes the custom language support feature that has been implemented in GRID IDE. This feature allows developers to define and use custom programming languages dynamically without needing to rebuild the IDE.

## Implementation Summary

### Files Created

#### Core Service and Configuration

1. **`src/vs/workbench/services/customLanguages/common/customLanguageConfiguration.ts`**
   - Defines TypeScript interfaces for custom language definitions
   - Includes configuration schemas for:
     - Language metadata (ID, display name, file associations)
     - Editor behavior (comments, brackets, auto-closing pairs, indentation)
     - TextMate grammar configuration
     - Language Server Protocol (LSP) integration

2. **`src/vs/workbench/services/customLanguages/common/customLanguages.ts`**
   - Service interface (`ICustomLanguagesService`)
   - Methods for registering, updating, removing, and querying custom languages
   - Import/export functionality for language definitions

3. **`src/vs/workbench/services/customLanguages/browser/customLanguagesService.ts`**
   - Implementation of the `ICustomLanguagesService`
   - Integrates with the language service to register languages
   - Handles storage and persistence of custom languages
   - Manages TextMate grammar registration
   - Converts configuration to VS Code language configuration format

#### UI Contributions

4. **`src/vs/workbench/contrib/customLanguages/browser/customLanguages.contribution.ts`**
   - Command contributions for managing custom languages:
     - `Add Custom Language` - Interactive language creation
     - `Edit Custom Language` - Modify existing languages
     - `Remove Custom Language` - Delete custom languages
     - `List Custom Languages` - View all registered languages
     - `Import Custom Languages` - Import from JSON file
     - `Export Custom Languages` - Export to JSON file

#### Workspace Integration

5. **`src/vs/workbench/services/customLanguages/browser/customLanguageIndexing.ts`**
   - Workspace-specific language loading from `.vscode/custom-languages.json`
   - File watching for automatic reload on configuration changes
   - Export functionality to save languages to workspace

#### Extension API

6. **`src/vs/workbench/api/common/extHostCustomLanguages.ts`**
   - Extension host API for custom languages
   - Allows extensions to register custom languages programmatically

7. **`src/vs/workbench/api/browser/mainThreadCustomLanguages.ts`**
   - Main thread implementation of custom language API
   - Bridges extension host and workbench service

#### Documentation and Examples

8. **`docs/custom-language-support.md`**
   - Comprehensive documentation covering:
     - Quick start guide
     - Language configuration reference
     - TextMate grammar integration
     - LSP server configuration
     - Workspace-specific languages
     - Best practices and troubleshooting

9. **`examples/custom-languages/example-language.json`**
   - Complete example showing all features
   - Includes keywords, strings, numbers, operators, functions
   - Demonstrates proper TextMate grammar structure

10. **`examples/custom-languages/README.md`**
    - Quick reference for example usage
    - Minimal examples for common use cases
    - Customization tips

### Files Modified

1. **`src/vs/workbench/workbench.common.main.ts`**
   - Added imports for custom language service and contributions
   - Ensures services are loaded on workbench startup

2. **`src/vs/workbench/api/common/extHost.protocol.ts`**
   - Added `MainThreadCustomLanguagesShape` interface
   - Added `MainThreadCustomLanguages` to `MainContext`
   - Defines protocol for extension API communication

## Features

### 1. Dynamic Language Registration

- Register new languages without rebuilding the IDE
- Support for file associations (extensions, filenames, patterns)
- First-line detection (shebang support)
- MIME type associations

### 2. Editor Behavior Configuration

- Comment syntax (line and block comments)
- Bracket pairs and auto-closing
- Indentation rules
- Folding markers
- Word patterns
- On-enter rules for smart indentation

### 3. Syntax Highlighting

- Full TextMate grammar support
- Inline or external grammar files
- Embedded language support
- Token type mappings
- Grammar injection

### 4. Language Server Integration

- LSP server configuration
- Multiple transport types (stdio, ipc, socket, pipe)
- Custom initialization options
- File event patterns

### 5. Workspace-Specific Languages

- Store languages in `.vscode/custom-languages.json`
- Automatic loading on workspace open
- Team-wide language support via version control
- Hot-reload on configuration changes

### 6. Programmatic API

- Extension API for language registration
- Full CRUD operations (Create, Read, Update, Delete)
- Import/export functionality
- Language querying

## Usage

### Command Palette

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Add Custom Language"
3. Follow the prompts to configure your language

### Workspace Configuration

Create `.vscode/custom-languages.json`:

```json
{
  "version": "1.0",
  "languages": [
    {
      "id": "mylang",
      "displayName": "My Language",
      "extensions": [".myl"],
      "configuration": {
        "comments": {
          "lineComment": "//"
        }
      }
    }
  ]
}
```

### Extension API

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  vscode.languages.registerCustomLanguage({
    id: 'mylang',
    displayName: 'My Language',
    extensions: ['.myl']
  });
}
```

## Architecture

### Service Layer

```
ICustomLanguagesService (Interface)
    ├── CustomLanguagesService (Implementation)
    │   ├── Storage (User profile storage)
    │   ├── Language Registration (ILanguageService)
    │   └── Grammar Registration (TextMate service)
    └── CustomLanguageIndexingContribution
        └── Workspace configuration loading
```

### API Layer

```
Extension API
    └── extHostCustomLanguages
        └── MainThread Proxy
            └── mainThreadCustomLanguages
                └── ICustomLanguagesService
```

## Configuration Schema

The configuration uses a versioned schema (currently v1.0) to support future migrations:

```typescript
{
  version: "1.0",
  languages: [
    {
      id: string,
      displayName: string,
      extensions?: string[],
      filenames?: string[],
      filenamePatterns?: string[],
      firstLine?: string,
      aliases?: string[],
      mimetypes?: string[],
      configuration?: { /* editor config */ },
      grammar?: { /* TextMate grammar */ },
      languageServer?: { /* LSP config */ }
    }
  ]
}
```

## Storage

- User-level languages: Stored in workbench storage (profile scope)
- Workspace-level languages: Stored in `.vscode/custom-languages.json`
- Merged on startup with workspace languages taking precedence

## Extensibility

The system is designed to be extensible:

1. **New Configuration Options**: Add to `ICustomLanguageConfiguration` interface
2. **New Grammar Features**: Extend `ICustomLanguageGrammar` interface
3. **Custom Providers**: Register additional language feature providers
4. **Migration Logic**: Handle schema version changes in service

## Testing

To test the implementation:

1. Install dependencies: `npm install`
2. Build the project: `npm run compile`
3. Run GRID IDE
4. Use Command Palette to add a custom language
5. Create a file with the custom extension
6. Verify syntax highlighting and editor behavior

## Future Enhancements

Potential improvements for future versions:

1. **Visual Grammar Editor**: GUI for creating TextMate grammars
2. **Language Marketplace**: Share custom languages with the community
3. **Auto-detection**: Automatically detect language from file content
4. **Live Grammar Preview**: Real-time preview while editing grammars
5. **Grammar Validation**: Validate TextMate grammar syntax
6. **Language Templates**: Pre-built templates for common language types
7. **Debugging Support**: Integration with debug adapters
8. **IntelliSense Builder**: Visual builder for completion providers

## Technical Notes

### Dependencies

- Uses existing VS Code language infrastructure
- Integrates with TextMate tokenization service
- Compatible with Language Server Protocol
- No additional runtime dependencies

### Performance

- Languages are registered lazily on first use
- Background tokenization for large files
- Efficient storage using JSON serialization
- Workspace languages loaded on startup (BlockRestore phase)

### Compatibility

- Works with existing VS Code extensions
- TextMate grammars from VS Code can be reused
- LSP servers compatible with VS Code work seamlessly
- Import/export uses standard JSON format

## Troubleshooting

### Language Not Detected

- Check file extension matches exactly
- Verify language is registered (use `List Custom Languages`)
- Reload window after adding language

### Syntax Highlighting Not Working

- Validate TextMate grammar JSON syntax
- Check grammar scopeName is unique
- View console for grammar loading errors

### Language Server Not Starting

- Verify command path is correct and executable
- Check language server logs for errors
- Ensure file event patterns match your files

## Support

For issues or questions:

- Check the documentation: `docs/custom-language-support.md`
- Review examples: `examples/custom-languages/`
- Open an issue on the GRID IDE repository

## Credits

This implementation is based on the VS Code language extension architecture and follows established patterns for language integration. It extends the base functionality to allow runtime language registration without requiring IDE rebuilds.
