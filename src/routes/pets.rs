use axum::{
    routing::{delete, get, post, put},
    Router,
};

use crate::{handlers::{pet_handlers, upload_handlers}, AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/users/{owner_id}/pets", post(pet_handlers::create_pet))
        .route("/api/users/{owner_id}/pets", get(pet_handlers::get_pets_by_owner))
        .route("/api/pets/{pet_id}", get(pet_handlers::get_pet))
        .route("/api/pets/{pet_id}", put(pet_handlers::update_pet))
        .route("/api/pets/{pet_id}", delete(pet_handlers::delete_pet))
        .route("/api/pets/{pet_id}/photo", post(upload_handlers::upload_pet_photo))
}
