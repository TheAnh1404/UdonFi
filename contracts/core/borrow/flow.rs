//! Borrow flow preparation and execution.

use crate::errors::{BorrowResult, LendingError};
use crate::events::publish_borrow_created;
use crate::model::{BorrowExecutionResult, BorrowRequest, BorrowValidationResult};
use crate::validation::{
    borrow_requires_interest_accrual, borrow_requires_risk_check, validate_borrow_accounting,
    validate_borrow_amount, validate_borrow_cap, validate_borrow_ledger, validate_borrow_liquidity,
    validate_borrow_risk, validate_protocol_accepts_borrow, validate_request_matches_reserve,
    validate_reserve_allows_borrow,
};
use soroban_sdk::{Env, String};
use udonfi_accounting::{
    apply_debt_increase, apply_liquidity_decrease, checked_add_scaled_debt, read_accounting_ledger,
    read_reserve_accounting, read_user_accounting_snapshot, validate_accounting_ledger,
    validate_reserve_accounting, write_accounting_ledger, write_reserve_accounting,
    write_user_accounting_snapshot, UserAccountingSnapshot,
};
use udonfi_config_engine::storage::read_latest_validation_config;
use udonfi_pool_state::storage::read_pool_state;
use udonfi_reserve_registry::storage::read_reserve;
use udonfi_shared::{empty_event_id, BORROW_CREATED};

pub fn prepare_borrow(env: &Env, request: &BorrowRequest) -> BorrowResult<BorrowValidationResult> {
    let pool = read_pool_state(env).ok_or(LendingError::NotInitialized)?;
    validate_protocol_accepts_borrow(&pool)?;

    let reserve = read_reserve(env, request.reserve_id).ok_or(LendingError::ReserveNotFound)?;
    validate_request_matches_reserve(request, &reserve)?;
    validate_reserve_allows_borrow(&reserve)?;

    let validation_config =
        read_latest_validation_config(env).ok_or(LendingError::NotInitialized)?;
    validate_borrow_amount(request.amount, &validation_config)?;

    let accounting =
        read_reserve_accounting(env, request.reserve_id).ok_or(LendingError::NotInitialized)?;
    validate_borrow_accounting(&accounting)?;

    validate_borrow_liquidity(request.amount, &accounting)?;
    let projected_total_borrow = validate_borrow_cap(request.amount, &reserve, &accounting)?;
    validate_borrow_ledger(request.current_ledger, &reserve, &accounting)?;
    validate_borrow_risk(env, request)?;

    let requires_interest_accrual =
        borrow_requires_interest_accrual(request.current_ledger, &reserve)?;
    let requires_risk_check = borrow_requires_risk_check();

    Ok(BorrowValidationResult::valid(
        request.reserve_id,
        request.amount,
        projected_total_borrow,
        reserve.borrow_cap,
        accounting.available_liquidity,
        requires_interest_accrual,
        requires_risk_check,
    ))
}

pub fn execute_borrow(env: &Env, request: &BorrowRequest) -> BorrowResult<BorrowExecutionResult> {
    let prepared = prepare_borrow(env, request)?;
    if !prepared.is_valid {
        return Err(LendingError::InvalidAmount);
    }
    if !prepared.requires_risk_check {
        return Err(LendingError::HFTooLow);
    }

    let mut ledger = read_accounting_ledger(env).ok_or(LendingError::NotInitialized)?;
    let mut reserve_accounting =
        read_reserve_accounting(env, prepared.reserve_id).ok_or(LendingError::NotInitialized)?;
    let borrow_index = reserve_accounting.borrow_index;

    let debt = apply_debt_increase(
        &mut ledger,
        &mut reserve_accounting,
        prepared.amount,
        Some(prepared.borrow_cap),
        request.current_ledger,
    )?;
    let liquidity = apply_liquidity_decrease(
        &mut ledger,
        &mut reserve_accounting,
        prepared.amount,
        request.current_ledger,
    )?;

    let mut user_snapshot = read_user_accounting_snapshot(env, &request.actor, prepared.reserve_id)
        .unwrap_or_else(|| {
            UserAccountingSnapshot::new(
                request.actor.clone(),
                prepared.reserve_id,
                request.current_ledger,
            )
        });
    user_snapshot.scaled_debt =
        checked_add_scaled_debt(user_snapshot.scaled_debt, debt.scaled_delta)?;
    user_snapshot.last_updated_ledger = request.current_ledger;

    validate_accounting_ledger(&ledger)?;
    validate_reserve_accounting(&reserve_accounting)?;

    let result = BorrowExecutionResult {
        actor: request.actor.clone(),
        reserve_id: prepared.reserve_id,
        amount: prepared.amount,
        scaled_debt_minted: debt.scaled_delta,
        borrow_index,
        previous_total_liquidity: liquidity.previous_total_liquidity,
        updated_total_liquidity: liquidity.updated_total_liquidity,
        previous_scaled_debt: debt.previous_scaled_debt,
        updated_scaled_debt: debt.updated_scaled_debt,
        ledger: request.current_ledger,
        accounting_version: debt.accounting_version,
        event_name: String::from_str(env, BORROW_CREATED),
        event_id: empty_event_id(env),
    };

    write_accounting_ledger(env, &ledger);
    write_reserve_accounting(env, &reserve_accounting);
    write_user_accounting_snapshot(env, &user_snapshot);
    publish_borrow_created(env, &result);

    Ok(result)
}
