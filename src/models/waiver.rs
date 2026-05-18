use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct WaiverTemplate {
    pub id: Uuid,
    pub version: i32,
    pub title: String,
    pub body: String,
    pub body_sha256: String,
    pub is_active: bool,
    pub activated_at: Option<DateTime<Utc>>,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateWaiverTemplateRequest {
    pub title: String,
    pub body: String,
}

#[derive(Debug, Deserialize)]
pub struct WaiverSignaturePayload {
    pub template_id: Uuid,
    pub template_version: i32,
    pub waiver_body_sha256: String,
    pub signer_full_name: String,
    pub consent_checked: bool,
    pub client_timezone: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct SignedWaiver {
    pub id: Uuid,
    pub appointment_id: Uuid,
    pub user_id: Uuid,
    pub template_id: Uuid,
    pub template_version: i32,
    pub waiver_body: String,
    pub waiver_body_sha256: String,
    pub signer_full_name: String,
    pub consent_checked: bool,
    pub pet_ids: Vec<Uuid>,
    pub service_notes: Option<String>,
    pub signed_at: DateTime<Utc>,
    pub client_ip: String,
    pub user_agent: String,
    pub client_timezone: String,
    pub payload_sha256: String,
    pub created_at: DateTime<Utc>,
    pub appointment_date: Option<NaiveDate>,
    pub time_slot: Option<NaiveTime>,
    pub pet_names_snapshot: Option<Vec<String>>,
}

#[derive(Debug)]
pub struct SignedWaiverInsert {
    pub appointment_id: Uuid,
    pub user_id: Uuid,
    pub template_id: Uuid,
    pub template_version: i32,
    pub waiver_body: String,
    pub waiver_body_sha256: String,
    pub signer_full_name: String,
    pub consent_checked: bool,
    pub pet_ids: Vec<Uuid>,
    pub service_notes: Option<String>,
    pub client_ip: String,
    pub user_agent: String,
    pub client_timezone: String,
    pub payload_sha256: String,
    pub appointment_date: NaiveDate,
    pub time_slot: NaiveTime,
    pub pet_names_snapshot: Vec<String>,
}
