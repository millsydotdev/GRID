// Copyright 2025 GRID. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"

/**
 * Centralized error codes for GRID Editor Bridge.
 * Organized by category for consistency across all command handlers.
 */
namespace GRID
{
namespace ErrorCodes
{
	// ============================================================================
	// Parameter Validation Errors (1000-1099)
	// ============================================================================
	constexpr const TCHAR* PARAM_MISSING = TEXT("PARAM_MISSING");
	constexpr const TCHAR* PARAM_INVALID = TEXT("PARAM_INVALID");
	constexpr const TCHAR* PARAM_EMPTY = TEXT("PARAM_EMPTY");
	constexpr const TCHAR* PARAM_TYPE_MISMATCH = TEXT("PARAM_TYPE_MISMATCH");

	// ============================================================================
	// Blueprint Errors (2000-2099)
	// ============================================================================
	constexpr const TCHAR* BLUEPRINT_NOT_FOUND = TEXT("BLUEPRINT_NOT_FOUND");
	constexpr const TCHAR* BLUEPRINT_LOAD_FAILED = TEXT("BLUEPRINT_LOAD_FAILED");
	constexpr const TCHAR* BLUEPRINT_COMPILATION_FAILED = TEXT("BLUEPRINT_COMPILATION_FAILED");
	constexpr const TCHAR* BLUEPRINT_CREATE_FAILED = TEXT("BLUEPRINT_CREATE_FAILED");
	constexpr const TCHAR* BLUEPRINT_INVALID_PARENT = TEXT("BLUEPRINT_INVALID_PARENT");

	// ============================================================================
	// Variable Errors (2100-2199)
	// ============================================================================
	constexpr const TCHAR* VARIABLE_NOT_FOUND = TEXT("VARIABLE_NOT_FOUND");
	constexpr const TCHAR* VARIABLE_ALREADY_EXISTS = TEXT("VARIABLE_ALREADY_EXISTS");
	constexpr const TCHAR* VARIABLE_CREATE_FAILED = TEXT("VARIABLE_CREATE_FAILED");

	// ============================================================================
	// Component Errors (2200-2299)
	// ============================================================================
	constexpr const TCHAR* COMPONENT_NOT_FOUND = TEXT("COMPONENT_NOT_FOUND");
	constexpr const TCHAR* COMPONENT_TYPE_INVALID = TEXT("COMPONENT_TYPE_INVALID");
	constexpr const TCHAR* COMPONENT_ADD_FAILED = TEXT("COMPONENT_ADD_FAILED");

	// ============================================================================
	// Property Errors (2300-2399)
	// ============================================================================
	constexpr const TCHAR* PROPERTY_NOT_FOUND = TEXT("PROPERTY_NOT_FOUND");
	constexpr const TCHAR* PROPERTY_READ_ONLY = TEXT("PROPERTY_READ_ONLY");
	constexpr const TCHAR* PROPERTY_SET_FAILED = TEXT("PROPERTY_SET_FAILED");

	// ============================================================================
	// Node Errors (2400-2499)
	// ============================================================================
	constexpr const TCHAR* NODE_NOT_FOUND = TEXT("NODE_NOT_FOUND");
	constexpr const TCHAR* NODE_CREATE_FAILED = TEXT("NODE_CREATE_FAILED");
	constexpr const TCHAR* PIN_NOT_FOUND = TEXT("PIN_NOT_FOUND");
	constexpr const TCHAR* PIN_CONNECTION_FAILED = TEXT("PIN_CONNECTION_FAILED");

	// ============================================================================
	// Widget Errors (3000-3099)
	// ============================================================================
	constexpr const TCHAR* WIDGET_NOT_FOUND = TEXT("WIDGET_NOT_FOUND");
	constexpr const TCHAR* WIDGET_CREATE_FAILED = TEXT("WIDGET_CREATE_FAILED");
	constexpr const TCHAR* WIDGET_TYPE_INVALID = TEXT("WIDGET_TYPE_INVALID");

	// ============================================================================
	// Asset Errors (4000-4099)
	// ============================================================================
	constexpr const TCHAR* ASSET_NOT_FOUND = TEXT("ASSET_NOT_FOUND");
	constexpr const TCHAR* ASSET_LOAD_FAILED = TEXT("ASSET_LOAD_FAILED");
	constexpr const TCHAR* ASSET_SAVE_FAILED = TEXT("ASSET_SAVE_FAILED");
	constexpr const TCHAR* ASSET_DELETE_FAILED = TEXT("ASSET_DELETE_FAILED");

	// ============================================================================
	// Actor Errors (5000-5099)
	// ============================================================================
	constexpr const TCHAR* ACTOR_NOT_FOUND = TEXT("ACTOR_NOT_FOUND");
	constexpr const TCHAR* ACTOR_SPAWN_FAILED = TEXT("ACTOR_SPAWN_FAILED");
	constexpr const TCHAR* ACTOR_DELETE_FAILED = TEXT("ACTOR_DELETE_FAILED");

	// ============================================================================
	// Material Errors (6000-6099)
	// ============================================================================
	constexpr const TCHAR* MATERIAL_NOT_FOUND = TEXT("MATERIAL_NOT_FOUND");
	constexpr const TCHAR* MATERIAL_CREATE_FAILED = TEXT("MATERIAL_CREATE_FAILED");
	constexpr const TCHAR* EXPRESSION_NOT_FOUND = TEXT("EXPRESSION_NOT_FOUND");

	// ============================================================================
	// System Errors (9000-9099)
	// ============================================================================
	constexpr const TCHAR* UNKNOWN_COMMAND = TEXT("UNKNOWN_COMMAND");
	constexpr const TCHAR* NOT_IMPLEMENTED = TEXT("NOT_IMPLEMENTED");
	constexpr const TCHAR* INTERNAL_ERROR = TEXT("INTERNAL_ERROR");
	constexpr const TCHAR* TIMEOUT = TEXT("TIMEOUT");
	constexpr const TCHAR* NO_WORLD = TEXT("NO_WORLD");
	constexpr const TCHAR* EDITOR_NOT_AVAILABLE = TEXT("EDITOR_NOT_AVAILABLE");

} // namespace ErrorCodes
} // namespace GRID
