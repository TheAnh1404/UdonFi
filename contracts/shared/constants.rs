//! Protocol-wide constants for UdonFi V2.

/// Fixed-point precision for standard token balances (10^18)
pub const WAD: i128 = 1_000_000_000_000_000_000;
pub const HALF_WAD: i128 = WAD / 2;

/// Fixed-point precision for compounding interest indexes (10^27)
pub const RAY: i128 = 1_000_000_000_000_000_000_000_000_000;
pub const HALF_RAY: i128 = RAY / 2;

/// Percentage factor representation (100.00% = 10,000 basis points)
pub const PERCENTAGE_FACTOR: u32 = 10_000;

/// Seconds per year based on 365.25 days
pub const SECONDS_PER_YEAR: u64 = 31_557_600;

/// Maximum number of active reserves supported by the bitmap model
pub const MAX_RESERVES: u32 = 64;

/// Maximum allowed Loan-To-Value configuration (99.00% = 9,900 bps)
pub const MAX_LTV_BPS: u32 = 9_900;

/// Minimum Health Factor threshold to maintain solvency (1.0 in WAD)
pub const MIN_HEALTH_FACTOR: i128 = WAD;

/// TTL threshold below which storage entries are extended (~1 day at 5s ledgers)
pub const TTL_THRESHOLD: u32 = 17_280;

/// TTL extension target (~30 days at 5s ledgers)
pub const TTL_EXTEND_TO: u32 = 518_400;

/// Maximum age of a prepare liquidation session in ledger sequences
pub const MAX_LIQUIDATION_SESSION_AGE: u32 = 20;
