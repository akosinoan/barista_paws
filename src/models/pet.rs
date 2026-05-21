use uuid::Uuid;
use serde::{ser::SerializeStruct, Deserialize, Serialize, Serializer};
use chrono::{DateTime, Utc};

#[derive(Debug, Deserialize, sqlx::FromRow)]
pub struct Pet {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub name: String,
    pub species: String,
    pub breed: Option<String>,
    pub age: Option<i32>,
    pub weight: Option<f64>,
    pub notes: Option<String>,
    pub photo_image_id: Option<Uuid>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

impl Serialize for Pet {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut s = serializer.serialize_struct("Pet", 11)?;
        s.serialize_field("id", &self.id)?;
        s.serialize_field("owner_id", &self.owner_id)?;
        s.serialize_field("name", &self.name)?;
        s.serialize_field("species", &self.species)?;
        s.serialize_field("breed", &self.breed)?;
        s.serialize_field("age", &self.age)?;
        s.serialize_field("weight", &self.weight)?;
        s.serialize_field("notes", &self.notes)?;
        s.serialize_field("photo_url", &self.photo_url())?;
        s.serialize_field("created_at", &self.created_at)?;
        s.serialize_field("updated_at", &self.updated_at)?;
        s.end()
    }
}

impl Pet {
    pub fn photo_url(&self) -> Option<String> {
        self.photo_image_id.map(|img| format!("/api/pets/{}/photo?v={}", self.id, img))
    }
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
