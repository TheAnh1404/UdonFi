//! Reusable liquidity accounting operations.

use crate::balance::{decrease_liquidity, increase_liquidity, validate_wad_amount};
use crate::errors::AccountingResult;
use crate::model::{AccountingLedger, ReserveAccounting};
use crate::operations::{validate_operation_context, validate_operation_post_state};
use soroban_sdk::contracttype;
use udonfi_shared::{LedgerSequence, ReserveId, Wad};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LiquidityAccountingResult {
    pub reserve_id: ReserveId,
    pub previous_total_liquidity: Wad,
    pub updated_total_liquidity: Wad,
    pub previous_available_liquidity: Wad,
    pub updated_available_liquidity: Wad,
    pub delta: Wad,
    pub current_ledger: LedgerSequence,
    pub accounting_version: u32,
}

pub fn apply_liquidity_increase(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    delta: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<LiquidityAccountingResult> {
    validate_operation_context(ledger, reserve, current_ledger)?;
    validate_wad_amount(delta)?;

    let previous_total_liquidity = reserve.total_liquidity;
    let previous_available_liquidity = reserve.available_liquidity;

    increase_liquidity(ledger, reserve, delta, current_ledger)?;
    validate_operation_post_state(ledger, reserve)?;

    Ok(LiquidityAccountingResult {
        reserve_id: reserve.reserve_id,
        previous_total_liquidity,
        updated_total_liquidity: reserve.total_liquidity,
        previous_available_liquidity,
        updated_available_liquidity: reserve.available_liquidity,
        delta,
        current_ledger,
        accounting_version: ledger.accounting_version,
    })
}

pub fn apply_liquidity_decrease(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    delta: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<LiquidityAccountingResult> {
    validate_operation_context(ledger, reserve, current_ledger)?;
    validate_wad_amount(delta)?;

    let previous_total_liquidity = reserve.total_liquidity;
    let previous_available_liquidity = reserve.available_liquidity;

    decrease_liquidity(ledger, reserve, delta, current_ledger)?;
    validate_operation_post_state(ledger, reserve)?;

    Ok(LiquidityAccountingResult {
        reserve_id: reserve.reserve_id,
        previous_total_liquidity,
        updated_total_liquidity: reserve.total_liquidity,
        previous_available_liquidity,
        updated_available_liquidity: reserve.available_liquidity,
        delta,
        current_ledger,
        accounting_version: ledger.accounting_version,
    })
}
