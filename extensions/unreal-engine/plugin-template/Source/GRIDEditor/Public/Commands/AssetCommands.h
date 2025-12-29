// Copyright 2025 GRID. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * Handles Asset commands from GRID IDE.
 * Supports: search, import, export, delete, duplicate, save, list_references, etc.
 */
class GRIDEDITOR_API FAssetCommands
{
public:
	FAssetCommands();
	~FAssetCommands();

	TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
	TSharedPtr<FJsonObject> Search(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ImportTexture(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ExportTexture(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> Delete(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> Duplicate(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> Save(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> SaveAll(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> ListReferences(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> Open(const TSharedPtr<FJsonObject>& Params);

	TSharedPtr<FJsonObject> CreateError(const FString& Code, const FString& Message);
	TSharedPtr<FJsonObject> CreateSuccess(const TSharedPtr<FJsonObject>& Data = nullptr);
};
