//! Reusable insurance-fund accounting operations.

use crate::balance::validate_wad_amount;
use crate::errors::AccountingResult;
use crate::insurance::accrue_to_insurance;
use crate::model::{AccountingLedger, ReserveAccounting};
use crate::operations::{validate_operation_context, validate_operation_post_state};
use soroban_sdk::contracttype;
use udonfi_shared::{LedgerSequence, ReserveId, Wad};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InsuranceAccountingResult {
    pub reserve_id: ReserveId,
    pub previous_reserve_insurance: Wad,
    pub updated_reserve_insurance: Wad,
    pub previous_insurance_balance: Wad,
    pub updated_insurance_balance: Wad,
    pub delta: Wad,
    pub current_ledger: LedgerSequence,
    pub accounting_version: u32,
}

pub fn apply_insurance_accrual(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    delta: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<InsuranceAccountingResult> {
    validate_operation_context(ledger, reserve, current_ledger)?;
    validate_wad_amount(delta)?;

    let previous_reserve_insurance = reserve.accrued_to_insurance;
    let previous_insurance_balance = ledger.insurance_fund_balance;

    accrue_to_insurance(ledger, reserve, delta, current_ledger)?;
    validate_operation_post_state(ledger, reserve)?;

    Ok(InsuranceAccountingResult {
        reserve_id: reserve.reserve_id,
        previous_reserve_insurance,
        updated_reserve_insurance: reserve.accrued_to_insurance,
        previous_insurance_balance,
        updated_insurance_balance: ledger.insurance_fund_balance,
        delta,
        current_ledger,
        accounting_version: ledger.accounting_version,
    })
}
