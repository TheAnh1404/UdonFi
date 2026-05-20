//! Error types for UdonFi Lending Protocol
//! All contract errors are encoded as u32 for Soroban compatibility.

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum LendingError {
    /// Contract has already been initialized
    AlreadyInitialized = 1,
    /// Contract has not been initialized yet
    NotInitialized = 2,
    /// Caller is not authorized for this operation
    Unauthorized = 3,
    /// User does not have enough collateral to cover the borrow
    InsufficientCollateral = 4,
    /// Health Factor would drop below 1.0 after this operation
    HealthFactorBelowThreshold = 5,
    /// Not enough liquidity in the pool for withdrawal/borrow
    InsufficientLiquidity = 6,
    /// Amount must be greater than zero
    InvalidAmount = 7,
    /// Reserve (asset pool) is not active or paused
    ReserveNotActive = 8,
    /// Borrowing is disabled for this reserve
    BorrowingNotEnabled = 9,
    /// Oracle price is stale (too old)
    StaleOraclePrice = 10,
    /// Oracle price is outside acceptable range (circuit breaker)
    OraclePriceOutOfRange = 11,
    /// Liquidation not allowed — Health Factor is above threshold
    LiquidationNotAllowed = 12,
    /// Reserve index is invalid (out of 0-63 range)
    InvalidReserveIndex = 13,
    /// Maximum number of reserves (64) reached
    MaxReservesReached = 14,
    /// Arithmetic overflow in calculation
    Overflow = 15,
    /// Reserve not found for the given asset
    ReserveNotFound = 16,
    /// debtToken cannot be transferred
    NonTransferable = 17,
    /// Liquidation session expired or not found
    LiquidationSessionExpired = 18,
    /// Health Factor must improve after liquidation
    HealthFactorNotImproved = 19,
    /// User has no outstanding debt to repay
    NoDebtToRepay = 20,
}
