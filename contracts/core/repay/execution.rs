//! Repay flow execution.

use crate::errors::{LendingError, RepayResult};
use crate::events::publish_repay_completed;
use crate::flow::prepare_repay;
use crate::model::{RepayExecutionResult, RepayRequest};
use soroban_sdk::{Env, String};
use udonfi_accounting::{
    apply_liquidity_increase, checked_sub_scaled_debt, decrease_scaled_debt,
    read_accounting_ledger, read_reserve_accounting, read_user_accounting_snapshot,
    validate_accounting_ledger, validate_reserve_accounting, write_accounting_ledger,
    write_reserve_accounting, write_user_accounting_snapshot,
};
use udonfi_shared::{empty_event_id, REPAY_COMPLETED};

pub fn execute_repay(env: &Env, request: &RepayRequest) -> RepayResult<RepayExecutionResult> {
    let prepared = prepare_repay(env, request)?;
    if !prepared.is_valid {
        return Err(LendingError::InvalidAmount);
    }

    let mut ledger = read_accounting_ledger(env).ok_or(LendingError::NotInitialized)?;
    let mut reserve_accounting =
        read_reserve_accounting(env, prepared.reserve_id).ok_or(LendingError::NotInitialized)?;
    let mut user_snapshot = read_user_accounting_snapshot(env, &request.actor, prepared.reserve_id)
        .ok_or(LendingError::NoDebtToRepay)?;

    let borrow_index = reserve_accounting.borrow_index;
    let previous_scaled_debt = reserve_accounting.total_scaled_debt;

    decrease_scaled_debt(
        &mut ledger,
        &mut reserve_accounting,
        prepared.scaled_debt_to_burn,
        prepared.actual_repay_amount,
        request.current_ledger,
    )?;
    let liquidity = apply_liquidity_increase(
        &mut ledger,
        &mut reserve_accounting,
        prepared.actual_repay_amount,
        request.current_ledger,
    )?;

    user_snapshot.scaled_debt =
        checked_sub_scaled_debt(user_snapshot.scaled_debt, prepared.scaled_debt_to_burn)?;
    user_snapshot.last_updated_ledger = request.current_ledger;

    validate_accounting_ledger(&ledger)?;
    validate_reserve_accounting(&reserve_accounting)?;

    let result = RepayExecutionResult {
        actor: request.actor.clone(),
        reserve_id: prepared.reserve_id,
        requested_amount: prepared.requested_amount,
        actual_repay_amount: prepared.actual_repay_amount,
        scaled_debt_burned: prepared.scaled_debt_to_burn,
        borrow_index,
        previous_scaled_debt,
        updated_scaled_debt: reserve_accounting.total_scaled_debt,
        previous_liquidity: liquidity.previous_total_liquidity,
        updated_liquidity: liquidity.updated_total_liquidity,
        ledger: request.current_ledger,
        event_name: String::from_str(env, REPAY_COMPLETED),
        event_id: empty_event_id(env),
    };

    write_accounting_ledger(env, &ledger);
    write_reserve_accounting(env, &reserve_accounting);
    write_user_accounting_snapshot(env, &user_snapshot);
    publish_repay_completed(env, &result);

    Ok(result)
}
