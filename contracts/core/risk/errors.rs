//! Risk Engine error aliases.

pub use udonfi_shared::LendingError;

pub type RiskResult<T> = Result<T, LendingError>;
