use sqlx::PgPool;
use uuid::Uuid;

use crate::models::pet::{CreatePetRequest, Pet, UpdatePetRequest};

pub async fn create_pet(pool: &PgPool, owner_id: &Uuid, payload: &CreatePetRequest) -> Result<Pet, sqlx::Error> {
    let pet_id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO pets (id, owner_id, name, species, breed, age, weight, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
    )
    .bind(&pet_id)
    .bind(owner_id)
    .bind(&payload.name)
    .bind(&payload.species)
    .bind(&payload.breed)
    .bind(&payload.age)
    .bind(&payload.weight)
    .bind(&payload.notes)
    .execute(pool)
    .await?;

    get_pet_by_id(pool, &pet_id).await
}

pub async fn get_pet_by_id(pool: &PgPool, pet_id: &Uuid) -> Result<Pet, sqlx::Error> {
    sqlx::query_as::<_, Pet>(
        r#"SELECT id, owner_id, name, species, breed, age, weight, notes, photo_url, created_at, updated_at FROM pets WHERE id = $1"#,
    )
    .bind(pet_id)
    .fetch_one(pool)
    .await
}

pub async fn get_pets_by_owner(pool: &PgPool, owner_id: &Uuid) -> Result<Vec<Pet>, sqlx::Error> {
    sqlx::query_as::<_, Pet>(
        r#"SELECT id, owner_id, name, species, breed, age, weight, notes, photo_url, created_at, updated_at FROM pets WHERE owner_id = $1 ORDER BY created_at DESC"#,
    )
    .bind(owner_id)
    .fetch_all(pool)
    .await
}

pub async fn update_pet(pool: &PgPool, pet_id: &Uuid, payload: &UpdatePetRequest) -> Result<Pet, sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE pets SET
            name = COALESCE($2, name),
            species = COALESCE($3, species),
            breed = COALESCE($4, breed),
            age = COALESCE($5, age),
            weight = COALESCE($6, weight),
            notes = COALESCE($7, notes),
            updated_at = now()
        WHERE id = $1
        "#,
    )
    .bind(pet_id)
    .bind(&payload.name)
    .bind(&payload.species)
    .bind(&payload.breed)
    .bind(&payload.age)
    .bind(&payload.weight)
    .bind(&payload.notes)
    .execute(pool)
    .await?;

    get_pet_by_id(pool, pet_id).await
}

pub async fn update_photo_url(pool: &PgPool, pet_id: &Uuid, url: &str) -> Result<(), sqlx::Error> {
    sqlx::query(r#"UPDATE pets SET photo_url = $2 WHERE id = $1"#)
        .bind(pet_id)
        .bind(url)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete_pet(pool: &PgPool, pet_id: &Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(r#"DELETE FROM pets WHERE id = $1"#)
        .bind(pet_id)
        .execute(pool)
        .await?;

    Ok(())
}
