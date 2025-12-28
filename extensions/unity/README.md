# Unity Support for GRID

Enhanced C# support for Unity game development with automatic editor plugin integration.

## Features

- **Enhanced C# Syntax** - Unity-specific attributes and templates
- **Code Snippets** - Quick snippets for MonoBehaviour, ScriptableObject, and Unity lifecycle methods
- **Auto-Installing Plugin** - Automatically installs GRID editor bridge plugin when Unity project is detected
- **Project Management** - Refresh assets and open in Unity commands
- **Editor Communication** - TCP-based communication between GRID and Unity Editor

## Snippets

Type these prefixes in C# files:

- `monobehaviour` - Create a MonoBehaviour class
- `scriptableobject` - Create a ScriptableObject class
- `serializefield` - Add a SerializeField
- `header` - Add a Header attribute
- `tooltip` - Add a Tooltip attribute
- `requirecomponent` - Add a RequireComponent attribute
- `menuitem` - Create an Editor MenuItem
- `log` - Add Debug.Log statement
- `coroutine` - Create a Coroutine
- `awake` - Add Awake method
- `start` - Add Start method
- `update` - Add Update method
- `fixedupdate` - Add FixedUpdate method
- `oncollisionenter` - Add OnCollisionEnter method
- `ontriggerenter` - Add OnTriggerEnter method
- `customeditor` - Create a Custom Editor

## Commands

- **Unity: Install GRID Editor Plugin** - Manually install the editor plugin
- **Unity: Refresh Project** - Refresh Unity assets
- **Unity: Open in Unity Editor** - Open the project in Unity

## Auto-Detection

GRID automatically detects Unity projects when an `Assets` folder is found in the workspace.

## Editor Plugin

The GRID Editor Bridge provides:
- Real-time communication with GRID IDE
- Asset refresh commands
- Console log access
- Build pipeline integration

## License

MIT
