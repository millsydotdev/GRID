// Copyright 2025 GRID. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * Handles Enhanced Input commands from GRID IDE.
 * Supports: create_action, create_context, add_mapping, list_keys, modifiers, triggers, etc.
 */
class GRIDEDITOR_API FInputCommands
{
public:
	FInputCommands();
	~FInputCommands();

	TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
	// Input Actions
	TSharedPtr<FJsonObject> CreateAction(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ListActions(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> GetActionProperties(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ConfigureAction(const TSharedPtr<FJsonObject>& Params);

	// Mapping Contexts
	TSharedPtr<FJsonObject> CreateMappingContext(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ListMappingContexts(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> GetMappings(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> AddKeyMapping(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> RemoveKeyMapping(const TSharedPtr<FJsonObject>& Params);

	// Keys & Modifiers
	TSharedPtr<FJsonObject> GetAvailableKeys(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> AddModifier(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> RemoveModifier(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ListModifiers(const TSharedPtr<FJsonObject>& Params);

	// Triggers
	TSharedPtr<FJsonObject> AddTrigger(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> RemoveTrigger(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ListTriggers(const TSharedPtr<FJsonObject>& Params);

	TSharedPtr<FJsonObject> CreateError(const FString& Code, const FString& Message);
	TSharedPtr<FJsonObject> CreateSuccess(const TSharedPtr<FJsonObject>& Data = nullptr);
};
