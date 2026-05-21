use std::sync::Arc;

use axum::{
    body::Body,
    extract::{Multipart, Path, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use uuid::Uuid;

use crate::{
    auth::extractor::AuthUser,
    repository::{image_repo, pet_repo, user_repo},
    state::CachedImage,
    AppState,
};

const MAX_IMAGE_BYTES: usize = 5 * 1024 * 1024;

fn is_allowed_content_type(ct: &str) -> bool {
    matches!(ct, "image/jpeg" | "image/png" | "image/gif" | "image/webp")
}

fn json_err(status: StatusCode, message: &str) -> Response {
    (
        status,
        Json(serde_json::json!({
            "success": false,
            "message": message,
            "data": null
        })),
    )
        .into_response()
}

/// Auth required. User can upload their own avatar; admin can upload for any user.
pub async fn upload_user_avatar(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Response {
    if claims.role != "admin" && claims.sub != user_id {
        return json_err(StatusCode::FORBIDDEN, "Access denied");
    }

    if let Ok(Some(field)) = multipart.next_field().await {
        let content_type = field.content_type().unwrap_or("").to_string();
        if !is_allowed_content_type(&content_type) {
            return json_err(
                StatusCode::BAD_REQUEST,
                "Only JPEG, PNG, GIF, and WebP images are allowed",
            );
        }

        let data = match field.bytes().await {
            Ok(d) => d,
            Err(_) => return json_err(StatusCode::BAD_REQUEST, "Failed to read uploaded file"),
        };
        if data.len() > MAX_IMAGE_BYTES {
            return json_err(StatusCode::PAYLOAD_TOO_LARGE, "Image exceeds 5 MiB limit");
        }

        let image_id = match image_repo::insert_image(&state.db_pool, &data, &content_type).await {
            Ok(id) => id,
            Err(_) => return json_err(StatusCode::INTERNAL_SERVER_ERROR, "Failed to store image"),
        };

        let prev = match user_repo::update_avatar_image_id(&state.db_pool, &user_id, &image_id).await {
            Ok(prev) => prev,
            Err(_) => return json_err(StatusCode::INTERNAL_SERVER_ERROR, "Failed to save avatar"),
        };
        if let Some(prev_id) = prev {
            let _ = image_repo::delete_image(&state.db_pool, &prev_id).await;
            state.image_cache.invalidate(&prev_id).await;
        }

        let url = format!("/api/users/{}/avatar?v={}", user_id, image_id);
        return (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Avatar uploaded",
                "data": { "url": url }
            })),
        )
            .into_response();
    }

    json_err(StatusCode::BAD_REQUEST, "No file provided")
}

/// Auth required. Owner can upload a photo for their pet; admin can upload for any pet.
pub async fn upload_pet_photo(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(pet_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Response {
    let pet = match pet_repo::get_pet_by_id(&state.db_pool, &pet_id).await {
        Ok(p) => p,
        Err(_) => return json_err(StatusCode::NOT_FOUND, "Pet not found"),
    };
    if claims.role != "admin" && claims.sub != pet.owner_id {
        return json_err(StatusCode::FORBIDDEN, "Access denied");
    }

    if let Ok(Some(field)) = multipart.next_field().await {
        let content_type = field.content_type().unwrap_or("").to_string();
        if !is_allowed_content_type(&content_type) {
            return json_err(
                StatusCode::BAD_REQUEST,
                "Only JPEG, PNG, GIF, and WebP images are allowed",
            );
        }

        let data = match field.bytes().await {
            Ok(d) => d,
            Err(_) => return json_err(StatusCode::BAD_REQUEST, "Failed to read uploaded file"),
        };
        if data.len() > MAX_IMAGE_BYTES {
            return json_err(StatusCode::PAYLOAD_TOO_LARGE, "Image exceeds 5 MiB limit");
        }

        let image_id = match image_repo::insert_image(&state.db_pool, &data, &content_type).await {
            Ok(id) => id,
            Err(_) => return json_err(StatusCode::INTERNAL_SERVER_ERROR, "Failed to store image"),
        };

        let prev = match pet_repo::update_photo_image_id(&state.db_pool, &pet_id, &image_id).await {
            Ok(prev) => prev,
            Err(_) => return json_err(StatusCode::INTERNAL_SERVER_ERROR, "Failed to save photo"),
        };
        if let Some(prev_id) = prev {
            let _ = image_repo::delete_image(&state.db_pool, &prev_id).await;
            state.image_cache.invalidate(&prev_id).await;
        }

        let url = format!("/api/pets/{}/photo?v={}", pet_id, image_id);
        return (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Photo uploaded",
                "data": { "url": url }
            })),
        )
            .into_response();
    }

    json_err(StatusCode::BAD_REQUEST, "No file provided")
}

async fn serve_image(state: &AppState, image_id: Uuid, headers: &HeaderMap) -> Response {
    let etag = format!("\"{}\"", image_id);
    if let Some(if_none_match) = headers.get(header::IF_NONE_MATCH).and_then(|v| v.to_str().ok()) {
        if if_none_match == etag {
            return Response::builder()
                .status(StatusCode::NOT_MODIFIED)
                .header(header::ETAG, &etag)
                .header(header::CACHE_CONTROL, "private, max-age=86400, must-revalidate")
                .body(Body::empty())
                .unwrap();
        }
    }

    let cached = if let Some(c) = state.image_cache.get(&image_id).await {
        c
    } else {
        let (bytes, content_type) = match image_repo::get_image(&state.db_pool, &image_id).await {
            Ok(v) => v,
            Err(_) => return json_err(StatusCode::NOT_FOUND, "Image not found"),
        };
        let cached = CachedImage {
            bytes: Arc::new(bytes),
            content_type: Arc::from(content_type),
        };
        state.image_cache.insert(image_id, cached.clone()).await;
        cached
    };

    let content_type = HeaderValue::from_str(&cached.content_type)
        .unwrap_or_else(|_| HeaderValue::from_static("application/octet-stream"));

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, content_type)
        .header(header::CONTENT_LENGTH, cached.bytes.len())
        .header(header::ETAG, etag)
        .header(header::CACHE_CONTROL, "private, max-age=86400, must-revalidate")
        .body(Body::from((*cached.bytes).clone()))
        .unwrap()
}

pub async fn get_user_avatar(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    headers: HeaderMap,
) -> Response {
    let image_id = match user_repo::get_avatar_image_id(&state.db_pool, &user_id).await {
        Ok(Some(id)) => id,
        Ok(None) => return json_err(StatusCode::NOT_FOUND, "No avatar"),
        Err(_) => return json_err(StatusCode::NOT_FOUND, "User not found"),
    };
    serve_image(&state, image_id, &headers).await
}

pub async fn get_pet_photo(
    State(state): State<AppState>,
    Path(pet_id): Path<Uuid>,
    headers: HeaderMap,
) -> Response {
    let image_id = match pet_repo::get_photo_image_id(&state.db_pool, &pet_id).await {
        Ok(Some(id)) => id,
        Ok(None) => return json_err(StatusCode::NOT_FOUND, "No photo"),
        Err(_) => return json_err(StatusCode::NOT_FOUND, "Pet not found"),
    };
    serve_image(&state, image_id, &headers).await
}
