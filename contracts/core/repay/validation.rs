//! Repay validation helpers.

use crate::errors::{LendingError, RepayResult};
use crate::model::RepayRequest;
use udonfi_accounting::{
    actual_debt_to_scaled, scaled_debt_to_actual, validate_reserve_accounting, ReserveAccounting,
    UserAccountingSnapshot,
};
use udonfi_config_engine::{validation::validate_validation_config, ValidationConfig};
use udonfi_pool_state::{Pool, ProtocolStatus};
use udonfi_reserve_registry::{can_reserve_allow_repay, Reserve};
use udonfi_shared::{LedgerSequence, ScaledDebt, Wad};

#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct RepayDebtPreview {
    pub actual_repay_amount: Wad,
    pub current_actual_debt: Wad,
    pub scaled_debt_to_burn: ScaledDebt,
}

pub fn validate_protocol_accepts_repay(pool: &Pool) -> RepayResult<()> {
    if matches!(
        pool.protocol_status,
        ProtocolStatus::Uninitialized | ProtocolStatus::Initializing
    ) {
        return Err(LendingError::NotInitialized);
    }
    Ok(())
}

pub fn validate_reserve_allows_repay(env: &soroban_sdk::Env, reserve: &Reserve) -> RepayResult<()> {
    if can_reserve_allow_repay(env, reserve.reserve_id) {
        return Ok(());
    }
    Err(LendingError::ReserveNotActive)
}

pub fn validate_request_matches_reserve(
    request: &RepayRequest,
    reserve: &Reserve,
) -> RepayResult<()> {
    if request.reserve_id != reserve.reserve_id || request.asset_address != reserve.asset_address {
        return Err(LendingError::InvalidIndex);
    }
    Ok(())
}

pub fn validate_repay_amount(amount: Wad, validation_config: &ValidationConfig) -> RepayResult<()> {
    validate_validation_config(validation_config)?;
    if amount.0 <= 0 {
        return Err(LendingError::InvalidAmount);
    }
    if amount.0 < validation_config.min_repay_amount.0 {
        return Err(LendingError::InvalidAmount);
    }
    if amount.0 > validation_config.max_transaction_amount.0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_repay_ledger(
    current_ledger: LedgerSequence,
    reserve: &Reserve,
    accounting: &ReserveAccounting,
) -> RepayResult<()> {
    udonfi_interest::delta_ledger(reserve.last_accrual_ledger, current_ledger)?;
    if current_ledger.0 < accounting.last_updated_ledger.0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_repay_accounting(accounting: &ReserveAccounting) -> RepayResult<()> {
    validate_reserve_accounting(accounting)
}

pub fn cap_repay_to_debt(
    requested_amount: Wad,
    user_snapshot: &Option<UserAccountingSnapshot>,
    accounting: &ReserveAccounting,
) -> RepayResult<RepayDebtPreview> {
    let snapshot = user_snapshot.as_ref().ok_or(LendingError::NoDebtToRepay)?;
    if snapshot.scaled_debt.0 <= 0 {
        return Err(LendingError::NoDebtToRepay);
    }

    let current_actual_debt = scaled_debt_to_actual(snapshot.scaled_debt, accounting.borrow_index)?;
    if current_actual_debt.0 <= 0 {
        return Err(LendingError::NoDebtToRepay);
    }

    let actual_repay_amount = if requested_amount.0 > current_actual_debt.0 {
        current_actual_debt
    } else {
        requested_amount
    };
    let scaled_debt_to_burn = if actual_repay_amount == current_actual_debt {
        snapshot.scaled_debt
    } else {
        let scaled_debt_to_burn =
            actual_debt_to_scaled(actual_repay_amount, accounting.borrow_index)?;
        if scaled_debt_to_burn.0 > snapshot.scaled_debt.0 {
            return Err(LendingError::MathUnderflow);
        }
        scaled_debt_to_burn
    };

    Ok(RepayDebtPreview {
        actual_repay_amount,
        current_actual_debt,
        scaled_debt_to_burn,
    })
}

pub fn repay_requires_interest_accrual(
    current_ledger: LedgerSequence,
    reserve: &Reserve,
) -> RepayResult<bool> {
    let delta = udonfi_interest::delta_ledger(reserve.last_accrual_ledger, current_ledger)?;
    Ok(delta.0 > 0)
}
