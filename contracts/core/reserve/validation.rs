//! Validation rules for registry operations.

use crate::errors::LendingError;
use crate::model::ReserveStatus;

/// Validates decimal configuration (typically 0-18).
pub fn validate_decimals(decimals: u32) -> Result<(), LendingError> {
    if decimals > 18 {
        return Err(LendingError::InvalidPrecision);
    }
    Ok(())
}

/// Validates that LTV is strictly less than the Liquidation Threshold (INV-RSK-007)
/// and that both parameters are within acceptable bounds.
pub fn validate_ltv_and_threshold(ltv: u32, threshold: u32) -> Result<(), LendingError> {
    udonfi_shared::math::validation::validate_ltv(ltv)?;

    if threshold > 10000 {
        return Err(LendingError::InvalidLiquidationThreshold);
    }

    if ltv >= threshold {
        return Err(LendingError::InvalidLTV);
    }
    Ok(())
}

/// Validates that the liquidation bonus is within acceptable basis point bounds (<= 100%).
pub fn validate_liquidation_bonus(bonus: u32) -> Result<(), LendingError> {
    if bonus > 10000 {
        return Err(LendingError::InvalidLiquidationBonus);
    }
    Ok(())
}

/// Validates reserve configuration bounds.
pub fn validate_caps(supply_cap: i128, borrow_cap: i128) -> Result<(), LendingError> {
    if supply_cap < 0 || borrow_cap < 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

/// Validates reserve state transition rules.
///
/// Permitted transitions:
/// - Uninitialized -> Active
/// - Active -> Frozen, Paused, Deprecated
/// - Frozen -> Active, Paused, Deprecated
/// - Paused -> Active, Frozen, Deprecated
/// - Deprecated -> (Terminal state, no transitions out of Deprecated)
pub fn validate_state_transition(
    from: ReserveStatus,
    to: ReserveStatus,
) -> Result<(), LendingError> {
    if from == to {
        return Ok(()); // No-op is valid
    }
    match (from, to) {
        (ReserveStatus::Uninitialized, ReserveStatus::Active) => Ok(()),
        (ReserveStatus::Active, ReserveStatus::Frozen) => Ok(()),
        (ReserveStatus::Active, ReserveStatus::Paused) => Ok(()),
        (ReserveStatus::Active, ReserveStatus::Deprecated) => Ok(()),
        (ReserveStatus::Frozen, ReserveStatus::Active) => Ok(()),
        (ReserveStatus::Paused, ReserveStatus::Active) => Ok(()),
        _ => Err(LendingError::ReserveNotActive),
    }
}
