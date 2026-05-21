use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::IntoResponse,
};
use chrono::Timelike;

use crate::{
    auth::extractor::AuthUser,
    models::api_response::ApiResponse,
    models::business_hours::UpdateBusinessHoursRequest,
    repository::business_hours_repo,
    AppState,
};

fn error(status: StatusCode, message: impl Into<String>) -> (StatusCode, Json<serde_json::Value>) {
    (
        status,
        Json(serde_json::json!({
            "success": false,
            "message": message.into(),
            "data": null,
        })),
    )
}

fn ok<T: serde::Serialize>(
    status: StatusCode,
    message: &str,
    data: T,
) -> (StatusCode, Json<serde_json::Value>) {
    (
        status,
        Json(
            serde_json::to_value(ApiResponse {
                success: true,
                message: message.to_string(),
                data: Some(data),
            })
            .unwrap_or_default(),
        ),
    )
}

/// Any authenticated user: read the current business hours config.
pub async fn get_business_hours(
    AuthUser(_claims): AuthUser,
    State(state): State<AppState>,
) -> impl IntoResponse {
    match business_hours_repo::get(&state.db_pool).await {
        Ok(bh) => ok(StatusCode::OK, "Business hours retrieved", bh),
        Err(e) => {
            tracing::error!(error = ?e, "failed to load business hours");
            error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to load business hours: {}", e),
            )
        }
    }
}

/// Admin-only: update business hours config.
pub async fn update_business_hours(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<UpdateBusinessHoursRequest>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return error(StatusCode::FORBIDDEN, "Access denied: admin only");
    }

    if payload.open_time >= payload.close_time {
        return error(
            StatusCode::BAD_REQUEST,
            "open_time must be earlier than close_time",
        );
    }
    if payload.slot_minutes < 5 || payload.slot_minutes > 240 {
        return error(
            StatusCode::BAD_REQUEST,
            "slot_minutes must be between 5 and 240",
        );
    }

    let open_min =
        payload.open_time.hour() as i32 * 60 + payload.open_time.minute() as i32;
    let close_min =
        payload.close_time.hour() as i32 * 60 + payload.close_time.minute() as i32;
    if (close_min - open_min) % payload.slot_minutes != 0 {
        return error(
            StatusCode::BAD_REQUEST,
            "slot_minutes must evenly divide the open/close window",
        );
    }

    match business_hours_repo::update(&state.db_pool, &payload).await {
        Ok(bh) => ok(StatusCode::OK, "Business hours updated", bh),
        Err(e) => {
            tracing::error!(error = ?e, "failed to update business hours");
            error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to update business hours: {}", e),
            )
        }
    }
}
