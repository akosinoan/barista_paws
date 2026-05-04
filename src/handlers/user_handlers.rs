use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use uuid::Uuid;

use crate::{
    auth::extractor::AuthUser,
    models::{
        api_response::ApiResponse,
        user::{AdminResponse, ChangePasswordRequest, ClientResponse, CreateAdminRequest, CreateClientRequest, UpdateUserRequest, UserResponse},
    },
    repository::user_repo,
    AppState,
};

/// Auth required. Client can only change their own password (current_password required).
/// Admin can change any user's password; current_password only required when changing their own.
pub async fn change_password(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Json(payload): Json<ChangePasswordRequest>,
) -> impl IntoResponse {
    let is_self = claims.sub == user_id;
    let is_admin = claims.role == "admin";

    if !is_admin && !is_self {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Access denied: you can only change your own password",
                "data": null
            })),
        );
    }

    // Verify current password when changing own account (both clients and admins)
    if is_self {
        let current = match &payload.current_password {
            Some(p) => p.clone(),
            None => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "current_password is required",
                        "data": null
                    })),
                );
            }
        };

        let user = match user_repo::get_user_by_id(&state.db_pool, &user_id).await {
            Ok(u) => u,
            Err(_) => {
                return (
                    StatusCode::NOT_FOUND,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "User not found",
                        "data": null
                    })),
                );
            }
        };

        if !bcrypt::verify(&current, &user.hashed_password).unwrap_or(false) {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Current password is incorrect",
                    "data": null
                })),
            );
        }
    }

    let hashed = match bcrypt::hash(&payload.new_password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to hash password",
                    "data": null
                })),
            );
        }
    };

    match user_repo::update_password(&state.db_pool, &user_id, &hashed).await {
        Ok(()) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Password updated successfully",
                "data": null
            })),
        ),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to update password",
                "data": null
            })),
        ),
    }
}

/// Public: anyone can register as a client (no auth required).
pub async fn create_client(
    State(state): State<AppState>,
    Json(payload): Json<CreateClientRequest>,
) -> impl IntoResponse {
    let hashed_password = match bcrypt::hash(&payload.password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to hash password",
                    "data": null
                })),
            );
        }
    };

    match user_repo::create_client(&state.db_pool, &payload, &hashed_password).await {
        Ok(user) => {
            let role = user_repo::get_user_role(&state.db_pool, &user.id)
                .await
                .unwrap_or_else(|_| "client".to_string());
            let client = user_repo::get_client_details(&state.db_pool, &user.id).await.ok();

            let user_resp = UserResponse {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone_number: user.phone_number,
                address: user.address,
                avatar_url: user.avatar_url,
                role,
                created_at: user.created_at,
            };

            let client_resp = ClientResponse {
                vip_card_number: client.and_then(|c| c.vip_card_number),
                user: user_resp,
            };

            (
                StatusCode::CREATED,
                Json(serde_json::to_value(ApiResponse {
                    success: true,
                    message: "Client created successfully".to_string(),
                    data: Some(client_resp),
                }).unwrap_or_default()),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to create client: {}", e),
                "data": null
            })),
        ),
    }
}

/// Auth required. Admin only: create a new client user from the admin panel.
pub async fn create_client_as_admin(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<CreateClientRequest>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Access denied: admin only",
                "data": null
            })),
        );
    }

    let hashed_password = match bcrypt::hash(&payload.password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to hash password",
                    "data": null
                })),
            );
        }
    };

    match user_repo::create_client(&state.db_pool, &payload, &hashed_password).await {
        Ok(user) => {
            let client = user_repo::get_client_details(&state.db_pool, &user.id).await.ok();

            let user_resp = UserResponse {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone_number: user.phone_number,
                address: user.address,
                avatar_url: user.avatar_url,
                role: "client".to_string(),
                created_at: user.created_at,
            };

            let client_resp = ClientResponse {
                vip_card_number: client.and_then(|c| c.vip_card_number),
                user: user_resp,
            };

            (
                StatusCode::CREATED,
                Json(serde_json::to_value(ApiResponse {
                    success: true,
                    message: "Client created successfully".to_string(),
                    data: Some(client_resp),
                }).unwrap_or_default()),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to create client: {}", e),
                "data": null
            })),
        ),
    }
}

