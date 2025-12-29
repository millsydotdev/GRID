// Copyright 2025 GRID. All Rights Reserved.

#include "Commands/BlueprintCommands.h"
#include "Engine/Blueprint.h"
#include "Engine/BlueprintGeneratedClass.h"
#include "Factories/BlueprintFactory.h"
#include "Kismet2/BlueprintEditorUtils.h"
#include "Kismet2/KismetEditorUtilities.h"
#include "EditorAssetLibrary.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "Engine/SimpleConstructionScript.h"
#include "Engine/SCS_Node.h"
#include "EdGraph/EdGraph.h"
#include "K2Node_Event.h"
#include "K2Node_CallFunction.h"

FBlueprintCommands::FBlueprintCommands()
{
}

FBlueprintCommands::~FBlueprintCommands()
{
}

TSharedPtr<FJsonObject> FBlueprintCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
	if (CommandType == TEXT("blueprint_create"))
	{
		return CreateBlueprint(Params);
	}
	else if (CommandType == TEXT("blueprint_compile"))
	{
		return CompileBlueprint(Params);
	}
	else if (CommandType == TEXT("blueprint_get_info"))
	{
		return GetBlueprintInfo(Params);
	}
	else if (CommandType == TEXT("blueprint_reparent"))
	{
		return ReparentBlueprint(Params);
	}
	else if (CommandType == TEXT("blueprint_get_property"))
	{
		return GetProperty(Params);
	}
	else if (CommandType == TEXT("blueprint_set_property"))
	{
		return SetProperty(Params);
	}
	else if (CommandType == TEXT("blueprint_add_component"))
	{
		return AddComponent(Params);
	}
	else if (CommandType == TEXT("blueprint_remove_component"))
	{
		return RemoveComponent(Params);
	}
	else if (CommandType == TEXT("blueprint_get_hierarchy"))
	{
		return GetComponentHierarchy(Params);
	}
	else if (CommandType == TEXT("blueprint_add_variable"))
	{
		return AddVariable(Params);
	}
	else if (CommandType == TEXT("blueprint_remove_variable"))
	{
		return RemoveVariable(Params);
	}
	else if (CommandType == TEXT("blueprint_list_variables"))
	{
		return ListVariables(Params);
	}
	else if (CommandType == TEXT("blueprint_add_function"))
	{
		return AddFunction(Params);
	}
	else if (CommandType == TEXT("blueprint_remove_function"))
	{
		return RemoveFunction(Params);
	}
	else if (CommandType == TEXT("blueprint_list_functions"))
	{
		return ListFunctions(Params);
	}
	else if (CommandType == TEXT("blueprint_discover_nodes"))
	{
		return DiscoverNodes(Params);
	}
	else if (CommandType == TEXT("blueprint_create_node"))
	{
		return CreateNode(Params);
	}
	else if (CommandType == TEXT("blueprint_delete_node"))
	{
		return DeleteNode(Params);
	}
	else if (CommandType == TEXT("blueprint_connect_nodes"))
	{
		return ConnectNodes(Params);
	}
	else if (CommandType == TEXT("blueprint_list_nodes"))
	{
		return ListNodes(Params);
	}

	return CreateError(TEXT("UNKNOWN_COMMAND"), FString::Printf(TEXT("Unknown blueprint command: %s"), *CommandType));
}

UBlueprint* FBlueprintCommands::LoadBlueprint(const FString& Path)
{
	return Cast<UBlueprint>(UEditorAssetLibrary::LoadAsset(Path));
}

TSharedPtr<FJsonObject> FBlueprintCommands::CreateBlueprint(const TSharedPtr<FJsonObject>& Params)
{
	FString Path = Params->GetStringField(TEXT("path"));
	FString ParentClass = Params->GetStringField(TEXT("parent_class"));

	if (Path.IsEmpty())
	{
		return CreateError(TEXT("MISSING_PATH"), TEXT("Blueprint path is required"));
	}

	// Default to Actor
	UClass* Parent = AActor::StaticClass();
	if (!ParentClass.IsEmpty())
	{
		UClass* FoundClass = FindObject<UClass>(ANY_PACKAGE, *ParentClass);
		if (FoundClass)
		{
			Parent = FoundClass;
		}
	}

	// Create Blueprint
	UBlueprintFactory* Factory = NewObject<UBlueprintFactory>();
	Factory->ParentClass = Parent;

	FString PackagePath = FPackageName::ObjectPathToPackageName(Path);
	FString AssetName = FPackageName::GetLongPackageAssetName(Path);

	UPackage* Package = CreatePackage(*PackagePath);
	UBlueprint* Blueprint = Cast<UBlueprint>(Factory->FactoryCreateNew(
		UBlueprint::StaticClass(),
		Package,
		*AssetName,
		RF_Public | RF_Standalone,
		nullptr,
		GWarn
	));

	if (!Blueprint)
	{
		return CreateError(TEXT("CREATE_FAILED"), TEXT("Failed to create blueprint"));
	}

	// Save
	FAssetRegistryModule::AssetCreated(Blueprint);
	Blueprint->MarkPackageDirty();
	UEditorAssetLibrary::SaveAsset(Path);

	TSharedPtr<FJsonObject> Data = MakeShared<FJsonObject>();
	Data->SetStringField(TEXT("path"), Path);
	Data->SetStringField(TEXT("name"), AssetName);
	Data->SetStringField(TEXT("parent_class"), Parent->GetName());

	return CreateSuccess(Data);
}

