// Copyright 2025 GRID. All Rights Reserved.

#include "GRIDEditorModule.h"
#include "GRIDBridge.h"
#include "HAL/RunnableThread.h"
#include "Modules/ModuleManager.h"

#define LOCTEXT_NAMESPACE "FGRIDEditorModule"

void FGRIDEditorModule::StartupModule()
{
	UE_LOG(LogTemp, Log, TEXT("[GRID] Editor Bridge module starting..."));
	
	Bridge = new FGRIDBridge();
	bIsRunning = false;
	ServerThread = nullptr;
	
	StartServer();
	
	UE_LOG(LogTemp, Log, TEXT("[GRID] Editor Bridge module started successfully"));
}

void FGRIDEditorModule::ShutdownModule()
{
	UE_LOG(LogTemp, Log, TEXT("[GRID] Editor Bridge module shutting down..."));
	
	StopServer();
	
	if (Bridge)
	{
		delete Bridge;
		Bridge = nullptr;
	}
	
	UE_LOG(LogTemp, Log, TEXT("[GRID] Editor Bridge module shutdown complete"));
}

FGRIDEditorModule& FGRIDEditorModule::Get()
{
	return FModuleManager::LoadModuleChecked<FGRIDEditorModule>("GRIDEditor");
}

bool FGRIDEditorModule::IsAvailable()
{
	return FModuleManager::Get().IsModuleLoaded("GRIDEditor");
}

void FGRIDEditorModule::StartServer()
{
	if (bIsRunning || !Bridge)
	{
		return;
	}
	
	Bridge->Initialize();
	bIsRunning = true;
}

void FGRIDEditorModule::StopServer()
{
	if (!bIsRunning || !Bridge)
	{
		return;
	}
	
	Bridge->Shutdown();
	bIsRunning = false;
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FGRIDEditorModule, GRIDEditor)
