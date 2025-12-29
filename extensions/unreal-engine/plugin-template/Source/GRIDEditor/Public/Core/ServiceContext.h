// Copyright 2025 GRID. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "HAL/CriticalSection.h"

class UWorld;
class UEditorEngine;
class IAssetRegistry;

/**
 * Shared context for services providing thread-safe access to UE resources.
 * Enables dependency injection and centralized configuration.
 */
class GRIDEDITOR_API FServiceContext
{
public:
	FServiceContext();
	~FServiceContext();

	// Logging
	void LogInfo(const FString& Message, const FString& ServiceName) const;
	void LogWarning(const FString& Message, const FString& ServiceName) const;
	void LogError(const FString& Message, const FString& ServiceName) const;

	// UE Access
	UWorld* GetWorld() const;
	UEditorEngine* GetEditorEngine() const;
	IAssetRegistry* GetAssetRegistry() const;

	// Configuration
	FString GetConfigValue(const FString& Key, const FString& DefaultValue = TEXT("")) const;
	void SetConfigValue(const FString& Key, const FString& Value);

private:
	TMap<FString, FString> ConfigValues;
	mutable IAssetRegistry* CachedAssetRegistry;
	mutable FCriticalSection Lock;
};
