use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::IntoResponse,
};

use crate::{
    auth::jwt::create_token,
    models::{
        api_response::ApiResponse,
        user::{LoginRequest, LoginResponse, UserResponse},
    },
    repository::user_repo,
    AppState,
};

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let user = match user_repo::get_user_by_email(&state.db_pool, &payload.email).await {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Invalid email or password",
                    "data": null
                })),
            );
        }
    };

    let valid = bcrypt::verify(&payload.password, &user.hashed_password).unwrap_or(false);
    if !valid {
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "success": false,
                "message": "Invalid email or password",
                "data": null
            })),
        );
    }

    let role = user_repo::get_user_role(&state.db_pool, &user.id)
        .await
        .unwrap_or_else(|_| "client".to_string());

    let token = match create_token(user.id, &role) {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to generate token",
                    "data": null
                })),
            );
        }
    };

    let login_resp = LoginResponse {
        token,
        user: UserResponse {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            phone_number: user.phone_number,
            address: user.address,
            avatar_url: user.avatar_image_id.map(|img| format!("/api/users/{}/avatar?v={}", user.id, img)),
            role,
            created_at: user.created_at,
        },
    };

    (
        StatusCode::OK,
        Json(serde_json::to_value(ApiResponse {
            success: true,
            message: "Login successful".to_string(),
            data: Some(login_resp),
        }).unwrap_or_default()),
    )
}
