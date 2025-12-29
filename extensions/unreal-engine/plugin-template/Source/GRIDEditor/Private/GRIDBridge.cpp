// Copyright 2025 GRID. All Rights Reserved.

#include "GRIDBridge.h"
#include "GRIDServerRunnable.h"
#include "Commands/BlueprintCommands.h"
#include "Commands/ActorCommands.h"
#include "Commands/MaterialCommands.h"
#include "Commands/WidgetCommands.h"
#include "Commands/AssetCommands.h"
#include "Commands/InputCommands.h"

#include "Sockets.h"
#include "SocketSubsystem.h"
#include "HAL/RunnableThread.h"
#include "HAL/PlatformFileManager.h"
#include "Interfaces/IPv4/IPv4Address.h"
#include "Interfaces/IPv4/IPv4Endpoint.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "Async/Async.h"

FGRIDBridge::FGRIDBridge()
	: bIsRunning(false)
	, ServerThread(nullptr)
	, ServerRunnable(nullptr)
	, Port(0)
{
	// Initialize command handlers
	BlueprintCommands = MakeShared<FBlueprintCommands>();
	ActorCommands = MakeShared<FActorCommands>();
	MaterialCommands = MakeShared<FMaterialCommands>();
	WidgetCommands = MakeShared<FWidgetCommands>();
	AssetCommands = MakeShared<FAssetCommands>();
	InputCommands = MakeShared<FInputCommands>();
}

FGRIDBridge::~FGRIDBridge()
{
	Shutdown();
}

void FGRIDBridge::Initialize()
{
	if (bIsRunning)
	{
		return;
	}

	UE_LOG(LogTemp, Log, TEXT("[GRID] Bridge initializing..."));

	ISocketSubsystem* SocketSubsystem = ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM);
	if (!SocketSubsystem)
	{
		UE_LOG(LogTemp, Error, TEXT("[GRID] Failed to get socket subsystem"));
		return;
	}

	// Create listener socket on dynamic port (0 = OS assigns)
	ListenerSocket = MakeShareable(SocketSubsystem->CreateSocket(NAME_Stream, TEXT("GRIDListener"), false));
	if (!ListenerSocket.IsValid())
	{
		UE_LOG(LogTemp, Error, TEXT("[GRID] Failed to create listener socket"));
		return;
	}

	ListenerSocket->SetReuseAddr(true);
	ListenerSocket->SetNonBlocking(true);

	// Bind to localhost on dynamic port
	FIPv4Address Address;
	FIPv4Address::Parse(TEXT("127.0.0.1"), Address);
	FIPv4Endpoint Endpoint(Address, 0);

	if (!ListenerSocket->Bind(*Endpoint.ToInternetAddr()))
	{
		UE_LOG(LogTemp, Error, TEXT("[GRID] Failed to bind socket"));
		return;
	}

	// Get the assigned port
	TSharedRef<FInternetAddr> BoundAddr = SocketSubsystem->CreateInternetAddr();
	ListenerSocket->GetAddress(*BoundAddr);
	Port = BoundAddr->GetPort();

	if (!ListenerSocket->Listen(5))
	{
		UE_LOG(LogTemp, Error, TEXT("[GRID] Failed to start listening"));
		return;
	}

	// Write port file for GRID IDE discovery
	WritePortFile();

	// Start server thread
	ServerRunnable = new FGRIDServerRunnable(this, ListenerSocket);
	ServerThread = FRunnableThread::Create(ServerRunnable, TEXT("GRIDServerThread"), 0, TPri_Normal);

	if (!ServerThread)
	{
		UE_LOG(LogTemp, Error, TEXT("[GRID] Failed to create server thread"));
		Shutdown();
		return;
	}

	bIsRunning = true;
	UE_LOG(LogTemp, Log, TEXT("[GRID] Bridge started on port %d"), Port);
}

void FGRIDBridge::Shutdown()
{
	if (!bIsRunning)
	{
		return;
	}

	UE_LOG(LogTemp, Log, TEXT("[GRID] Bridge shutting down..."));

	bIsRunning = false;

	// Stop server runnable
	if (ServerRunnable)
	{
		ServerRunnable->Stop();
		FPlatformProcess::Sleep(0.1f);
	}

	// Close sockets
	if (ListenerSocket.IsValid())
	{
		ListenerSocket->Close();
		ISocketSubsystem* SocketSubsystem = ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM);
		if (SocketSubsystem)
		{
			SocketSubsystem->DestroySocket(ListenerSocket.Get());
		}
		ListenerSocket.Reset();
	}

	// Wait for thread
	if (ServerThread)
	{
		ServerThread->WaitForCompletion();
		delete ServerThread;
		ServerThread = nullptr;
		ServerRunnable = nullptr;
	}

	// Delete port file
	DeletePortFile();

	UE_LOG(LogTemp, Log, TEXT("[GRID] Bridge shutdown complete"));
}

