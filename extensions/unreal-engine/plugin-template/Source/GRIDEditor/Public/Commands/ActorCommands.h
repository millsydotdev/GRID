// Copyright 2025 GRID. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * Handles Level Actor commands from GRID IDE.
 * Supports: list, find, spawn, delete, transform, properties, etc.
 */
class GRIDEDITOR_API FActorCommands
{
public:
	FActorCommands();
	~FActorCommands();

	TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
	TSharedPtr<FJsonObject> ListActors(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> FindActors(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> SpawnActor(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> DeleteActor(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> GetActorInfo(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> GetTransform(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> SetTransform(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> SetLocation(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> SetRotation(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> SetScale(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> GetProperty(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> SetProperty(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> FocusActor(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> SelectActor(const TSharedPtr<FJsonObject>& Params);
	TSharedPtr<FJsonObject> RenameActor(const TSharedPtr<FJsonObject>& Params);

	TSharedPtr<FJsonObject> CreateError(const FString& Code, const FString& Message);
	TSharedPtr<FJsonObject> CreateSuccess(const TSharedPtr<FJsonObject>& Data = nullptr);
};
