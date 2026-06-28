//! Interest index accrual calculations.

use crate::errors::{InterestResult, LendingError};
use crate::model::{IndexUpdateResult, InterestState, LEDGERS_PER_YEAR};
use crate::validation::{validate_index_monotonicity, validate_interest_state};
use udonfi_accounting::shares::{mul_div_down, mul_div_up};
use udonfi_shared::{LedgerSequence, Ray, RAY};

pub fn delta_ledger(
    last_accrual_ledger: LedgerSequence,
    current_ledger: LedgerSequence,
) -> InterestResult<LedgerSequence> {
    if current_ledger.0 < last_accrual_ledger.0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(LedgerSequence(current_ledger.0 - last_accrual_ledger.0))
}

pub fn update_borrow_index(
    previous_borrow_index: Ray,
    borrow_rate: Ray,
    delta_ledger: LedgerSequence,
) -> InterestResult<Ray> {
    if previous_borrow_index.0 <= 0 {
        return Err(LendingError::InvalidInterestRateConfig);
    }
    if borrow_rate.0 < 0 {
        return Err(LendingError::InvalidAmount);
    }
    if delta_ledger.0 == 0 || borrow_rate.0 == 0 {
        return Ok(previous_borrow_index);
    }

    let rate_delta = mul_div_up(borrow_rate.0, delta_ledger.0 as i128, LEDGERS_PER_YEAR)?;
    let factor = RAY
        .checked_add(rate_delta)
        .ok_or(LendingError::MathOverflow)?;
    let next = mul_div_up(previous_borrow_index.0, factor, RAY)?;
    Ok(Ray(next))
}

pub fn update_supply_index(
    previous_supply_index: Ray,
    supply_rate: Ray,
    delta_ledger: LedgerSequence,
) -> InterestResult<Ray> {
    if previous_supply_index.0 <= 0 {
        return Err(LendingError::InvalidInterestRateConfig);
    }
    if supply_rate.0 < 0 {
        return Err(LendingError::InvalidAmount);
    }
    if delta_ledger.0 == 0 || supply_rate.0 == 0 {
        return Ok(previous_supply_index);
    }

    let rate_delta = mul_div_down(supply_rate.0, delta_ledger.0 as i128, LEDGERS_PER_YEAR)?;
    let factor = RAY
        .checked_add(rate_delta)
        .ok_or(LendingError::MathOverflow)?;
    let next = mul_div_down(previous_supply_index.0, factor, RAY)?;
    Ok(Ray(next))
}

pub fn update_indices(state: &InterestState) -> InterestResult<IndexUpdateResult> {
    validate_interest_state(state)?;
    let delta = delta_ledger(state.last_accrual_ledger, state.current_ledger)?;
    let new_borrow_index = update_borrow_index(state.borrow_index, state.borrow_rate, delta)?;
    let new_supply_index = update_supply_index(state.supply_index, state.supply_rate, delta)?;
    validate_index_monotonicity(
        state.supply_index,
        state.borrow_index,
        new_supply_index,
        new_borrow_index,
    )?;

    Ok(IndexUpdateResult {
        previous_supply_index: state.supply_index,
        previous_borrow_index: state.borrow_index,
        new_supply_index,
        new_borrow_index,
        delta_ledger: delta,
    })
}
