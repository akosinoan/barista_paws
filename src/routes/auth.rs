use axum::{
    routing::{get, post},
    Router,
};

use crate::{handlers::{auth_handlers, user_handlers}, AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/auth/login", post(auth_handlers::login))
        .route("/api/auth/me", get(user_handlers::get_me))
}
