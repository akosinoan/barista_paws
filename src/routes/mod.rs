use axum::Router;

use crate::AppState;

pub mod appointments;
pub mod auth;
pub mod pets;
pub mod timeslots;
pub mod users;
pub mod waivers;

pub fn router() -> Router<AppState> {
    Router::new()
        .merge(auth::router())
        .merge(users::router())
        .merge(pets::router())
        .merge(appointments::router())
        .merge(timeslots::router())
        .merge(waivers::router())
}
