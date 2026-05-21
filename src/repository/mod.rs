pub mod user_repo;
pub mod pet_repo;
pub mod appointment_repo;
pub mod timeslot_repo;
pub mod waiver_repo;
pub mod audit_repo;
pub mod image_repo;
pub mod business_hours_repo;

/// Result of a delete that may take either soft or hard form depending on dependents.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeleteOutcome {
    /// Row removed from the database.
    Hard,
    /// Row marked as deleted (`deleted_at` set) to preserve referential history.
    Soft,
}

/// Outcome of attempting to delete a user.
#[derive(Debug)]
pub enum DeleteUserError {
    /// User has pets or appointments and cannot be deleted.
    HasDependents,
    Sqlx(sqlx::Error),
}

impl From<sqlx::Error> for DeleteUserError {
    fn from(e: sqlx::Error) -> Self {
        DeleteUserError::Sqlx(e)
    }
}
