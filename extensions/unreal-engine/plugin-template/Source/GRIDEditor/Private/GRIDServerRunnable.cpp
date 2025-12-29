// Copyright 2025 GRID. All Rights Reserved.

#include "GRIDServerRunnable.h"
#include "GRIDBridge.h"
#include "Sockets.h"
#include "SocketSubsystem.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonReader.h"

FGRIDServerRunnable::FGRIDServerRunnable(FGRIDBridge* InBridge, TSharedPtr<FSocket> InListenerSocket)
	: Bridge(InBridge)
	, ListenerSocket(InListenerSocket)
{
}

FGRIDServerRunnable::~FGRIDServerRunnable()
{
}

bool FGRIDServerRunnable::Init()
{
	return true;
}

uint32 FGRIDServerRunnable::Run()
{
	while (StopTaskCounter.GetValue() == 0)
	{
		if (!ListenerSocket.IsValid())
		{
			break;
		}

		bool bHasPendingConnection = false;
		if (ListenerSocket->WaitForPendingConnection(bHasPendingConnection, FTimespan::FromMilliseconds(100)))
		{
			if (bHasPendingConnection)
			{
				TSharedPtr<FInternetAddr> ClientAddr = ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)->CreateInternetAddr();
				FSocket* ClientSocket = ListenerSocket->Accept(*ClientAddr, TEXT("GRID Client"));

				if (ClientSocket)
				{
					HandleClientConnection(ClientSocket);
					ClientSocket->Close();
					ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)->DestroySocket(ClientSocket);
				}
			}
		}
	}

	return 0;
}

void FGRIDServerRunnable::Stop()
{
	StopTaskCounter.Increment();
}

void FGRIDServerRunnable::Exit()
{
}

void FGRIDServerRunnable::HandleClientConnection(FSocket* ClientSocket)
{
	if (!ClientSocket || !Bridge)
	{
		return;
	}

	// Read request data
	TArray<uint8> Buffer;
	Buffer.SetNumUninitialized(65536);
	int32 BytesRead = 0;

	ClientSocket->SetNonBlocking(false);
	ClientSocket->Wait(ESocketWaitConditions::WaitForRead, FTimespan::FromSeconds(5));

	if (ClientSocket->Recv(Buffer.GetData(), Buffer.Num(), BytesRead))
	{
		if (BytesRead > 0)
		{
			FString RequestData = FString(UTF8_TO_TCHAR(reinterpret_cast<const char*>(Buffer.GetData())));
			RequestData = RequestData.Left(BytesRead);

			FString ResponseData = ProcessRequest(RequestData);

			// Send response
			FTCHARToUTF8 Converter(*ResponseData);
			int32 BytesSent = 0;
			ClientSocket->Send(reinterpret_cast<const uint8*>(Converter.Get()), Converter.Length(), BytesSent);
		}
	}
}

FString FGRIDServerRunnable::ProcessRequest(const FString& RequestData)
{
	// Parse JSON request
	TSharedPtr<FJsonObject> RequestJson;
	TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(RequestData);

	if (!FJsonSerializer::Deserialize(Reader, RequestJson) || !RequestJson.IsValid())
	{
		return TEXT("{\"success\":false,\"error_code\":\"INVALID_JSON\",\"error\":\"Failed to parse request JSON\"}");
	}

	// Extract command and params
	FString CommandType;
	if (!RequestJson->TryGetStringField(TEXT("command"), CommandType))
	{
		return TEXT("{\"success\":false,\"error_code\":\"MISSING_COMMAND\",\"error\":\"Request missing 'command' field\"}");
	}

	TSharedPtr<FJsonObject> Params = RequestJson->GetObjectField(TEXT("params"));
	if (!Params.IsValid())
	{
		Params = MakeShared<FJsonObject>();
	}

	// Execute command
	return Bridge->ExecuteCommand(CommandType, Params);
}
