use axum::{
    routing::{get, put},
    Router,
};

use crate::{handlers::business_hours_handlers, AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/api/business-hours",
            get(business_hours_handlers::get_business_hours),
        )
        .route(
            "/api/business-hours",
            put(business_hours_handlers::update_business_hours),
        )
}
