//! Borrow Engine error aliases.

pub use udonfi_shared::LendingError;

pub type BorrowResult<T> = Result<T, LendingError>;
