#include "GRIDEditorBridge.h"
#include "Networking.h"

#define LOCTEXT_NAMESPACE "FGRIDEditorBridgeModule"

void FGRIDEditorBridgeModule::StartupModule()
{
	// Start TCP Listener on port 48061
	FIPv4Address Address;
	FIPv4Address::Parse(TEXT("127.0.0.1"), Address);
	FIPv4Endpoint Endpoint(Address, 48061);

	Listener = new FTcpListener(Endpoint);
	Listener->OnConnectionAccepted().BindRaw(this, &FGRIDEditorBridgeModule::OnConnectionAccepted);

	UE_LOG(LogTemp, Log, TEXT("GRID Editor Bridge started on port 48061"));
}

void FGRIDEditorBridgeModule::ShutdownModule()
{
	if (Listener)
	{
		delete Listener;
		Listener = nullptr;
	}
}

void FGRIDEditorBridgeModule::OnConnectionAccepted(FSocket* Socket, const FIPv4Endpoint& Endpoint)
{
	UE_LOG(LogTemp, Log, TEXT("GRID IDE Connected"));
	
	// Handle connection...
	// In a real implementation, this would spawn a thread to handle messages
	
	Socket->Close();
}

#undef LOCTEXT_NAMESPACE
	
IMPLEMENT_MODULE(FGRIDEditorBridgeModule, GRIDEditorBridge)
