use axum::{
    routing::{delete, get, post},
    Router,
};

use crate::{handlers::timeslot_handlers, AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/timeslots", get(timeslot_handlers::list_available_slots))
        .route("/api/timeslots/block", post(timeslot_handlers::block_slot))
        .route("/api/timeslots/blocked", get(timeslot_handlers::list_blocked))
        .route("/api/timeslots/blocked/{id}", delete(timeslot_handlers::unblock))
}
