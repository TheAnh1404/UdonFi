//! Reusable bad-debt accounting operations.

use crate::bad_debt::{cover_bad_debt_from_insurance, record_bad_debt};
use crate::balance::validate_wad_amount;
use crate::errors::AccountingResult;
use crate::model::{AccountingLedger, ReserveAccounting};
use crate::operations::{
    ensure_insurance_coverage_available, ensure_positive_delta_has_debt_shares,
    validate_operation_context, validate_operation_post_state,
};
use crate::shares::actual_debt_to_scaled;
use soroban_sdk::contracttype;
use udonfi_shared::{LedgerSequence, ReserveId, ScaledDebt, Wad};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadDebtAccountingResult {
    pub reserve_id: ReserveId,
    pub previous_bad_debt: Wad,
    pub updated_bad_debt: Wad,
    pub delta: Wad,
    pub previous_insurance_balance: Wad,
    pub updated_insurance_balance: Wad,
    pub previous_actual_debt: Wad,
    pub updated_actual_debt: Wad,
    pub scaled_debt_delta: ScaledDebt,
    pub current_ledger: LedgerSequence,
    pub accounting_version: u32,
}

pub fn apply_bad_debt_recording(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    delta: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<BadDebtAccountingResult> {
    validate_operation_context(ledger, reserve, current_ledger)?;
    validate_wad_amount(delta)?;

    let previous_bad_debt = reserve.bad_debt;
    let previous_insurance_balance = ledger.insurance_fund_balance;
    let previous_actual_debt = reserve.total_actual_debt;

    record_bad_debt(ledger, reserve, delta, current_ledger)?;
    validate_operation_post_state(ledger, reserve)?;

    Ok(BadDebtAccountingResult {
        reserve_id: reserve.reserve_id,
        previous_bad_debt,
        updated_bad_debt: reserve.bad_debt,
        delta,
        previous_insurance_balance,
        updated_insurance_balance: ledger.insurance_fund_balance,
        previous_actual_debt,
        updated_actual_debt: reserve.total_actual_debt,
        scaled_debt_delta: ScaledDebt(0),
        current_ledger,
        accounting_version: ledger.accounting_version,
    })
}

pub fn apply_bad_debt_coverage(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    delta: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<BadDebtAccountingResult> {
    validate_operation_context(ledger, reserve, current_ledger)?;
    validate_wad_amount(delta)?;
    ensure_insurance_coverage_available(ledger, reserve, delta)?;

    let previous_bad_debt = reserve.bad_debt;
    let previous_insurance_balance = ledger.insurance_fund_balance;
    let previous_actual_debt = reserve.total_actual_debt;
    let scaled_debt_delta = actual_debt_to_scaled(delta, reserve.borrow_index)?;
    ensure_positive_delta_has_debt_shares(delta, scaled_debt_delta)?;

    cover_bad_debt_from_insurance(ledger, reserve, delta, scaled_debt_delta, current_ledger)?;
    validate_operation_post_state(ledger, reserve)?;

    Ok(BadDebtAccountingResult {
        reserve_id: reserve.reserve_id,
        previous_bad_debt,
        updated_bad_debt: reserve.bad_debt,
        delta,
        previous_insurance_balance,
        updated_insurance_balance: ledger.insurance_fund_balance,
        previous_actual_debt,
        updated_actual_debt: reserve.total_actual_debt,
        scaled_debt_delta,
        current_ledger,
        accounting_version: ledger.accounting_version,
    })
}
