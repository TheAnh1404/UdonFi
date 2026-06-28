//! Supply flow preparation.

use crate::errors::{LendingError, SupplyResult};
use crate::model::{DepositRequest, DepositValidationResult};
use crate::validation::{
    deposit_requires_interest_accrual, validate_deposit_accounting, validate_deposit_amount,
    validate_deposit_ledger, validate_protocol_accepts_deposit, validate_request_matches_reserve,
    validate_reserve_accepts_deposit, validate_supply_cap,
};
use soroban_sdk::Env;
use udonfi_accounting::read_reserve_accounting;
use udonfi_config_engine::storage::read_latest_validation_config;
use udonfi_pool_state::storage::read_pool_state;
use udonfi_reserve_registry::storage::read_reserve;

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
    let required_interest_accrual =
        deposit_requires_interest_accrual(request.current_ledger, &reserve)?;

    Ok(DepositValidationResult::valid(
        request.reserve_id,
        request.amount,
        accounting.available_liquidity,
        projected_total_supply,
        reserve.supply_cap,
        required_interest_accrual,
        request.current_ledger,
    ))
}
