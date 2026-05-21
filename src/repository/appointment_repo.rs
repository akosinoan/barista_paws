use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::models::appointment::{
    Appointment, AppointmentStatusHistoryEntry, AppointmentWithPets, CreateAppointmentRequest,
    UpdateAppointmentRequest,
};
use crate::models::pet::Pet;
use crate::repository::DeleteOutcome;

const APPT_SELECT: &str = "a.id, a.client_id, a.appointment_date, a.time_slot, a.status, a.notes,
                  a.created_at, a.updated_at,
                  a.status_changed_by, a.status_changed_at,
                  CASE WHEN u.id IS NOT NULL THEN u.first_name || ' ' || u.last_name END
                      AS status_changed_by_name,
                  a.deleted_at";

pub async fn insert_in_tx(
    tx: &mut Transaction<'_, Postgres>,
    client_id: &Uuid,
    payload: &CreateAppointmentRequest,
) -> Result<Uuid, sqlx::Error> {
    let appointment_id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO appointments (id, client_id, appointment_date, time_slot, notes)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(&appointment_id)
    .bind(client_id)
    .bind(&payload.appointment_date)
    .bind(&payload.time_slot)
    .bind(&payload.notes)
    .execute(&mut **tx)
    .await?;

    insert_history(tx, &appointment_id, None, "pending", Some(client_id)).await?;

    for pet_id in &payload.pet_ids {
        sqlx::query(
            r#"INSERT INTO appointment_pets (appointment_id, pet_id) VALUES ($1, $2)"#,
        )
        .bind(&appointment_id)
        .bind(pet_id)
        .execute(&mut **tx)
        .await?;
    }

    Ok(appointment_id)
}

pub async fn create_appointment(
    pool: &PgPool,
    client_id: &Uuid,
    payload: &CreateAppointmentRequest,
) -> Result<AppointmentWithPets, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let appointment_id = insert_in_tx(&mut tx, client_id, payload).await?;
    tx.commit().await?;
    get_by_id(pool, &appointment_id).await
}

/// Fetch an appointment, excluding soft-deleted rows.
pub async fn get_by_id(pool: &PgPool, id: &Uuid) -> Result<AppointmentWithPets, sqlx::Error> {
    get_by_id_inner(pool, id, false).await
}

/// Admin-only fetch that ignores the soft-delete flag.
pub async fn get_by_id_any(pool: &PgPool, id: &Uuid) -> Result<AppointmentWithPets, sqlx::Error> {
    get_by_id_inner(pool, id, true).await
}

async fn get_by_id_inner(
    pool: &PgPool,
    id: &Uuid,
    include_deleted: bool,
) -> Result<AppointmentWithPets, sqlx::Error> {
    let filter = if include_deleted { "" } else { " AND a.deleted_at IS NULL" };
    let sql = format!(
        "SELECT {APPT_SELECT}
         FROM appointments a
         LEFT JOIN users u ON u.id = a.status_changed_by
         WHERE a.id = $1{filter}"
    );
    let appointment = sqlx::query_as::<_, Appointment>(&sql)
        .bind(id)
        .fetch_one(pool)
        .await?;

    let pets = fetch_pets_for_appointment(pool, id).await?;
    let waiver_signed = is_waiver_signed(pool, id).await?;

    Ok(AppointmentWithPets { appointment, pets, waiver_signed })
}

pub async fn is_waiver_signed(pool: &PgPool, id: &Uuid) -> Result<bool, sqlx::Error> {
    let exists: Option<bool> = sqlx::query_scalar(
        r#"SELECT EXISTS(SELECT 1 FROM signed_waivers WHERE appointment_id = $1)"#,
    )
    .bind(id)
    .fetch_one(pool)
    .await?;
    Ok(exists.unwrap_or(false))
}

pub async fn list_by_client(
    pool: &PgPool,
    client_id: &Uuid,
    include_deleted: bool,
) -> Result<Vec<AppointmentWithPets>, sqlx::Error> {
    let filter = if include_deleted { "" } else { " AND a.deleted_at IS NULL" };
    let sql = format!(
        "SELECT {APPT_SELECT}
         FROM appointments a
         LEFT JOIN users u ON u.id = a.status_changed_by
         WHERE a.client_id = $1{filter}
         ORDER BY a.appointment_date DESC, a.time_slot DESC"
    );
    let appointments = sqlx::query_as::<_, Appointment>(&sql)
        .bind(client_id)
        .fetch_all(pool)
        .await?;

    attach_pets(pool, appointments).await
}

pub async fn list_all(
    pool: &PgPool,
    include_deleted: bool,
) -> Result<Vec<AppointmentWithPets>, sqlx::Error> {
    let filter = if include_deleted { "" } else { " WHERE a.deleted_at IS NULL" };
    let sql = format!(
        "SELECT {APPT_SELECT}
         FROM appointments a
         LEFT JOIN users u ON u.id = a.status_changed_by{filter}
         ORDER BY a.appointment_date DESC, a.time_slot DESC"
    );
    let appointments = sqlx::query_as::<_, Appointment>(&sql)
        .fetch_all(pool)
        .await?;

    attach_pets(pool, appointments).await
}

