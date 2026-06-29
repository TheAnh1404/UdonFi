//! Liquidation MVP error aliases.

pub use udonfi_shared::LendingError;

pub type LiquidationResult<T> = Result<T, LendingError>;
