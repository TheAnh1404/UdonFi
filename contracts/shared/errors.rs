//! Protocol-wide error types for UdonFi V2.
//!
//! All contract errors are mapped to u32 for compatibility with Soroban VM.

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum LendingError {
    // --- General & Authorization (100-199) ---
    Unauthorized = 100,
    AlreadyInitialized = 101,
    NotInitialized = 102,
    Paused = 103,
    NotPaused = 104,
    InvalidAdmin = 105,
    InvalidGuardian = 106,

    // --- Math & Overflow (200-299) ---
    MathOverflow = 200,
    MathUnderflow = 201,
    DivisionByZero = 202,
    InvalidPrecision = 203,

    // --- Validation & Parameters (300-399) ---
    InvalidAmount = 300,
    InvalidIndex = 301,
    InvalidLTV = 302,
    InvalidLiquidationThreshold = 303,
    InvalidLiquidationBonus = 304,
    InvalidReserveFactor = 305,
    InvalidOptimalUtilization = 306,
    InvalidInterestRateConfig = 307,
    InvalidPriceAge = 308,

    // --- Reserves & Caps (400-499) ---
    ReserveNotFound = 400,
    ReserveAlreadyExists = 401,
    ReserveFrozen = 402,
    ReservePaused = 403,
    ReserveNotActive = 404,
    MaxReservesReached = 405,
    SupplyCapViolation = 406,
    BorrowCapViolation = 407,

    // --- Pool & User Solvency (500-599) ---
    InsufficientLiquidity = 500,
    InsufficientCollateral = 501,
    HFTooLow = 502,              // Health Factor would drop below threshold
    LiquidationNotAllowed = 503, // Position is solvent
    LiquidationSessionExpired = 504,
    HealthFactorNotImproved = 505,
    NoDebtToRepay = 506,
    NonTransferable = 507,

    // --- Oracle & Price (600-699) ---
    PriceUnavailable = 600,
    StaleOraclePrice = 601,
    OraclePriceDeviationExceeded = 602,
    InvalidPriceValue = 603,
    OracleTimestampInFuture = 604,

    // --- Governance & Upgrade (700-799) ---
    ProposalThresholdNotMet = 700,
    QuorumNotReached = 701,
    TimelockActive = 702,
    InvalidWasmHash = 703,
}
