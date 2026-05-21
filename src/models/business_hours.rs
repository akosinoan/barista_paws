use chrono::{DateTime, NaiveTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct BusinessHours {
    pub open_time: NaiveTime,
    pub close_time: NaiveTime,
    pub slot_minutes: i32,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBusinessHoursRequest {
    pub open_time: NaiveTime,
    pub close_time: NaiveTime,
    pub slot_minutes: i32,
}
