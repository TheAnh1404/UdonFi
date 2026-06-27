//! Protocol initialization flow for Pool State.

use crate::errors::LendingError;
use crate::events::{publish_protocol_initialized, ProtocolInitialized};
use crate::model::{Pool, ProtocolStatus, INITIAL_CONFIG_VERSION};
use crate::storage::{
    write_guardian, write_insurance_fund, write_pool_state, write_protocol_config, write_treasury,
};
use crate::validation::{
    validate_admin_address, validate_guardian_address, validate_insurance_fund_address,
    validate_not_initialized, validate_protocol_metadata, validate_state_transition,
    validate_treasury_address,
};
use soroban_sdk::{Address, Env, String};
use udonfi_shared::{ProtocolConfig, Timestamp};

pub fn initialize_protocol(
    env: &Env,
    admin: Address,
    protocol_name: String,
    protocol_version: u32,
    guardian: Address,
    treasury_address: Address,
    insurance_fund_address: Address,
) -> Result<Pool, LendingError> {
    validate_not_initialized(env)?;
    admin.require_auth();

    validate_protocol_metadata(protocol_version, INITIAL_CONFIG_VERSION)?;
    validate_admin_address(env, &admin)?;
    validate_guardian_address(env, &guardian)?;
    validate_treasury_address(env, &treasury_address)?;
    validate_insurance_fund_address(env, &insurance_fund_address)?;
    validate_state_transition(ProtocolStatus::Uninitialized, ProtocolStatus::Initializing)?;
    validate_state_transition(ProtocolStatus::Initializing, ProtocolStatus::Active)?;

    let now = Timestamp(env.ledger().timestamp());
    let pool = Pool {
        protocol_version,
        protocol_name: protocol_name.clone(),
        protocol_status: ProtocolStatus::Active,
        total_reserves: 0,
        active_reserves: 0,
        paused: false,
        guardian: guardian.clone(),
        admin: admin.clone(),
        treasury_address: treasury_address.clone(),
        insurance_fund_address: insurance_fund_address.clone(),
        created_at: now,
        updated_at: now,
        initialized_at: now,
        current_config_version: INITIAL_CONFIG_VERSION,
    };

    let config = ProtocolConfig {
        admin: admin.clone(),
        guardian: guardian.clone(),
        treasury: treasury_address.clone(),
        max_reserves: udonfi_shared::constants::MAX_RESERVES,
    };

    write_pool_state(env, &pool);
    write_protocol_config(env, &config);
    write_guardian(env, &guardian);
    write_treasury(env, &treasury_address);
    write_insurance_fund(env, &insurance_fund_address);

    publish_protocol_initialized(
        env,
        ProtocolInitialized {
            protocol_name,
            protocol_version,
            admin,
            guardian,
            treasury_address,
            insurance_fund_address,
            initialized_at: now,
        },
    );

    Ok(pool)
}
