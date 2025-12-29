// Copyright 2025 GRID. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * Bridge class that handles communication between GRID IDE and Unreal Editor.
 * Manages TCP server, command routing, and response handling.
 */
class GRIDEDITOR_API FGRIDBridge
{
public:
	FGRIDBridge();
	~FGRIDBridge();

	/** Initialize the bridge and start listening for connections */
	void Initialize();

	/** Shutdown the bridge and cleanup resources */
	void Shutdown();

	/** Execute a command and return the result */
	FString ExecuteCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

	/** Check if the bridge is running */
	bool IsRunning() const { return bIsRunning; }

	/** Get the port the server is listening on */
	int32 GetPort() const { return Port; }

private:
	/** Route command to appropriate handler */
	TSharedPtr<FJsonObject> RouteCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

	/** Create a standardized error response */
	TSharedPtr<FJsonObject> CreateErrorResponse(const FString& ErrorCode, const FString& ErrorMessage);

	/** Create a standardized success response */
	TSharedPtr<FJsonObject> CreateSuccessResponse(const TSharedPtr<FJsonObject>& Data);

	/** Write port file for GRID IDE discovery */
	void WritePortFile();

	/** Delete port file on shutdown */
	void DeletePortFile();

	// Command Handlers
	TSharedPtr<class FBlueprintCommands> BlueprintCommands;
	TSharedPtr<class FActorCommands> ActorCommands;
	TSharedPtr<class FMaterialCommands> MaterialCommands;
	TSharedPtr<class FWidgetCommands> WidgetCommands;
	TSharedPtr<class FAssetCommands> AssetCommands;
	TSharedPtr<class FInputCommands> InputCommands;

	// Server state
	TSharedPtr<class FSocket> ListenerSocket;
	class FRunnableThread* ServerThread;
	class FGRIDServerRunnable* ServerRunnable;
	bool bIsRunning;
	int32 Port;
	FString PortFilePath;
};
