// Copyright 2025 GRID. All Rights Reserved.

#include "Core/ToolRegistry.h"

FGRIDToolRegistry& FGRIDToolRegistry::Get()
{
	static FGRIDToolRegistry Instance;
	return Instance;
}

void FGRIDToolRegistry::Initialize()
{
	if (bInitialized)
	{
		return;
	}
	bInitialized = true;
	UE_LOG(LogTemp, Log, TEXT("[GRID] ToolRegistry initialized with %d tools"), Tools.Num());
}

void FGRIDToolRegistry::Shutdown()
{
	Tools.Empty();
	ToolNameToIndex.Empty();
	ToolExecuteFuncs.Empty();
	bInitialized = false;
}

TArray<FGRIDToolMetadata> FGRIDToolRegistry::GetEnabledTools() const
{
	TArray<FGRIDToolMetadata> Enabled;
	for (const FGRIDToolMetadata& Tool : Tools)
	{
		if (!DisabledTools.Contains(Tool.Name))
		{
			Enabled.Add(Tool);
		}
	}
	return Enabled;
}

TArray<FGRIDToolMetadata> FGRIDToolRegistry::GetToolsByCategory(const FString& Category) const
{
	TArray<FGRIDToolMetadata> Result;
	for (const FGRIDToolMetadata& Tool : Tools)
	{
		if (Tool.Category == Category)
		{
			Result.Add(Tool);
		}
	}
	return Result;
}

const FGRIDToolMetadata* FGRIDToolRegistry::FindTool(const FString& ToolName) const
{
	const int32* Index = ToolNameToIndex.Find(ToolName);
	if (Index && Tools.IsValidIndex(*Index))
	{
		return &Tools[*Index];
	}
	return nullptr;
}

void FGRIDToolRegistry::RegisterTool(const FGRIDToolRegistration& Registration)
{
	FGRIDToolMetadata Metadata;
	Metadata.Name = Registration.Name;
	Metadata.Description = Registration.Description;
	Metadata.Category = Registration.Category;
	Metadata.Parameters = Registration.Parameters;

	int32 Index = Tools.Num();
	Tools.Add(Metadata);
	ToolNameToIndex.Add(Registration.Name, Index);
	ToolExecuteFuncs.Add(Registration.Name, Registration.ExecuteFunc);

	UE_LOG(LogTemp, Log, TEXT("[GRID] Registered tool: %s"), *Registration.Name);
}

bool FGRIDToolRegistry::IsToolEnabled(const FString& ToolName) const
{
	return !DisabledTools.Contains(ToolName);
}

void FGRIDToolRegistry::SetToolEnabled(const FString& ToolName, bool bEnabled)
{
	if (bEnabled)
	{
		DisabledTools.Remove(ToolName);
	}
	else
	{
		DisabledTools.Add(ToolName);
	}
}

FString FGRIDToolRegistry::ExecuteTool(const FString& ToolName, const TMap<FString, FString>& Parameters)
{
	const FGRIDToolExecuteFunc* Func = ToolExecuteFuncs.Find(ToolName);
	if (!Func)
	{
		return TEXT("{\"success\":false,\"error_code\":\"UNKNOWN_TOOL\",\"error\":\"Tool not found\"}");
	}

	if (DisabledTools.Contains(ToolName))
	{
		return TEXT("{\"success\":false,\"error_code\":\"TOOL_DISABLED\",\"error\":\"Tool is disabled\"}");
	}

	return (*Func)(Parameters);
}
