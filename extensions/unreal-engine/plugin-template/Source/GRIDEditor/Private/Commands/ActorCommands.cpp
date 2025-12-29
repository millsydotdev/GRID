// Copyright 2025 GRID. All Rights Reserved.

#include "Commands/ActorCommands.h"
#include "Engine/World.h"
#include "Engine/StaticMeshActor.h"
#include "GameFramework/Actor.h"
#include "Subsystems/EditorActorSubsystem.h"
#include "Kismet/GameplayStatics.h"
#include "Editor.h"
#include "LevelEditor.h"

FActorCommands::FActorCommands()
{
}

FActorCommands::~FActorCommands()
{
}

TSharedPtr<FJsonObject> FActorCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
	if (CommandType == TEXT("actor_list"))
	{
		return ListActors(Params);
	}
	else if (CommandType == TEXT("actor_find"))
	{
		return FindActors(Params);
	}
	else if (CommandType == TEXT("actor_spawn"))
	{
		return SpawnActor(Params);
	}
	else if (CommandType == TEXT("actor_delete"))
	{
		return DeleteActor(Params);
	}
	else if (CommandType == TEXT("actor_get_info"))
	{
		return GetActorInfo(Params);
	}
	else if (CommandType == TEXT("actor_get_transform"))
	{
		return GetTransform(Params);
	}
	else if (CommandType == TEXT("actor_set_transform"))
	{
		return SetTransform(Params);
	}
	else if (CommandType == TEXT("actor_set_location"))
	{
		return SetLocation(Params);
	}
	else if (CommandType == TEXT("actor_set_rotation"))
	{
		return SetRotation(Params);
	}
	else if (CommandType == TEXT("actor_set_scale"))
	{
		return SetScale(Params);
	}
	else if (CommandType == TEXT("actor_focus"))
	{
		return FocusActor(Params);
	}
	else if (CommandType == TEXT("actor_select"))
	{
		return SelectActor(Params);
	}
	else if (CommandType == TEXT("actor_rename"))
	{
		return RenameActor(Params);
	}

	return CreateError(TEXT("UNKNOWN_COMMAND"), FString::Printf(TEXT("Unknown actor command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FActorCommands::ListActors(const TSharedPtr<FJsonObject>& Params)
{
	UWorld* World = GEditor ? GEditor->GetEditorWorldContext().World() : nullptr;
	if (!World)
	{
		return CreateError(TEXT("NO_WORLD"), TEXT("No active world"));
	}

	TArray<TSharedPtr<FJsonValue>> ActorArray;
	for (TActorIterator<AActor> It(World); It; ++It)
	{
		AActor* Actor = *It;
		TSharedPtr<FJsonObject> ActorObj = MakeShared<FJsonObject>();
		ActorObj->SetStringField(TEXT("name"), Actor->GetActorLabel());
		ActorObj->SetStringField(TEXT("class"), Actor->GetClass()->GetName());

		FVector Location = Actor->GetActorLocation();
		ActorObj->SetNumberField(TEXT("x"), Location.X);
		ActorObj->SetNumberField(TEXT("y"), Location.Y);
		ActorObj->SetNumberField(TEXT("z"), Location.Z);

		ActorArray.Add(MakeShared<FJsonValueObject>(ActorObj));
	}

	TSharedPtr<FJsonObject> Data = MakeShared<FJsonObject>();
	Data->SetArrayField(TEXT("actors"), ActorArray);
	Data->SetNumberField(TEXT("count"), ActorArray.Num());

	return CreateSuccess(Data);
}

TSharedPtr<FJsonObject> FActorCommands::FindActors(const TSharedPtr<FJsonObject>& Params)
{
	FString Pattern = Params->GetStringField(TEXT("pattern"));
	FString ClassName = Params->GetStringField(TEXT("class"));

	UWorld* World = GEditor ? GEditor->GetEditorWorldContext().World() : nullptr;
	if (!World)
	{
		return CreateError(TEXT("NO_WORLD"), TEXT("No active world"));
	}

	TArray<TSharedPtr<FJsonValue>> ActorArray;
	for (TActorIterator<AActor> It(World); It; ++It)
	{
		AActor* Actor = *It;
		bool bMatch = true;

		if (!Pattern.IsEmpty() && !Actor->GetActorLabel().Contains(Pattern))
		{
			bMatch = false;
		}
		if (!ClassName.IsEmpty() && Actor->GetClass()->GetName() != ClassName)
		{
			bMatch = false;
		}

		if (bMatch)
		{
			TSharedPtr<FJsonObject> ActorObj = MakeShared<FJsonObject>();
			ActorObj->SetStringField(TEXT("name"), Actor->GetActorLabel());
			ActorObj->SetStringField(TEXT("class"), Actor->GetClass()->GetName());
			ActorArray.Add(MakeShared<FJsonValueObject>(ActorObj));
		}
	}

	TSharedPtr<FJsonObject> Data = MakeShared<FJsonObject>();
	Data->SetArrayField(TEXT("actors"), ActorArray);
	Data->SetNumberField(TEXT("count"), ActorArray.Num());

	return CreateSuccess(Data);
}

TSharedPtr<FJsonObject> FActorCommands::SpawnActor(const TSharedPtr<FJsonObject>& Params)
{
	FString ClassName = Params->GetStringField(TEXT("class"));
	FString BlueprintPath = Params->GetStringField(TEXT("blueprint"));

	double X = Params->GetNumberField(TEXT("x"));
	double Y = Params->GetNumberField(TEXT("y"));
	double Z = Params->GetNumberField(TEXT("z"));

	UWorld* World = GEditor ? GEditor->GetEditorWorldContext().World() : nullptr;
	if (!World)
	{
		return CreateError(TEXT("NO_WORLD"), TEXT("No active world"));
	}

	UClass* ActorClass = nullptr;

	if (!BlueprintPath.IsEmpty())
	{
		UBlueprint* Blueprint = Cast<UBlueprint>(StaticLoadObject(UBlueprint::StaticClass(), nullptr, *BlueprintPath));
		if (Blueprint && Blueprint->GeneratedClass)
		{
			ActorClass = Blueprint->GeneratedClass;
		}
	}
	else if (!ClassName.IsEmpty())
	{
		ActorClass = FindObject<UClass>(ANY_PACKAGE, *ClassName);
	}

	if (!ActorClass)
	{
		ActorClass = AStaticMeshActor::StaticClass();
	}

	FActorSpawnParameters SpawnParams;
	SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	AActor* NewActor = World->SpawnActor<AActor>(ActorClass, FVector(X, Y, Z), FRotator::ZeroRotator, SpawnParams);

	if (!NewActor)
	{
		return CreateError(TEXT("SPAWN_FAILED"), TEXT("Failed to spawn actor"));
	}

	TSharedPtr<FJsonObject> Data = MakeShared<FJsonObject>();
	Data->SetStringField(TEXT("name"), NewActor->GetActorLabel());
	Data->SetStringField(TEXT("class"), NewActor->GetClass()->GetName());
	Data->SetNumberField(TEXT("x"), X);
	Data->SetNumberField(TEXT("y"), Y);
	Data->SetNumberField(TEXT("z"), Z);

	return CreateSuccess(Data);
}

// Stub implementations
TSharedPtr<FJsonObject> FActorCommands::DeleteActor(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("DeleteActor not yet implemented"));
}

TSharedPtr<FJsonObject> FActorCommands::GetActorInfo(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("GetActorInfo not yet implemented"));
}

TSharedPtr<FJsonObject> FActorCommands::GetTransform(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("GetTransform not yet implemented"));
}

