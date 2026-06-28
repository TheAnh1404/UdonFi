//! Interest Engine validation helpers.

use crate::errors::{InterestResult, LendingError};
use crate::model::{InterestRateModel, InterestState};
use udonfi_shared::{Ray, RAY};

pub fn validate_ray_non_negative(value: Ray) -> InterestResult<()> {
    if value.0 < 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_positive_index(index: Ray) -> InterestResult<()> {
    if index.0 <= 0 {
        return Err(LendingError::InvalidInterestRateConfig);
    }
    Ok(())
}

pub fn validate_rate_model(model: &InterestRateModel) -> InterestResult<()> {
    validate_ray_non_negative(model.base_rate)?;
    validate_ray_non_negative(model.slope1)?;
    validate_ray_non_negative(model.slope2)?;
    validate_ray_non_negative(model.max_borrow_rate)?;
    validate_ray_non_negative(model.reserve_factor)?;

    if model.optimal_utilization.0 <= 0 || model.optimal_utilization.0 > RAY {
        return Err(LendingError::InvalidOptimalUtilization);
    }
    if model.max_borrow_rate.0 <= 0 || model.max_borrow_rate.0 > RAY {
        return Err(LendingError::InvalidInterestRateConfig);
    }
    if model.reserve_factor.0 > RAY {
        return Err(LendingError::InvalidReserveFactor);
    }
    Ok(())
}

pub fn validate_interest_state(state: &InterestState) -> InterestResult<()> {
    validate_positive_index(state.supply_index)?;
    validate_positive_index(state.borrow_index)?;
    validate_ray_non_negative(state.utilization_rate)?;
    validate_ray_non_negative(state.borrow_rate)?;
    validate_ray_non_negative(state.supply_rate)?;
    validate_ray_non_negative(state.reserve_factor)?;

    if state.utilization_rate.0 > RAY {
        return Err(LendingError::InvalidAmount);
    }
    if state.reserve_factor.0 > RAY {
        return Err(LendingError::InvalidReserveFactor);
    }
    if state.supply_rate.0 > state.borrow_rate.0 {
        return Err(LendingError::InvalidInterestRateConfig);
    }
    if state.current_ledger.0 < state.last_accrual_ledger.0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_index_monotonicity(
    old_supply_index: Ray,
    old_borrow_index: Ray,
    new_supply_index: Ray,
    new_borrow_index: Ray,
) -> InterestResult<()> {
    validate_positive_index(old_supply_index)?;
    validate_positive_index(old_borrow_index)?;
    validate_positive_index(new_supply_index)?;
    validate_positive_index(new_borrow_index)?;

    if new_supply_index.0 < old_supply_index.0 || new_borrow_index.0 < old_borrow_index.0 {
        return Err(LendingError::InvalidInterestRateConfig);
    }
    Ok(())
}
