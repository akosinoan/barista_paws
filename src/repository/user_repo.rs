use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::models::user::{
    Admin, Client, CreateAdminRequest, CreateClientRequest, UpdateUserRequest, User,
};
use crate::repository::DeleteUserError;

pub async fn create_client(pool: &PgPool, payload: &CreateClientRequest, hashed_password: &str) -> Result<User, sqlx::Error> {
    let mut tx = pool.begin().await?;

    let user_id = insert_user(&mut tx, &payload.email, hashed_password, &payload.first_name, &payload.last_name, payload.phone_number.as_deref(), payload.address.as_deref()).await?;
    insert_user_role(&mut tx, &user_id, "client").await?;
    insert_client(&mut tx, &user_id, payload.vip_card_number.as_deref()).await?;

    tx.commit().await?;

    get_user_by_id(pool, &user_id).await
}

pub async fn create_admin(pool: &PgPool, payload: &CreateAdminRequest, hashed_password: &str) -> Result<User, sqlx::Error> {
    let mut tx = pool.begin().await?;

    let user_id = insert_user(&mut tx, &payload.email, hashed_password, &payload.first_name, &payload.last_name, payload.phone_number.as_deref(), payload.address.as_deref()).await?;
    insert_user_role(&mut tx, &user_id, "admin").await?;
    insert_admin(&mut tx, &user_id, payload.access_level).await?;

    tx.commit().await?;

    get_user_by_id(pool, &user_id).await
}

async fn insert_user(
    tx: &mut Transaction<'_, Postgres>,
    email: &str,
    hashed_password: &str,
    first_name: &str,
    last_name: &str,
    phone_number: Option<&str>,
    address: Option<&str>,
) -> Result<Uuid, sqlx::Error> {
    let user_id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO users (id, email, hashed_password, first_name, last_name, phone_number, address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(&user_id)
    .bind(email)
    .bind(hashed_password)
    .bind(first_name)
    .bind(last_name)
    .bind(phone_number)
    .bind(address)
    .execute(&mut **tx)
    .await?;

    Ok(user_id)
}

async fn insert_user_role(
    tx: &mut Transaction<'_, Postgres>,
    user_id: &Uuid,
    role_name: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, r.id FROM roles r WHERE r.name = $2
        "#,
    )
    .bind(user_id)
    .bind(role_name)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

async fn insert_client(
    tx: &mut Transaction<'_, Postgres>,
    user_id: &Uuid,
    vip_card_number: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO clients (user_id, vip_card_number) VALUES ($1, $2)"#,
    )
    .bind(user_id)
    .bind(vip_card_number)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

async fn insert_admin(
    tx: &mut Transaction<'_, Postgres>,
    user_id: &Uuid,
    access_level: i32,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO admins (user_id, access_level) VALUES ($1, $2)"#,
    )
    .bind(user_id)
    .bind(access_level)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

pub async fn get_user_by_id(pool: &PgPool, user_id: &Uuid) -> Result<User, sqlx::Error> {
    sqlx::query_as::<_, User>(
        r#"SELECT id, email, hashed_password, first_name, last_name, phone_number, address, avatar_image_id, created_at FROM users WHERE id = $1"#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
}

pub async fn get_user_by_email(pool: &PgPool, email: &str) -> Result<User, sqlx::Error> {
    sqlx::query_as::<_, User>(
        r#"SELECT id, email, hashed_password, first_name, last_name, phone_number, address, avatar_image_id, created_at FROM users WHERE email = $1"#,
    )
    .bind(email)
    .fetch_one(pool)
    .await
}

pub async fn get_avatar_image_id(pool: &PgPool, user_id: &Uuid) -> Result<Option<Uuid>, sqlx::Error> {
    let row: (Option<Uuid>,) = sqlx::query_as(
        r#"SELECT avatar_image_id FROM users WHERE id = $1"#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;
    Ok(row.0)
}

pub async fn get_user_role(pool: &PgPool, user_id: &Uuid) -> Result<String, sqlx::Error> {
    let role: (String,) = sqlx::query_as(
        r#"SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1"#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(role.0)
}

pub async fn get_client_details(pool: &PgPool, user_id: &Uuid) -> Result<Client, sqlx::Error> {
    sqlx::query_as::<_, Client>(
        r#"SELECT user_id, vip_card_number FROM clients WHERE user_id = $1"#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
}

pub async fn get_admin_details(pool: &PgPool, user_id: &Uuid) -> Result<Admin, sqlx::Error> {
    sqlx::query_as::<_, Admin>(
        r#"SELECT user_id, access_level FROM admins WHERE user_id = $1"#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
}

pub async fn get_all_users(pool: &PgPool) -> Result<Vec<User>, sqlx::Error> {
    sqlx::query_as::<_, User>(
        r#"SELECT id, email, hashed_password, first_name, last_name, phone_number, address, avatar_image_id, created_at FROM users ORDER BY created_at DESC"#,
    )
    .fetch_all(pool)
    .await
}

pub async fn update_user(pool: &PgPool, user_id: &Uuid, payload: &UpdateUserRequest) -> Result<User, sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE users SET
            email = COALESCE($2, email),
            first_name = COALESCE($3, first_name),
            last_name = COALESCE($4, last_name),
            phone_number = COALESCE($5, phone_number),
            address = COALESCE($6, address)
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .bind(&payload.email)
    .bind(&payload.first_name)
    .bind(&payload.last_name)
    .bind(&payload.phone_number)
    .bind(&payload.address)
    .execute(pool)
    .await?;

    get_user_by_id(pool, user_id).await
}

pub async fn update_password(pool: &PgPool, user_id: &Uuid, hashed_password: &str) -> Result<(), sqlx::Error> {
    sqlx::query(r#"UPDATE users SET hashed_password = $2 WHERE id = $1"#)
        .bind(user_id)
        .bind(hashed_password)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn update_avatar_image_id(
    pool: &PgPool,
    user_id: &Uuid,
    image_id: &Uuid,
) -> Result<Option<Uuid>, sqlx::Error> {
    let prev: (Option<Uuid>,) = sqlx::query_as(
        r#"SELECT avatar_image_id FROM users WHERE id = $1"#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    sqlx::query(r#"UPDATE users SET avatar_image_id = $2 WHERE id = $1"#)
        .bind(user_id)
        .bind(image_id)
        .execute(pool)
        .await?;
    Ok(prev.0)
}

/// Hard-delete a user, but only when they have no pets and no appointments.
/// FK cascades clear out `clients` / `admins` / `user_roles` rows automatically.
pub async fn delete_user(pool: &PgPool, user_id: &Uuid) -> Result<(), DeleteUserError> {
    let has_deps: bool = sqlx::query_scalar(
        r#"SELECT EXISTS(
               SELECT 1 FROM pets WHERE owner_id = $1
               UNION ALL
               SELECT 1 FROM appointments WHERE client_id = $1
           )"#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if has_deps {
        return Err(DeleteUserError::HasDependents);
    }

    sqlx::query(r#"DELETE FROM users WHERE id = $1"#)
        .bind(user_id)
        .execute(pool)
        .await?;

    Ok(())
}
