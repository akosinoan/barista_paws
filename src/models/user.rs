use uuid::Uuid;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

// --- Database models ---

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub hashed_password: String,
    pub first_name: String,
    pub last_name: String,
    pub phone_number: Option<String>,
    pub address: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Client {
    pub user_id: Uuid,
    pub vip_card_number: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Admin {
    pub user_id: Uuid,
    pub access_level: i32,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Role {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserRoleRow {
    pub user_id: Uuid,
    pub role_id: i32,
}

// --- Auth DTOs ---

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserResponse,
}

// --- Request DTOs ---

#[derive(Debug, Deserialize)]
pub struct CreateClientRequest {
    pub email: String,
    pub password: String,
    pub first_name: String,
    pub last_name: String,
    pub phone_number: Option<String>,
    pub address: Option<String>,
    pub vip_card_number: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAdminRequest {
    pub email: String,
    pub password: String,
    pub first_name: String,
    pub last_name: String,
    pub phone_number: Option<String>,
    pub address: Option<String>,
    pub access_level: i32,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub email: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub phone_number: Option<String>,
    pub address: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: Option<String>,
    pub new_password: String,
}

// --- Response DTOs ---

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub phone_number: Option<String>,
    pub address: Option<String>,
    pub avatar_url: Option<String>,
    pub role: String,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct ClientResponse {
    pub user: UserResponse,
    pub vip_card_number: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AdminResponse {
    pub user: UserResponse,
    pub access_level: i32,
}

impl User {
    pub fn validate_email(email: &str) -> bool {
        email.contains('@') && email.contains('.')
    }
}
