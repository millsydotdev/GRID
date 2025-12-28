# Custom Language Support in GRID IDE

GRID IDE now supports defining and using custom programming languages dynamically. This allows you to:

- Add syntax highlighting for your custom language
- Configure editor behavior (brackets, comments, indentation)
- Integrate TextMate grammars for advanced highlighting
- Support language indexing for your projects
- Use Language Server Protocol (LSP) for rich IDE features

## Table of Contents

1. [Quick Start](#quick-start)
2. [Language Configuration](#language-configuration)
3. [TextMate Grammars](#textmate-grammars)
4. [Language Server Integration](#language-server-integration)
5. [Workspace-Specific Languages](#workspace-specific-languages)
6. [Programmatic API](#programmatic-api)
7. [Examples](#examples)

## Quick Start

### Using Commands

The easiest way to add a custom language is through the command palette:

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type `Add Custom Language`
3. Follow the prompts to configure your language

### Using JSON Configuration

Create a `.vscode/custom-languages.json` file in your workspace:

```json
{
  "version": "1.0",
  "languages": [
    {
      "id": "mylang",
      "displayName": "My Language",
      "extensions": [".myl", ".mylang"],
      "aliases": ["MyLang"],
      "configuration": {
        "comments": {
          "lineComment": "//",
          "blockComment": ["/*", "*/"]
        },
        "brackets": [
          ["{", "}"],
          ["[", "]"],
          ["(", ")"]
        ],
        "autoClosingPairs": [
          { "open": "{", "close": "}" },
          { "open": "[", "close": "]" },
          { "open": "(", "close": ")" },
          { "open": "\"", "close": "\"" },
          { "open": "'", "close": "'" }
        ]
      }
    }
  ]
}
```

## Language Configuration

### Basic Structure

```typescript
interface ICustomLanguageDefinition {
  // Required
  id: string;                    // Unique identifier (e.g., 'mylang')
  displayName: string;           // Display name (e.g., 'My Language')

  // File Associations (at least one required)
  extensions?: string[];         // e.g., ['.myl', '.mylang']
  filenames?: string[];          // e.g., ['Mylangfile']
  filenamePatterns?: string[];   // e.g., ['*.config.myl']

  // Optional
  aliases?: string[];            // Alternative names
  firstLine?: string;            // Regex for first line detection (shebang)
  mimetypes?: string[];          // MIME types

  // Editor Behavior
  configuration?: ICustomLanguageConfiguration;

  // Syntax Highlighting
  grammar?: ICustomLanguageGrammar;

  // Language Server
  languageServer?: ICustomLanguageServerConfig;
}
```

### Editor Configuration

```json
{
  "configuration": {
    "comments": {
      "lineComment": "//",
      "blockComment": ["/*", "*/"]
    },
    "brackets": [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"]
    ],
    "autoClosingPairs": [
      { "open": "{", "close": "}" },
      { "open": "[", "close": "]" },
      { "open": "(", "close": ")" },
      { "open": "\"", "close": "\"", "notIn": ["string"] },
      { "open": "'", "close": "'", "notIn": ["string", "comment"] }
    ],
    "surroundingPairs": [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
      ["\"", "\""],
      ["'", "'"]
    ],
    "wordPattern": "(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s]+)",
    "indentationRules": {
      "increaseIndentPattern": "^.*\\{[^}\"']*$",
      "decreaseIndentPattern": "^\\s*\\}.*$"
    },
    "folding": {
      "markers": {
        "start": "^\\s*//\\s*#region",
        "end": "^\\s*//\\s*#endregion"
      }
    }
  }
}
```

## TextMate Grammars

TextMate grammars provide advanced syntax highlighting. You can define grammars inline or reference external files.

### Inline Grammar

```json
{
  "grammar": {
    "scopeName": "source.mylang",
    "grammar": {
      "name": "MyLang",
      "scopeName": "source.mylang",
      "patterns": [
        {
          "name": "keyword.control.mylang",
          "match": "\\b(if|else|while|for|return)\\b"
        },
        {
          "name": "string.quoted.double.mylang",
          "begin": "\"",
          "end": "\"",
          "patterns": [
            {
              "name": "constant.character.escape.mylang",
              "match": "\\\\."
            }
          ]
        },
        {
          "name": "comment.line.double-slash.mylang",
          "match": "//.*$"
        }
      ]
    }
  }
}
```

### External Grammar File

```json
{
  "grammar": {
    "scopeName": "source.mylang",
    "path": "file:///path/to/mylang.tmLanguage.json"
  }
}
```

### Embedded Languages

Support for embedded languages (like JavaScript in HTML):

```json
{
  "grammar": {
    "scopeName": "source.mylang",
    "path": "file:///path/to/mylang.tmLanguage.json",
    "embeddedLanguages": {
      "meta.embedded.block.javascript": "javascript",
      "meta.embedded.block.css": "css"
    }
  }
}
```

## Language Server Integration

Add LSP support for advanced features like autocomplete, go-to-definition, and refactoring.

```json
{
  "languageServer": {
    "command": "mylang-language-server",
    "args": ["--stdio"],
    "transport": "stdio",
    "fileEvents": ["**/*.myl"],
    "initializationOptions": {
      "enableFeatures": ["completion", "diagnostics", "hover"]
    }
  }
}
```

### Language Server Options

- **command**: Path to the language server executable
- **args**: Command-line arguments
- **transport**: Communication method (`stdio`, `ipc`, `socket`, `pipe`)
- **port**: Port number for socket transport
- **env**: Environment variables
- **fileEvents**: Glob patterns for file watching
- **initializationOptions**: Server-specific initialization options

## Workspace-Specific Languages

Store custom language definitions in your workspace for team sharing:

### Location

`.vscode/custom-languages.json`

### Auto-loading

GRID IDE automatically loads custom languages from this file when you open a workspace.

### Exporting

Use the command `Export Custom Languages` to save your current custom languages to the workspace configuration.

## Programmatic API

Extensions can register custom languages programmatically:

### TypeScript Extension Example

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Register a custom language
  const definition = {
    id: 'mylang',
    displayName: 'My Language',
    extensions: ['.myl'],
    configuration: {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [['{', '}'], ['[', ']'], ['(', ')']],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' }
      ]
    },
    grammar: {
      scopeName: 'source.mylang',
      grammar: {
        // TextMate grammar rules
      }
    }
  };

  // Register the language
  vscode.languages.registerCustomLanguage(definition);
}
```

## Examples

### Example 1: Simple Language with Basic Syntax Highlighting

```json
{
  "version": "1.0",
  "languages": [
    {
      "id": "simple",
      "displayName": "Simple Language",
      "extensions": [".simple"],
      "configuration": {
        "comments": {
          "lineComment": "#"
        },
        "brackets": [
          ["(", ")"]
        ],
        "autoClosingPairs": [
          { "open": "(", "close": ")" },
          { "open": "\"", "close": "\"" }
        ]
      },
      "grammar": {
        "scopeName": "source.simple",
        "grammar": {
          "name": "Simple",
          "scopeName": "source.simple",
          "patterns": [
            {
              "name": "keyword.control.simple",
              "match": "\\b(print|input|if|else)\\b"
            },
            {
              "name": "string.quoted.double.simple",
              "begin": "\"",
              "end": "\""
            },
            {
              "name": "comment.line.number-sign.simple",
              "match": "#.*$"
            },
            {
              "name": "constant.numeric.simple",
              "match": "\\b[0-9]+\\b"
            }
          ]
        }
      }
    }
  ]
}
```

### Example 2: Language with Advanced Features

```json
{
  "version": "1.0",
  "languages": [
    {
      "id": "advanced",
      "displayName": "Advanced Language",
      "extensions": [".adv"],
      "aliases": ["AdvLang"],
      "firstLine": "^#!/usr/bin/env advanced",
      "configuration": {
        "comments": {
          "lineComment": "//",
          "blockComment": ["/*", "*/"]
        },
        "brackets": [
          ["{", "}"],
          ["[", "]"],
          ["(", ")"]
        ],
        "autoClosingPairs": [
          { "open": "{", "close": "}" },
          { "open": "[", "close": "]" },
          { "open": "(", "close": ")" },
          { "open": "\"", "close": "\"", "notIn": ["string"] },
          { "open": "'", "close": "'", "notIn": ["string", "comment"] }
        ],
        "surroundingPairs": [
          ["{", "}"],
          ["[", "]"],
          ["(", ")"],
          ["\"", "\""],
          ["'", "'"]
        ],
        "wordPattern": "(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s]+)",
        "indentationRules": {
          "increaseIndentPattern": "^.*\\{[^}\"']*$",
          "decreaseIndentPattern": "^\\s*\\}.*$"
        },
        "onEnterRules": [
          {
            "beforeText": "\\{[^}]*$",
            "action": {
              "indent": "indent"
            }
          }
        ],
        "folding": {
          "markers": {
            "start": "^\\s*//\\s*#region",
            "end": "^\\s*//\\s*#endregion"
          }
        }
      },
      "grammar": {
        "scopeName": "source.advanced",
        "path": "file:///path/to/advanced.tmLanguage.json"
      },
      "languageServer": {
        "command": "advanced-ls",
        "args": ["--stdio"],
        "transport": "stdio"
      }
    }
  ]
}
```

### Example 3: Language for Configuration Files

```json
{
  "version": "1.0",
  "languages": [
    {
      "id": "myconfig",
      "displayName": "My Config",
      "filenames": ["myconfig", ".myconfigrc"],
      "filenamePatterns": ["*.myconfig"],
      "configuration": {
        "comments": {
          "lineComment": "#"
        },
        "brackets": [
          ["[", "]"],
          ["{", "}"]
        ],
        "autoClosingPairs": [
          { "open": "[", "close": "]" },
          { "open": "{", "close": "}" },
          { "open": "\"", "close": "\"" }
        ]
      },
      "grammar": {
        "scopeName": "source.myconfig",
        "grammar": {
          "name": "MyConfig",
          "scopeName": "source.myconfig",
          "patterns": [
            {
              "name": "entity.name.section.myconfig",
              "match": "^\\[.*\\]$"
            },
            {
              "name": "keyword.other.definition.myconfig",
              "match": "^[a-zA-Z_][a-zA-Z0-9_]*"
            },
            {
              "name": "keyword.operator.assignment.myconfig",
              "match": "="
            },
            {
              "name": "string.quoted.double.myconfig",
              "begin": "\"",
              "end": "\""
            },
            {
              "name": "comment.line.number-sign.myconfig",
              "match": "#.*$"
            }
          ]
        }
      }
    }
  ]
}
```

## Available Commands

- **Add Custom Language**: Create a new custom language interactively
- **Edit Custom Language**: Modify an existing custom language
- **Remove Custom Language**: Delete a custom language
- **List Custom Languages**: View all registered custom languages
- **Import Custom Languages**: Import languages from a JSON file
- **Export Custom Languages**: Export languages to a JSON file

## Best Practices

1. **Use Unique IDs**: Choose language IDs that won't conflict with built-in languages
2. **Test Incrementally**: Start with basic configuration, then add grammars and LSP
3. **Share with Team**: Use workspace configuration for team-wide language support
4. **Version Control**: Commit `.vscode/custom-languages.json` to your repository
5. **Document Syntax**: Create documentation for your custom language syntax
6. **Use TextMate Tools**: Use existing TextMate grammar tools for complex highlighting

## Troubleshooting

### Language Not Detected

- Check file extensions match exactly
- Verify language is registered (use `List Custom Languages`)
- Reload the window after changes

### Syntax Highlighting Not Working

- Validate your TextMate grammar JSON
- Check scopeName is unique
- Use Developer Tools Console to see grammar loading errors

### Language Server Not Starting

- Verify the command path is correct
- Check language server logs
- Ensure fileEvents patterns match your files

## Resources

- [TextMate Grammar Documentation](https://macromates.com/manual/en/language_grammars)
- [VS Code Language Extension Guide](https://code.visualstudio.com/api/language-extensions/overview)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [Yeoman Generator for VS Code Extensions](https://github.com/Microsoft/vscode-generator-code)

## Support

For issues or questions about custom language support:

- Open an issue on the GRID IDE repository
- Check the FAQ in the documentation
- Join the community discussions
