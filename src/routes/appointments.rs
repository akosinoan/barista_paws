use axum::{
    routing::{delete, get, post, put},
    Router,
};

use crate::{handlers::appointment_handlers, AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/api/users/{user_id}/appointments",
            post(appointment_handlers::create_appointment),
        )
        .route(
            "/api/users/{user_id}/appointments",
            get(appointment_handlers::list_client_appointments),
        )
        .route(
            "/api/appointments",
            get(appointment_handlers::list_all_appointments),
        )
        .route(
            "/api/appointments/{id}",
            get(appointment_handlers::get_appointment),
        )
        .route(
            "/api/appointments/{id}",
            put(appointment_handlers::update_appointment),
        )
        .route(
            "/api/appointments/{id}",
            delete(appointment_handlers::delete_appointment),
        )
        .route(
            "/api/appointments/{id}/approve",
            post(appointment_handlers::approve_appointment),
        )
        .route(
            "/api/appointments/{id}/reject",
            post(appointment_handlers::reject_appointment),
        )
        .route(
            "/api/appointments/{id}/complete",
            post(appointment_handlers::complete_appointment),
        )
        .route(
            "/api/appointments/{id}/cancel",
            post(appointment_handlers::cancel_appointment),
        )
        .route(
            "/api/appointments/{id}/sign-waiver",
            post(appointment_handlers::sign_appointment_waiver),
        )
        .route(
            "/api/appointments/{id}/history",
            get(appointment_handlers::get_appointment_history),
        )
}
