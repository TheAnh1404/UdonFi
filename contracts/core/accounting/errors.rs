//! Accounting Engine error aliases.

pub use udonfi_shared::LendingError;

pub type AccountingResult<T> = Result<T, LendingError>;
