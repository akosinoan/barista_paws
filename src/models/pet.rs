use uuid::Uuid;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Pet {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub name: String,
    pub species: String,
    pub breed: Option<String>,
    pub age: Option<i32>,
    pub weight: Option<f64>,
    pub notes: Option<String>,
    pub photo_url: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePetRequest {
    pub name: String,
    pub species: String,
    pub breed: Option<String>,
    pub age: Option<i32>,
    pub weight: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePetRequest {
    pub name: Option<String>,
    pub species: Option<String>,
    pub breed: Option<String>,
    pub age: Option<i32>,
    pub weight: Option<f64>,
    pub notes: Option<String>,
}
