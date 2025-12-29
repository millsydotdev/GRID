// Copyright 2025 GRID. All Rights Reserved.

#include "Commands/AssetCommands.h"
#include "EditorAssetLibrary.h"
#include "AssetRegistry/AssetRegistryModule.h"

FAssetCommands::FAssetCommands() {}
FAssetCommands::~FAssetCommands() {}

TSharedPtr<FJsonObject> FAssetCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
	if (CommandType == TEXT("asset_search")) return Search(Params);
	if (CommandType == TEXT("asset_import_texture")) return ImportTexture(Params);
	if (CommandType == TEXT("asset_export_texture")) return ExportTexture(Params);
	if (CommandType == TEXT("asset_delete")) return Delete(Params);
	if (CommandType == TEXT("asset_duplicate")) return Duplicate(Params);
	if (CommandType == TEXT("asset_save")) return Save(Params);
	if (CommandType == TEXT("asset_save_all")) return SaveAll(Params);
	if (CommandType == TEXT("asset_list_references")) return ListReferences(Params);
	if (CommandType == TEXT("asset_open")) return Open(Params);
	return CreateError(TEXT("UNKNOWN_COMMAND"), FString::Printf(TEXT("Unknown asset command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FAssetCommands::Search(const TSharedPtr<FJsonObject>& Params)
{
	FString Query = Params->GetStringField(TEXT("query"));
	FString Type = Params->GetStringField(TEXT("type"));

	FAssetRegistryModule& AssetRegistry = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry");
	TArray<FAssetData> Assets;

	FARFilter Filter;
	if (!Type.IsEmpty())
	{
		Filter.ClassPaths.Add(FTopLevelAssetPath(*Type));
	}
	Filter.PackagePaths.Add(FName(TEXT("/Game")));
	Filter.bRecursivePaths = true;

	AssetRegistry.Get().GetAssets(Filter, Assets);

	TArray<TSharedPtr<FJsonValue>> ResultArray;
	for (const FAssetData& Asset : Assets)
	{
		if (!Query.IsEmpty() && !Asset.AssetName.ToString().Contains(Query))
		{
			continue;
		}

		TSharedPtr<FJsonObject> AssetObj = MakeShared<FJsonObject>();
		AssetObj->SetStringField(TEXT("name"), Asset.AssetName.ToString());
		AssetObj->SetStringField(TEXT("path"), Asset.GetObjectPathString());
		AssetObj->SetStringField(TEXT("class"), Asset.AssetClassPath.GetAssetName().ToString());
		ResultArray.Add(MakeShared<FJsonValueObject>(AssetObj));

		if (ResultArray.Num() >= 100) break;
	}

	TSharedPtr<FJsonObject> Data = MakeShared<FJsonObject>();
	Data->SetArrayField(TEXT("assets"), ResultArray);
	Data->SetNumberField(TEXT("count"), ResultArray.Num());
	return CreateSuccess(Data);
}

TSharedPtr<FJsonObject> FAssetCommands::ImportTexture(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FAssetCommands::ExportTexture(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FAssetCommands::Delete(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FAssetCommands::Duplicate(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FAssetCommands::Save(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FAssetCommands::SaveAll(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FAssetCommands::ListReferences(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FAssetCommands::Open(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }

TSharedPtr<FJsonObject> FAssetCommands::CreateError(const FString& Code, const FString& Message)
{
	TSharedPtr<FJsonObject> R = MakeShared<FJsonObject>();
	R->SetBoolField(TEXT("success"), false);
	R->SetStringField(TEXT("error_code"), Code);
	R->SetStringField(TEXT("error"), Message);
	return R;
}

TSharedPtr<FJsonObject> FAssetCommands::CreateSuccess(const TSharedPtr<FJsonObject>& Data)
{
	TSharedPtr<FJsonObject> R = MakeShared<FJsonObject>();
	R->SetBoolField(TEXT("success"), true);
	if (Data.IsValid()) R->SetObjectField(TEXT("data"), Data);
	return R;
}
