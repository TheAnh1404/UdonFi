//! Shared data types for UdonFi Lending Protocol.
//!
//! These types are used across all contracts for consistent
//! storage key definitions, reserve configuration, and user state.

use soroban_sdk::{contracttype, Address, Symbol};

// ─────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────

/// Top-level storage keys for the LendingPool Router contract.
#[contracttype]
#[derive(Clone)]
pub enum PoolDataKey {
    /// Administrator address
    Admin,
    /// Price oracle adapter contract address
    Oracle,
    /// Number of active reserves
    ReserveCount,
    /// Reserve configuration by index: ReserveConfig
    ReserveByIndex(u32),
    /// Asset address → reserve index mapping
    ReserveIndexByAsset(Address),
    /// User configuration bitmap (u128)
    UserConfig(Address),
    /// User scaled aToken balance for a specific reserve
    UserATokenBalance(Address, u32),
    /// User scaled debtToken balance for a specific reserve
    UserDebtBalance(Address, u32),
    /// Whether the contract has been initialized
    Initialized,
    /// Treasury address for protocol fees
    Treasury,
    /// Pause flag for emergency
    Paused,
}

/// Storage keys for individual Reserve contracts.
#[contracttype]
#[derive(Clone)]
pub enum ReserveDataKey {
    /// Reserve static configuration
    Config,
    /// Current liquidity index (RAY precision)
    LiquidityIndex,
    /// Current borrow index (RAY precision)
    BorrowIndex,
    /// Total scaled deposits
    TotalScaledDeposits,
    /// Total scaled borrows
    TotalScaledBorrows,
    /// Last update timestamp (ledger timestamp)
    LastUpdateTimestamp,
    /// Current borrow rate (WAD precision)
    CurrentBorrowRate,
    /// Current supply rate (WAD precision)
    CurrentSupplyRate,
    /// Accumulated protocol fees
    AccruedFees,
}

/// Storage keys for aToken and debtToken contracts.
#[contracttype]
#[derive(Clone)]
pub enum TokenDataKey {
    /// Token name (String)
    Name,
    /// Token symbol (Symbol)
    TokenSymbol,
    /// Token decimals
    Decimals,
    /// Authorized pool contract address (only pool can mint/burn)
    Pool,
    /// Underlying asset address
    UnderlyingAsset,
    /// Reserve index this token belongs to
    ReserveIndex,
    /// User's scaled balance
    ScaledBalance(Address),
    /// Total scaled supply
    TotalScaledSupply,
}

/// Storage keys for Price Oracle Adapter.
#[contracttype]
#[derive(Clone)]
pub enum OracleDataKey {
    /// Admin address
    Admin,
    /// Reflector Oracle contract address
    ReflectorAddress,
    /// Maximum allowed price age in ledgers
    MaxPriceAge,
    /// Last known price for circuit breaker
    LastPrice(Address),
    /// Maximum allowed price deviation percentage (basis points)
    MaxPriceDeviation,
}

/// Storage keys for Liquidation Engine.
#[contracttype]
#[derive(Clone)]
pub enum LiquidationDataKey {
    /// Admin address
    Admin,
    /// Associated lending pool address
    Pool,
    /// Pending liquidation session data
    LiquidationSession(soroban_sdk::BytesN<32>),
}

// ─────────────────────────────────────────────
// Configuration Types
// ─────────────────────────────────────────────

/// Configuration for a lending reserve (asset pool).
#[contracttype]
#[derive(Clone, Debug)]
pub struct ReserveConfig {
    /// SAC contract address for the underlying asset
    pub asset: Address,
    /// aToken contract address (deposit receipts)
    pub a_token: Address,
    /// debtToken contract address (debt tracking)
    pub debt_token: Address,
    /// Maximum Loan-to-Value ratio (basis points, e.g., 7500 = 75%)
    pub ltv: u32,
    /// Liquidation threshold (basis points, e.g., 8000 = 80%)
    pub liquidation_threshold: u32,
    /// Liquidation bonus for liquidators (basis points, e.g., 500 = 5%)
    pub liquidation_bonus: u32,
    /// Reserve factor — protocol fee on interest (basis points, e.g., 1000 = 10%)
    pub reserve_factor: u32,
    /// Asset decimals
    pub decimals: u32,
    /// Whether the reserve is active and accepting operations
    pub is_active: bool,
    /// Whether borrowing is enabled for this reserve
    pub is_borrowing_enabled: bool,
    /// Index position in the bitmap (0-63)
    pub reserve_index: u32,
}

