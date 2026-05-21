use axum::{
    routing::{delete, get, post, put},
    Router,
};

use crate::{handlers::{upload_handlers, user_handlers}, AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/clients", post(user_handlers::create_client))
        .route("/api/admin/clients", post(user_handlers::create_client_as_admin))
        .route("/api/admins", post(user_handlers::create_admin))
        .route("/api/users", get(user_handlers::get_all_users))
        .route("/api/users/{user_id}", get(user_handlers::get_user))
        .route("/api/users/{user_id}", put(user_handlers::update_user))
        .route("/api/users/{user_id}", delete(user_handlers::delete_user))
        .route("/api/users/{user_id}/password", put(user_handlers::change_password))
        .route("/api/users/{user_id}/avatar", post(upload_handlers::upload_user_avatar))
        .route("/api/users/{user_id}/avatar", get(upload_handlers::get_user_avatar))
}
