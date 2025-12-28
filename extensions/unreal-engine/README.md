# Unreal Engine Support for GRID

Enhanced C++ support for Unreal Engine development with automatic editor plugin integration.

## Features

- **Enhanced C++ Syntax** - Unreal-specific macros and templates
- **Code Snippets** - Quick snippets for UCLASS, UPROPERTY, UFUNCTION, Actor, Character, Component classes
- **Auto-Installing Plugin** - Automatically installs GRID editor bridge plugin when .uproject file is detected
- **Project Management** - Refresh project files and build commands
- **Blueprint Integration** - Support for Blueprint-exposed C++ code

## Snippets

Type these prefixes in C++ files:

- `uclass` - Create a UCLASS
- `ustruct` - Create a USTRUCT
- `uproperty` - Create a UPROPERTY
- `ufunction` - Create a UFUNCTION
- `uactor` - Create an Actor class
- `ucharacter` - Create a Character class
- `ucomponent` - Create an ActorComponent class
- `uenum` - Create a UENUM
- `uelog` - Add UE_LOG statement
- `ublueprintnativeevent` - Create a Blueprint Native Event

## Commands

- **Unreal Engine: Install GRID Editor Plugin** - Manually install the editor plugin
- **Unreal Engine: Refresh Project Files** - Regenerate project files
- **Unreal Engine: Build Editor** - Build the editor

## Auto-Detection

GRID automatically detects Unreal Engine projects when a `.uproject` file is found in the workspace.

## License

MIT
