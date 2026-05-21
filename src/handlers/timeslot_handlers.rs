use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use chrono::NaiveDate;
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    appointments::config,
    auth::extractor::AuthUser,
    models::api_response::ApiResponse,
    models::timeslot::{
        BlockTimeslotRequest, BulkBlockTimeslotRequest, BulkUnblockRequest, TimeslotAvailability,
    },
    repository::timeslot_repo,
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct DateQuery {
    pub date: NaiveDate,
}

#[derive(Debug, Deserialize)]
pub struct OptionalDateQuery {
    pub date: Option<NaiveDate>,
}

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

/// Any authenticated user: list all slots for a date with availability.
pub async fn list_available_slots(
    AuthUser(_claims): AuthUser,
    State(state): State<AppState>,
    Query(q): Query<DateQuery>,
) -> impl IntoResponse {
    let blocked = match timeslot_repo::list_blocked_slots_for_date(&state.db_pool, q.date).await {
        Ok(b) => b,
        Err(e) => {
            return error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to load blocked slots: {}", e),
            );
        }
    };

    let whole_day_blocked = blocked.iter().any(|b| b.time_slot.is_none());
    let blocked_slots: Vec<_> = blocked.iter().filter_map(|b| b.time_slot).collect();

    let slots: Vec<TimeslotAvailability> = config::all_slots()
        .into_iter()
        .map(|t| TimeslotAvailability {
            time_slot: t,
            available: !whole_day_blocked && !blocked_slots.contains(&t),
        })
        .collect();

    ok(StatusCode::OK, "Timeslots retrieved", slots)
}

/// Admin-only: block a slot (or whole day if time_slot is null).
pub async fn block_slot(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<BlockTimeslotRequest>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return error(StatusCode::FORBIDDEN, "Access denied: admin only");
    }

    if let Some(slot) = payload.time_slot
        && !config::is_valid_slot(slot)
    {
        return error(
            StatusCode::BAD_REQUEST,
            "Invalid timeslot: must align with business hours",
        );
    }

    match timeslot_repo::block_slot(&state.db_pool, &payload).await {
        Ok(blocked) => ok(StatusCode::CREATED, "Timeslot blocked", blocked),
        Err(e) => error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to block timeslot: {}", e),
        ),
    }
}

/// Admin-only: list all blocked slots (optionally filtered by date).
pub async fn list_blocked(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Query(q): Query<OptionalDateQuery>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return error(StatusCode::FORBIDDEN, "Access denied: admin only");
    }

    match timeslot_repo::list_blocked(&state.db_pool, q.date).await {
        Ok(list) => ok(StatusCode::OK, "Blocked slots retrieved", list),
        Err(e) => error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to list blocked slots: {}", e),
        ),
    }
}

/// Admin-only: block many slots in a single transaction.
pub async fn bulk_block(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<BulkBlockTimeslotRequest>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return error(StatusCode::FORBIDDEN, "Access denied: admin only");
    }

    if payload.slots.is_empty() {
        return error(StatusCode::BAD_REQUEST, "No slots provided");
    }

    for s in &payload.slots {
        if let Some(slot) = s.time_slot
            && !config::is_valid_slot(slot)
        {
            return error(
                StatusCode::BAD_REQUEST,
                "Invalid timeslot: must align with business hours",
            );
        }
    }

    match timeslot_repo::bulk_block_slots(&state.db_pool, &payload.slots).await {
        Ok(blocked) => ok(StatusCode::CREATED, "Timeslots blocked", blocked),
        Err(e) => error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to block timeslots: {}", e),
        ),
    }
}

/// Admin-only: unblock many slots in a single transaction.
pub async fn bulk_unblock(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<BulkUnblockRequest>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return error(StatusCode::FORBIDDEN, "Access denied: admin only");
    }

    if payload.ids.is_empty() {
        return error(StatusCode::BAD_REQUEST, "No ids provided");
    }

    match timeslot_repo::bulk_unblock(&state.db_pool, &payload.ids).await {
        Ok(count) => ok(
            StatusCode::OK,
            "Timeslots unblocked",
            serde_json::json!({ "deleted": count }),
        ),
        Err(e) => error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to unblock timeslots: {}", e),
        ),
    }
}

/// Admin-only: remove a block.
pub async fn unblock(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return error(StatusCode::FORBIDDEN, "Access denied: admin only");
    }

    match timeslot_repo::unblock(&state.db_pool, &id).await {
        Ok(()) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Timeslot unblocked",
                "data": null,
            })),
        ),
        Err(e) => error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to unblock: {}", e),
        ),
    }
}
