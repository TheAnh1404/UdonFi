//! Supply Engine error aliases.

pub use udonfi_shared::LendingError;

pub type SupplyResult<T> = Result<T, LendingError>;
