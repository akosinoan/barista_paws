use axum::Router;
use moka::future::Cache;
use tower_http::cors::{Any, CorsLayer};
use crate::{db, routes, state::{AppState, CachedImage}};

pub async fn run() {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info,sqlx=warn")),
        )
        .init();

    let db_pool = db::connect().await.expect("Failed to connect to database!");

    let image_cache: Cache<uuid::Uuid, CachedImage> = Cache::builder()
        .max_capacity(64 * 1024 * 1024)
        .weigher(|_k, v: &CachedImage| v.bytes.len().try_into().unwrap_or(u32::MAX))
        .build();

    let state = AppState { db_pool, image_cache };
    let api_port = std::env::var("API_PORT").expect("API_PORT must be set in .env!");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .merge(routes::router())
        .layer(cors)
        .with_state(state);

    let addr = format!("0.0.0.0:{}", api_port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Listener bind failed");

    tracing::info!(addr = %addr, "server running");
    axum::serve(listener, app).await.expect("Server failed");
}
