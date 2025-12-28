# Custom Language Examples

This directory contains example configurations for custom languages in GRID IDE.

## Getting Started

1. **Copy the example**: Copy `example-language.json` to your workspace as `.vscode/custom-languages.json`
2. **Customize**: Modify the configuration to match your language
3. **Reload**: Reload the GRID IDE window to activate the custom language

## Example Files

### `example-language.json`

A comprehensive example showing all available features:
- Basic language configuration (ID, display name, file extensions)
- Editor behavior (comments, brackets, auto-closing pairs)
- Indentation rules
- Folding markers
- Complete TextMate grammar with:
  - Keywords (control flow, declarations, types)
  - String literals (double, single, template)
  - Numeric literals (decimal, hex, binary, octal)
  - Comments (line and block)
  - Operators
  - Function name highlighting

## Quick Examples

### Minimal Language

```json
{
  "version": "1.0",
  "languages": [
    {
      "id": "mylang",
      "displayName": "My Language",
      "extensions": [".myl"]
    }
  ]
}
```

### Language with Comments and Brackets

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
        },
        "brackets": [
          ["{", "}"]
        ],
        "autoClosingPairs": [
          { "open": "{", "close": "}" }
        ]
      }
    }
  ]
}
```

### Language with Basic Syntax Highlighting

```json
{
  "version": "1.0",
  "languages": [
    {
      "id": "mylang",
      "displayName": "My Language",
      "extensions": [".myl"],
      "grammar": {
        "scopeName": "source.mylang",
        "grammar": {
          "patterns": [
            {
              "name": "keyword.control.mylang",
              "match": "\\b(if|else|while)\\b"
            },
            {
              "name": "string.quoted.double.mylang",
              "begin": "\"",
              "end": "\""
            }
          ]
        }
      }
    }
  ]
}
```

## Customization Tips

### File Associations

You can associate your language with files in multiple ways:

```json
{
  "extensions": [".myl", ".mylang"],           // File extensions
  "filenames": ["Mylangfile", ".mylangrc"],    // Exact filenames
  "filenamePatterns": ["*.config.myl"],        // Glob patterns
  "firstLine": "^#!/usr/bin/env mylang"        // Shebang detection
}
```

### Editor Behavior

Configure how the editor behaves with your language:

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
      { "open": "\"", "close": "\"", "notIn": ["string"] }
    ],
    "surroundingPairs": [
      ["{", "}"],
      ["\"", "\""]
    ]
  }
}
```

### Syntax Highlighting Scopes

Common TextMate scope names for syntax highlighting:

- `keyword.control` - Control flow keywords (if, else, while)
- `keyword.declaration` - Declaration keywords (var, let, const)
- `storage.type` - Type names (int, string, bool)
- `string.quoted.double` - Double-quoted strings
- `string.quoted.single` - Single-quoted strings
- `comment.line` - Line comments
- `comment.block` - Block comments
- `constant.numeric` - Numeric literals
- `constant.language` - Language constants (true, false, null)
- `entity.name.function` - Function names
- `entity.name.class` - Class names
- `variable.parameter` - Function parameters
- `keyword.operator` - Operators (+, -, *, /)

## Testing Your Language

1. Create a test file with your language's extension (e.g., `test.myl`)
2. Open the file in GRID IDE
3. Check that:
   - Syntax highlighting works correctly
   - Brackets auto-close
   - Comments are recognized
   - Indentation behaves as expected

## Advanced Features

### Language Server Integration

For advanced features like autocomplete and go-to-definition:

```json
{
  "languageServer": {
    "command": "/path/to/language-server",
    "args": ["--stdio"],
    "transport": "stdio"
  }
}
```

### Embedded Languages

Support for embedding other languages (like CSS in HTML):

```json
{
  "grammar": {
    "embeddedLanguages": {
      "meta.embedded.block.javascript": "javascript",
      "meta.embedded.block.css": "css"
    }
  }
}
```

## Resources

- [Full Documentation](../../docs/custom-language-support.md)
- [TextMate Grammar Guide](https://macromates.com/manual/en/language_grammars)
- [VS Code Language Extensions](https://code.visualstudio.com/api/language-extensions/overview)

## Need Help?

- Check the [documentation](../../docs/custom-language-support.md)
- Open an issue on the GRID IDE repository
- Join the community discussions
