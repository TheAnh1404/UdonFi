//! Debt accounting primitives.

use crate::balance::{
    checked_add_scaled_debt, checked_add_wad, checked_sub_scaled_debt, checked_sub_wad,
    validate_scaled_debt_amount, validate_wad_amount,
};
use crate::errors::AccountingResult;
use crate::model::{AccountingLedger, ReserveAccounting};
use udonfi_shared::{LedgerSequence, ScaledDebt, Wad};

pub fn increase_scaled_debt(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    scaled_amount: ScaledDebt,
    actual_amount: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_scaled_debt_amount(scaled_amount)?;
    validate_wad_amount(actual_amount)?;

    let reserve_scaled_debt = checked_add_scaled_debt(reserve.total_scaled_debt, scaled_amount)?;
    let reserve_actual_debt = checked_add_wad(reserve.total_actual_debt, actual_amount)?;
    let ledger_scaled_debt = checked_add_scaled_debt(ledger.total_scaled_debt, scaled_amount)?;
    let ledger_total_assets = checked_add_wad(ledger.total_assets, actual_amount)?;

    reserve.total_scaled_debt = reserve_scaled_debt;
    reserve.total_actual_debt = reserve_actual_debt;
    ledger.total_scaled_debt = ledger_scaled_debt;
    ledger.total_assets = ledger_total_assets;
    reserve.touch(current_ledger);
    ledger.touch(current_ledger);

    Ok(())
}

pub fn decrease_scaled_debt(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    scaled_amount: ScaledDebt,
    actual_amount: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_scaled_debt_amount(scaled_amount)?;
    validate_wad_amount(actual_amount)?;

    let reserve_scaled_debt = checked_sub_scaled_debt(reserve.total_scaled_debt, scaled_amount)?;
    let reserve_actual_debt = checked_sub_wad(reserve.total_actual_debt, actual_amount)?;
    let ledger_scaled_debt = checked_sub_scaled_debt(ledger.total_scaled_debt, scaled_amount)?;
    let ledger_total_assets = checked_sub_wad(ledger.total_assets, actual_amount)?;

    reserve.total_scaled_debt = reserve_scaled_debt;
    reserve.total_actual_debt = reserve_actual_debt;
    ledger.total_scaled_debt = ledger_scaled_debt;
    ledger.total_assets = ledger_total_assets;
    reserve.touch(current_ledger);
    ledger.touch(current_ledger);

    Ok(())
}
