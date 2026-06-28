//! Deposit validation helpers.

use crate::errors::{LendingError, SupplyResult};
use crate::model::DepositRequest;
use udonfi_accounting::{validate_reserve_accounting, ReserveAccounting};
use udonfi_config_engine::{validation::validate_validation_config, ValidationConfig};
use udonfi_pool_state::{Pool, ProtocolStatus};
use udonfi_reserve_registry::{can_reserve_accept_supply, Reserve, ReserveStatus};
use udonfi_shared::{LedgerSequence, Wad};

pub fn validate_protocol_accepts_deposit(pool: &Pool) -> SupplyResult<()> {
    if pool.protocol_status == ProtocolStatus::Uninitialized {
        return Err(LendingError::NotInitialized);
    }
    if pool.paused || pool.protocol_status == ProtocolStatus::Paused {
        return Err(LendingError::Paused);
    }
    if pool.protocol_status != ProtocolStatus::Active {
        return Err(LendingError::ReserveNotActive);
    }
    Ok(())
}

pub fn validate_reserve_accepts_deposit(
    env: &soroban_sdk::Env,
    reserve: &Reserve,
) -> SupplyResult<()> {
    if can_reserve_accept_supply(env, reserve.reserve_id) {
        return Ok(());
    }

    match reserve.reserve_status {
        ReserveStatus::Frozen => Err(LendingError::ReserveFrozen),
        ReserveStatus::Paused => Err(LendingError::ReservePaused),
        ReserveStatus::Active => Ok(()),
        ReserveStatus::Uninitialized | ReserveStatus::Deprecated => {
            Err(LendingError::ReserveNotActive)
        }
    }
}

pub fn validate_request_matches_reserve(
    request: &DepositRequest,
    reserve: &Reserve,
) -> SupplyResult<()> {
    if request.reserve_id != reserve.reserve_id || request.asset_address != reserve.asset_address {
        return Err(LendingError::InvalidIndex);
    }
    Ok(())
}

pub fn validate_deposit_amount(
    amount: Wad,
    validation_config: &ValidationConfig,
) -> SupplyResult<()> {
    validate_validation_config(validation_config)?;

    if amount.0 <= 0 {
        return Err(LendingError::InvalidAmount);
    }
    if amount.0 < validation_config.min_deposit_amount.0 {
        return Err(LendingError::InvalidAmount);
    }
    if amount.0 > validation_config.max_transaction_amount.0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_deposit_ledger(
    current_ledger: LedgerSequence,
    reserve: &Reserve,
    accounting: &ReserveAccounting,
) -> SupplyResult<()> {
    udonfi_interest::delta_ledger(reserve.last_accrual_ledger, current_ledger)?;
    if current_ledger.0 < accounting.last_updated_ledger.0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_deposit_accounting(accounting: &ReserveAccounting) -> SupplyResult<()> {
    validate_reserve_accounting(accounting)
}

pub fn validate_supply_cap(
    amount: Wad,
    reserve: &Reserve,
    accounting: &ReserveAccounting,
) -> SupplyResult<Wad> {
    if reserve.supply_cap.0 < 0 {
        return Err(LendingError::InvalidAmount);
    }

    let projected_total_supply = accounting
        .total_actual_supply
        .0
        .checked_add(amount.0)
        .map(Wad)
        .ok_or(LendingError::MathOverflow)?;

    if projected_total_supply.0 > reserve.supply_cap.0 {
        return Err(LendingError::SupplyCapViolation);
    }

    Ok(projected_total_supply)
}

pub fn deposit_requires_interest_accrual(
    current_ledger: LedgerSequence,
    reserve: &Reserve,
) -> SupplyResult<bool> {
    let delta = udonfi_interest::delta_ledger(reserve.last_accrual_ledger, current_ledger)?;
    Ok(delta.0 > 0)
}
