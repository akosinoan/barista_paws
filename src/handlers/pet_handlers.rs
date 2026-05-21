use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::extractor::AuthUser,
    models::pet::{CreatePetRequest, UpdatePetRequest},
    repository::pet_repo,
    AppState,
};

#[derive(Debug, Deserialize, Default)]
pub struct IncludeDeletedQuery {
    #[serde(default)]
    pub include_deleted: bool,
}

/// Auth required. Client can only add pets for themselves. Admin can add for any user.
pub async fn create_pet(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(owner_id): Path<Uuid>,
    Json(payload): Json<CreatePetRequest>,
) -> impl IntoResponse {
    if claims.role != "admin" && claims.sub != owner_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Access denied: you can only add pets to your own account",
                "data": null
            })),
        );
    }

    match pet_repo::create_pet(&state.db_pool, &owner_id, &payload).await {
        Ok(pet) => (
            StatusCode::CREATED,
            Json(serde_json::to_value(crate::models::api_response::ApiResponse {
                success: true,
                message: "Pet created successfully".to_string(),
                data: Some(pet),
            }).unwrap_or_default()),
        ),
        Err(e) => {
            tracing::error!(owner_id = %owner_id, error = ?e, "failed to create pet");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": format!("Failed to create pet: {}", e),
                    "data": null
                })),
            )
        }
    }
}

/// Auth required. Client can only view their own pets. Admin can view any user's pets.
pub async fn get_pets_by_owner(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(owner_id): Path<Uuid>,
    Query(q): Query<IncludeDeletedQuery>,
) -> impl IntoResponse {
    if claims.role != "admin" && claims.sub != owner_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Access denied: you can only view your own pets",
                "data": null
            })),
        );
    }

    let include_deleted = q.include_deleted && claims.role == "admin";

    match pet_repo::get_pets_by_owner(&state.db_pool, &owner_id, include_deleted).await {
        Ok(pets) => (
            StatusCode::OK,
            Json(serde_json::to_value(crate::models::api_response::ApiResponse {
                success: true,
                message: "Pets retrieved".to_string(),
                data: Some(pets),
            }).unwrap_or_default()),
        ),
        Err(e) => {
            tracing::error!(owner_id = %owner_id, error = ?e, "failed to get pets by owner");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": format!("Failed to get pets: {}", e),
                    "data": null
                })),
            )
        }
    }
}

/// Auth required. Client can only view their own pet. Admin can view any.
pub async fn get_pet(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(pet_id): Path<Uuid>,
) -> impl IntoResponse {
    match pet_repo::get_pet_by_id(&state.db_pool, &pet_id).await {
        Ok(pet) => {
            if claims.role != "admin" && claims.sub != pet.owner_id {
                return (
                    StatusCode::FORBIDDEN,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Access denied: this pet does not belong to you",
                        "data": null
                    })),
                );
            }

            (
                StatusCode::OK,
                Json(serde_json::to_value(crate::models::api_response::ApiResponse {
                    success: true,
                    message: "Pet found".to_string(),
                    data: Some(pet),
                }).unwrap_or_default()),
            )
        }
        Err(_) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Pet not found",
                "data": null
            })),
        ),
    }
}

/// Auth required. Client can only update their own pet. Admin can update any.
pub async fn update_pet(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(pet_id): Path<Uuid>,
    Json(payload): Json<UpdatePetRequest>,
) -> impl IntoResponse {
    let existing = match pet_repo::get_pet_by_id(&state.db_pool, &pet_id).await {
        Ok(p) => p,
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Pet not found",
                    "data": null
                })),
            );
        }
    };

    if claims.role != "admin" && claims.sub != existing.owner_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Access denied: this pet does not belong to you",
                "data": null
            })),
        );
    }

    match pet_repo::update_pet(&state.db_pool, &pet_id, &payload).await {
        Ok(pet) => (
            StatusCode::OK,
            Json(serde_json::to_value(crate::models::api_response::ApiResponse {
                success: true,
                message: "Pet updated".to_string(),
                data: Some(pet),
            }).unwrap_or_default()),
        ),
        Err(e) => {
            tracing::error!(pet_id = %pet_id, error = ?e, "failed to update pet");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to update pet",
                    "data": null
                })),
            )
        }
    }
}

/// Auth required. Client can only delete their own pet. Admin can delete any.
pub async fn delete_pet(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(pet_id): Path<Uuid>,
) -> impl IntoResponse {
    let existing = match pet_repo::get_pet_by_id(&state.db_pool, &pet_id).await {
        Ok(p) => p,
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Pet not found",
                    "data": null
                })),
            );
        }
    };

    if claims.role != "admin" && claims.sub != existing.owner_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Access denied: this pet does not belong to you",
                "data": null
            })),
        );
    }

    match pet_repo::delete_pet(&state.db_pool, &pet_id).await {
        Ok(_) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Pet deleted",
                "data": null
            })),
        ),
        Err(e) => {
            tracing::error!(pet_id = %pet_id, error = ?e, "failed to delete pet");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to delete pet",
                    "data": null
                })),
            )
        }
    }
}
