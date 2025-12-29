// Copyright 2025 GRID. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * Handles Material commands from GRID IDE.
 * Supports: create, get_info, set_property, create_instance, node manipulation, etc.
 */
class GRIDEDITOR_API FMaterialCommands
{
public:
	FMaterialCommands();
	~FMaterialCommands();

	TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
	TSharedPtr<FJsonObject> CreateMaterial(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> CreateMaterialInstance(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> GetMaterialInfo(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> GetProperty(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> SetProperty(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ListParameters(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> SetParameter(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> Compile(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> Save(const TSharedPtr<FJsonObject>& Params);

	// Material Node commands
	TSharedPtr<FJsonObject> DiscoverNodeTypes(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> CreateNode(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> DeleteNode(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ConnectNodes(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ListNodes(const TSharedPtr<FJsonObject>& Params);

	TSharedPtr<FJsonObject> CreateError(const FString& Code, const FString& Message);
	TSharedPtr<FJsonObject> CreateSuccess(const TSharedPtr<FJsonObject>& Data = nullptr);
};