/// Interest rate model parameters for the kinked curve.
#[contracttype]
#[derive(Clone, Debug)]
pub struct InterestRateConfig {
    /// Optimal utilization rate (WAD, e.g., 0.8 * WAD = 80%)
    pub optimal_utilization: i128,
    /// Base borrow rate (WAD, e.g., 0.02 * WAD = 2%)
    pub base_rate: i128,
    /// Interest rate slope below optimal utilization (WAD)
    pub slope1: i128,
    /// Interest rate slope above optimal utilization — steep (WAD)
    pub slope2: i128,
}

/// Dynamic state data for a reserve.
#[contracttype]
#[derive(Clone, Debug)]
pub struct ReserveState {
    /// Current liquidity index — accumulates supply interest (RAY)
    pub liquidity_index: i128,
    /// Current borrow index — accumulates borrow interest (RAY)
    pub borrow_index: i128,
    /// Total scaled deposits across all users
    pub total_scaled_deposits: i128,
    /// Total scaled borrows across all users
    pub total_scaled_borrows: i128,
    /// Last time indices were updated (ledger timestamp)
    pub last_update_timestamp: u64,
    /// Current borrow rate (WAD per year)
    pub current_borrow_rate: i128,
    /// Current supply rate (WAD per year)
    pub current_supply_rate: i128,
}

/// Aggregated user account data across all reserves.
#[contracttype]
#[derive(Clone, Debug)]
pub struct UserAccountData {
    /// Total collateral value in USD (WAD)
    pub total_collateral_usd: i128,
    /// Total debt value in USD (WAD)
    pub total_debt_usd: i128,
    /// Available borrowing power in USD (WAD)
    pub available_borrow_usd: i128,
    /// Current Health Factor (WAD, >= 1.0 is safe)
    pub health_factor: i128,
    /// Current average LTV (WAD)
    pub current_ltv: i128,
    /// User configuration bitmap
    pub config_bitmap: u128,
}

/// Liquidation session data (stored temporarily between steps).
#[contracttype]
#[derive(Clone, Debug)]
pub struct LiquidationParams {
    /// Liquidator address
    pub liquidator: Address,
    /// Borrower being liquidated
    pub borrower: Address,
    /// Debt asset to be repaid
    pub debt_asset: Address,
    /// Collateral asset to be seized
    pub collateral_asset: Address,
    /// Amount of debt to cover
    pub debt_to_cover: i128,
    /// Amount of collateral to seize (including bonus)
    pub collateral_to_seize: i128,
    /// Liquidation bonus applied
    pub liquidation_bonus: u32,
    /// Ledger sequence when session was created (for expiry)
    pub created_at_ledger: u32,
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/// TTL threshold — if remaining TTL is below this, extend
pub const TTL_THRESHOLD: u32 = 17_280; // ~1 day at 5s ledgers

/// TTL extend duration — extend to approximately 30 days
pub const TTL_EXTEND_TO: u32 = 518_400; // ~30 days at 5s ledgers

/// Liquidation session expiry — max 20 ledgers between prepare and execute
pub const LIQUIDATION_SESSION_MAX_AGE: u32 = 20;

/// Health Factor threshold — positions below this can be liquidated
/// Encoded as WAD (1.0 = WAD)
pub const HEALTH_FACTOR_LIQUIDATION_THRESHOLD: i128 = 1_000_000_000_000_000_000; // 1.0 in WAD
