// Copyright 2025 GRID. All Rights Reserved.

#include "Commands/MaterialCommands.h"
#include "Materials/Material.h"
#include "Materials/MaterialInstanceConstant.h"
#include "Factories/MaterialFactoryNew.h"
#include "Factories/MaterialInstanceConstantFactoryNew.h"
#include "EditorAssetLibrary.h"
#include "AssetRegistry/AssetRegistryModule.h"

FMaterialCommands::FMaterialCommands() {}
FMaterialCommands::~FMaterialCommands() {}

TSharedPtr<FJsonObject> FMaterialCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
	if (CommandType == TEXT("material_create")) return CreateMaterial(Params);
	if (CommandType == TEXT("material_create_instance")) return CreateMaterialInstance(Params);
	if (CommandType == TEXT("material_get_info")) return GetMaterialInfo(Params);
	if (CommandType == TEXT("material_compile")) return Compile(Params);
	if (CommandType == TEXT("material_save")) return Save(Params);
	return CreateError(TEXT("UNKNOWN_COMMAND"), FString::Printf(TEXT("Unknown material command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FMaterialCommands::CreateMaterial(const TSharedPtr<FJsonObject>& Params)
{
	FString Path = Params->GetStringField(TEXT("path"));
	if (Path.IsEmpty()) return CreateError(TEXT("MISSING_PATH"), TEXT("Material path required"));

	UMaterialFactoryNew* Factory = NewObject<UMaterialFactoryNew>();
	FString PackagePath = FPackageName::ObjectPathToPackageName(Path);
	FString AssetName = FPackageName::GetLongPackageAssetName(Path);
	UPackage* Package = CreatePackage(*PackagePath);

	UMaterial* Material = Cast<UMaterial>(Factory->FactoryCreateNew(
		UMaterial::StaticClass(), Package, *AssetName,
		RF_Public | RF_Standalone, nullptr, GWarn));

	if (!Material) return CreateError(TEXT("CREATE_FAILED"), TEXT("Failed to create material"));

	FAssetRegistryModule::AssetCreated(Material);
	Material->MarkPackageDirty();
	UEditorAssetLibrary::SaveAsset(Path);

	TSharedPtr<FJsonObject> Data = MakeShared<FJsonObject>();
	Data->SetStringField(TEXT("path"), Path);
	Data->SetStringField(TEXT("name"), AssetName);
	return CreateSuccess(Data);
}

TSharedPtr<FJsonObject> FMaterialCommands::CreateMaterialInstance(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FMaterialCommands::GetMaterialInfo(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FMaterialCommands::GetProperty(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FMaterialCommands::SetProperty(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FMaterialCommands::ListParameters(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FMaterialCommands::SetParameter(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FMaterialCommands::Compile(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FMaterialCommands::Save(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FMaterialCommands::DiscoverNodeTypes(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FMaterialCommands::CreateNode(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FMaterialCommands::DeleteNode(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FMaterialCommands::ConnectNodes(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FMaterialCommands::ListNodes(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }

TSharedPtr<FJsonObject> FMaterialCommands::CreateError(const FString& Code, const FString& Message)
{
	TSharedPtr<FJsonObject> R = MakeShared<FJsonObject>();
	R->SetBoolField(TEXT("success"), false);
	R->SetStringField(TEXT("error_code"), Code);
	R->SetStringField(TEXT("error"), Message);
	return R;
}

TSharedPtr<FJsonObject> FMaterialCommands::CreateSuccess(const TSharedPtr<FJsonObject>& Data)
{
	TSharedPtr<FJsonObject> R = MakeShared<FJsonObject>();
	R->SetBoolField(TEXT("success"), true);
	if (Data.IsValid()) R->SetObjectField(TEXT("data"), Data);
	return R;
}
