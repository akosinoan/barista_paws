use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use chrono::Utc;
use uuid::Uuid;

use crate::{
    appointments::config,
    auth::extractor::AuthUser,
    models::api_response::ApiResponse,
    models::appointment::{CreateAppointmentRequest, UpdateAppointmentRequest},
    models::audit::AuditLogInsert,
    models::waiver::SignedWaiverInsert,
    repository::{appointment_repo, audit_repo, pet_repo, timeslot_repo, waiver_repo},
    util::client_meta::ClientMeta,
    util::signing::{payload_hash, SignedWaiverInputs},
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
/// Requires a signed waiver payload — appointment + signed_waiver are inserted in one transaction.
pub async fn create_appointment(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    meta: ClientMeta,
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
    let admin_on_behalf = is_admin && claims.sub != owner_id;

    // Waiver rules:
    // - Client booking for self: waiver REQUIRED.
    // - Admin booking on behalf of client: waiver MUST be omitted (client signs later).
    match (&payload.waiver, admin_on_behalf) {
        (Some(_), true) => {
            return error(
                StatusCode::BAD_REQUEST,
                "Admins cannot sign the waiver on behalf of a client; omit the waiver field",
            );
        }
        (None, false) => {
            return error(StatusCode::BAD_REQUEST, "Waiver signature is required");
        }
        _ => {}
    }

    if let Some(w) = &payload.waiver {
        if !w.consent_checked {
            return error(StatusCode::BAD_REQUEST, "Consent checkbox must be checked");
        }
        if w.signer_full_name.trim().len() < 2 {
            return error(StatusCode::BAD_REQUEST, "Full legal name is required");
        }
        if w.client_timezone.trim().is_empty() {
            return error(StatusCode::BAD_REQUEST, "Client timezone is required");
        }
    }

    let admin_override = is_admin && payload.force;

    if !admin_override && !config::is_valid_slot(payload.time_slot) {
        return error(
            StatusCode::BAD_REQUEST,
            "Invalid timeslot: must align with business hours",
        );
    }

    let mut pet_names: Vec<String> = Vec::with_capacity(payload.pet_ids.len());
    for pet_id in &payload.pet_ids {
        match pet_repo::get_pet_by_id(&state.db_pool, pet_id).await {
            Ok(pet) => {
                if pet.owner_id != owner_id {
                    return error(
                        StatusCode::BAD_REQUEST,
                        "One or more selected pets do not belong to this user",
                    );
                }
                pet_names.push(format!("{}:{}", pet.id, pet.name));
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
                return error(StatusCode::BAD_REQUEST, "Selected timeslot is unavailable");
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

    let mut tx = match state.db_pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            return error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to begin transaction: {}", e),
            );
        }
    };

    let appointment_id = match appointment_repo::insert_in_tx(&mut tx, &owner_id, &payload).await {
        Ok(id) => id,
        Err(e) => {
            return error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create appointment: {}", e),
            );
        }
    };

    // If client booked for themselves, insert the signed waiver atomically.
    if let Some(w) = &payload.waiver {
        if let Err(resp) = insert_signed_waiver(
            &mut tx,
            &claims,
            &owner_id,
            appointment_id,
            payload.appointment_date,
            payload.time_slot,
            &payload.pet_ids,
            &pet_names,
            payload.notes.as_deref(),
            &meta,
            w,
        )
        .await
        {
            return resp;
        }
    } else {
        // Admin booked on behalf — log the booking action (no waiver yet).
        let audit = AuditLogInsert {
            actor_user_id: Some(claims.sub),
            actor_role: Some(claims.role.clone()),
            action: "appointment.created_by_admin".into(),
            target_type: Some("appointment".into()),
            target_id: Some(appointment_id.to_string()),
            metadata: serde_json::json!({
                "owner_id": owner_id,
                "pet_ids": payload.pet_ids,
                "waiver_pending": true,
            }),
            ip_address: Some(meta.ip.to_string()),
            user_agent: Some(meta.user_agent.clone()),
        };
        if let Err(e) = audit_repo::insert_in_tx(&mut tx, &audit).await {
            return error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to write audit log: {}", e),
            );
        }
    }

    if let Err(e) = tx.commit().await {
        return error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to commit transaction: {}", e),
        );
    }

    match appointment_repo::get_by_id(&state.db_pool, &appointment_id).await {
        Ok(appt) => ok(StatusCode::CREATED, "Appointment requested", appt),
        Err(e) => error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to load appointment: {}", e),
        ),
    }
}