void FGRIDBridge::WritePortFile()
{
	// Write to Saved/Config/GRID/Port.txt for GRID IDE discovery
	FString ProjectDir = FPaths::ProjectDir();
	PortFilePath = FPaths::Combine(ProjectDir, TEXT("Saved"), TEXT("Config"), TEXT("GRID"), TEXT("Port.txt"));

	IPlatformFile& PlatformFile = FPlatformFileManager::Get().GetPlatformFile();
	PlatformFile.CreateDirectoryTree(*FPaths::GetPath(PortFilePath));

	FFileHelper::SaveStringToFile(FString::FromInt(Port), *PortFilePath);
	UE_LOG(LogTemp, Log, TEXT("[GRID] Port file written: %s"), *PortFilePath);
}

void FGRIDBridge::DeletePortFile()
{
	if (!PortFilePath.IsEmpty())
	{
		IPlatformFile& PlatformFile = FPlatformFileManager::Get().GetPlatformFile();
		PlatformFile.DeleteFile(*PortFilePath);
		UE_LOG(LogTemp, Log, TEXT("[GRID] Port file deleted: %s"), *PortFilePath);
	}
}

TSharedPtr<FJsonObject> FGRIDBridge::RouteCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
	// System commands
	if (CommandType == TEXT("check_connection"))
	{
		TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();
		Result->SetBoolField(TEXT("connected"), true);
		Result->SetStringField(TEXT("engine_version"), TEXT("5.5"));
		Result->SetStringField(TEXT("plugin_version"), TEXT("1.0.0"));
		return CreateSuccessResponse(Result);
	}

	// Blueprint commands
	if (CommandType.StartsWith(TEXT("blueprint_")))
	{
		return BlueprintCommands->HandleCommand(CommandType, Params);
	}

	// Actor commands
	if (CommandType.StartsWith(TEXT("actor_")))
	{
		return ActorCommands->HandleCommand(CommandType, Params);
	}

	// Material commands
	if (CommandType.StartsWith(TEXT("material_")))
	{
		return MaterialCommands->HandleCommand(CommandType, Params);
	}

	// Widget commands
	if (CommandType.StartsWith(TEXT("widget_")))
	{
		return WidgetCommands->HandleCommand(CommandType, Params);
	}

	// Asset commands
	if (CommandType.StartsWith(TEXT("asset_")))
	{
		return AssetCommands->HandleCommand(CommandType, Params);
	}

	// Input commands
	if (CommandType.StartsWith(TEXT("input_")))
	{
		return InputCommands->HandleCommand(CommandType, Params);
	}

	return CreateErrorResponse(TEXT("UNKNOWN_COMMAND"), FString::Printf(TEXT("Unknown command: %s"), *CommandType));
}

FString FGRIDBridge::ExecuteCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
	UE_LOG(LogTemp, Log, TEXT("[GRID] Executing command: %s"), *CommandType);

	TPromise<FString> Promise;
	TFuture<FString> Future = Promise.GetFuture();

	// Execute on game thread
	AsyncTask(ENamedThreads::GameThread, [this, CommandType, Params, Promise = MoveTemp(Promise)]() mutable
	{
		TSharedPtr<FJsonObject> Result = RouteCommand(CommandType, Params);

		FString ResultString;
		TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&ResultString);
		FJsonSerializer::Serialize(Result.ToSharedRef(), Writer);

		Promise.SetValue(ResultString);
	});

	// Wait for result with timeout
	bool bReady = Future.WaitFor(FTimespan::FromSeconds(30));
	if (!bReady)
	{
		TSharedPtr<FJsonObject> TimeoutError = CreateErrorResponse(TEXT("TIMEOUT"), TEXT("Command execution timed out"));
		FString ErrorString;
		TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&ErrorString);
		FJsonSerializer::Serialize(TimeoutError.ToSharedRef(), Writer);
		return ErrorString;
	}

	return Future.Get();
}

TSharedPtr<FJsonObject> FGRIDBridge::CreateErrorResponse(const FString& ErrorCode, const FString& ErrorMessage)
{
	TSharedPtr<FJsonObject> Response = MakeShared<FJsonObject>();
	Response->SetBoolField(TEXT("success"), false);
	Response->SetStringField(TEXT("error_code"), ErrorCode);
	Response->SetStringField(TEXT("error"), ErrorMessage);
	return Response;
}

TSharedPtr<FJsonObject> FGRIDBridge::CreateSuccessResponse(const TSharedPtr<FJsonObject>& Data)
{
	TSharedPtr<FJsonObject> Response = MakeShared<FJsonObject>();
	Response->SetBoolField(TEXT("success"), true);
	if (Data.IsValid())
	{
		Response->SetObjectField(TEXT("data"), Data);
	}
	return Response;
}
