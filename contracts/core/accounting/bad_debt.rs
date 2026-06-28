//! Bad debt tracking primitives.

use crate::balance::{
    checked_add_wad, checked_sub_scaled_debt, checked_sub_wad, validate_scaled_debt_amount,
    validate_wad_amount,
};
use crate::errors::{AccountingResult, LendingError};
use crate::model::{AccountingLedger, ReserveAccounting};
use udonfi_shared::{LedgerSequence, ScaledDebt, Wad};

pub fn record_bad_debt(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    amount: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_wad_amount(amount)?;

    let reserve_bad_debt = checked_add_wad(reserve.bad_debt, amount)?;
    if reserve_bad_debt.0 > reserve.total_actual_debt.0 {
        return Err(LendingError::InvalidAmount);
    }
    let ledger_bad_debt = checked_add_wad(ledger.total_bad_debt, amount)?;

    reserve.bad_debt = reserve_bad_debt;
    ledger.total_bad_debt = ledger_bad_debt;
    reserve.touch(current_ledger);
    ledger.touch(current_ledger);

    Ok(())
}

pub fn reduce_bad_debt(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    amount: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_wad_amount(amount)?;

    let reserve_bad_debt = checked_sub_wad(reserve.bad_debt, amount)?;
    let ledger_bad_debt = checked_sub_wad(ledger.total_bad_debt, amount)?;

    reserve.bad_debt = reserve_bad_debt;
    ledger.total_bad_debt = ledger_bad_debt;
    reserve.touch(current_ledger);
    ledger.touch(current_ledger);

    Ok(())
}

pub fn get_bad_debt(reserve: &ReserveAccounting) -> Wad {
    reserve.bad_debt
}

pub fn cover_bad_debt_from_insurance(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    amount: Wad,
    scaled_debt_to_clear: ScaledDebt,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_wad_amount(amount)?;
    validate_scaled_debt_amount(scaled_debt_to_clear)?;
    if amount.0 > 0 && scaled_debt_to_clear.0 == 0 {
        return Err(LendingError::InvalidAmount);
    }
    if amount.0 > ledger.insurance_fund_balance.0 || amount.0 > reserve.accrued_to_insurance.0 {
        return Err(LendingError::InsufficientLiquidity);
    }

    let reserve_bad_debt = checked_sub_wad(reserve.bad_debt, amount)?;
    let ledger_bad_debt = checked_sub_wad(ledger.total_bad_debt, amount)?;
    let reserve_insurance = checked_sub_wad(reserve.accrued_to_insurance, amount)?;
    let insurance_balance = checked_sub_wad(ledger.insurance_fund_balance, amount)?;
    let protocol_equity = checked_sub_wad(ledger.protocol_equity, amount)?;
    let reserve_actual_debt = checked_sub_wad(reserve.total_actual_debt, amount)?;
    let ledger_assets = checked_sub_wad(ledger.total_assets, amount)?;
    let reserve_scaled_debt =
        checked_sub_scaled_debt(reserve.total_scaled_debt, scaled_debt_to_clear)?;
    let ledger_scaled_debt =
        checked_sub_scaled_debt(ledger.total_scaled_debt, scaled_debt_to_clear)?;

    reserve.bad_debt = reserve_bad_debt;
    reserve.accrued_to_insurance = reserve_insurance;
    reserve.total_actual_debt = reserve_actual_debt;
    reserve.total_scaled_debt = reserve_scaled_debt;
    ledger.total_bad_debt = ledger_bad_debt;
    ledger.insurance_fund_balance = insurance_balance;
    ledger.protocol_equity = protocol_equity;
    ledger.total_assets = ledger_assets;
    ledger.total_scaled_debt = ledger_scaled_debt;
    reserve.touch(current_ledger);
    ledger.touch(current_ledger);

    Ok(())
}
