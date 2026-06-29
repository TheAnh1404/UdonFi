//! Withdraw Engine error aliases.

pub use udonfi_shared::LendingError;

pub type WithdrawResult<T> = Result<T, LendingError>;
