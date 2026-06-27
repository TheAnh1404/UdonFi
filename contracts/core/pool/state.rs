//! Pool State management operations.

use crate::errors::LendingError;
use crate::events::{
    publish_guardian_updated, publish_insurance_fund_updated, publish_protocol_metadata_updated,
    publish_protocol_paused, publish_protocol_unpaused, publish_treasury_updated, GuardianUpdated,
    InsuranceFundUpdated, ProtocolMetadataUpdated, ProtocolPaused, ProtocolUnpaused,
    TreasuryUpdated,
};
use crate::model::{Pool, ProtocolStatus};
use crate::storage::{
    pool_exists, read_pool_state, read_protocol_config, write_guardian, write_insurance_fund,
    write_pool_state, write_protocol_config, write_treasury,
};
use crate::validation::{
    require_admin, require_admin_or_guardian, validate_guardian_address,
    validate_insurance_fund_address, validate_protocol_active, validate_protocol_metadata,
    validate_state_transition, validate_treasury_address,
};
use soroban_sdk::{Address, Env, String};
use udonfi_shared::Timestamp;

pub fn is_protocol_initialized(env: &Env) -> bool {
    pool_exists(env)
}

pub fn get_pool(env: &Env) -> Result<Pool, LendingError> {
    read_pool_state(env).ok_or(LendingError::NotInitialized)
}

pub fn assert_protocol_active(env: &Env) -> Result<(), LendingError> {
    let pool = get_pool(env)?;
    validate_protocol_active(&pool)
}

pub fn update_protocol_metadata(
    env: &Env,
    caller: Address,
    protocol_name: String,
    protocol_version: u32,
    current_config_version: u32,
) -> Result<Pool, LendingError> {
    let mut pool = require_admin(env, &caller)?;
    validate_protocol_metadata(protocol_version, current_config_version)?;

    let now = Timestamp(env.ledger().timestamp());
    pool.protocol_name = protocol_name.clone();
    pool.protocol_version = protocol_version;
    pool.current_config_version = current_config_version;
    pool.updated_at = now;
    write_pool_state(env, &pool);

    publish_protocol_metadata_updated(
        env,
        ProtocolMetadataUpdated {
            protocol_name,
            protocol_version,
            current_config_version,
            updated_by: caller,
            updated_at: now,
        },
    );

    Ok(pool)
}

pub fn pause_protocol(env: &Env, caller: Address) -> Result<Pool, LendingError> {
    let mut pool = require_admin_or_guardian(env, &caller)?;
    if pool.paused {
        return Err(LendingError::Paused);
    }
    validate_state_transition(pool.protocol_status, ProtocolStatus::Paused)?;

    let now = Timestamp(env.ledger().timestamp());
    pool.protocol_status = ProtocolStatus::Paused;
    pool.paused = true;
    pool.updated_at = now;
    write_pool_state(env, &pool);

    publish_protocol_paused(
        env,
        ProtocolPaused {
            by: caller,
            paused_at: now,
        },
    );

    Ok(pool)
}

pub fn unpause_protocol(env: &Env, caller: Address) -> Result<Pool, LendingError> {
    let mut pool = require_admin_or_guardian(env, &caller)?;
    if !pool.paused {
        return Err(LendingError::NotPaused);
    }
    validate_state_transition(pool.protocol_status, ProtocolStatus::Active)?;

    let now = Timestamp(env.ledger().timestamp());
    pool.protocol_status = ProtocolStatus::Active;
    pool.paused = false;
    pool.updated_at = now;
    write_pool_state(env, &pool);

    publish_protocol_unpaused(
        env,
        ProtocolUnpaused {
            by: caller,
            unpaused_at: now,
        },
    );

    Ok(pool)
}

pub fn set_guardian(
    env: &Env,
    caller: Address,
    new_guardian: Address,
) -> Result<Pool, LendingError> {
    let mut pool = require_admin(env, &caller)?;
    validate_guardian_address(env, &new_guardian)?;

    let old_guardian = pool.guardian.clone();
    let now = Timestamp(env.ledger().timestamp());
    pool.guardian = new_guardian.clone();
    pool.updated_at = now;
    write_pool_state(env, &pool);
    write_guardian(env, &new_guardian);

    if let Some(mut config) = read_protocol_config(env) {
        config.guardian = new_guardian.clone();
        write_protocol_config(env, &config);
    }

    publish_guardian_updated(
        env,
        GuardianUpdated {
            old_guardian,
            new_guardian,
            updated_by: caller,
            updated_at: now,
        },
    );

    Ok(pool)
}

pub fn set_treasury(
    env: &Env,
    caller: Address,
    new_treasury: Address,
) -> Result<Pool, LendingError> {
    let mut pool = require_admin(env, &caller)?;
    validate_treasury_address(env, &new_treasury)?;

    let old_treasury = pool.treasury_address.clone();
    let now = Timestamp(env.ledger().timestamp());
    pool.treasury_address = new_treasury.clone();
    pool.updated_at = now;
    write_pool_state(env, &pool);
    write_treasury(env, &new_treasury);

    if let Some(mut config) = read_protocol_config(env) {
        config.treasury = new_treasury.clone();
        write_protocol_config(env, &config);
    }

    publish_treasury_updated(
        env,
        TreasuryUpdated {
            old_treasury,
            new_treasury,
            updated_by: caller,
            updated_at: now,
        },
    );

    Ok(pool)
}

pub fn set_insurance_fund(
    env: &Env,
    caller: Address,
    new_insurance_fund: Address,
) -> Result<Pool, LendingError> {
    let mut pool = require_admin(env, &caller)?;
    validate_insurance_fund_address(env, &new_insurance_fund)?;

    let old_insurance_fund = pool.insurance_fund_address.clone();
    let now = Timestamp(env.ledger().timestamp());
    pool.insurance_fund_address = new_insurance_fund.clone();
    pool.updated_at = now;
    write_pool_state(env, &pool);
    write_insurance_fund(env, &new_insurance_fund);

    publish_insurance_fund_updated(
        env,
        InsuranceFundUpdated {
            old_insurance_fund,
            new_insurance_fund,
            updated_by: caller,
            updated_at: now,
        },
    );

    Ok(pool)
}
