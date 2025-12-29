// Copyright 2025 GRID. All Rights Reserved.

#include "Core/ServiceContext.h"
#include "Editor.h"
#include "AssetRegistry/AssetRegistryModule.h"

FServiceContext::FServiceContext()
	: CachedAssetRegistry(nullptr)
{
}

FServiceContext::~FServiceContext()
{
}

void FServiceContext::LogInfo(const FString& Message, const FString& ServiceName) const
{
	UE_LOG(LogTemp, Log, TEXT("[GRID][%s] %s"), *ServiceName, *Message);
}

void FServiceContext::LogWarning(const FString& Message, const FString& ServiceName) const
{
	UE_LOG(LogTemp, Warning, TEXT("[GRID][%s] %s"), *ServiceName, *Message);
}

void FServiceContext::LogError(const FString& Message, const FString& ServiceName) const
{
	UE_LOG(LogTemp, Error, TEXT("[GRID][%s] %s"), *ServiceName, *Message);
}

UWorld* FServiceContext::GetWorld() const
{
	if (GEditor)
	{
		return GEditor->GetEditorWorldContext().World();
	}
	return nullptr;
}

UEditorEngine* FServiceContext::GetEditorEngine() const
{
	return GEditor;
}

IAssetRegistry* FServiceContext::GetAssetRegistry() const
{
	FScopeLock ScopeLock(&Lock);
	
	if (!CachedAssetRegistry)
	{
		FAssetRegistryModule& Module = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry");
		CachedAssetRegistry = &Module.Get();
	}
	
	return CachedAssetRegistry;
}

FString FServiceContext::GetConfigValue(const FString& Key, const FString& DefaultValue) const
{
	FScopeLock ScopeLock(&Lock);
	
	const FString* Value = ConfigValues.Find(Key);
	return Value ? *Value : DefaultValue;
}

void FServiceContext::SetConfigValue(const FString& Key, const FString& Value)
{
	FScopeLock ScopeLock(&Lock);
	ConfigValues.Add(Key, Value);
}
