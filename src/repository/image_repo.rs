use sqlx::PgPool;
use uuid::Uuid;

use crate::repository::DeleteOutcome;

pub async fn insert_image(
    pool: &PgPool,
    bytes: &[u8],
    content_type: &str,
) -> Result<Uuid, sqlx::Error> {
    let id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO images (id, bytes, content_type, byte_size) VALUES ($1, $2, $3, $4)"#,
    )
    .bind(&id)
    .bind(bytes)
    .bind(content_type)
    .bind(bytes.len() as i32)
    .execute(pool)
    .await?;
    Ok(id)
}

pub async fn get_image(
    pool: &PgPool,
    id: &Uuid,
) -> Result<(Vec<u8>, String), sqlx::Error> {
    let row: (Vec<u8>, String) = sqlx::query_as(
        r#"SELECT bytes, content_type FROM images WHERE id = $1"#,
    )
    .bind(id)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

/// Soft-delete if the image is still referenced by a user avatar or pet photo;
/// otherwise hard-delete to reclaim storage.
pub async fn delete_image(pool: &PgPool, id: &Uuid) -> Result<DeleteOutcome, sqlx::Error> {
    let referenced: bool = sqlx::query_scalar(
        r#"SELECT EXISTS(
               SELECT 1 FROM users WHERE avatar_image_id = $1
               UNION ALL
               SELECT 1 FROM pets WHERE photo_image_id = $1
           )"#,
    )
    .bind(id)
    .fetch_one(pool)
    .await?;

    if referenced {
        sqlx::query(r#"UPDATE images SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL"#)
            .bind(id)
            .execute(pool)
            .await?;
        Ok(DeleteOutcome::Soft)
    } else {
        sqlx::query(r#"DELETE FROM images WHERE id = $1"#)
            .bind(id)
            .execute(pool)
            .await?;
        Ok(DeleteOutcome::Hard)
    }
}
