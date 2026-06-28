//! Insurance fund accounting primitives.

use crate::bad_debt;
use crate::balance::{checked_add_wad, validate_wad_amount};
use crate::errors::AccountingResult;
use crate::model::{AccountingLedger, ReserveAccounting};
use udonfi_shared::{LedgerSequence, ScaledDebt, Wad};

pub fn increase_insurance_balance(
    ledger: &mut AccountingLedger,
    amount: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_wad_amount(amount)?;

    let insurance_balance = checked_add_wad(ledger.insurance_fund_balance, amount)?;
    let protocol_equity = checked_add_wad(ledger.protocol_equity, amount)?;

    ledger.insurance_fund_balance = insurance_balance;
    ledger.protocol_equity = protocol_equity;
    ledger.touch(current_ledger);

    Ok(())
}

pub fn accrue_to_insurance(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    amount: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_wad_amount(amount)?;

    let reserve_insurance = checked_add_wad(reserve.accrued_to_insurance, amount)?;
    let insurance_balance = checked_add_wad(ledger.insurance_fund_balance, amount)?;
    let protocol_equity = checked_add_wad(ledger.protocol_equity, amount)?;

    reserve.accrued_to_insurance = reserve_insurance;
    ledger.insurance_fund_balance = insurance_balance;
    ledger.protocol_equity = protocol_equity;
    reserve.touch(current_ledger);
    ledger.touch(current_ledger);

    Ok(())
}

pub fn cover_bad_debt(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    amount: Wad,
    scaled_debt_to_clear: ScaledDebt,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    bad_debt::cover_bad_debt_from_insurance(
        ledger,
        reserve,
        amount,
        scaled_debt_to_clear,
        current_ledger,
    )
}
