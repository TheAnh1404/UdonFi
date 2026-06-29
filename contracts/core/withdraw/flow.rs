//! Withdrawal flow preparation and execution.

use crate::errors::{LendingError, WithdrawResult};
use crate::events::publish_withdraw_completed;
use crate::model::{WithdrawExecutionResult, WithdrawRequest, WithdrawValidationResult};
use crate::validation::{
    validate_pool_liquidity, validate_protocol_accepts_withdraw, validate_request_matches_reserve,
    validate_reserve_allows_withdraw, validate_user_balance, validate_withdraw_accounting,
    validate_withdraw_amount, validate_withdraw_ledger, withdraw_requires_interest_accrual,
};
use soroban_sdk::{Env, String};
use udonfi_accounting::{
    apply_liquidity_decrease, apply_supply_decrease, read_accounting_ledger,
    read_reserve_accounting, read_user_accounting_snapshot as read_shared_user_snapshot,
    validate_accounting_ledger, validate_reserve_accounting, write_accounting_ledger,
    write_reserve_accounting, write_user_accounting_snapshot as write_shared_user_snapshot,
    UserAccountingSnapshot,
};
use udonfi_config_engine::storage::read_latest_validation_config;
use udonfi_pool_state::storage::read_pool_state;
use udonfi_reserve_registry::storage::read_reserve;
use udonfi_shared::{empty_event_id, ReserveId, ScaledBalance, WITHDRAW_COMPLETED};

pub fn read_user_accounting_snapshot(
    env: &Env,
    user: &soroban_sdk::Address,
    reserve_id: ReserveId,
) -> Option<UserAccountingSnapshot> {
    read_shared_user_snapshot(env, user, reserve_id)
}

pub fn write_user_accounting_snapshot(env: &Env, snapshot: &UserAccountingSnapshot) {
    write_shared_user_snapshot(env, snapshot);
}

pub fn prepare_withdraw(
    env: &Env,
    request: &WithdrawRequest,
) -> WithdrawResult<WithdrawValidationResult> {
    let pool = read_pool_state(env).ok_or(LendingError::NotInitialized)?;
    validate_protocol_accepts_withdraw(&pool)?;

    let reserve = read_reserve(env, request.reserve_id).ok_or(LendingError::ReserveNotFound)?;
    validate_request_matches_reserve(request, &reserve)?;
    validate_reserve_allows_withdraw(env, &reserve)?;

    let validation_config =
        read_latest_validation_config(env).ok_or(LendingError::NotInitialized)?;
    validate_withdraw_amount(request.amount, &validation_config)?;

    let accounting =
        read_reserve_accounting(env, request.reserve_id).ok_or(LendingError::NotInitialized)?;
    validate_withdraw_accounting(&accounting)?;
    validate_withdraw_ledger(request.current_ledger, &reserve, &accounting)?;

    let user_snapshot = read_user_accounting_snapshot(env, &request.actor, request.reserve_id);
    let scaled_supply_to_burn =
        validate_user_balance(request.amount, &user_snapshot, accounting.supply_index)?;

    validate_pool_liquidity(request.amount, &accounting)?;

    let requires_interest_accrual =
        withdraw_requires_interest_accrual(request.current_ledger, &reserve)?;

    // Risk Check Rule:
    // If the user has no debt, withdraw does not require Health Factor validation.
    // If the user has debt or collateral-enabled supply, return requires_risk_check = true.
    let requires_risk_check = if let Some(ref snapshot) = user_snapshot {
        snapshot.scaled_debt.0 > 0 || snapshot.collateral_enabled
    } else {
        false
    };

    if requires_risk_check {
        let risk_result =
            udonfi_risk::can_withdraw(env, &request.actor, request.reserve_id, request.amount)?;
        if !risk_result.is_allowed {
            return Err(LendingError::HFTooLow);
        }
    }

    let user_actual_supply = if let Some(ref snapshot) = user_snapshot {
        udonfi_accounting::shares::scaled_supply_to_actual(
            snapshot.scaled_supply,
            accounting.supply_index,
        )?
    } else {
        udonfi_shared::Wad(0)
    };

    Ok(WithdrawValidationResult::valid(
        request.reserve_id,
        request.amount,
        scaled_supply_to_burn,
        user_actual_supply,
        accounting.available_liquidity,
        requires_interest_accrual,
        requires_risk_check,
    ))
}

pub fn execute_withdraw(
    env: &Env,
    request: &WithdrawRequest,
) -> WithdrawResult<WithdrawExecutionResult> {
    let prepared = prepare_withdraw(env, request)?;
    if !prepared.is_valid {
        return Err(LendingError::InvalidAmount);
    }

    let mut ledger = read_accounting_ledger(env).ok_or(LendingError::NotInitialized)?;
    let mut reserve_accounting =
        read_reserve_accounting(env, prepared.reserve_id).ok_or(LendingError::NotInitialized)?;
    let mut user_snapshot = read_user_accounting_snapshot(env, &request.actor, prepared.reserve_id)
        .ok_or(LendingError::InsufficientCollateral)?;
    let supply_index = reserve_accounting.supply_index;
    let previous_user_scaled_supply = user_snapshot.scaled_supply;

    if prepared.scaled_supply_to_burn.0 > user_snapshot.scaled_supply.0 {
        return Err(LendingError::InsufficientCollateral);
    }

    let supply = apply_supply_decrease(
        &mut ledger,
        &mut reserve_accounting,
        prepared.amount,
        request.current_ledger,
    )?;
    if supply.scaled_delta != prepared.scaled_supply_to_burn {
        return Err(LendingError::InvalidIndex);
    }
    let liquidity = apply_liquidity_decrease(
        &mut ledger,
        &mut reserve_accounting,
        prepared.amount,
        request.current_ledger,
    )?;

    user_snapshot.scaled_supply = ScaledBalance(
        user_snapshot
            .scaled_supply
            .0
            .checked_sub(supply.scaled_delta.0)
            .ok_or(LendingError::MathUnderflow)?,
    );
    if user_snapshot.scaled_supply.0 == 0 && user_snapshot.scaled_debt.0 == 0 {
        user_snapshot.collateral_enabled = false;
    }
    user_snapshot.last_updated_ledger = request.current_ledger;

    validate_accounting_ledger(&ledger)?;
    validate_reserve_accounting(&reserve_accounting)?;

    let result = WithdrawExecutionResult {
        actor: request.actor.clone(),
        reserve_id: prepared.reserve_id,
        amount: prepared.amount,
        scaled_supply_burned: supply.scaled_delta,
        supply_index,
        previous_total_liquidity: liquidity.previous_total_liquidity,
        updated_total_liquidity: liquidity.updated_total_liquidity,
        previous_available_liquidity: liquidity.previous_available_liquidity,
        updated_available_liquidity: liquidity.updated_available_liquidity,
        previous_scaled_supply: supply.previous_scaled_supply,
        updated_scaled_supply: supply.updated_scaled_supply,
        previous_user_scaled_supply,
        updated_user_scaled_supply: user_snapshot.scaled_supply,
        previous_reserve_scaled_supply: supply.previous_scaled_supply,
        updated_reserve_scaled_supply: supply.updated_scaled_supply,
        ledger: request.current_ledger,
        accounting_version: ledger.accounting_version,
        event_name: String::from_str(env, WITHDRAW_COMPLETED),
        event_id: empty_event_id(env),
    };

    write_accounting_ledger(env, &ledger);
    write_reserve_accounting(env, &reserve_accounting);
    write_user_accounting_snapshot(env, &user_snapshot);
    publish_withdraw_completed(env, &result);

    Ok(result)
}
