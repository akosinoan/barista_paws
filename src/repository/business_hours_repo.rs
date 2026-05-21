use sqlx::PgPool;

use crate::models::business_hours::{BusinessHours, UpdateBusinessHoursRequest};

pub async fn get(pool: &PgPool) -> Result<BusinessHours, sqlx::Error> {
    sqlx::query_as::<_, BusinessHours>(
        r#"SELECT open_time, close_time, slot_minutes, updated_at
           FROM business_hours WHERE id = 1"#,
    )
    .fetch_one(pool)
    .await
}

pub async fn update(
    pool: &PgPool,
    payload: &UpdateBusinessHoursRequest,
) -> Result<BusinessHours, sqlx::Error> {
    sqlx::query_as::<_, BusinessHours>(
        r#"UPDATE business_hours
           SET open_time = $1, close_time = $2, slot_minutes = $3, updated_at = NOW()
           WHERE id = 1
           RETURNING open_time, close_time, slot_minutes, updated_at"#,
    )
    .bind(payload.open_time)
    .bind(payload.close_time)
    .bind(payload.slot_minutes)
    .fetch_one(pool)
    .await
}
