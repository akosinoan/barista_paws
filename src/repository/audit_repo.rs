use sqlx::{PgPool, Postgres, Transaction};

use crate::models::audit::{AuditLog, AuditLogInsert};

pub async fn insert_in_tx(
    tx: &mut Transaction<'_, Postgres>,
    log: &AuditLogInsert,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO audit_logs
            (actor_user_id, actor_role, action, target_type, target_id, metadata, ip_address, user_agent)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        "#,
    )
    .bind(&log.actor_user_id)
    .bind(&log.actor_role)
    .bind(&log.action)
    .bind(&log.target_type)
    .bind(&log.target_id)
    .bind(&log.metadata)
    .bind(&log.ip_address)
    .bind(&log.user_agent)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn insert(pool: &PgPool, log: &AuditLogInsert) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    insert_in_tx(&mut tx, log).await?;
    tx.commit().await?;
    Ok(())
}

pub async fn list_recent(pool: &PgPool, limit: i64) -> Result<Vec<AuditLog>, sqlx::Error> {
    sqlx::query_as::<_, AuditLog>(
        r#"SELECT id, actor_user_id, actor_role, action, target_type, target_id,
                  metadata, ip_address, user_agent, created_at
           FROM audit_logs ORDER BY created_at DESC LIMIT $1"#,
    )
    .bind(limit)
    .fetch_all(pool)
    .await
}
