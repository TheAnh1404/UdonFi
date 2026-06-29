//! Repay flow preparation.

use crate::errors::{LendingError, RepayResult};
use crate::model::{RepayRequest, RepayValidationResult};
use crate::validation::{
    cap_repay_to_debt, repay_requires_interest_accrual, validate_protocol_accepts_repay,
    validate_repay_accounting, validate_repay_amount, validate_repay_ledger,
    validate_request_matches_reserve, validate_reserve_allows_repay,
};
use soroban_sdk::Env;
use udonfi_accounting::{read_reserve_accounting, read_user_accounting_snapshot};
use udonfi_config_engine::storage::read_latest_validation_config;
use udonfi_pool_state::storage::read_pool_state;
use udonfi_reserve_registry::storage::read_reserve;

pub fn prepare_repay(env: &Env, request: &RepayRequest) -> RepayResult<RepayValidationResult> {
    let pool = read_pool_state(env).ok_or(LendingError::NotInitialized)?;
    validate_protocol_accepts_repay(&pool)?;

    let reserve = read_reserve(env, request.reserve_id).ok_or(LendingError::ReserveNotFound)?;
    validate_request_matches_reserve(request, &reserve)?;
    validate_reserve_allows_repay(env, &reserve)?;

    let validation_config =
        read_latest_validation_config(env).ok_or(LendingError::NotInitialized)?;
    validate_repay_amount(request.amount, &validation_config)?;

    let accounting =
        read_reserve_accounting(env, request.reserve_id).ok_or(LendingError::NotInitialized)?;
    validate_repay_accounting(&accounting)?;

    let user_snapshot = read_user_accounting_snapshot(env, &request.actor, request.reserve_id);
    let preview = cap_repay_to_debt(request.amount, &user_snapshot, &accounting)?;
    validate_repay_ledger(request.current_ledger, &reserve, &accounting)?;

    let requires_interest_accrual =
        repay_requires_interest_accrual(request.current_ledger, &reserve)?;

    Ok(RepayValidationResult::valid(
        request.reserve_id,
        request.amount,
        preview.actual_repay_amount,
        preview.current_actual_debt,
        preview.scaled_debt_to_burn,
        requires_interest_accrual,
    ))
}
