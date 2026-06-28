//! Interest Index Engine models.

use soroban_sdk::contracttype;
use udonfi_shared::{BasisPoints, LedgerSequence, Ray, Wad, RAY};

pub const INTEREST_ENGINE_VERSION: u32 = 1;
pub const LEDGERS_PER_YEAR: i128 = 6_307_200;
pub const BPS_DENOMINATOR: i128 = 10_000;

pub const DEFAULT_OPTIMAL_UTILIZATION_BPS: u32 = 8_000;
pub const DEFAULT_BASE_RATE_BPS: u32 = 100;
pub const DEFAULT_SLOPE1_BPS: u32 = 400;
pub const DEFAULT_SLOPE2_BPS: u32 = 8_500;
pub const DEFAULT_MAX_BORROW_RATE_BPS: u32 = 9_000;
pub const DEFAULT_RESERVE_FACTOR_BPS: u32 = 1_000;

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct InterestRateModel {
    pub base_rate: Ray,
    pub slope1: Ray,
    pub slope2: Ray,
    pub optimal_utilization: Ray,
    pub max_borrow_rate: Ray,
    pub reserve_factor: Ray,
}

impl InterestRateModel {
    pub fn new(
        base_rate: Ray,
        slope1: Ray,
        slope2: Ray,
        optimal_utilization: Ray,
        max_borrow_rate: Ray,
        reserve_factor: Ray,
    ) -> Self {
        Self {
            base_rate,
            slope1,
            slope2,
            optimal_utilization,
            max_borrow_rate,
            reserve_factor,
        }
    }
}

impl Default for InterestRateModel {
    fn default() -> Self {
        Self {
            base_rate: bps_to_ray_unchecked(DEFAULT_BASE_RATE_BPS),
            slope1: bps_to_ray_unchecked(DEFAULT_SLOPE1_BPS),
            slope2: bps_to_ray_unchecked(DEFAULT_SLOPE2_BPS),
            optimal_utilization: bps_to_ray_unchecked(DEFAULT_OPTIMAL_UTILIZATION_BPS),
            max_borrow_rate: bps_to_ray_unchecked(DEFAULT_MAX_BORROW_RATE_BPS),
            reserve_factor: bps_to_ray_unchecked(DEFAULT_RESERVE_FACTOR_BPS),
        }
    }
}

impl From<udonfi_config_engine::InterestConfig> for InterestRateModel {
    fn from(config: udonfi_config_engine::InterestConfig) -> Self {
        Self {
            base_rate: bps_to_ray_unchecked(config.base_rate_bps.0),
            slope1: bps_to_ray_unchecked(config.slope1_bps.0),
            slope2: bps_to_ray_unchecked(config.slope2_bps.0),
            optimal_utilization: bps_to_ray_unchecked(config.optimal_utilization_bps.0),
            max_borrow_rate: bps_to_ray_unchecked(config.max_borrow_rate_bps.0),
            reserve_factor: bps_to_ray_unchecked(config.reserve_factor_bps.0),
        }
    }
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct InterestState {
    pub supply_index: Ray,
    pub borrow_index: Ray,
    pub utilization_rate: Ray,
    pub borrow_rate: Ray,
    pub supply_rate: Ray,
    pub reserve_factor: Ray,
    pub last_accrual_ledger: LedgerSequence,
    pub current_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct IndexUpdateResult {
    pub previous_supply_index: Ray,
    pub previous_borrow_index: Ray,
    pub new_supply_index: Ray,
    pub new_borrow_index: Ray,
    pub delta_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct InterestAccrualResult {
    pub total_supply: Wad,
    pub total_borrow: Wad,
    pub utilization_rate: Ray,
    pub borrow_rate: Ray,
    pub supply_rate: Ray,
    pub previous_supply_index: Ray,
    pub previous_borrow_index: Ray,
    pub new_supply_index: Ray,
    pub new_borrow_index: Ray,
    pub last_accrual_ledger: LedgerSequence,
    pub current_ledger: LedgerSequence,
    pub delta_ledger: LedgerSequence,
}

pub fn bps_to_ray_unchecked(bps: u32) -> Ray {
    Ray((bps as i128 * RAY) / BPS_DENOMINATOR)
}

pub fn bps_to_ray(bps: BasisPoints) -> Result<Ray, udonfi_shared::LendingError> {
    if bps.0 > BPS_DENOMINATOR as u32 {
        return Err(udonfi_shared::LendingError::InvalidAmount);
    }
    Ok(bps_to_ray_unchecked(bps.0))
}
