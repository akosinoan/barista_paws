use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use uuid::Uuid;

use crate::{
    appointments::config,
    auth::extractor::AuthUser,
    models::api_response::ApiResponse,
    models::appointment::{CreateAppointmentRequest, UpdateAppointmentRequest},
    repository::{appointment_repo, pet_repo, timeslot_repo},
    AppState,
};

const ALLOWED_STATUSES: &[&str] = &[
    "pending",
    "approved",
    "rejected",
    "cancelled",
    "completed",
];

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

/// Client creates an appointment for themselves; admin can create for any user.
pub async fn create_appointment(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(owner_id): Path<Uuid>,
    Json(payload): Json<CreateAppointmentRequest>,
) -> impl IntoResponse {
    if claims.role != "admin" && claims.sub != owner_id {
        return error(
            StatusCode::FORBIDDEN,
            "Access denied: you can only book appointments for your own account",
        );
    }

    if payload.pet_ids.is_empty() {
        return error(StatusCode::BAD_REQUEST, "At least one pet must be selected");
    }

    let is_admin = claims.role == "admin";
    let admin_override = is_admin && payload.force;

    if !admin_override && !config::is_valid_slot(payload.time_slot) {
        return error(
            StatusCode::BAD_REQUEST,
            "Invalid timeslot: must align with business hours",
        );
    }

    for pet_id in &payload.pet_ids {
        match pet_repo::get_pet_by_id(&state.db_pool, pet_id).await {
            Ok(pet) => {
                if pet.owner_id != owner_id {
                    return error(
                        StatusCode::BAD_REQUEST,
                        "One or more selected pets do not belong to this user",
                    );
                }
            }
            Err(_) => {
                return error(StatusCode::BAD_REQUEST, "One or more selected pets not found");
            }
        }
    }

    if !admin_override {
        match timeslot_repo::is_slot_blocked(
            &state.db_pool,
            payload.appointment_date,
            payload.time_slot,
        )
        .await
        {
            Ok(true) => {
                return error(
                    StatusCode::BAD_REQUEST,
                    "Selected timeslot is unavailable",
                );
            }
            Ok(false) => {}
            Err(e) => {
                return error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to check timeslot availability: {}", e),
                );
            }
        }
    }

    match appointment_repo::create_appointment(&state.db_pool, &owner_id, &payload).await {
        Ok(appt) => ok(StatusCode::CREATED, "Appointment requested", appt),
        Err(e) => error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to create appointment: {}", e),
        ),
    }
}

/// Client lists own appointments; admin can list any user's appointments.
pub async fn list_client_appointments(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(owner_id): Path<Uuid>,
) -> impl IntoResponse {
    if claims.role != "admin" && claims.sub != owner_id {
        return error(
            StatusCode::FORBIDDEN,
            "Access denied: you can only view your own appointments",
        );
    }

    match appointment_repo::list_by_client(&state.db_pool, &owner_id).await {
        Ok(list) => ok(StatusCode::OK, "Appointments retrieved", list),
        Err(e) => error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to list appointments: {}", e),
        ),
    }
}

/// Admin-only: list all appointments.
pub async fn list_all_appointments(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return error(
            StatusCode::FORBIDDEN,
            "Access denied: admin only",
        );
    }

    match appointment_repo::list_all(&state.db_pool).await {
        Ok(list) => ok(StatusCode::OK, "Appointments retrieved", list),
        Err(e) => error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to list appointments: {}", e),
        ),
    }
}

pub async fn get_appointment(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match appointment_repo::get_by_id(&state.db_pool, &id).await {
        Ok(appt) => {
            if claims.role != "admin" && claims.sub != appt.appointment.client_id {
                return error(
                    StatusCode::FORBIDDEN,
                    "Access denied: this appointment does not belong to you",
                );
            }
            ok(StatusCode::OK, "Appointment found", appt)
        }
        Err(_) => error(StatusCode::NOT_FOUND, "Appointment not found"),
    }
}

