// Copyright 2025 GRID. All Rights Reserved.

#include "Commands/WidgetCommands.h"
#include "WidgetBlueprint.h"
#include "EditorAssetLibrary.h"

FWidgetCommands::FWidgetCommands() {}
FWidgetCommands::~FWidgetCommands() {}

TSharedPtr<FJsonObject> FWidgetCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
	if (CommandType == TEXT("widget_create")) return CreateWidgetBlueprint(Params);
	if (CommandType == TEXT("widget_list_components")) return ListComponents(Params);
	if (CommandType == TEXT("widget_add_component")) return AddComponent(Params);
	if (CommandType == TEXT("widget_remove_component")) return RemoveComponent(Params);
	if (CommandType == TEXT("widget_get_property")) return GetProperty(Params);
	if (CommandType == TEXT("widget_set_property")) return SetProperty(Params);
	if (CommandType == TEXT("widget_list_properties")) return ListProperties(Params);
	if (CommandType == TEXT("widget_discover_types")) return DiscoverWidgetTypes(Params);
	if (CommandType == TEXT("widget_validate")) return ValidateHierarchy(Params);
	if (CommandType == TEXT("widget_get_events")) return GetAvailableEvents(Params);
	if (CommandType == TEXT("widget_bind_events")) return BindEvents(Params);
	return CreateError(TEXT("UNKNOWN_COMMAND"), FString::Printf(TEXT("Unknown widget command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FWidgetCommands::CreateWidgetBlueprint(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FWidgetCommands::ListComponents(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FWidgetCommands::AddComponent(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FWidgetCommands::RemoveComponent(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FWidgetCommands::GetProperty(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FWidgetCommands::SetProperty(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FWidgetCommands::ListProperties(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FWidgetCommands::DiscoverWidgetTypes(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FWidgetCommands::ValidateHierarchy(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FWidgetCommands::GetAvailableEvents(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }
TSharedPtr<FJsonObject> FWidgetCommands::BindEvents(const TSharedPtr<FJsonObject>& Params) { return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("Not implemented")); }

TSharedPtr<FJsonObject> FWidgetCommands::CreateError(const FString& Code, const FString& Message)
{
	TSharedPtr<FJsonObject> R = MakeShared<FJsonObject>();
	R->SetBoolField(TEXT("success"), false);
	R->SetStringField(TEXT("error_code"), Code);
	R->SetStringField(TEXT("error"), Message);
	return R;
}

TSharedPtr<FJsonObject> FWidgetCommands::CreateSuccess(const TSharedPtr<FJsonObject>& Data)
{
	TSharedPtr<FJsonObject> R = MakeShared<FJsonObject>();
	R->SetBoolField(TEXT("success"), true);
	if (Data.IsValid()) R->SetObjectField(TEXT("data"), Data);
	return R;
}
