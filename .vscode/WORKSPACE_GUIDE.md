# GRID IDE Workspace Guide

This guide explains the enhanced IDE configuration for the GRID project.

## Multi-Root Workspace

### Using the Workspace File

To take advantage of the multi-root workspace setup, open the workspace file instead of the folder:

```bash
code grid-development.code-workspace
```

### Benefits

The multi-root workspace (`grid-development.code-workspace`) provides:

- **Organized folder structure**: Separate views for core source, extensions, build scripts, CLI, tests, and docs
- **Scoped navigation**: Easier to navigate large codebases with logical separation
- **Folder-specific settings**: Different configurations can be applied to different parts of the project
- **Better search**: Search can be scoped to specific workspace folders

### Workspace Folders

- **GRID (Root)**: Main project root
- **Core Source**: `/src` - Core VSCode/GRID source code
- **Extensions**: `/extensions` - All built-in extensions (98 extensions)
- **Build Scripts**: `/build` - Build and compilation scripts
- **CLI**: `/cli` - Command-line interface (Rust)
- **Tests**: `/test` - All test suites
- **Documentation**: `/docs` - Project documentation

## Language Server Configuration

The IDE now includes comprehensive language server configurations:

### Supported Languages

| Language | Formatter | Features |
|----------|-----------|----------|
| **TypeScript/JavaScript** | Built-in | Format on save, auto-imports |
| **Rust** | rust-analyzer | Format on save, advanced analysis |
| **Python** | black-formatter | Format on save, type checking (Pylance), organize imports |
| **YAML** | redhat.vscode-yaml | Format on save, schema validation, completion |
| **JSON/JSONC** | Built-in | Format on save, schema validation |
| **CSS/SCSS/Less** | Built-in | Format on save, advanced CSS features |
| **HTML** | Built-in | Format on save |
| **Markdown** | Built-in | Word wrap, preserve trailing spaces |
| **Shell Scripts** | N/A | ShellCheck linting on type |
| **Go** | gofmt | Format on save, organize imports, linting |

### Python Setup

For Python development, create a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install pytest black
```

### YAML Schema Validation

YAML files automatically validate against schemas:
- GitHub Workflows: `.github/workflows/*.yml`
- GitHub Actions: `.github/actions/*/action.yml`

### Shell Script Linting

Install ShellCheck for shell script validation:

```bash
# macOS
brew install shellcheck

# Ubuntu/Debian
sudo apt-get install shellcheck

# Windows (with Chocolatey)
choco install shellcheck
```

## Performance Monitoring

**Renderer profiling** is now enabled for performance analysis:

```json
"application.experimental.rendererProfiling": true
```

### Benefits

- Track rendering performance issues
- Identify slow operations in the UI
- Profile extension host performance
- Debug frame rate issues

### Using the Profiler

1. Open Command Palette (`Cmd/Ctrl + Shift + P`)
2. Search for "Developer: Startup Performance"
3. View detailed performance metrics

## Recommended Extensions

The workspace now recommends additional extensions for multi-language support:

### Language Support
- Python (`ms-python.python`)
- Pylance (`ms-python.vscode-pylance`)
- Black Formatter (`ms-python.black-formatter`)
- YAML (`redhat.vscode-yaml`)
- Go (`golang.go`)
- ShellCheck (`timonwong.shellcheck`)

### Additional Tools
- Coverage Gutters (`ryanluker.vscode-coverage-gutters`)
- Test Adapter Converter (`ms-vscode.test-adapter-converter`)

Install all recommended extensions:
1. Open Extensions view (`Cmd/Ctrl + Shift + X`)
2. Search for "@recommended"
3. Install all workspace recommendations

## Tips

### Format on Save

All supported languages now format automatically on save. To disable for a specific language, update `.vscode/settings.json`:

```json
"[language]": {
    "editor.formatOnSave": false
}
```

### Language-Specific Settings

Override settings per language using the `[language]` notation in settings.json.

### Multi-Root Search

When using the multi-root workspace, scope searches by clicking the folder icon in the search view.

### Performance

If you experience performance issues with all language servers enabled, you can disable specific ones:

```json
"python.languageServer": "None",
"go.useLanguageServer": false
```

## Troubleshooting

### Language Server Not Working

1. Check that the recommended extension is installed
2. Reload the window (`Cmd/Ctrl + R`)
3. Check the Output panel for errors (View → Output)
4. Ensure language-specific tools are installed (e.g., Python, Go)

### Workspace File Not Loading Settings

Settings are inherited from `.vscode/settings.json`. The workspace file adds additional folder organization but doesn't override the main settings.

### Performance Issues

If renderer profiling causes issues, you can disable it:

```json
"application.experimental.rendererProfiling": false
```

## Additional Resources

- [VSCode Multi-Root Workspaces](https://code.visualstudio.com/docs/editor/multi-root-workspaces)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [VSCode Settings Reference](https://code.visualstudio.com/docs/getstarted/settings)
