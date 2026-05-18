use axum::{
    routing::{get, post},
    Router,
};

use crate::{handlers::waiver_handlers, AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/waivers/active", get(waiver_handlers::get_active_waiver))
        .route(
            "/api/waivers/templates",
            get(waiver_handlers::list_templates).post(waiver_handlers::create_template),
        )
        .route(
            "/api/waivers/templates/{id}/activate",
            post(waiver_handlers::activate_template),
        )
        .route(
            "/api/appointments/{id}/waiver",
            get(waiver_handlers::get_signed_for_appointment),
        )
        .route("/api/admin/audit-logs", get(waiver_handlers::list_audit_logs))
}
