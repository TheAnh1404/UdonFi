//! Reusable debt-side accounting operations.

use crate::balance::validate_wad_amount;
use crate::debt::{decrease_scaled_debt, increase_scaled_debt};
use crate::errors::AccountingResult;
use crate::model::{AccountingLedger, ReserveAccounting};
use crate::operations::{
    ensure_positive_delta_has_debt_shares, ensure_scaled_debt_available, validate_borrow_cap,
    validate_operation_context, validate_operation_post_state,
};
use crate::shares::actual_debt_to_scaled;
use soroban_sdk::contracttype;
use udonfi_shared::{LedgerSequence, ReserveId, ScaledDebt, Wad};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DebtAccountingResult {
    pub reserve_id: ReserveId,
    pub previous_scaled_debt: ScaledDebt,
    pub updated_scaled_debt: ScaledDebt,
    pub scaled_delta: ScaledDebt,
    pub previous_actual_debt: Wad,
    pub updated_actual_debt: Wad,
    pub actual_delta: Wad,
    pub current_ledger: LedgerSequence,
    pub accounting_version: u32,
}

pub fn apply_debt_increase(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    actual_delta: Wad,
    borrow_cap: Option<Wad>,
    current_ledger: LedgerSequence,
) -> AccountingResult<DebtAccountingResult> {
    validate_operation_context(ledger, reserve, current_ledger)?;
    validate_wad_amount(actual_delta)?;
    validate_borrow_cap(reserve.total_actual_debt, actual_delta, borrow_cap)?;

    let previous_scaled_debt = reserve.total_scaled_debt;
    let previous_actual_debt = reserve.total_actual_debt;
    let scaled_delta = actual_debt_to_scaled(actual_delta, reserve.borrow_index)?;
    ensure_positive_delta_has_debt_shares(actual_delta, scaled_delta)?;

    increase_scaled_debt(ledger, reserve, scaled_delta, actual_delta, current_ledger)?;
    validate_operation_post_state(ledger, reserve)?;

    Ok(DebtAccountingResult {
        reserve_id: reserve.reserve_id,
        previous_scaled_debt,
        updated_scaled_debt: reserve.total_scaled_debt,
        scaled_delta,
        previous_actual_debt,
        updated_actual_debt: reserve.total_actual_debt,
        actual_delta,
        current_ledger,
        accounting_version: ledger.accounting_version,
    })
}

pub fn apply_debt_decrease(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    actual_delta: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<DebtAccountingResult> {
    validate_operation_context(ledger, reserve, current_ledger)?;
    validate_wad_amount(actual_delta)?;

    let previous_scaled_debt = reserve.total_scaled_debt;
    let previous_actual_debt = reserve.total_actual_debt;
    let scaled_delta = actual_debt_to_scaled(actual_delta, reserve.borrow_index)?;
    ensure_positive_delta_has_debt_shares(actual_delta, scaled_delta)?;
    ensure_scaled_debt_available(ledger, reserve, scaled_delta, actual_delta)?;

    decrease_scaled_debt(ledger, reserve, scaled_delta, actual_delta, current_ledger)?;
    validate_operation_post_state(ledger, reserve)?;

    Ok(DebtAccountingResult {
        reserve_id: reserve.reserve_id,
        previous_scaled_debt,
        updated_scaled_debt: reserve.total_scaled_debt,
        scaled_delta,
        previous_actual_debt,
        updated_actual_debt: reserve.total_actual_debt,
        actual_delta,
        current_ledger,
        accounting_version: ledger.accounting_version,
    })
}