TSharedPtr<FJsonObject> FActorCommands::SetTransform(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("SetTransform not yet implemented"));
}

TSharedPtr<FJsonObject> FActorCommands::SetLocation(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("SetLocation not yet implemented"));
}

TSharedPtr<FJsonObject> FActorCommands::SetRotation(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("SetRotation not yet implemented"));
}

TSharedPtr<FJsonObject> FActorCommands::SetScale(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("SetScale not yet implemented"));
}

TSharedPtr<FJsonObject> FActorCommands::GetProperty(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("GetProperty not yet implemented"));
}

TSharedPtr<FJsonObject> FActorCommands::SetProperty(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("SetProperty not yet implemented"));
}

TSharedPtr<FJsonObject> FActorCommands::FocusActor(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("FocusActor not yet implemented"));
}

TSharedPtr<FJsonObject> FActorCommands::SelectActor(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("SelectActor not yet implemented"));
}

TSharedPtr<FJsonObject> FActorCommands::RenameActor(const TSharedPtr<FJsonObject>& Params)
{
	return CreateError(TEXT("NOT_IMPLEMENTED"), TEXT("RenameActor not yet implemented"));
}

TSharedPtr<FJsonObject> FActorCommands::CreateError(const FString& Code, const FString& Message)
{
	TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();
	Result->SetBoolField(TEXT("success"), false);
	Result->SetStringField(TEXT("error_code"), Code);
	Result->SetStringField(TEXT("error"), Message);
	return Result;
}

TSharedPtr<FJsonObject> FActorCommands::CreateSuccess(const TSharedPtr<FJsonObject>& Data)
{
	TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();
	Result->SetBoolField(TEXT("success"), true);
	if (Data.IsValid())
	{
		Result->SetObjectField(TEXT("data"), Data);
	}
	return Result;
}
