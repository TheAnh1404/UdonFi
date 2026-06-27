//! Protocol configuration structures for UdonFi V2.

use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProtocolConfig {
    pub admin: Address,
    pub guardian: Address,
    pub treasury: Address,
    pub max_reserves: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveConfig {
    pub asset: Address,
    pub a_token: Address,
    pub debt_token: Address,
    pub ltv: u32,
    pub liquidation_threshold: u32,
    pub liquidation_bonus: u32,
    pub reserve_factor: u32,
    pub decimals: u32,
    pub is_active: bool,
    pub is_borrowing_enabled: bool,
    pub reserve_index: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InterestRateConfig {
    pub optimal_utilization: i128,
    pub base_rate: i128,
    pub slope1: i128,
    pub slope2: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RiskConfig {
    pub min_health_factor: i128,
    pub liquidation_bonus_cap: u32,
    pub close_factor: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OracleConfig {
    pub reflector_address: Address,
    pub max_price_age: u32,
    pub max_price_deviation: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GovernanceConfig {
    pub voting_delay: u32,
    pub voting_period: u32,
    pub proposal_threshold: u32,
    pub quorum_bps: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PauseConfig {
    pub is_paused: bool,
    pub pause_duration: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ValidationConfig {
    pub max_supply_cap: i128,
    pub max_borrow_cap: i128,
}
