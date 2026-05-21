use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use uuid::Uuid;

use crate::{
    auth::extractor::AuthUser,
    models::api_response::ApiResponse,
    models::waiver::CreateWaiverTemplateRequest,
    repository::{appointment_repo, audit_repo, waiver_repo},
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

/// Public-ish: any authenticated user fetches the currently active waiver.
pub async fn get_active_waiver(
    AuthUser(_claims): AuthUser,
    State(state): State<AppState>,
) -> impl IntoResponse {
    match waiver_repo::get_active(&state.db_pool).await {
        Ok(Some(t)) => ok(StatusCode::OK, "Active waiver", t),
        Ok(None) => error(StatusCode::NOT_FOUND, "No active waiver template configured"),
        Err(e) => {
            tracing::error!(error = ?e, "failed to load active waiver");
            error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to load waiver: {}", e),
            )
        }
    }
}

/// Admin-only: list all templates.
pub async fn list_templates(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return error(StatusCode::FORBIDDEN, "Access denied: admin only");
    }
    match waiver_repo::list_all(&state.db_pool).await {
        Ok(list) => ok(StatusCode::OK, "Templates", list),
        Err(e) => {
            tracing::error!(error = ?e, "failed to list waiver templates");
            error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to list templates: {}", e),
            )
        }
    }
}

/// Admin-only: create a new template (starts inactive).
pub async fn create_template(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<CreateWaiverTemplateRequest>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return error(StatusCode::FORBIDDEN, "Access denied: admin only");
    }
    if payload.title.trim().is_empty() || payload.body.trim().is_empty() {
        return error(StatusCode::BAD_REQUEST, "Title and body are required");
    }
    match waiver_repo::create_template(
        &state.db_pool,
        payload.title.trim(),
        &payload.body,
        &claims.sub,
    )
    .await
    {
        Ok(t) => {
            let _ = audit_repo::insert(
                &state.db_pool,
                &crate::models::audit::AuditLogInsert {
                    actor_user_id: Some(claims.sub),
                    actor_role: Some(claims.role.clone()),
                    action: "waiver.template.created".into(),
                    target_type: Some("waiver_template".into()),
                    target_id: Some(t.id.to_string()),
                    metadata: serde_json::json!({ "version": t.version }),
                    ip_address: None,
                    user_agent: None,
                },
            )
            .await;
            ok(StatusCode::CREATED, "Template created", t)
        }
        Err(e) => {
            tracing::error!(actor = %claims.sub, error = ?e, "failed to create waiver template");
            error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create template: {}", e),
            )
        }
    }
}

/// Admin-only: activate a template (deactivates the previous active one).
pub async fn activate_template(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return error(StatusCode::FORBIDDEN, "Access denied: admin only");
    }
    match waiver_repo::activate(&state.db_pool, &id).await {
        Ok(t) => {
            let _ = audit_repo::insert(
                &state.db_pool,
                &crate::models::audit::AuditLogInsert {
                    actor_user_id: Some(claims.sub),
                    actor_role: Some(claims.role.clone()),
                    action: "waiver.template.activated".into(),
                    target_type: Some("waiver_template".into()),
                    target_id: Some(t.id.to_string()),
                    metadata: serde_json::json!({ "version": t.version }),
                    ip_address: None,
                    user_agent: None,
                },
            )
            .await;
            ok(StatusCode::OK, "Template activated", t)
        }
        Err(e) => {
            tracing::error!(template_id = %id, actor = %claims.sub, error = ?e, "failed to activate waiver template");
            error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to activate template: {}", e),
            )
        }
    }
}

/// Owner-of-appointment or admin: fetch the signed waiver for an appointment.
pub async fn get_signed_for_appointment(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(appointment_id): Path<Uuid>,
) -> impl IntoResponse {
    let appt = match appointment_repo::get_by_id(&state.db_pool, &appointment_id).await {
        Ok(a) => a,
        Err(_) => return error(StatusCode::NOT_FOUND, "Appointment not found"),
    };
    if claims.role != "admin" && claims.sub != appt.appointment.client_id {
        return error(StatusCode::FORBIDDEN, "Access denied");
    }
    match waiver_repo::get_signed_by_appointment(&state.db_pool, &appointment_id).await {
        Ok(sw) => ok(StatusCode::OK, "Signed waiver", sw),
        Err(_) => error(StatusCode::NOT_FOUND, "Signed waiver not found"),
    }
}

/// Admin-only: list recent audit logs.
pub async fn list_audit_logs(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
) -> impl IntoResponse {
    if claims.role != "admin" {
        return error(StatusCode::FORBIDDEN, "Access denied: admin only");
    }
    match audit_repo::list_recent(&state.db_pool, 200).await {
        Ok(list) => ok(StatusCode::OK, "Audit logs", list),
        Err(e) => {
            tracing::error!(error = ?e, "failed to list audit logs");
            error(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to list audit logs: {}", e),
            )
        }
    }
}
