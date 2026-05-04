use axum::{
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
};

use super::jwt::{verify_token, Claims};

/// Extracts and validates JWT from the Authorization header.
/// Use this as an extractor in handlers that require authentication.
pub struct AuthUser(pub Claims);

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, axum::Json<serde_json::Value>);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok());

        let token = match auth_header {
            Some(h) if h.starts_with("Bearer ") => &h[7..],
            _ => {
                return Err((
                    StatusCode::UNAUTHORIZED,
                    axum::Json(serde_json::json!({
                        "success": false,
                        "message": "Missing or invalid Authorization header",
                        "data": null
                    })),
                ));
            }
        };

        match verify_token(token) {
            Ok(claims) => Ok(AuthUser(claims)),
            Err(_) => Err((
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({
                    "success": false,
                    "message": "Invalid or expired token",
                    "data": null
                })),
            )),
        }
    }
}
