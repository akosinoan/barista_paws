use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct BlockedTimeslot {
    pub id: Uuid,
    pub blocked_date: NaiveDate,
    pub time_slot: Option<NaiveTime>,
    pub reason: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct BlockTimeslotRequest {
    pub blocked_date: NaiveDate,
    /// Null blocks the entire day.
    pub time_slot: Option<NaiveTime>,
    pub reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TimeslotAvailability {
    pub time_slot: NaiveTime,
    pub available: bool,
}
