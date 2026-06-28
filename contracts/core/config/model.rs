//! Centralized protocol configuration models.

use soroban_sdk::{contracttype, Address, String};
use udonfi_shared::{
    BasisPoints, HealthFactor, LedgerSequence, Ray, Timestamp, Wad, MIN_HEALTH_FACTOR, RAY,
    TTL_EXTEND_TO,
};

pub const INITIAL_CONFIG_VERSION: u32 = 1;
pub const DEFAULT_PROTOCOL_VERSION: u32 = 2;
pub const DEFAULT_MAX_PRICE_STALENESS_LEDGERS: u32 = 720;
pub const DEFAULT_MAX_PRICE_DEVIATION_BPS: u32 = 200;
pub const DEFAULT_GOVERNANCE_TIMELOCK_DELAY_LEDGERS: u32 = 34_560;
pub const MIN_GOVERNANCE_TIMELOCK_DELAY_LEDGERS: u32 = 17_280;
pub const DEFAULT_QUORUM_BPS: u32 = 400;
pub const DEFAULT_PROPOSAL_THRESHOLD_BPS: u32 = 100;
pub const DEFAULT_CLOSE_FACTOR_BPS: u32 = 5_000;
pub const DEFAULT_LIQUIDATION_BONUS_BPS: u32 = 500;
pub const DEFAULT_OPTIMAL_UTILIZATION_BPS: u32 = 8_000;
pub const DEFAULT_BASE_RATE_BPS: u32 = 100;
pub const DEFAULT_SLOPE1_BPS: u32 = 400;
pub const DEFAULT_SLOPE2_BPS: u32 = 8_500;
pub const DEFAULT_MAX_BORROW_RATE_BPS: u32 = 9_000;
pub const DEFAULT_RESERVE_FACTOR_BPS: u32 = 1_000;

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ConfigAuthority {
    Governance = 0,
    Guardian = 1,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ConfigSection {
    All = 0,
    Protocol = 1,
    Risk = 2,
    Interest = 3,
    Oracle = 4,
    Governance = 5,
    Validation = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigAccessControl {
    pub admin: Address,
    pub guardian: Address,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigUpdateContext {
    pub actor: Address,
    pub authority: ConfigAuthority,
    pub reason: String,
    pub emergency: bool,
    pub timelock_delay_ledgers: LedgerSequence,
    pub timelock_expires_at_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProtocolConfig {
    pub protocol_version: u32,
    pub config_version: u32,
    pub protocol_fee_bps: BasisPoints,
    pub reserve_factor_min_bps: BasisPoints,
    pub reserve_factor_max_bps: BasisPoints,
    pub max_reserves: u32,
    pub max_assets: u32,
    pub min_health_factor: HealthFactor,
    pub default_ttl: LedgerSequence,
    pub emergency_mode_enabled: bool,
    pub updated_at: Timestamp,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct RiskConfig {
    pub min_ltv_bps: BasisPoints,
    pub max_ltv_bps: BasisPoints,
    pub min_liquidation_threshold_bps: BasisPoints,
    pub max_liquidation_threshold_bps: BasisPoints,
    pub min_liquidation_bonus_bps: BasisPoints,
    pub max_liquidation_bonus_bps: BasisPoints,
    pub max_close_factor_bps: BasisPoints,
    pub min_health_factor: HealthFactor,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct InterestConfig {
    pub base_rate_bps: BasisPoints,
    pub slope1_bps: BasisPoints,
    pub slope2_bps: BasisPoints,
    pub optimal_utilization_bps: BasisPoints,
    pub max_borrow_rate_bps: BasisPoints,
    pub reserve_factor_bps: BasisPoints,
    pub borrow_index_initial: Ray,
    pub supply_index_initial: Ray,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct OracleConfig {
    pub max_price_staleness_ledgers: LedgerSequence,
    pub max_price_deviation_bps: BasisPoints,
    pub fallback_enabled: bool,
    pub twap_enabled: bool,
    pub circuit_breaker_enabled: bool,
    pub emergency_price_freeze_enabled: bool,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct GovernanceConfig {
    pub timelock_delay_ledgers: LedgerSequence,
    pub emergency_delay_ledgers: LedgerSequence,
    pub quorum_bps: BasisPoints,
    pub proposal_threshold_bps: BasisPoints,
    pub guardian_can_reduce_risk: bool,
    pub guardian_can_pause: bool,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct ValidationConfig {
    pub min_deposit_amount: Wad,
    pub min_borrow_amount: Wad,
    pub min_repay_amount: Wad,
    pub max_transaction_amount: Wad,
    pub dust_threshold: Wad,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CurrentConfig {
    pub protocol: ProtocolConfig,
    pub risk: RiskConfig,
    pub interest: InterestConfig,
    pub oracle: OracleConfig,
    pub governance: GovernanceConfig,
    pub validation: ValidationConfig,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigHistoryMetadata {
    pub config_version: u32,
    pub previous_version: u32,
    pub changed_section: ConfigSection,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub timestamp: Timestamp,
    pub emergency: bool,
    pub reason: String,
}

impl ConfigUpdateContext {
    pub fn governance(actor: Address, reason: String) -> Self {
        Self {
            actor,
            authority: ConfigAuthority::Governance,
            reason,
            emergency: false,
            timelock_delay_ledgers: LedgerSequence(0),
            timelock_expires_at_ledger: LedgerSequence(0),
        }
    }

    pub fn timelocked_governance(
        actor: Address,
        reason: String,
        timelock_delay_ledgers: LedgerSequence,
        timelock_expires_at_ledger: LedgerSequence,
    ) -> Self {
        Self {
            actor,
            authority: ConfigAuthority::Governance,
            reason,
            emergency: false,
            timelock_delay_ledgers,
            timelock_expires_at_ledger,
        }
    }

    pub fn guardian_emergency(actor: Address, reason: String) -> Self {
        Self {
            actor,
            authority: ConfigAuthority::Guardian,
            reason,
            emergency: true,
            timelock_delay_ledgers: LedgerSequence(0),
            timelock_expires_at_ledger: LedgerSequence(0),
        }
    }
}

pub fn default_protocol_config(now: Timestamp) -> ProtocolConfig {
    ProtocolConfig {
        protocol_version: DEFAULT_PROTOCOL_VERSION,
        config_version: INITIAL_CONFIG_VERSION,
        protocol_fee_bps: BasisPoints(0),
        reserve_factor_min_bps: BasisPoints(0),
        reserve_factor_max_bps: BasisPoints(10_000),
        max_reserves: udonfi_shared::constants::MAX_RESERVES,
        max_assets: udonfi_shared::constants::MAX_RESERVES,
        min_health_factor: HealthFactor(MIN_HEALTH_FACTOR),
        default_ttl: LedgerSequence(TTL_EXTEND_TO),
        emergency_mode_enabled: false,
        updated_at: now,
    }
}

pub fn default_risk_config() -> RiskConfig {
    RiskConfig {
        min_ltv_bps: BasisPoints(0),
        max_ltv_bps: BasisPoints(udonfi_shared::constants::MAX_LTV_BPS),
        min_liquidation_threshold_bps: BasisPoints(1),
        max_liquidation_threshold_bps: BasisPoints(10_000),
        min_liquidation_bonus_bps: BasisPoints(0),
        max_liquidation_bonus_bps: BasisPoints(DEFAULT_LIQUIDATION_BONUS_BPS),
        max_close_factor_bps: BasisPoints(DEFAULT_CLOSE_FACTOR_BPS),
        min_health_factor: HealthFactor(MIN_HEALTH_FACTOR),
    }
}

pub fn default_interest_config() -> InterestConfig {
    InterestConfig {
        base_rate_bps: BasisPoints(DEFAULT_BASE_RATE_BPS),
        slope1_bps: BasisPoints(DEFAULT_SLOPE1_BPS),
        slope2_bps: BasisPoints(DEFAULT_SLOPE2_BPS),
        optimal_utilization_bps: BasisPoints(DEFAULT_OPTIMAL_UTILIZATION_BPS),
        max_borrow_rate_bps: BasisPoints(DEFAULT_MAX_BORROW_RATE_BPS),
        reserve_factor_bps: BasisPoints(DEFAULT_RESERVE_FACTOR_BPS),
        borrow_index_initial: Ray(RAY),
        supply_index_initial: Ray(RAY),
    }
}

pub fn default_oracle_config() -> OracleConfig {
    OracleConfig {
        max_price_staleness_ledgers: LedgerSequence(DEFAULT_MAX_PRICE_STALENESS_LEDGERS),
        max_price_deviation_bps: BasisPoints(DEFAULT_MAX_PRICE_DEVIATION_BPS),
        fallback_enabled: true,
        twap_enabled: true,
        circuit_breaker_enabled: true,
        emergency_price_freeze_enabled: true,
    }
}

pub fn default_governance_config() -> GovernanceConfig {
    GovernanceConfig {
        timelock_delay_ledgers: LedgerSequence(DEFAULT_GOVERNANCE_TIMELOCK_DELAY_LEDGERS),
        emergency_delay_ledgers: LedgerSequence(0),
        quorum_bps: BasisPoints(DEFAULT_QUORUM_BPS),
        proposal_threshold_bps: BasisPoints(DEFAULT_PROPOSAL_THRESHOLD_BPS),
        guardian_can_reduce_risk: true,
        guardian_can_pause: true,
    }
}

pub fn default_validation_config() -> ValidationConfig {
    ValidationConfig {
        min_deposit_amount: Wad(1),
        min_borrow_amount: Wad(1),
        min_repay_amount: Wad(1),
        max_transaction_amount: Wad(i128::MAX),
        dust_threshold: Wad(1),
    }
}
