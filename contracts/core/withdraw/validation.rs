//! Withdrawal validation helpers.

use crate::errors::{LendingError, WithdrawResult};
use crate::model::WithdrawRequest;
use udonfi_accounting::shares::actual_supply_to_scaled;
use udonfi_accounting::{validate_reserve_accounting, ReserveAccounting, UserAccountingSnapshot};
use udonfi_config_engine::ValidationConfig;
use udonfi_pool_state::{Pool, ProtocolStatus};
use udonfi_reserve_registry::{can_reserve_allow_withdraw, Reserve};
use udonfi_shared::{LedgerSequence, Ray, ScaledBalance, Wad};

pub fn validate_protocol_accepts_withdraw(pool: &Pool) -> WithdrawResult<()> {
    if pool.protocol_status == ProtocolStatus::Uninitialized {
        return Err(LendingError::NotInitialized);
    }
    if pool.paused || pool.protocol_status == ProtocolStatus::Paused {
        return Err(LendingError::Paused);
    }
    Ok(())
}

pub fn validate_reserve_allows_withdraw(
    env: &soroban_sdk::Env,
    reserve: &Reserve,
) -> WithdrawResult<()> {
    if can_reserve_allow_withdraw(env, reserve.reserve_id) {
        return Ok(());
    }
    Err(LendingError::ReserveNotActive)
}

pub fn validate_request_matches_reserve(
    request: &WithdrawRequest,
    reserve: &Reserve,
) -> WithdrawResult<()> {
    if request.reserve_id != reserve.reserve_id || request.asset_address != reserve.asset_address {
        return Err(LendingError::InvalidIndex);
    }
    Ok(())
}

pub fn validate_withdraw_amount(
    amount: Wad,
    validation_config: &ValidationConfig,
) -> WithdrawResult<()> {
    if amount.0 <= 0 {
        return Err(LendingError::InvalidAmount);
    }
    // check minimum withdraw amount if configured
    if amount.0 < validation_config.dust_threshold.0 {
        return Err(LendingError::InvalidAmount);
    }
    // check maximum transaction amount if configured
    if amount.0 > validation_config.max_transaction_amount.0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_withdraw_ledger(
    current_ledger: LedgerSequence,
    reserve: &Reserve,
    accounting: &ReserveAccounting,
) -> WithdrawResult<()> {
    udonfi_interest::delta_ledger(reserve.last_accrual_ledger, current_ledger)?;
    if current_ledger.0 < accounting.last_updated_ledger.0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_user_balance(
    amount: Wad,
    user_snapshot: &Option<UserAccountingSnapshot>,
    supply_index: Ray,
) -> WithdrawResult<ScaledBalance> {
    let snapshot = user_snapshot
        .as_ref()
        .ok_or(LendingError::InsufficientCollateral)?;
    if snapshot.scaled_supply.0 <= 0 {
        return Err(LendingError::InsufficientCollateral);
    }

    let scaled_supply_to_burn = actual_supply_to_scaled(amount, supply_index)?;
    if scaled_supply_to_burn.0 == 0 {
        return Err(LendingError::InvalidAmount);
    }
    if snapshot.scaled_supply.0 < scaled_supply_to_burn.0 {
        return Err(LendingError::InsufficientCollateral);
    }

    Ok(scaled_supply_to_burn)
}

pub fn validate_pool_liquidity(amount: Wad, accounting: &ReserveAccounting) -> WithdrawResult<()> {
    if amount.0 > accounting.available_liquidity.0 {
        return Err(LendingError::InsufficientLiquidity);
    }
    Ok(())
}

pub fn withdraw_requires_interest_accrual(
    current_ledger: LedgerSequence,
    reserve: &Reserve,
) -> WithdrawResult<bool> {
    let delta = udonfi_interest::delta_ledger(reserve.last_accrual_ledger, current_ledger)?;
    Ok(delta.0 > 0)
}

pub fn validate_withdraw_accounting(accounting: &ReserveAccounting) -> WithdrawResult<()> {
    validate_reserve_accounting(accounting)
}
