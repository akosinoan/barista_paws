use axum::Router;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use crate::{db, routes, state::AppState};

pub async fn run() {
    let db_pool = db::connect().await.expect("Failed to connect to database!");
    let state = AppState { db_pool };
    let api_port = std::env::var("API_PORT").expect("API_PORT must be set in .env!");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .merge(routes::router())
        .nest_service("/uploads", ServeDir::new("uploads"))
        .layer(cors)
        .with_state(state);

    let addr = format!("0.0.0.0:{}", api_port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Listener bind failed");

    println!("Server running on {}", &addr);
    axum::serve(listener, app).await.expect("Server failed");
}
