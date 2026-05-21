use chrono::{NaiveDate, NaiveTime};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::timeslot::{BlockTimeslotRequest, BlockedTimeslot};

pub async fn block_slot(
    pool: &PgPool,
    payload: &BlockTimeslotRequest,
) -> Result<BlockedTimeslot, sqlx::Error> {
    let id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO blocked_timeslots (id, blocked_date, time_slot, reason)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(&id)
    .bind(&payload.blocked_date)
    .bind(&payload.time_slot)
    .bind(&payload.reason)
    .execute(pool)
    .await?;

    get_by_id(pool, &id).await
}

pub async fn get_by_id(pool: &PgPool, id: &Uuid) -> Result<BlockedTimeslot, sqlx::Error> {
    sqlx::query_as::<_, BlockedTimeslot>(
        r#"SELECT id, blocked_date, time_slot, reason, created_at
           FROM blocked_timeslots WHERE id = $1"#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
}

pub async fn unblock(pool: &PgPool, id: &Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(r#"DELETE FROM blocked_timeslots WHERE id = $1"#)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn bulk_block_slots(
    pool: &PgPool,
    slots: &[BlockTimeslotRequest],
) -> Result<Vec<BlockedTimeslot>, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let mut ids: Vec<Uuid> = Vec::with_capacity(slots.len());

    for payload in slots {
        let id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO blocked_timeslots (id, blocked_date, time_slot, reason)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(&id)
        .bind(&payload.blocked_date)
        .bind(&payload.time_slot)
        .bind(&payload.reason)
        .execute(&mut *tx)
        .await?;
        ids.push(id);
    }

    let inserted = sqlx::query_as::<_, BlockedTimeslot>(
        r#"SELECT id, blocked_date, time_slot, reason, created_at
           FROM blocked_timeslots
           WHERE id = ANY($1)
           ORDER BY blocked_date ASC, time_slot ASC NULLS FIRST"#,
    )
    .bind(&ids)
    .fetch_all(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(inserted)
}

pub async fn bulk_unblock(pool: &PgPool, ids: &[Uuid]) -> Result<u64, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let res = sqlx::query(r#"DELETE FROM blocked_timeslots WHERE id = ANY($1)"#)
        .bind(ids)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(res.rows_affected())
}

pub async fn list_blocked(
    pool: &PgPool,
    date: Option<NaiveDate>,
) -> Result<Vec<BlockedTimeslot>, sqlx::Error> {
    match date {
        Some(d) => {
            sqlx::query_as::<_, BlockedTimeslot>(
                r#"SELECT id, blocked_date, time_slot, reason, created_at
                   FROM blocked_timeslots WHERE blocked_date = $1
                   ORDER BY time_slot ASC NULLS FIRST"#,
            )
            .bind(d)
            .fetch_all(pool)
            .await
        }
        None => {
            sqlx::query_as::<_, BlockedTimeslot>(
                r#"SELECT id, blocked_date, time_slot, reason, created_at
                   FROM blocked_timeslots
                   ORDER BY blocked_date DESC, time_slot ASC NULLS FIRST"#,
            )
            .fetch_all(pool)
            .await
        }
    }
}

pub async fn list_blocked_slots_for_date(
    pool: &PgPool,
    date: NaiveDate,
) -> Result<Vec<BlockedTimeslot>, sqlx::Error> {
    list_blocked(pool, Some(date)).await
}

pub async fn is_slot_blocked(
    pool: &PgPool,
    date: NaiveDate,
    slot: NaiveTime,
) -> Result<bool, sqlx::Error> {
    let row: (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*) FROM blocked_timeslots
           WHERE blocked_date = $1 AND (time_slot IS NULL OR time_slot = $2)"#,
    )
    .bind(date)
    .bind(slot)
    .fetch_one(pool)
    .await?;

    Ok(row.0 > 0)
}
