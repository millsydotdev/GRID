// Copyright 2025 GRID. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * Handles UMG Widget commands from GRID IDE.
 * Supports: create, list_components, add_component, set_property, bind_events, etc.
 */
class GRIDEDITOR_API FWidgetCommands
{
public:
	FWidgetCommands();
	~FWidgetCommands();

	TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
	TSharedPtr<FJsonObject> CreateWidgetBlueprint(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ListComponents(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> AddComponent(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> RemoveComponent(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> GetProperty(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> SetProperty(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ListProperties(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> DiscoverWidgetTypes(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ValidateHierarchy(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> GetAvailableEvents(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> BindEvents(const TSharedPtr<FJsonObject>& Params);

	TSharedPtr<FJsonObject> CreateError(const FString& Code, const FString& Message);
	TSharedPtr<FJsonObject> CreateSuccess(const TSharedPtr<FJsonObject>& Data = nullptr);
};
