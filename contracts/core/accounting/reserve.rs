//! Reserve-level accounting helpers.

use crate::errors::{AccountingResult, LendingError};
use crate::model::ReserveAccounting;
use crate::shares::{scaled_debt_to_actual, scaled_supply_to_actual};
use udonfi_shared::{LedgerSequence, Ray, ReserveId};

pub fn new_reserve_accounting(
    reserve_id: ReserveId,
    current_ledger: LedgerSequence,
) -> ReserveAccounting {
    ReserveAccounting::new(reserve_id, current_ledger)
}

pub fn set_reserve_indices(
    reserve: &mut ReserveAccounting,
    supply_index: Ray,
    borrow_index: Ray,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    if supply_index.0 <= 0 || borrow_index.0 <= 0 {
        return Err(LendingError::DivisionByZero);
    }
    if supply_index.0 < reserve.supply_index.0 || borrow_index.0 < reserve.borrow_index.0 {
        return Err(LendingError::InvalidAmount);
    }

    reserve.supply_index = supply_index;
    reserve.borrow_index = borrow_index;
    reserve.touch(current_ledger);
    Ok(())
}

pub fn refresh_actual_balances_from_indices(
    reserve: &mut ReserveAccounting,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    reserve.total_actual_supply =
        scaled_supply_to_actual(reserve.total_scaled_supply, reserve.supply_index)?;
    reserve.total_actual_debt =
        scaled_debt_to_actual(reserve.total_scaled_debt, reserve.borrow_index)?;
    reserve.touch(current_ledger);
    Ok(())
}