/// Auth required. Admin only: create a new admin user.
pub async fn create_admin(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<CreateAdminRequest>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Access denied: admin only",
                "data": null
            })),
        );
    }

    let hashed_password = match bcrypt::hash(&payload.password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to hash password",
                    "data": null
                })),
            );
        }
    };

    match user_repo::create_admin(&state.db_pool, &payload, &hashed_password).await {
        Ok(user) => {
            let admin = user_repo::get_admin_details(&state.db_pool, &user.id).await.ok();
            let access_level = admin.map(|a| a.access_level).unwrap_or(payload.access_level);

            let user_resp = UserResponse {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone_number: user.phone_number,
                address: user.address,
                avatar_url: user.avatar_url,
                role: "admin".to_string(),
                created_at: user.created_at,
            };

            let admin_resp = AdminResponse {
                access_level,
                user: user_resp,
            };

            (
                StatusCode::CREATED,
                Json(serde_json::to_value(ApiResponse {
                    success: true,
                    message: "Admin created successfully".to_string(),
                    data: Some(admin_resp),
                }).unwrap_or_default()),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to create admin: {}", e),
                "data": null
            })),
        ),
    }
}

/// Auth required. Client can only view their own profile. Admin can view any user.
pub async fn get_user(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> impl IntoResponse {
    if claims.role != "admin" && claims.sub != user_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Access denied: you can only view your own profile",
                "data": null
            })),
        );
    }

    match user_repo::get_user_by_id(&state.db_pool, &user_id).await {
        Ok(user) => {
            let role = user_repo::get_user_role(&state.db_pool, &user.id)
                .await
                .unwrap_or_else(|_| "unknown".to_string());

            (
                StatusCode::OK,
                Json(serde_json::to_value(ApiResponse {
                    success: true,
                    message: "User found".to_string(),
                    data: Some(UserResponse {
                        id: user.id,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        phone_number: user.phone_number,
                        address: user.address,
                        avatar_url: user.avatar_url,
                        role,
                        created_at: user.created_at,
                    }),
                }).unwrap_or_default()),
            )
        }
        Err(_) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "User not found",
                "data": null
            })),
        ),
    }
}

/// Auth required. Admin only: list all users.
pub async fn get_all_users(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Access denied: admin only",
                "data": null
            })),
        );
    }

    match user_repo::get_all_users(&state.db_pool).await {
        Ok(users) => {
            let mut user_responses = Vec::new();
            for user in users {
                let role = user_repo::get_user_role(&state.db_pool, &user.id)
                    .await
                    .unwrap_or_else(|_| "unknown".to_string());
                user_responses.push(UserResponse {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    phone_number: user.phone_number,
                    address: user.address,
                    avatar_url: user.avatar_url,
                    role,
                    created_at: user.created_at,
                });
            }

            (
                StatusCode::OK,
                Json(serde_json::to_value(ApiResponse {
                    success: true,
                    message: "Users retrieved".to_string(),
                    data: Some(user_responses),
                }).unwrap_or_default()),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get users: {}", e),
                "data": null
            })),
        ),
    }
}

/// Auth required. Client can only update their own profile. Admin can update any.
pub async fn update_user(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Json(payload): Json<UpdateUserRequest>,
) -> impl IntoResponse {
    if claims.role != "admin" && claims.sub != user_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Access denied: you can only edit your own profile",
                "data": null
            })),
        );
    }

    match user_repo::update_user(&state.db_pool, &user_id, &payload).await {
        Ok(user) => {
            let role = user_repo::get_user_role(&state.db_pool, &user.id)
                .await
                .unwrap_or_else(|_| "unknown".to_string());

            (
                StatusCode::OK,
                Json(serde_json::to_value(ApiResponse {
                    success: true,
                    message: "User updated".to_string(),
                    data: Some(UserResponse {
                        id: user.id,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        phone_number: user.phone_number,
                        address: user.address,
                        avatar_url: user.avatar_url,
                        role,
                        created_at: user.created_at,
                    }),
                }).unwrap_or_default()),
            )
        }
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to update user",
                "data": null
            })),
        ),
    }
}

/// Auth required. Client can only delete themselves. Admin can delete any.
pub async fn delete_user(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> impl IntoResponse {
    if claims.role != "admin" && claims.sub != user_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Access denied: you can only delete your own account",
                "data": null
            })),
        );
    }

    match user_repo::delete_user(&state.db_pool, &user_id).await {
        Ok(()) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "User deleted",
                "data": null
            })),
        ),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to delete user",
                "data": null
            })),
        ),
    }
}

/// Auth required. Returns the currently authenticated user's profile.
pub async fn get_me(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
) -> impl IntoResponse {
    match user_repo::get_user_by_id(&state.db_pool, &claims.sub).await {
        Ok(user) => {
            let role = user_repo::get_user_role(&state.db_pool, &user.id)
                .await
                .unwrap_or_else(|_| "unknown".to_string());

            (
                StatusCode::OK,
                Json(serde_json::to_value(ApiResponse {
                    success: true,
                    message: "Current user".to_string(),
                    data: Some(UserResponse {
                        id: user.id,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        phone_number: user.phone_number,
                        address: user.address,
                        avatar_url: user.avatar_url,
                        role,
                        created_at: user.created_at,
                    }),
                }).unwrap_or_default()),
            )
        }
        Err(_) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "User not found",
                "data": null
            })),
        ),
    }
}
