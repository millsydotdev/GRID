// Copyright 2025 GRID. All Rights Reserved.

#include "Commands/InputCommands.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "EditorAssetLibrary.h"

FInputCommands::FInputCommands() {}
FInputCommands::~FInputCommands() {}

TSharedPtr<FJsonObject> FInputCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
	if (CommandType == TEXT("input_create_action")) return CreateAction(Params);
	if (CommandType == TEXT("input_list_actions")) return ListActions(Params);
	if (CommandType == TEXT("input_create_context")) return CreateMappingContext(Params);
	if (CommandType == TEXT("input_list_contexts")) return ListMappingContexts(Params);
	if (CommandType == TEXT("input_add_mapping")) return AddKeyMapping(Params);
	if (CommandType == TEXT("input_remove_mapping")) return RemoveKeyMapping(Params);
	if (CommandType == TEXT("input_get_mappings")) return GetMappings(Params);
	if (CommandType == TEXT("input_get_keys")) return GetAvailableKeys(Params);
	if (CommandType == TEXT("input_add_modifier")) return AddModifier(Params);
	if (CommandType == TEXT("input_remove_modifier")) return RemoveModifier(Params);
	if (CommandType == TEXT("input_add_trigger")) return AddTrigger(Params);
	if (CommandType == TEXT("input_remove_trigger")) return RemoveTrigger(Params);
	return CreateError(TEXT("UNKNOWN_COMMAND"), FString::Printf(TEXT("Unknown input command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FInputCommands::CreateAction(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::ListActions(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::GetActionProperties(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::ConfigureAction(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::CreateMappingContext(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::ListMappingContexts(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::GetMappings(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::AddKeyMapping(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::RemoveKeyMapping(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::GetAvailableKeys(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::AddModifier(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::RemoveModifier(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::ListModifiers(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::AddTrigger(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::RemoveTrigger(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FInputCommands::ListTriggers(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }

TSharedPtr<FJsonObject> FInputCommands::CreateError(const FString& Code, const FString& Message)
{
	TSharedPtr<FJsonObject> R = MakeShared<FJsonObject>();
	R->SetBoolField(TEXT("success"), false);
	R->SetStringField(TEXT("error_code"), Code);
	R->SetStringField(TEXT("error"), Message);
	return R;
}

TSharedPtr<FJsonObject> FInputCommands::CreateSuccess(const TSharedPtr<FJsonObject>& Data)
{
	TSharedPtr<FJsonObject> R = MakeShared<FJsonObject>();
	R->SetBoolField(TEXT("success"), true);
	if (Data.IsValid()) R->SetObjectField(TEXT("data"), Data);
	return R;
}
