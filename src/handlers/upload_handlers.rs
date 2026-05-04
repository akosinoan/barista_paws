use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use uuid::Uuid;
use tokio::fs;

use crate::{
    auth::extractor::AuthUser,
    repository::{pet_repo, user_repo},
    AppState,
};

fn ext_from_content_type(ct: &str) -> Option<&'static str> {
    match ct {
        "image/jpeg" => Some("jpg"),
        "image/png" => Some("png"),
        "image/gif" => Some("gif"),
        "image/webp" => Some("webp"),
        _ => None,
    }
}

/// Auth required. User can upload their own avatar; admin can upload for any user.
pub async fn upload_user_avatar(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    if claims.role != "admin" && claims.sub != user_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Access denied",
                "data": null
            })),
        );
    }

    while let Ok(Some(field)) = multipart.next_field().await {
        let content_type = field.content_type().unwrap_or("").to_string();
        let ext = match ext_from_content_type(&content_type) {
            Some(e) => e,
            None => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Only JPEG, PNG, GIF, and WebP images are allowed",
                        "data": null
                    })),
                );
            }
        };

        let data = match field.bytes().await {
            Ok(d) => d,
            Err(_) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to read uploaded file",
                        "data": null
                    })),
                );
            }
        };

        let dir = "uploads/avatars";
        fs::create_dir_all(dir).await.ok();
        let filename = format!("{}.{}", Uuid::new_v4(), ext);
        let path = format!("{}/{}", dir, filename);

        if fs::write(&path, &data).await.is_err() {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to save file",
                    "data": null
                })),
            );
        }

        let url = format!("/uploads/avatars/{}", filename);

        if user_repo::update_avatar_url(&state.db_pool, &user_id, &url).await.is_err() {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to save avatar URL",
                    "data": null
                })),
            );
        }

        return (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Avatar uploaded",
                "data": { "url": url }
            })),
        );
    }

    (
        StatusCode::BAD_REQUEST,
        Json(serde_json::json!({
            "success": false,
            "message": "No file provided",
            "data": null
        })),
    )
}

/// Auth required. Owner can upload a photo for their pet; admin can upload for any pet.
pub async fn upload_pet_photo(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(pet_id): Path<Uuid>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let pet = match pet_repo::get_pet_by_id(&state.db_pool, &pet_id).await {
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

    if claims.role != "admin" && claims.sub != pet.owner_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Access denied",
                "data": null
            })),
        );
    }

    while let Ok(Some(field)) = multipart.next_field().await {
        let content_type = field.content_type().unwrap_or("").to_string();
        let ext = match ext_from_content_type(&content_type) {
            Some(e) => e,
            None => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Only JPEG, PNG, GIF, and WebP images are allowed",
                        "data": null
                    })),
                );
            }
        };

        let data = match field.bytes().await {
            Ok(d) => d,
            Err(_) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to read uploaded file",
                        "data": null
                    })),
                );
            }
        };

        let dir = "uploads/pets";
        fs::create_dir_all(dir).await.ok();
        let filename = format!("{}.{}", Uuid::new_v4(), ext);
        let path = format!("{}/{}", dir, filename);

        if fs::write(&path, &data).await.is_err() {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to save file",
                    "data": null
                })),
            );
        }

        let url = format!("/uploads/pets/{}", filename);

        if pet_repo::update_photo_url(&state.db_pool, &pet_id, &url).await.is_err() {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to save photo URL",
                    "data": null
                })),
            );
        }

        return (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Photo uploaded",
                "data": { "url": url }
            })),
        );
    }

    (
        StatusCode::BAD_REQUEST,
        Json(serde_json::json!({
            "success": false,
            "message": "No file provided",
            "data": null
        })),
    )
}
