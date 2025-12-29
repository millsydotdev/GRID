// Copyright 2025 GRID. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * Handles Blueprint manipulation commands from GRID IDE.
 * Supports: create, compile, get_info, set_property, add_component, add_variable, add_function, etc.
 */
class GRIDEDITOR_API FBlueprintCommands
{
public:
	FBlueprintCommands();
	~FBlueprintCommands();

	/** Route command to appropriate handler */
	TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
	// Blueprint Lifecycle
	TSharedPtr<FJsonObject> CreateBlueprint(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> CompileBlueprint(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> GetBlueprintInfo(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ReparentBlueprint(const TSharedPtr<FJsonObject>& Params);

	// Blueprint Properties
	TSharedPtr<FJsonObject> GetProperty(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> SetProperty(const TSharedPtr<FJsonObject>& Params);

	// Blueprint Components
	TSharedPtr<FJsonObject> AddComponent(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> RemoveComponent(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> GetComponentHierarchy(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> SetComponentProperty(const TSharedPtr<FJsonObject>& Params);

	// Blueprint Variables
	TSharedPtr<FJsonObject> AddVariable(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> RemoveVariable(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ListVariables(const TSharedPtr<FJsonObject>& Params);

	// Blueprint Functions
	TSharedPtr<FJsonObject> AddFunction(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> RemoveFunction(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ListFunctions(const TSharedPtr<FJsonObject>& Params);

	// Blueprint Graph Nodes
	TSharedPtr<FJsonObject> DiscoverNodes(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> CreateNode(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> DeleteNode(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ConnectNodes(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ListNodes(const TSharedPtr<FJsonObject>& Params);

	// Helpers
	TSharedPtr<FJsonObject> CreateError(const FString& Code, const FString& Message);
	TSharedPtr<FJsonObject> CreateSuccess(const TSharedPtr<FJsonObject>& Data = nullptr);
	class UBlueprint* LoadBlueprint(const FString& Path);
};
