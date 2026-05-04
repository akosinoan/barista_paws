use sqlx::PgPool;
use uuid::Uuid;

use crate::models::appointment::{
    Appointment, AppointmentWithPets, CreateAppointmentRequest, UpdateAppointmentRequest,
};
use crate::models::pet::Pet;

pub async fn create_appointment(
    pool: &PgPool,
    client_id: &Uuid,
    payload: &CreateAppointmentRequest,
) -> Result<AppointmentWithPets, sqlx::Error> {
    let appointment_id = Uuid::new_v4();
    let mut tx = pool.begin().await?;

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
    .execute(&mut *tx)
    .await?;

    for pet_id in &payload.pet_ids {
        sqlx::query(
            r#"INSERT INTO appointment_pets (appointment_id, pet_id) VALUES ($1, $2)"#,
        )
        .bind(&appointment_id)
        .bind(pet_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    get_by_id(pool, &appointment_id).await
}

pub async fn get_by_id(pool: &PgPool, id: &Uuid) -> Result<AppointmentWithPets, sqlx::Error> {
    let appointment = sqlx::query_as::<_, Appointment>(
        r#"SELECT id, client_id, appointment_date, time_slot, status, notes, created_at, updated_at
           FROM appointments WHERE id = $1"#,
    )
    .bind(id)
    .fetch_one(pool)
    .await?;

    let pets = fetch_pets_for_appointment(pool, id).await?;

    Ok(AppointmentWithPets { appointment, pets })
}

pub async fn list_by_client(
    pool: &PgPool,
    client_id: &Uuid,
) -> Result<Vec<AppointmentWithPets>, sqlx::Error> {
    let appointments = sqlx::query_as::<_, Appointment>(
        r#"SELECT id, client_id, appointment_date, time_slot, status, notes, created_at, updated_at
           FROM appointments WHERE client_id = $1
           ORDER BY appointment_date DESC, time_slot DESC"#,
    )
    .bind(client_id)
    .fetch_all(pool)
    .await?;

    attach_pets(pool, appointments).await
}

pub async fn list_all(pool: &PgPool) -> Result<Vec<AppointmentWithPets>, sqlx::Error> {
    let appointments = sqlx::query_as::<_, Appointment>(
        r#"SELECT id, client_id, appointment_date, time_slot, status, notes, created_at, updated_at
           FROM appointments
           ORDER BY appointment_date DESC, time_slot DESC"#,
    )
    .fetch_all(pool)
    .await?;

    attach_pets(pool, appointments).await
}

pub async fn update_appointment(
    pool: &PgPool,
    id: &Uuid,
    payload: &UpdateAppointmentRequest,
) -> Result<AppointmentWithPets, sqlx::Error> {
    let mut tx = pool.begin().await?;

    sqlx::query(
        r#"
        UPDATE appointments SET
            appointment_date = COALESCE($2, appointment_date),
            time_slot = COALESCE($3, time_slot),
            notes = COALESCE($4, notes),
            status = COALESCE($5, status),
            updated_at = now()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(&payload.appointment_date)
    .bind(&payload.time_slot)
    .bind(&payload.notes)
    .bind(&payload.status)
    .execute(&mut *tx)
    .await?;

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
) -> Result<AppointmentWithPets, sqlx::Error> {
    sqlx::query(
        r#"UPDATE appointments SET status = $2, updated_at = now() WHERE id = $1"#,
    )
    .bind(id)
    .bind(new_status)
    .execute(pool)
    .await?;

    get_by_id(pool, id).await
}

pub async fn delete(pool: &PgPool, id: &Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(r#"DELETE FROM appointments WHERE id = $1"#)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

async fn fetch_pets_for_appointment(
    pool: &PgPool,
    appointment_id: &Uuid,
) -> Result<Vec<Pet>, sqlx::Error> {
    sqlx::query_as::<_, Pet>(
        r#"SELECT p.id, p.owner_id, p.name, p.species, p.breed, p.age, p.weight, p.notes, p.photo_url, p.created_at, p.updated_at
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
        out.push(AppointmentWithPets { appointment, pets });
    }
    Ok(out)
}
