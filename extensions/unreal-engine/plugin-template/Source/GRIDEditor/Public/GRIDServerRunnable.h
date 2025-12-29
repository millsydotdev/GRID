// Copyright 2025 GRID. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "HAL/Runnable.h"

class FGRIDBridge;
class FSocket;

/**
 * Server runnable that handles incoming connections from GRID IDE.
 */
class FGRIDServerRunnable : public FRunnable
{
public:
	FGRIDServerRunnable(FGRIDBridge* InBridge, TSharedPtr<FSocket> InListenerSocket);
	virtual ~FGRIDServerRunnable();

	// FRunnable interface
	virtual bool Init() override;
	virtual uint32 Run() override;
	virtual void Stop() override;
	virtual void Exit() override;

private:
	void HandleClientConnection(FSocket* ClientSocket);
	FString ProcessRequest(const FString& RequestData);

	FGRIDBridge* Bridge;
	TSharedPtr<FSocket> ListenerSocket;
	FThreadSafeCounter StopTaskCounter;
};
