#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"
#include "Sockets.h"
#include "Common/TcpListener.h"

class FGRIDEditorBridgeModule : public IModuleInterface
{
public:
	/** IModuleInterface implementation */
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;

private:
	void OnConnectionAccepted(FSocket* Socket, const FIPv4Endpoint& Endpoint);

	FTcpListener* Listener;
};
