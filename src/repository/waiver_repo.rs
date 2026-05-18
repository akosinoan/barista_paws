use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::models::waiver::{SignedWaiver, SignedWaiverInsert, WaiverTemplate};
use crate::util::signing::sha256_hex;

pub async fn get_active(pool: &PgPool) -> Result<Option<WaiverTemplate>, sqlx::Error> {
    sqlx::query_as::<_, WaiverTemplate>(
        r#"SELECT id, version, title, body, body_sha256, is_active, activated_at, created_by, created_at
           FROM waiver_templates WHERE is_active = TRUE LIMIT 1"#,
    )
    .fetch_optional(pool)
    .await
}

pub async fn get_active_for_update(
    tx: &mut Transaction<'_, Postgres>,
) -> Result<Option<WaiverTemplate>, sqlx::Error> {
    sqlx::query_as::<_, WaiverTemplate>(
        r#"SELECT id, version, title, body, body_sha256, is_active, activated_at, created_by, created_at
           FROM waiver_templates WHERE is_active = TRUE FOR UPDATE"#,
    )
    .fetch_optional(&mut **tx)
    .await
}

pub async fn list_all(pool: &PgPool) -> Result<Vec<WaiverTemplate>, sqlx::Error> {
    sqlx::query_as::<_, WaiverTemplate>(
        r#"SELECT id, version, title, body, body_sha256, is_active, activated_at, created_by, created_at
           FROM waiver_templates ORDER BY version DESC"#,
    )
    .fetch_all(pool)
    .await
}

pub async fn get_by_id(pool: &PgPool, id: &Uuid) -> Result<WaiverTemplate, sqlx::Error> {
    sqlx::query_as::<_, WaiverTemplate>(
        r#"SELECT id, version, title, body, body_sha256, is_active, activated_at, created_by, created_at
           FROM waiver_templates WHERE id = $1"#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
}

pub async fn create_template(
    pool: &PgPool,
    title: &str,
    body: &str,
    created_by: &Uuid,
) -> Result<WaiverTemplate, sqlx::Error> {
    let next_version: i32 = sqlx::query_scalar(
        r#"SELECT COALESCE(MAX(version), 0) + 1 FROM waiver_templates"#,
    )
    .fetch_one(pool)
    .await?;

    let body_sha = sha256_hex(body.as_bytes());

    let id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO waiver_templates (version, title, body, body_sha256, created_by)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
        "#,
    )
    .bind(next_version)
    .bind(title)
    .bind(body)
    .bind(&body_sha)
    .bind(created_by)
    .fetch_one(pool)
    .await?;

    get_by_id(pool, &id).await
}

pub async fn activate(pool: &PgPool, id: &Uuid) -> Result<WaiverTemplate, sqlx::Error> {
    let mut tx = pool.begin().await?;

    sqlx::query(
        r#"UPDATE waiver_templates SET is_active = FALSE WHERE is_active = TRUE"#,
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"UPDATE waiver_templates SET is_active = TRUE, activated_at = NOW() WHERE id = $1"#,
    )
    .bind(id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    get_by_id(pool, id).await
}

pub async fn insert_signed_in_tx(
    tx: &mut Transaction<'_, Postgres>,
    s: &SignedWaiverInsert,
) -> Result<Uuid, sqlx::Error> {
    let id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO signed_waivers (
            appointment_id, user_id, template_id, template_version,
            waiver_body, waiver_body_sha256,
            signer_full_name, consent_checked, pet_ids, service_notes,
            client_ip, user_agent, client_timezone, payload_sha256,
            appointment_date, time_slot, pet_names_snapshot
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        RETURNING id
        "#,
    )
    .bind(&s.appointment_id)
    .bind(&s.user_id)
    .bind(&s.template_id)
    .bind(s.template_version)
    .bind(&s.waiver_body)
    .bind(&s.waiver_body_sha256)
    .bind(&s.signer_full_name)
    .bind(s.consent_checked)
    .bind(&s.pet_ids)
    .bind(&s.service_notes)
    .bind(&s.client_ip)
    .bind(&s.user_agent)
    .bind(&s.client_timezone)
    .bind(&s.payload_sha256)
    .bind(&s.appointment_date)
    .bind(&s.time_slot)
    .bind(&s.pet_names_snapshot)
    .fetch_one(&mut **tx)
    .await?;

    Ok(id)
}

pub async fn get_signed_by_appointment(
    pool: &PgPool,
    appointment_id: &Uuid,
) -> Result<SignedWaiver, sqlx::Error> {
    sqlx::query_as::<_, SignedWaiver>(
        r#"SELECT id, appointment_id, user_id, template_id, template_version,
                  waiver_body, waiver_body_sha256,
                  signer_full_name, consent_checked, pet_ids, service_notes,
                  signed_at, client_ip, user_agent, client_timezone,
                  payload_sha256, created_at,
                  appointment_date, time_slot, pet_names_snapshot
           FROM signed_waivers WHERE appointment_id = $1"#,
    )
    .bind(appointment_id)
    .fetch_one(pool)
    .await
}
