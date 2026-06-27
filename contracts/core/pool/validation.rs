//! Validation rules for Pool State operations.

use crate::errors::LendingError;
use crate::model::{Pool, ProtocolStatus};
use crate::storage::read_pool_state;
use soroban_sdk::{Address, Env};

pub fn validate_not_initialized(env: &Env) -> Result<(), LendingError> {
    if crate::storage::pool_exists(env) {
        return Err(LendingError::AlreadyInitialized);
    }
    Ok(())
}

pub fn validate_initialized(env: &Env) -> Result<(), LendingError> {
    if !crate::storage::pool_exists(env) {
        return Err(LendingError::NotInitialized);
    }
    Ok(())
}

pub fn validate_protocol_metadata(
    protocol_version: u32,
    config_version: u32,
) -> Result<(), LendingError> {
    if protocol_version == 0 || config_version == 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_admin_address(env: &Env, admin: &Address) -> Result<(), LendingError> {
    if admin == &env.current_contract_address() {
        return Err(LendingError::InvalidAdmin);
    }
    Ok(())
}

pub fn validate_guardian_address(env: &Env, guardian: &Address) -> Result<(), LendingError> {
    if guardian == &env.current_contract_address() {
        return Err(LendingError::InvalidGuardian);
    }
    Ok(())
}

pub fn validate_treasury_address(env: &Env, treasury: &Address) -> Result<(), LendingError> {
    if treasury == &env.current_contract_address() {
        return Err(LendingError::InvalidAdmin);
    }
    Ok(())
}

pub fn validate_insurance_fund_address(
    env: &Env,
    insurance_fund: &Address,
) -> Result<(), LendingError> {
    if insurance_fund == &env.current_contract_address() {
        return Err(LendingError::InvalidAdmin);
    }
    Ok(())
}

pub fn require_admin(env: &Env, caller: &Address) -> Result<Pool, LendingError> {
    caller.require_auth();
    let pool = read_pool_state(env).ok_or(LendingError::NotInitialized)?;
    udonfi_shared::validation::validate_admin(caller, &pool.admin)?;
    Ok(pool)
}

pub fn require_admin_or_guardian(env: &Env, caller: &Address) -> Result<Pool, LendingError> {
    caller.require_auth();
    let pool = read_pool_state(env).ok_or(LendingError::NotInitialized)?;
    if caller == &pool.admin || caller == &pool.guardian {
        return Ok(pool);
    }
    Err(LendingError::Unauthorized)
}

/// Validates global protocol lifecycle transitions.
///
/// Permitted transitions:
/// - Uninitialized -> Initializing
/// - Initializing -> Active
/// - Active -> Paused, Emergency, Deprecated
/// - Paused -> Active, Emergency, Deprecated
/// - Emergency -> Deprecated
/// - Deprecated -> terminal
pub fn validate_state_transition(
    from: ProtocolStatus,
    to: ProtocolStatus,
) -> Result<(), LendingError> {
    if from == to {
        return Ok(());
    }

    match (from, to) {
        (ProtocolStatus::Uninitialized, ProtocolStatus::Initializing)
        | (ProtocolStatus::Initializing, ProtocolStatus::Active)
        | (ProtocolStatus::Active, ProtocolStatus::Paused)
        | (ProtocolStatus::Active, ProtocolStatus::Emergency)
        | (ProtocolStatus::Active, ProtocolStatus::Deprecated)
        | (ProtocolStatus::Paused, ProtocolStatus::Active)
        | (ProtocolStatus::Paused, ProtocolStatus::Emergency)
        | (ProtocolStatus::Paused, ProtocolStatus::Deprecated)
        | (ProtocolStatus::Emergency, ProtocolStatus::Deprecated) => Ok(()),
        _ => Err(LendingError::ReserveNotActive),
    }
}

pub fn validate_protocol_active(pool: &Pool) -> Result<(), LendingError> {
    udonfi_shared::validation::validate_not_paused(pool.paused)?;
    if pool.protocol_status != ProtocolStatus::Active {
        return Err(LendingError::ReserveNotActive);
    }
    Ok(())
}
