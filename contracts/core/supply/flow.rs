//! Supply flow preparation.

use crate::errors::{LendingError, SupplyResult};
use crate::events::publish_deposit_completed;
use crate::model::{DepositExecutionResult, DepositRequest, DepositValidationResult};
use crate::validation::{
    deposit_requires_interest_accrual, validate_deposit_accounting, validate_deposit_amount,
    validate_deposit_ledger, validate_protocol_accepts_deposit, validate_request_matches_reserve,
    validate_reserve_accepts_deposit, validate_supply_cap,
};
use soroban_sdk::{Env, String};
use udonfi_accounting::{
    apply_liquidity_increase, apply_supply_increase, read_accounting_ledger,
    read_reserve_accounting, validate_accounting_ledger, validate_reserve_accounting,
    write_accounting_ledger, write_reserve_accounting,
};
use udonfi_config_engine::storage::read_latest_validation_config;
use udonfi_pool_state::storage::read_pool_state;
use udonfi_reserve_registry::storage::read_reserve;
use udonfi_shared::SUPPLY_DEPOSIT_COMPLETED;

pub fn prepare_deposit(
    env: &Env,
    request: &DepositRequest,
) -> SupplyResult<DepositValidationResult> {
    let pool = read_pool_state(env).ok_or(LendingError::NotInitialized)?;
    validate_protocol_accepts_deposit(&pool)?;

    let reserve = read_reserve(env, request.reserve_id).ok_or(LendingError::ReserveNotFound)?;
    validate_request_matches_reserve(request, &reserve)?;
    validate_reserve_accepts_deposit(env, &reserve)?;

    let validation_config =
        read_latest_validation_config(env).ok_or(LendingError::NotInitialized)?;
    validate_deposit_amount(request.amount, &validation_config)?;

    let accounting =
        read_reserve_accounting(env, request.reserve_id).ok_or(LendingError::NotInitialized)?;
    validate_deposit_accounting(&accounting)?;
    validate_deposit_ledger(request.current_ledger, &reserve, &accounting)?;

    let projected_total_supply = validate_supply_cap(request.amount, &reserve, &accounting)?;
    let requires_interest_accrual =
        deposit_requires_interest_accrual(request.current_ledger, &reserve)?;

    Ok(DepositValidationResult::valid(
        request.reserve_id,
        request.amount,
        accounting.available_liquidity,
        projected_total_supply,
        reserve.supply_cap,
        requires_interest_accrual,
        request.current_ledger,
    ))
}

pub fn execute_deposit(
    env: &Env,
    request: &DepositRequest,
) -> SupplyResult<DepositExecutionResult> {
    let prepared = prepare_deposit(env, request)?;
    if !prepared.is_valid {
        return Err(LendingError::InvalidAmount);
    }

    let mut ledger = read_accounting_ledger(env).ok_or(LendingError::NotInitialized)?;
    let mut reserve_accounting =
        read_reserve_accounting(env, prepared.reserve_id).ok_or(LendingError::NotInitialized)?;
    let supply_index = reserve_accounting.supply_index;

    // Token transfer boundary: wire a safe transfer adapter before exposing this as an entrypoint.
    let liquidity = apply_liquidity_increase(
        &mut ledger,
        &mut reserve_accounting,
        prepared.amount,
        prepared.current_ledger,
    )?;
    let supply = apply_supply_increase(
        &mut ledger,
        &mut reserve_accounting,
        prepared.amount,
        Some(prepared.supply_cap),
        prepared.current_ledger,
    )?;

    validate_accounting_ledger(&ledger)?;
    validate_reserve_accounting(&reserve_accounting)?;

    let result = DepositExecutionResult {
        actor: request.actor.clone(),
        reserve_id: prepared.reserve_id,
        amount: prepared.amount,
        scaled_supply_minted: supply.scaled_delta,
        supply_index,
        previous_total_liquidity: liquidity.previous_total_liquidity,
        updated_total_liquidity: liquidity.updated_total_liquidity,
        previous_scaled_supply: supply.previous_scaled_supply,
        updated_scaled_supply: supply.updated_scaled_supply,
        ledger: prepared.current_ledger,
        accounting_version: supply.accounting_version,
        event_name: String::from_str(env, SUPPLY_DEPOSIT_COMPLETED),
    };

    write_accounting_ledger(env, &ledger);
    write_reserve_accounting(env, &reserve_accounting);
    publish_deposit_completed(env, &result);

    Ok(result)
}
