//! Repay Engine error aliases.

pub use udonfi_shared::LendingError;

pub type RepayResult<T> = Result<T, LendingError>;
