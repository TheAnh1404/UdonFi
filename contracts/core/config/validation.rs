//! Validation rules for protocol-wide configuration.

use crate::errors::LendingError;
use crate::model::{
    ConfigAccessControl, ConfigAuthority, ConfigUpdateContext, GovernanceConfig, InterestConfig,
    OracleConfig, ProtocolConfig, RiskConfig, ValidationConfig,
    MIN_GOVERNANCE_TIMELOCK_DELAY_LEDGERS,
};
use crate::storage::read_access_control;
use soroban_sdk::Env;
use udonfi_shared::{
    math::validation::{validate_ltv, validate_reserve_factor},
    BasisPoints, HealthFactor, LedgerSequence, PERCENTAGE_FACTOR,
};

fn validate_bps(value: BasisPoints) -> Result<(), LendingError> {
    if value.0 > PERCENTAGE_FACTOR {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

fn validate_health_factor(value: HealthFactor) -> Result<(), LendingError> {
    if value.0 <= 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

fn validate_timelock_metadata(
    env: &Env,
    context: &ConfigUpdateContext,
    governance: &GovernanceConfig,
) -> Result<(), LendingError> {
    let required_delay = governance.timelock_delay_ledgers.0;
    if required_delay == 0 || context.timelock_delay_ledgers.0 < required_delay {
        return Err(LendingError::TimelockActive);
    }
    if context.timelock_expires_at_ledger.0 > env.ledger().sequence() {
        return Err(LendingError::TimelockActive);
    }
    Ok(())
}

pub fn validate_update_context(context: &ConfigUpdateContext) -> Result<(), LendingError> {
    if context.reason.is_empty() {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn require_authority(
    env: &Env,
    context: &ConfigUpdateContext,
) -> Result<ConfigAccessControl, LendingError> {
    validate_update_context(context)?;
    context.actor.require_auth();

    let access = read_access_control(env).ok_or(LendingError::NotInitialized)?;
    match context.authority {
        ConfigAuthority::Governance => {
            udonfi_shared::validation::validate_admin(&context.actor, &access.admin)?;
        }
        ConfigAuthority::Guardian => {
            udonfi_shared::validation::validate_guardian(&context.actor, &access.guardian)?;
            if !context.emergency {
                return Err(LendingError::Unauthorized);
            }
        }
    }
    Ok(access)
}

pub fn validate_governance_constraints(
    env: &Env,
    context: &ConfigUpdateContext,
    governance: &GovernanceConfig,
    risk_increasing: bool,
) -> Result<(), LendingError> {
    if risk_increasing {
        if context.authority == ConfigAuthority::Guardian || context.emergency {
            return Err(LendingError::TimelockActive);
        }
        validate_timelock_metadata(env, context, governance)?;
    }
    Ok(())
}

pub fn validate_guardian_reduction(
    context: &ConfigUpdateContext,
    risk_reducing_or_pause_related: bool,
) -> Result<(), LendingError> {
    if context.authority == ConfigAuthority::Guardian && !risk_reducing_or_pause_related {
        return Err(LendingError::Unauthorized);
    }
    Ok(())
}

pub fn validate_protocol_config(config: &ProtocolConfig) -> Result<(), LendingError> {
    if config.protocol_version == 0 || config.config_version == 0 {
        return Err(LendingError::InvalidAmount);
    }

    validate_bps(config.protocol_fee_bps)?;
    validate_reserve_factor(config.reserve_factor_min_bps.0)?;
    validate_reserve_factor(config.reserve_factor_max_bps.0)?;

    if config.reserve_factor_max_bps.0 < config.reserve_factor_min_bps.0 {
        return Err(LendingError::InvalidReserveFactor);
    }
    if config.max_reserves == 0 || config.max_assets == 0 {
        return Err(LendingError::InvalidAmount);
    }
    if config.max_reserves > udonfi_shared::constants::MAX_RESERVES
        || config.max_assets > udonfi_shared::constants::MAX_RESERVES
    {
        return Err(LendingError::MaxReservesReached);
    }
    validate_health_factor(config.min_health_factor)?;
    if config.default_ttl.0 == 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_risk_config(config: &RiskConfig) -> Result<(), LendingError> {
    validate_ltv(config.min_ltv_bps.0)?;
    validate_ltv(config.max_ltv_bps.0)?;
    validate_bps(config.min_liquidation_threshold_bps)?;
    validate_bps(config.max_liquidation_threshold_bps)?;
    validate_bps(config.min_liquidation_bonus_bps)?;
    validate_bps(config.max_liquidation_bonus_bps)?;
    validate_bps(config.max_close_factor_bps)?;
    validate_health_factor(config.min_health_factor)?;

    if config.max_ltv_bps.0 < config.min_ltv_bps.0 {
        return Err(LendingError::InvalidLTV);
    }
    if config.max_liquidation_threshold_bps.0 < config.min_liquidation_threshold_bps.0 {
        return Err(LendingError::InvalidLiquidationThreshold);
    }
    if config.max_liquidation_bonus_bps.0 < config.min_liquidation_bonus_bps.0 {
        return Err(LendingError::InvalidLiquidationBonus);
    }
    if config.max_ltv_bps.0 >= config.max_liquidation_threshold_bps.0 {
        return Err(LendingError::InvalidLTV);
    }
    if config.min_ltv_bps.0 >= config.min_liquidation_threshold_bps.0 {
        return Err(LendingError::InvalidLTV);
    }
    if config.max_close_factor_bps.0 == 0 {
        return Err(LendingError::InvalidLiquidationThreshold);
    }
    Ok(())
}

pub fn validate_interest_config(config: &InterestConfig) -> Result<(), LendingError> {
    validate_bps(config.base_rate_bps)?;
    validate_bps(config.slope1_bps)?;
    validate_bps(config.slope2_bps)?;
    validate_bps(config.optimal_utilization_bps)?;
    validate_bps(config.max_borrow_rate_bps)?;
    validate_reserve_factor(config.reserve_factor_bps.0)?;

    if config.optimal_utilization_bps.0 == 0 {
        return Err(LendingError::InvalidOptimalUtilization);
    }

    let full_utilization_rate = config
        .base_rate_bps
        .0
        .checked_add(config.slope1_bps.0)
        .and_then(|value| value.checked_add(config.slope2_bps.0))
        .ok_or(LendingError::MathOverflow)?;
    if full_utilization_rate > config.max_borrow_rate_bps.0 {
        return Err(LendingError::InvalidInterestRateConfig);
    }
    if config.borrow_index_initial.0 <= 0 || config.supply_index_initial.0 <= 0 {
        return Err(LendingError::InvalidInterestRateConfig);
    }
    Ok(())
}

pub fn validate_oracle_config(config: &OracleConfig) -> Result<(), LendingError> {
    if config.max_price_staleness_ledgers.0 == 0 {
        return Err(LendingError::InvalidPriceAge);
    }
    validate_bps(config.max_price_deviation_bps)?;
    if config.max_price_deviation_bps.0 == 0 {
        return Err(LendingError::OraclePriceDeviationExceeded);
    }
    Ok(())
}

pub fn validate_governance_config(config: &GovernanceConfig) -> Result<(), LendingError> {
    validate_bps(config.quorum_bps)?;
    validate_bps(config.proposal_threshold_bps)?;
    if config.timelock_delay_ledgers.0 < MIN_GOVERNANCE_TIMELOCK_DELAY_LEDGERS {
        return Err(LendingError::TimelockActive);
    }
    if config.emergency_delay_ledgers.0 > config.timelock_delay_ledgers.0 {
        return Err(LendingError::TimelockActive);
    }
    if config.quorum_bps.0 == 0 || config.proposal_threshold_bps.0 == 0 {
        return Err(LendingError::ProposalThresholdNotMet);
    }
    Ok(())
}

pub fn validate_validation_config(config: &ValidationConfig) -> Result<(), LendingError> {
    if config.min_deposit_amount.0 <= 0
        || config.min_borrow_amount.0 <= 0
        || config.min_repay_amount.0 <= 0
        || config.max_transaction_amount.0 <= 0
        || config.dust_threshold.0 < 0
    {
        return Err(LendingError::InvalidAmount);
    }
    if config.max_transaction_amount.0 < config.min_deposit_amount.0
        || config.max_transaction_amount.0 < config.min_borrow_amount.0
        || config.max_transaction_amount.0 < config.min_repay_amount.0
    {
        return Err(LendingError::InvalidAmount);
    }
    if config.dust_threshold.0 > config.min_deposit_amount.0
        || config.dust_threshold.0 > config.min_borrow_amount.0
        || config.dust_threshold.0 > config.min_repay_amount.0
    {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn protocol_change_increases_risk(current: &ProtocolConfig, next: &ProtocolConfig) -> bool {
    next.protocol_fee_bps.0 > current.protocol_fee_bps.0
        || next.reserve_factor_min_bps.0 < current.reserve_factor_min_bps.0
        || next.reserve_factor_max_bps.0 > current.reserve_factor_max_bps.0
        || next.max_reserves > current.max_reserves
        || next.max_assets > current.max_assets
        || next.min_health_factor.0 < current.min_health_factor.0
        || next.default_ttl.0 < current.default_ttl.0
        || (!next.emergency_mode_enabled && current.emergency_mode_enabled)
}

pub fn protocol_change_reduces_risk_or_pauses(
    current: &ProtocolConfig,
    next: &ProtocolConfig,
) -> bool {
    next.protocol_fee_bps.0 <= current.protocol_fee_bps.0
        && next.reserve_factor_min_bps.0 >= current.reserve_factor_min_bps.0
        && next.reserve_factor_max_bps.0 <= current.reserve_factor_max_bps.0
        && next.max_reserves <= current.max_reserves
        && next.max_assets <= current.max_assets
        && next.min_health_factor.0 >= current.min_health_factor.0
        && next.default_ttl.0 >= current.default_ttl.0
        && (next.emergency_mode_enabled || !current.emergency_mode_enabled)
}

pub fn risk_change_increases_risk(current: &RiskConfig, next: &RiskConfig) -> bool {
    next.max_ltv_bps.0 > current.max_ltv_bps.0
        || next.max_liquidation_threshold_bps.0 > current.max_liquidation_threshold_bps.0
        || next.min_liquidation_bonus_bps.0 < current.min_liquidation_bonus_bps.0
        || next.max_liquidation_bonus_bps.0 < current.max_liquidation_bonus_bps.0
        || next.max_close_factor_bps.0 < current.max_close_factor_bps.0
        || next.min_health_factor.0 < current.min_health_factor.0
}

pub fn risk_change_reduces_risk(current: &RiskConfig, next: &RiskConfig) -> bool {
    next.max_ltv_bps.0 <= current.max_ltv_bps.0
        && next.max_liquidation_threshold_bps.0 <= current.max_liquidation_threshold_bps.0
        && next.min_liquidation_bonus_bps.0 >= current.min_liquidation_bonus_bps.0
        && next.max_liquidation_bonus_bps.0 >= current.max_liquidation_bonus_bps.0
        && next.max_close_factor_bps.0 >= current.max_close_factor_bps.0
        && next.min_health_factor.0 >= current.min_health_factor.0
}

pub fn interest_change_increases_risk(current: &InterestConfig, next: &InterestConfig) -> bool {
    next.base_rate_bps.0 > current.base_rate_bps.0
        || next.slope1_bps.0 > current.slope1_bps.0
        || next.slope2_bps.0 > current.slope2_bps.0
        || next.max_borrow_rate_bps.0 > current.max_borrow_rate_bps.0
        || next.reserve_factor_bps.0 < current.reserve_factor_bps.0
}

pub fn interest_change_reduces_risk(current: &InterestConfig, next: &InterestConfig) -> bool {
    next.base_rate_bps.0 <= current.base_rate_bps.0
        && next.slope1_bps.0 <= current.slope1_bps.0
        && next.slope2_bps.0 <= current.slope2_bps.0
        && next.max_borrow_rate_bps.0 <= current.max_borrow_rate_bps.0
        && next.reserve_factor_bps.0 >= current.reserve_factor_bps.0
}

pub fn oracle_change_increases_risk(current: &OracleConfig, next: &OracleConfig) -> bool {
    next.max_price_staleness_ledgers.0 > current.max_price_staleness_ledgers.0
        || next.max_price_deviation_bps.0 > current.max_price_deviation_bps.0
        || (!next.fallback_enabled && current.fallback_enabled)
        || (!next.twap_enabled && current.twap_enabled)
        || (!next.circuit_breaker_enabled && current.circuit_breaker_enabled)
        || (!next.emergency_price_freeze_enabled && current.emergency_price_freeze_enabled)
}

pub fn oracle_change_reduces_risk(current: &OracleConfig, next: &OracleConfig) -> bool {
    next.max_price_staleness_ledgers.0 <= current.max_price_staleness_ledgers.0
        && next.max_price_deviation_bps.0 <= current.max_price_deviation_bps.0
        && (next.fallback_enabled || !current.fallback_enabled)
        && (next.twap_enabled || !current.twap_enabled)
        && (next.circuit_breaker_enabled || !current.circuit_breaker_enabled)
        && (next.emergency_price_freeze_enabled || !current.emergency_price_freeze_enabled)
}

pub fn governance_change_increases_risk(
    current: &GovernanceConfig,
    next: &GovernanceConfig,
) -> bool {
    next.timelock_delay_ledgers.0 < current.timelock_delay_ledgers.0
        || next.emergency_delay_ledgers.0 < current.emergency_delay_ledgers.0
        || next.quorum_bps.0 < current.quorum_bps.0
        || next.proposal_threshold_bps.0 < current.proposal_threshold_bps.0
        || (!next.guardian_can_reduce_risk && current.guardian_can_reduce_risk)
        || (!next.guardian_can_pause && current.guardian_can_pause)
}

pub fn validation_change_increases_risk(
    current: &ValidationConfig,
    next: &ValidationConfig,
) -> bool {
    next.min_deposit_amount.0 < current.min_deposit_amount.0
        || next.min_borrow_amount.0 < current.min_borrow_amount.0
        || next.min_repay_amount.0 < current.min_repay_amount.0
        || next.max_transaction_amount.0 > current.max_transaction_amount.0
        || next.dust_threshold.0 < current.dust_threshold.0
}

pub fn validation_change_reduces_risk(current: &ValidationConfig, next: &ValidationConfig) -> bool {
    next.min_deposit_amount.0 >= current.min_deposit_amount.0
        && next.min_borrow_amount.0 >= current.min_borrow_amount.0
        && next.min_repay_amount.0 >= current.min_repay_amount.0
        && next.max_transaction_amount.0 <= current.max_transaction_amount.0
        && next.dust_threshold.0 >= current.dust_threshold.0
}

pub fn ledger_sequence(value: u32) -> LedgerSequence {
    LedgerSequence(value)
}
