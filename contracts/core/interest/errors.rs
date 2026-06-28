//! Interest Engine error aliases.

pub use udonfi_shared::LendingError;

pub type InterestResult<T> = Result<T, LendingError>;
