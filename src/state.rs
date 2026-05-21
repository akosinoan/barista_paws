use std::sync::Arc;

use moka::future::Cache;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct CachedImage {
    pub bytes: Arc<Vec<u8>>,
    pub content_type: Arc<str>,
}

pub type ImageCache = Cache<Uuid, CachedImage>;

#[derive(Clone)]
pub struct AppState {
    pub db_pool: PgPool,
    pub image_cache: ImageCache,
}