pub async fn update_appointment(
    pool: &PgPool,
    id: &Uuid,
    payload: &UpdateAppointmentRequest,
    actor_id: &Uuid,
) -> Result<AppointmentWithPets, sqlx::Error> {
    let mut tx = pool.begin().await?;

    let prev_status: Option<String> =
        sqlx::query_scalar(r#"SELECT status FROM appointments WHERE id = $1"#)
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?;

    sqlx::query(
        r#"
        UPDATE appointments SET
            appointment_date = COALESCE($2, appointment_date),
            time_slot = COALESCE($3, time_slot),
            notes = COALESCE($4, notes),
            status = COALESCE($5, status),
            status_changed_by = CASE WHEN $5 IS NOT NULL THEN $6 ELSE status_changed_by END,
            status_changed_at = CASE WHEN $5 IS NOT NULL THEN now() ELSE status_changed_at END,
            updated_at = now()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(&payload.appointment_date)
    .bind(&payload.time_slot)
    .bind(&payload.notes)
    .bind(&payload.status)
    .bind(actor_id)
    .execute(&mut *tx)
    .await?;

    if let Some(new_status) = &payload.status
        && prev_status.as_deref() != Some(new_status.as_str())
    {
        insert_history(
            &mut tx,
            id,
            prev_status.as_deref(),
            new_status,
            Some(actor_id),
        )
        .await?;
    }

    if let Some(pet_ids) = &payload.pet_ids {
        sqlx::query(r#"DELETE FROM appointment_pets WHERE appointment_id = $1"#)
            .bind(id)
            .execute(&mut *tx)
            .await?;

        for pet_id in pet_ids {
            sqlx::query(
                r#"INSERT INTO appointment_pets (appointment_id, pet_id) VALUES ($1, $2)"#,
            )
            .bind(id)
            .bind(pet_id)
            .execute(&mut *tx)
            .await?;
        }
    }

    tx.commit().await?;

    get_by_id(pool, id).await
}

pub async fn set_status(
    pool: &PgPool,
    id: &Uuid,
    new_status: &str,
    actor_id: &Uuid,
) -> Result<AppointmentWithPets, sqlx::Error> {
    let mut tx = pool.begin().await?;

    let from_status: Option<String> =
        sqlx::query_scalar(r#"SELECT status FROM appointments WHERE id = $1"#)
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?;

    sqlx::query(
        r#"UPDATE appointments
           SET status = $2,
               status_changed_by = $3,
               status_changed_at = now(),
               updated_at = now()
           WHERE id = $1"#,
    )
    .bind(id)
    .bind(new_status)
    .bind(actor_id)
    .execute(&mut *tx)
    .await?;

    if from_status.as_deref() != Some(new_status) {
        insert_history(&mut tx, id, from_status.as_deref(), new_status, Some(actor_id)).await?;
    }

    tx.commit().await?;

    get_by_id(pool, id).await
}

async fn insert_history(
    tx: &mut Transaction<'_, Postgres>,
    appointment_id: &Uuid,
    from_status: Option<&str>,
    to_status: &str,
    actor_id: Option<&Uuid>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO appointment_status_history
                (appointment_id, from_status, to_status, changed_by)
           VALUES ($1, $2, $3, $4)"#,
    )
    .bind(appointment_id)
    .bind(from_status)
    .bind(to_status)
    .bind(actor_id)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn list_history(
    pool: &PgPool,
    appointment_id: &Uuid,
) -> Result<Vec<AppointmentStatusHistoryEntry>, sqlx::Error> {
    sqlx::query_as::<_, AppointmentStatusHistoryEntry>(
        r#"SELECT h.id, h.appointment_id, h.from_status, h.to_status, h.changed_by,
                  CASE WHEN u.id IS NOT NULL THEN u.first_name || ' ' || u.last_name END
                      AS changed_by_name,
                  h.changed_at
           FROM appointment_status_history h
           LEFT JOIN users u ON u.id = h.changed_by
           WHERE h.appointment_id = $1
           ORDER BY h.changed_at DESC"#,
    )
    .bind(appointment_id)
    .fetch_all(pool)
    .await
}

/// Soft-delete if the appointment has any signed waiver or status history attached;
/// otherwise hard-delete. The soft path also avoids the FK RESTRICT from `signed_waivers`.
pub async fn delete(pool: &PgPool, id: &Uuid) -> Result<DeleteOutcome, sqlx::Error> {
    let has_history: bool = sqlx::query_scalar(
        r#"SELECT EXISTS(
               SELECT 1 FROM signed_waivers WHERE appointment_id = $1
               UNION ALL
               SELECT 1 FROM appointment_status_history WHERE appointment_id = $1
           )"#,
    )
    .bind(id)
    .fetch_one(pool)
    .await?;

    if has_history {
        sqlx::query(
            r#"UPDATE appointments SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL"#,
        )
        .bind(id)
        .execute(pool)
        .await?;
        Ok(DeleteOutcome::Soft)
    } else {
        sqlx::query(r#"DELETE FROM appointments WHERE id = $1"#)
            .bind(id)
            .execute(pool)
            .await?;
        Ok(DeleteOutcome::Hard)
    }
}

async fn fetch_pets_for_appointment(
    pool: &PgPool,
    appointment_id: &Uuid,
) -> Result<Vec<Pet>, sqlx::Error> {
    sqlx::query_as::<_, Pet>(
        r#"SELECT p.id, p.owner_id, p.name, p.species, p.breed, p.age, p.weight, p.notes, p.photo_image_id, p.created_at, p.updated_at, p.deleted_at
           FROM pets p
           INNER JOIN appointment_pets ap ON ap.pet_id = p.id
           WHERE ap.appointment_id = $1
           ORDER BY p.name ASC"#,
    )
    .bind(appointment_id)
    .fetch_all(pool)
    .await
}

async fn attach_pets(
    pool: &PgPool,
    appointments: Vec<Appointment>,
) -> Result<Vec<AppointmentWithPets>, sqlx::Error> {
    let mut out = Vec::with_capacity(appointments.len());
    for appointment in appointments {
        let pets = fetch_pets_for_appointment(pool, &appointment.id).await?;
        let waiver_signed = is_waiver_signed(pool, &appointment.id).await?;
        out.push(AppointmentWithPets { appointment, pets, waiver_signed });
    }
    Ok(out)
}
