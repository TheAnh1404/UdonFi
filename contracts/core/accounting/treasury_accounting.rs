//! Reusable treasury accounting operations.

use crate::balance::validate_wad_amount;
use crate::errors::AccountingResult;
use crate::model::{AccountingLedger, ReserveAccounting};
use crate::operations::{validate_operation_context, validate_operation_post_state};
use crate::treasury::accrue_to_treasury;
use soroban_sdk::contracttype;
use udonfi_shared::{LedgerSequence, ReserveId, Wad};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TreasuryAccountingResult {
    pub reserve_id: ReserveId,
    pub previous_reserve_treasury: Wad,
    pub updated_reserve_treasury: Wad,
    pub previous_treasury_balance: Wad,
    pub updated_treasury_balance: Wad,
    pub delta: Wad,
    pub current_ledger: LedgerSequence,
    pub accounting_version: u32,
}

pub fn apply_treasury_accrual(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    delta: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<TreasuryAccountingResult> {
    validate_operation_context(ledger, reserve, current_ledger)?;
    validate_wad_amount(delta)?;

    let previous_reserve_treasury = reserve.accrued_to_treasury;
    let previous_treasury_balance = ledger.treasury_balance;

    accrue_to_treasury(ledger, reserve, delta, current_ledger)?;
    validate_operation_post_state(ledger, reserve)?;

    Ok(TreasuryAccountingResult {
        reserve_id: reserve.reserve_id,
        previous_reserve_treasury,
        updated_reserve_treasury: reserve.accrued_to_treasury,
        previous_treasury_balance,
        updated_treasury_balance: ledger.treasury_balance,
        delta,
        current_ledger,
        accounting_version: ledger.accounting_version,
    })
}
