//! Borrow validation helpers.

use crate::errors::{BorrowResult, LendingError};
use crate::model::BorrowRequest;
use udonfi_accounting::{validate_reserve_accounting, ReserveAccounting};
use udonfi_config_engine::{validation::validate_validation_config, ValidationConfig};
use udonfi_pool_state::{Pool, ProtocolStatus};
use udonfi_reserve_registry::{Reserve, ReserveStatus};
use udonfi_shared::{LedgerSequence, Wad};

pub fn validate_protocol_accepts_borrow(pool: &Pool) -> BorrowResult<()> {
    if matches!(
        pool.protocol_status,
        ProtocolStatus::Uninitialized | ProtocolStatus::Initializing
    ) {
        return Err(LendingError::NotInitialized);
    }
    if pool.paused
        || matches!(
            pool.protocol_status,
            ProtocolStatus::Paused | ProtocolStatus::Emergency
        )
    {
        return Err(LendingError::Paused);
    }
    if pool.protocol_status != ProtocolStatus::Active {
        return Err(LendingError::ReserveNotActive);
    }
    Ok(())
}

pub fn validate_reserve_allows_borrow(reserve: &Reserve) -> BorrowResult<()> {
    match reserve.reserve_status {
        ReserveStatus::Active => Ok(()),
        ReserveStatus::Frozen => Err(LendingError::ReserveFrozen),
        ReserveStatus::Paused => Err(LendingError::ReservePaused),
        ReserveStatus::Deprecated | ReserveStatus::Uninitialized => {
            Err(LendingError::ReserveNotActive)
        }
    }
}

pub fn validate_request_matches_reserve(
    request: &BorrowRequest,
    reserve: &Reserve,
) -> BorrowResult<()> {
    if request.reserve_id != reserve.reserve_id || request.asset_address != reserve.asset_address {
        return Err(LendingError::InvalidIndex);
    }
    Ok(())
}

pub fn validate_borrow_amount(
    amount: Wad,
    validation_config: &ValidationConfig,
) -> BorrowResult<()> {
    validate_validation_config(validation_config)?;
    if amount.0 <= 0 {
        return Err(LendingError::InvalidAmount);
    }
    if amount.0 < validation_config.min_borrow_amount.0 {
        return Err(LendingError::InvalidAmount);
    }
    if amount.0 > validation_config.max_transaction_amount.0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_borrow_ledger(
    current_ledger: LedgerSequence,
    reserve: &Reserve,
    accounting: &ReserveAccounting,
) -> BorrowResult<()> {
    udonfi_interest::delta_ledger(reserve.last_accrual_ledger, current_ledger)?;
    if current_ledger.0 < accounting.last_updated_ledger.0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_borrow_accounting(accounting: &ReserveAccounting) -> BorrowResult<()> {
    validate_reserve_accounting(accounting)
}

pub fn validate_borrow_cap(
    amount: Wad,
    reserve: &Reserve,
    accounting: &ReserveAccounting,
) -> BorrowResult<Wad> {
    if reserve.borrow_cap.0 < 0 {
        return Err(LendingError::InvalidAmount);
    }
    let projected_total_borrow = accounting
        .total_actual_debt
        .0
        .checked_add(amount.0)
        .map(Wad)
        .ok_or(LendingError::MathOverflow)?;
    if projected_total_borrow.0 > reserve.borrow_cap.0 {
        return Err(LendingError::BorrowCapViolation);
    }
    Ok(projected_total_borrow)
}

pub fn validate_borrow_liquidity(amount: Wad, accounting: &ReserveAccounting) -> BorrowResult<()> {
    if amount.0 > accounting.available_liquidity.0 {
        return Err(LendingError::InsufficientLiquidity);
    }
    Ok(())
}

pub fn borrow_requires_interest_accrual(
    current_ledger: LedgerSequence,
    reserve: &Reserve,
) -> BorrowResult<bool> {
    let delta = udonfi_interest::delta_ledger(reserve.last_accrual_ledger, current_ledger)?;
    Ok(delta.0 > 0)
}

pub fn validate_borrow_risk(env: &soroban_sdk::Env, request: &BorrowRequest) -> BorrowResult<()> {
    let risk_result =
        udonfi_risk::can_borrow(env, &request.actor, request.reserve_id, request.amount)?;
    if !risk_result.is_allowed {
        return Err(LendingError::HFTooLow);
    }
    Ok(())
}

pub fn borrow_requires_risk_check() -> bool {
    true
}
