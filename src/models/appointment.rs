use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::pet::Pet;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Appointment {
    pub id: Uuid,
    pub client_id: Uuid,
    pub appointment_date: NaiveDate,
    pub time_slot: NaiveTime,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct AppointmentWithPets {
    #[serde(flatten)]
    pub appointment: Appointment,
    pub pets: Vec<Pet>,
    pub waiver_signed: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateAppointmentRequest {
    pub appointment_date: NaiveDate,
    pub time_slot: NaiveTime,
    pub pet_ids: Vec<Uuid>,
    pub notes: Option<String>,
    #[serde(default)]
    pub force: bool,
    /// Required when client books for themselves. When an admin books on behalf of a client,
    /// this MUST be omitted — the client signs later via POST /api/appointments/{id}/waiver.
    pub waiver: Option<crate::models::waiver::WaiverSignaturePayload>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAppointmentRequest {
    pub appointment_date: Option<NaiveDate>,
    pub time_slot: Option<NaiveTime>,
    pub pet_ids: Option<Vec<Uuid>>,
    pub notes: Option<String>,
    pub status: Option<String>,
}
