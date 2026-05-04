use std::time::Duration;

use sqlx::postgres::{PgPool, PgPoolOptions};



pub async fn connect() -> Result<PgPool,sqlx::Error>{

    dotenvy::dotenv().ok();
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE URL must be set in .env!");
    
    PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&database_url)
        .await
}