#[allow(clippy::too_many_arguments)]
async fn insert_signed_waiver(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    claims: &crate::auth::jwt::Claims,
    owner_id: &Uuid,
    appointment_id: Uuid,
    appointment_date: chrono::NaiveDate,
    time_slot: chrono::NaiveTime,
    pet_ids: &[Uuid],
    pet_names: &[String],
    notes: Option<&str>,
    meta: &ClientMeta,
    w: &crate::models::waiver::WaiverSignaturePayload,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let template = match waiver_repo::get_active_for_update(tx).await {
        Ok(Some(t)) => t,
        Ok(None) => {
            return Err(error(
                StatusCode::CONFLICT,
                "No active waiver configured; please contact support",
            ));
        }
        Err(e) => {
            return Err(error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to load active waiver: {}", e),
            ));
        }
    };

    if template.id != w.template_id
        || template.version != w.template_version
        || template.body_sha256 != w.waiver_body_sha256
    {
        return Err((
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "success": false,
                "message": "Waiver version changed; please re-read and re-sign.",
                "data": { "code": "WAIVER_VERSION_STALE" },
            })),
        ));
    }

    let signed_at = Utc::now();
    let inputs = SignedWaiverInputs {
        appointment_id,
        user_id: *owner_id,
        template_id: template.id,
        template_version: template.version,
        body_sha256: &template.body_sha256,
        full_name: w.signer_full_name.trim(),
        consent: true,
        pet_ids,
        pet_names,
        appointment_date,
        time_slot,
        signed_at,
        ip: meta.ip,
        user_agent: &meta.user_agent,
        timezone: &w.client_timezone,
        notes,
    };
    let payload_sha = payload_hash(&inputs);

    let signed_insert = SignedWaiverInsert {
        appointment_id,
        user_id: *owner_id,
        template_id: template.id,
        template_version: template.version,
        waiver_body: template.body.clone(),
        waiver_body_sha256: template.body_sha256.clone(),
        signer_full_name: w.signer_full_name.trim().to_string(),
        consent_checked: true,
        pet_ids: pet_ids.to_vec(),
        service_notes: notes.map(|s| s.to_string()),
        client_ip: meta.ip.to_string(),
        user_agent: meta.user_agent.clone(),
        client_timezone: w.client_timezone.clone(),
        payload_sha256: payload_sha.clone(),
        appointment_date,
        time_slot,
        pet_names_snapshot: pet_names.to_vec(),
    };

    if let Err(e) = waiver_repo::insert_signed_in_tx(tx, &signed_insert).await {
        return Err(error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to record signed waiver: {}", e),
        ));
    }

    let audit = AuditLogInsert {
        actor_user_id: Some(claims.sub),
        actor_role: Some(claims.role.clone()),
        action: "waiver.signed".into(),
        target_type: Some("appointment".into()),
        target_id: Some(appointment_id.to_string()),
        metadata: serde_json::json!({
            "template_id": template.id,
            "template_version": template.version,
            "payload_sha256": payload_sha,
            "pet_ids": pet_ids,
        }),
        ip_address: Some(meta.ip.to_string()),
        user_agent: Some(meta.user_agent.clone()),
    };
    if let Err(e) = audit_repo::insert_in_tx(tx, &audit).await {
        return Err(error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to write audit log: {}", e),
        ));
    }

    Ok(())
}

/// Owning client signs the waiver for an appointment that was created without one
/// (e.g. an admin booked it on their behalf).
pub async fn sign_appointment_waiver(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    meta: ClientMeta,
    Path(id): Path<Uuid>,
    Json(payload): Json<crate::models::waiver::WaiverSignaturePayload>,
) -> impl IntoResponse {
    let appt = match appointment_repo::get_by_id(&state.db_pool, &id).await {
        Ok(a) => a,
        Err(_) => return error(StatusCode::NOT_FOUND, "Appointment not found"),
    };

    // Only the owning client may sign — not even admins.
    if claims.sub != appt.appointment.client_id {
        return error(
            StatusCode::FORBIDDEN,
            "Only the appointment owner can sign the waiver",
        );
    }

    if appt.waiver_signed {
        return error(StatusCode::CONFLICT, "Waiver already signed for this appointment");
    }

    if !payload.consent_checked {
        return error(StatusCode::BAD_REQUEST, "Consent checkbox must be checked");
    }
    if payload.signer_full_name.trim().len() < 2 {
        return error(StatusCode::BAD_REQUEST, "Full legal name is required");
    }
    if payload.client_timezone.trim().is_empty() {
        return error(StatusCode::BAD_REQUEST, "Client timezone is required");
    }

    let pet_ids: Vec<Uuid> = appt.pets.iter().map(|p| p.id).collect();
    let pet_names: Vec<String> = appt
        .pets
        .iter()
        .map(|p| format!("{}:{}", p.id, p.name))
        .collect();

    let mut tx = match state.db_pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            return error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to begin transaction: {}", e),
            );
        }
    };

    if let Err(resp) = insert_signed_waiver(
        &mut tx,
        &claims,
        &appt.appointment.client_id,
        appt.appointment.id,
        appt.appointment.appointment_date,
        appt.appointment.time_slot,
        &pet_ids,
        &pet_names,
        appt.appointment.notes.as_deref(),
        &meta,
        &payload,
    )
    .await
    {
        return resp;
    }

    if let Err(e) = tx.commit().await {
        return error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to commit transaction: {}", e),
        );
    }

    match appointment_repo::get_by_id(&state.db_pool, &id).await {
        Ok(a) => ok(StatusCode::OK, "Waiver signed", a),
        Err(e) => error(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to reload appointment: {}", e),
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
        return error(StatusCode::FORBIDDEN, "Access denied: admin only");
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
