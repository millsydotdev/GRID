// Copyright 2025 GRID. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

class FGRIDEditorModule : public IModuleInterface
{
public:
	/** IModuleInterface implementation */
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;

	/** Get the module instance */
	static FGRIDEditorModule& Get();

	/** Check if module is loaded */
	static bool IsAvailable();

private:
	void StartServer();
	void StopServer();

	class FGRIDBridge* Bridge;
	class FRunnableThread* ServerThread;
	bool bIsRunning;
};