TSharedPtr<FJsonObject> FBlueprintCommands::CompileBlueprint(const TSharedPtr<FJsonObject>& Params)
{
	FString Path = Params->GetStringField(TEXT("path"));
	UBlueprint* Blueprint = LoadBlueprint(Path);

	if (!Blueprint)
	{
		return CreateError(TEXT("NOT_FOUND"), FString::Printf(TEXT("Blueprint not found: %s"), *Path));
	}

	FKismetEditorUtilities::CompileBlueprint(Blueprint);

	TSharedPtr<FJsonObject> Data = MakeShared<FJsonObject>();
	Data->SetStringField(TEXT("path"), Path);
	Data->SetBoolField(TEXT("compiled"), true);
	Data->SetBoolField(TEXT("has_errors"), Blueprint->Status == BS_Error);

	return CreateSuccess(Data);
}

TSharedPtr<FJsonObject> FBlueprintCommands::GetBlueprintInfo(const TSharedPtr<FJsonObject>& Params)
{
	FString Path = Params->GetStringField(TEXT("path"));
	UBlueprint* Blueprint = LoadBlueprint(Path);

	if (!Blueprint)
	{
		return CreateError(TEXT("NOT_FOUND"), FString::Printf(TEXT("Blueprint not found: %s"), *Path));
	}

	TSharedPtr<FJsonObject> Data = MakeShared<FJsonObject>();
	Data->SetStringField(TEXT("path"), Path);
	Data->SetStringField(TEXT("name"), Blueprint->GetName());
	Data->SetStringField(TEXT("parent_class"), Blueprint->ParentClass ? Blueprint->ParentClass->GetName() : TEXT("None"));
	Data->SetStringField(TEXT("status"), Blueprint->Status == BS_UpToDate ? TEXT("UpToDate") : TEXT("NeedsCompile"));

	// Component count
	if (Blueprint->SimpleConstructionScript)
	{
		Data->SetNumberField(TEXT("component_count"), Blueprint->SimpleConstructionScript->GetAllNodes().Num());
	}

	// Variable count
	Data->SetNumberField(TEXT("variable_count"), Blueprint->NewVariables.Num());

	// Function count
	int32 FunctionCount = 0;
	for (UEdGraph* Graph : Blueprint->FunctionGraphs)
	{
		FunctionCount++;
	}
	Data->SetNumberField(TEXT("function_count"), FunctionCount);

	return CreateSuccess(Data);
}

// Stub implementations for remaining methods
TSharedPtr<FJsonObject> FBlueprintCommands::ReparentBlueprint(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("ReparentBlueprint not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::GetProperty(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("GetProperty not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::SetProperty(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("SetProperty not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::AddComponent(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("AddComponent not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::RemoveComponent(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("RemoveComponent not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::GetComponentHierarchy(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("GetComponentHierarchy not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::SetComponentProperty(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("SetComponentProperty not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::AddVariable(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("AddVariable not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::RemoveVariable(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("RemoveVariable not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::ListVariables(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("ListVariables not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::AddFunction(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("AddFunction not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::RemoveFunction(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("RemoveFunction not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::ListFunctions(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("ListFunctions not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::DiscoverNodes(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("DiscoverNodes not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::CreateNode(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("CreateNode not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::DeleteNode(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("DeleteNode not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::ConnectNodes(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("ConnectNodes not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::ListNodes(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("ListNodes not yet implemented"));
}

TSharedPtr<FJsonObject> FBlueprintCommands::CreateError(const FString& Code, const FString& Message)
{
	TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();
	Result->SetBoolField(TEXT("success"), false);
	Result->SetStringField(TEXT("error_code"), Code);
	Result->SetStringField(TEXT("error"), Message);
	return Result;
}

TSharedPtr<FJsonObject> FBlueprintCommands::CreateSuccess(const TSharedPtr<FJsonObject>& Data)
{
	TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();
	Result->SetBoolField(TEXT("success"), true);
	if (Data.IsValid())
	{
		Result->SetObjectField(TEXT("data"), Data);
	}
	return Result;
}
