//! Reusable supply-side accounting operations.

use crate::balance::{decrease_scaled_supply, increase_scaled_supply, validate_wad_amount};
use crate::errors::AccountingResult;
use crate::model::{AccountingLedger, ReserveAccounting};
use crate::operations::{
    ensure_positive_delta_has_supply_shares, ensure_scaled_supply_available,
    validate_operation_context, validate_operation_post_state, validate_supply_cap,
};
use crate::shares::actual_supply_to_scaled;
use soroban_sdk::contracttype;
use udonfi_shared::{LedgerSequence, ReserveId, ScaledBalance, Wad};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SupplyAccountingResult {
    pub reserve_id: ReserveId,
    pub previous_scaled_supply: ScaledBalance,
    pub updated_scaled_supply: ScaledBalance,
    pub scaled_delta: ScaledBalance,
    pub previous_actual_supply: Wad,
    pub updated_actual_supply: Wad,
    pub actual_delta: Wad,
    pub current_ledger: LedgerSequence,
    pub accounting_version: u32,
}

pub fn apply_supply_increase(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    actual_delta: Wad,
    supply_cap: Option<Wad>,
    current_ledger: LedgerSequence,
) -> AccountingResult<SupplyAccountingResult> {
    validate_operation_context(ledger, reserve, current_ledger)?;
    validate_wad_amount(actual_delta)?;
    validate_supply_cap(reserve.total_actual_supply, actual_delta, supply_cap)?;

    let previous_scaled_supply = reserve.total_scaled_supply;
    let previous_actual_supply = reserve.total_actual_supply;
    let scaled_delta = actual_supply_to_scaled(actual_delta, reserve.supply_index)?;
    ensure_positive_delta_has_supply_shares(actual_delta, scaled_delta)?;

    increase_scaled_supply(ledger, reserve, scaled_delta, actual_delta, current_ledger)?;
    validate_operation_post_state(ledger, reserve)?;

    Ok(SupplyAccountingResult {
        reserve_id: reserve.reserve_id,
        previous_scaled_supply,
        updated_scaled_supply: reserve.total_scaled_supply,
        scaled_delta,
        previous_actual_supply,
        updated_actual_supply: reserve.total_actual_supply,
        actual_delta,
        current_ledger,
        accounting_version: ledger.accounting_version,
    })
}

pub fn apply_supply_decrease(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    actual_delta: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<SupplyAccountingResult> {
    validate_operation_context(ledger, reserve, current_ledger)?;
    validate_wad_amount(actual_delta)?;

    let previous_scaled_supply = reserve.total_scaled_supply;
    let previous_actual_supply = reserve.total_actual_supply;
    let scaled_delta = actual_supply_to_scaled(actual_delta, reserve.supply_index)?;
    ensure_positive_delta_has_supply_shares(actual_delta, scaled_delta)?;
    ensure_scaled_supply_available(ledger, reserve, scaled_delta, actual_delta)?;

    decrease_scaled_supply(ledger, reserve, scaled_delta, actual_delta, current_ledger)?;
    validate_operation_post_state(ledger, reserve)?;

    Ok(SupplyAccountingResult {
        reserve_id: reserve.reserve_id,
        previous_scaled_supply,
        updated_scaled_supply: reserve.total_scaled_supply,
        scaled_delta,
        previous_actual_supply,
        updated_actual_supply: reserve.total_actual_supply,
        actual_delta,
        current_ledger,
        accounting_version: ledger.accounting_version,
    })
}
