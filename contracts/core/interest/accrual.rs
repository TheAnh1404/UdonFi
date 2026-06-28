//! Per-reserve interest accrual result construction.

use crate::errors::InterestResult;
use crate::index::update_indices;
use crate::model::{IndexUpdateResult, InterestAccrualResult, InterestRateModel, InterestState};
use crate::rates::calculate_rates;
use udonfi_accounting::ReserveAccounting;
use udonfi_shared::{LedgerSequence, Wad};

pub fn accrue_interest(
    total_supply: Wad,
    total_borrow: Wad,
    supply_index: udonfi_shared::Ray,
    borrow_index: udonfi_shared::Ray,
    last_accrual_ledger: LedgerSequence,
    current_ledger: LedgerSequence,
    model: &InterestRateModel,
) -> InterestResult<InterestAccrualResult> {
    let (utilization_rate, borrow_rate, supply_rate) =
        calculate_rates(total_supply, total_borrow, model)?;
    let state = InterestState {
        supply_index,
        borrow_index,
        utilization_rate,
        borrow_rate,
        supply_rate,
        reserve_factor: model.reserve_factor,
        last_accrual_ledger,
        current_ledger,
    };
    let update = update_indices(&state)?;
    Ok(to_accrual_result(total_supply, total_borrow, state, update))
}

pub fn accrue_reserve_interest(
    reserve: &ReserveAccounting,
    current_ledger: LedgerSequence,
    model: &InterestRateModel,
) -> InterestResult<InterestAccrualResult> {
    accrue_interest(
        reserve.total_actual_supply,
        reserve.total_actual_debt,
        reserve.supply_index,
        reserve.borrow_index,
        reserve.last_updated_ledger,
        current_ledger,
        model,
    )
}

fn to_accrual_result(
    total_supply: Wad,
    total_borrow: Wad,
    state: InterestState,
    update: IndexUpdateResult,
) -> InterestAccrualResult {
    InterestAccrualResult {
        total_supply,
        total_borrow,
        utilization_rate: state.utilization_rate,
        borrow_rate: state.borrow_rate,
        supply_rate: state.supply_rate,
        previous_supply_index: update.previous_supply_index,
        previous_borrow_index: update.previous_borrow_index,
        new_supply_index: update.new_supply_index,
        new_borrow_index: update.new_borrow_index,
        last_accrual_ledger: state.last_accrual_ledger,
        current_ledger: state.current_ledger,
        delta_ledger: update.delta_ledger,
    }
}
