// Copyright 2025 GRID. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"

/**
 * Tool parameter metadata for AI tool definitions.
 */
struct GRIDEDITOR_API FGRIDToolParameter
{
	FString Name;
	FString Description;
	FString Type;  // "string", "int", "float", "bool", "object", "array"
	bool bRequired = false;
	FString DefaultValue;
	TArray<FString> AllowedValues;

	FGRIDToolParameter() = default;

	FGRIDToolParameter(const FString& InName, const FString& InDesc, const FString& InType, bool InRequired)
		: Name(InName), Description(InDesc), Type(InType), bRequired(InRequired)
	{
	}
};

/**
 * Tool metadata for describing AI-accessible tools.
 */
struct GRIDEDITOR_API FGRIDToolMetadata
{
	FString Name;
	FString Description;
	FString Category;
	TArray<FString> Examples;
	TArray<FGRIDToolParameter> Parameters;

	FGRIDToolMetadata() = default;
};

/**
 * Tool registration info for auto-registration.
 */
using FGRIDToolExecuteFunc = TFunction<FString(const TMap<FString, FString>&)>;

struct GRIDEDITOR_API FGRIDToolRegistration
{
	FString Name;
	FString Description;
	FString Category;
	TArray<FGRIDToolParameter> Parameters;
	FGRIDToolExecuteFunc ExecuteFunc;
};

/**
 * Tool registry for managing available AI tools.
 */
class GRIDEDITOR_API FGRIDToolRegistry
{
public:
	static FGRIDToolRegistry& Get();

	void Initialize();
	void Shutdown();

	const TArray<FGRIDToolMetadata>& GetAllTools() const { return Tools; }
	TArray<FGRIDToolMetadata> GetEnabledTools() const;
	TArray<FGRIDToolMetadata> GetToolsByCategory(const FString& Category) const;
	const FGRIDToolMetadata* FindTool(const FString& ToolName) const;

	void RegisterTool(const FGRIDToolRegistration& Registration);
	bool IsToolEnabled(const FString& ToolName) const;
	void SetToolEnabled(const FString& ToolName, bool bEnabled);

	FString ExecuteTool(const FString& ToolName, const TMap<FString, FString>& Parameters);

private:
	FGRIDToolRegistry() = default;

	TArray<FGRIDToolMetadata> Tools;
	TMap<FString, int32> ToolNameToIndex;
	TMap<FString, FGRIDToolExecuteFunc> ToolExecuteFuncs;
	TSet<FString> DisabledTools;
	bool bInitialized = false;
};

// Auto-registration helper
struct GRIDEDITOR_API FGRIDToolAutoRegistrar
{
	FGRIDToolAutoRegistrar(const FGRIDToolRegistration& Registration)
	{
		FGRIDToolRegistry::Get().RegisterTool(Registration);
	}
};

// Registration macros
#define GRID_TOOL_PARAMS(...) TArray<FGRIDToolParameter>({ __VA_ARGS__ })
#define GRID_TOOL_PARAM(Name, Desc, Type, Required) FGRIDToolParameter(TEXT(Name), TEXT(Desc), TEXT(Type), Required)

#define REGISTER_GRID_TOOL(ToolName, Description, Category, ParamList, ExecuteBody) \
	static FGRIDToolAutoRegistrar AutoRegister_##ToolName( \
		FGRIDToolRegistration{ \
			TEXT(#ToolName), \
			TEXT(Description), \
			TEXT(Category), \
			ParamList, \
			[](const TMap<FString, FString>& Params) -> FString ExecuteBody \
		} \
	);