pub async fn update_appointment(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(mut payload): Json<UpdateAppointmentRequest>,
) -> impl IntoResponse {
    let existing = match appointment_repo::get_by_id(&state.db_pool, &id).await {
        Ok(a) => a,
        Err(_) => return error(StatusCode::NOT_FOUND, "Appointment not found"),
    };

    let is_admin = claims.role == "admin";
    if !is_admin && claims.sub != existing.appointment.client_id {
        return error(
            StatusCode::FORBIDDEN,
            "Access denied: this appointment does not belong to you",
        );
    }

    if !is_admin {
        payload.status = None;
    } else if let Some(status) = &payload.status
        && !ALLOWED_STATUSES.contains(&status.as_str())
    {
        return error(StatusCode::BAD_REQUEST, "Invalid status value");
    }

    if let Some(slot) = payload.time_slot
        && !config::is_valid_slot(slot)
    {
        return error(
            StatusCode::BAD_REQUEST,
            "Invalid timeslot: must align with business hours",
        );
    }

    if let Some(pet_ids) = &payload.pet_ids {
        if pet_ids.is_empty() {
            return error(StatusCode::BAD_REQUEST, "At least one pet must be selected");
        }
        for pet_id in pet_ids {
            match pet_repo::get_pet_by_id(&state.db_pool, pet_id).await {
                Ok(pet) => {
                    if pet.owner_id != existing.appointment.client_id {
                        return error(
                            StatusCode::BAD_REQUEST,
                            "One or more selected pets do not belong to this client",
                        );
                    }
                }
                Err(_) => {
                    return error(
                        StatusCode::BAD_REQUEST,
                        "One or more selected pets not found",
                    );
                }
            }
        }
    }

    if let (Some(date), Some(slot)) = (payload.appointment_date, payload.time_slot)
        && let Ok(true) = timeslot_repo::is_slot_blocked(&state.db_pool, date, slot).await
    {
        return error(
            StatusCode::BAD_REQUEST,
            "Selected timeslot is unavailable",
        );
    }

    match appointment_repo::update_appointment(&state.db_pool, &id, &payload).await {
        Ok(appt) => ok(StatusCode::OK, "Appointment updated", appt),
        Err(e) => error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to update appointment: {}", e),
        ),
    }
}

pub async fn delete_appointment(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let existing = match appointment_repo::get_by_id(&state.db_pool, &id).await {
        Ok(a) => a,
        Err(_) => return error(StatusCode::NOT_FOUND, "Appointment not found"),
    };

    if claims.role != "admin" && claims.sub != existing.appointment.client_id {
        return error(
            StatusCode::FORBIDDEN,
            "Access denied: this appointment does not belong to you",
        );
    }

    match appointment_repo::delete(&state.db_pool, &id).await {
        Ok(()) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Appointment deleted",
                "data": null,
            })),
        ),
        Err(e) => error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to delete appointment: {}", e),
        ),
    }
}

pub async fn approve_appointment(
    auth: AuthUser,
    state: State<AppState>,
    path: Path<Uuid>,
) -> impl IntoResponse {
    admin_set_status(auth, state, path, "approved", "Appointment approved").await
}

pub async fn reject_appointment(
    auth: AuthUser,
    state: State<AppState>,
    path: Path<Uuid>,
) -> impl IntoResponse {
    admin_set_status(auth, state, path, "rejected", "Appointment rejected").await
}

pub async fn complete_appointment(
    auth: AuthUser,
    state: State<AppState>,
    path: Path<Uuid>,
) -> impl IntoResponse {
    admin_set_status(auth, state, path, "completed", "Appointment completed").await
}

async fn admin_set_status(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    new_status: &str,
    success_message: &str,
) -> (StatusCode, Json<serde_json::Value>) {
    if claims.role != "admin" {
        return error(StatusCode::FORBIDDEN, "Access denied: admin only");
    }

    match appointment_repo::set_status(&state.db_pool, &id, new_status).await {
        Ok(appt) => ok(StatusCode::OK, success_message, appt),
        Err(e) => error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to update status: {}", e),
        ),
    }
}
