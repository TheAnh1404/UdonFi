//! Configuration versioning helpers.

use crate::errors::LendingError;
use crate::events::{
    publish_config_version_created, publish_emergency_config_change_applied, ConfigVersionCreated,
    EmergencyConfigChangeApplied,
};
use crate::model::{
    ConfigHistoryMetadata, ConfigSection, ConfigUpdateContext, CurrentConfig, ProtocolConfig,
};
use crate::storage::{
    read_current_version, read_history_count, write_current_version,
    write_governance_config_version, write_history_count, write_history_metadata,
    write_interest_config_version, write_oracle_config_version, write_protocol_config_version,
    write_risk_config_version, write_validation_config_version,
};
use soroban_sdk::Env;
use udonfi_shared::{LedgerSequence, Timestamp};

pub fn next_config_version(env: &Env) -> Result<(u32, u32), LendingError> {
    let current = read_current_version(env).ok_or(LendingError::NotInitialized)?;
    let next = current.checked_add(1).ok_or(LendingError::MathOverflow)?;
    if next <= current {
        return Err(LendingError::MathOverflow);
    }
    Ok((current, next))
}

pub fn stamp_protocol_version(protocol: &mut ProtocolConfig, version: u32, timestamp: Timestamp) {
    protocol.config_version = version;
    protocol.updated_at = timestamp;
}

pub fn write_config_snapshot(env: &Env, version: u32, config: &CurrentConfig) {
    write_protocol_config_version(env, version, &config.protocol);
    write_risk_config_version(env, version, &config.risk);
    write_interest_config_version(env, version, &config.interest);
    write_oracle_config_version(env, version, &config.oracle);
    write_governance_config_version(env, version, &config.governance);
    write_validation_config_version(env, version, &config.validation);
}

pub fn create_history_metadata(
    env: &Env,
    previous_version: u32,
    version: u32,
    section: ConfigSection,
    context: &ConfigUpdateContext,
) -> ConfigHistoryMetadata {
    ConfigHistoryMetadata {
        config_version: version,
        previous_version,
        changed_section: section,
        actor: context.actor.clone(),
        ledger: LedgerSequence(env.ledger().sequence()),
        timestamp: Timestamp(env.ledger().timestamp()),
        emergency: context.emergency,
        reason: context.reason.clone(),
    }
}

pub fn commit_version(
    env: &Env,
    metadata: &ConfigHistoryMetadata,
    config: &CurrentConfig,
) -> Result<(), LendingError> {
    let current = read_current_version(env).unwrap_or(0);
    if metadata.config_version <= current {
        return Err(LendingError::InvalidIndex);
    }

    let next_history_count = read_history_count(env)
        .checked_add(1)
        .ok_or(LendingError::MathOverflow)?;

    write_config_snapshot(env, metadata.config_version, config);
    write_history_metadata(env, metadata);
    write_current_version(env, metadata.config_version);
    write_history_count(env, next_history_count);

    publish_config_version_created(
        env,
        ConfigVersionCreated {
            previous_version: metadata.previous_version,
            config_version: metadata.config_version,
            changed_section: metadata.changed_section,
            actor: metadata.actor.clone(),
            ledger: metadata.ledger,
            emergency: metadata.emergency,
        },
    );

    if metadata.emergency {
        publish_emergency_config_change_applied(
            env,
            EmergencyConfigChangeApplied {
                config_version: metadata.config_version,
                changed_section: metadata.changed_section,
                actor: metadata.actor.clone(),
                ledger: metadata.ledger,
                emergency: true,
            },
        );
    }
    Ok(())
}
