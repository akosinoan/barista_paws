use std::net::{IpAddr, Ipv4Addr};

use axum::{
    extract::{ConnectInfo, FromRequestParts},
    http::{StatusCode, request::Parts},
};

pub struct ClientMeta {
    pub ip: IpAddr,
    pub user_agent: String,
}

impl<S> FromRequestParts<S> for ClientMeta
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, axum::Json<serde_json::Value>);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let user_agent = parts
            .headers
            .get("user-agent")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();

        if user_agent.is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                axum::Json(serde_json::json!({
                    "success": false,
                    "message": "Missing User-Agent header",
                    "data": null
                })),
            ));
        }

        // Prefer X-Forwarded-For first hop; fall back to ConnectInfo, then 0.0.0.0.
        let xff = parts
            .headers
            .get("x-forwarded-for")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.split(',').next())
            .map(|s| s.trim().to_string());

        let ip = if let Some(s) = xff {
            s.parse::<IpAddr>().ok()
        } else {
            None
        }
        .or_else(|| {
            parts
                .extensions
                .get::<ConnectInfo<std::net::SocketAddr>>()
                .map(|c| c.0.ip())
        })
        .unwrap_or(IpAddr::V4(Ipv4Addr::UNSPECIFIED));

        Ok(ClientMeta { ip, user_agent })
    }
}
