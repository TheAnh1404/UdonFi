//! Protocol Configuration Engine update and query API.

use crate::errors::LendingError;
use crate::events::{
    publish_governance_config_updated, publish_interest_config_updated,
    publish_oracle_config_updated, publish_protocol_config_updated, publish_risk_config_updated,
    publish_validation_config_updated, GovernanceConfigUpdated, InterestConfigUpdated,
    OracleConfigUpdated, ProtocolConfigUpdated, RiskConfigUpdated, ValidationConfigUpdated,
};
use crate::model::{
    default_governance_config, default_interest_config, default_oracle_config,
    default_protocol_config, default_risk_config, default_validation_config, ConfigAccessControl,
    ConfigHistoryMetadata, ConfigSection, ConfigUpdateContext, CurrentConfig, GovernanceConfig,
    InterestConfig, OracleConfig, ProtocolConfig, RiskConfig, ValidationConfig,
    INITIAL_CONFIG_VERSION,
};
use crate::storage::{
    has_config_engine, read_current_version, read_governance_config_version, read_history_count,
    read_history_metadata, read_interest_config_version, read_latest_governance_config,
    read_latest_interest_config, read_latest_oracle_config, read_latest_protocol_config,
    read_latest_risk_config, read_latest_validation_config, read_oracle_config_version,
    read_protocol_config_version, read_risk_config_version, read_validation_config_version,
    write_access_control, write_latest_governance_config, write_latest_interest_config,
    write_latest_oracle_config, write_latest_protocol_config, write_latest_risk_config,
    write_latest_validation_config,
};
use crate::validation::{
    governance_change_increases_risk, interest_change_increases_risk, interest_change_reduces_risk,
    oracle_change_increases_risk, oracle_change_reduces_risk, protocol_change_increases_risk,
    protocol_change_reduces_risk_or_pauses, require_authority, risk_change_increases_risk,
    risk_change_reduces_risk, validate_governance_config, validate_governance_constraints,
    validate_guardian_reduction, validate_interest_config, validate_oracle_config,
    validate_protocol_config, validate_risk_config, validate_validation_config,
    validation_change_increases_risk, validation_change_reduces_risk,
};
use crate::versioning::{
    commit_version, create_history_metadata, next_config_version, stamp_protocol_version,
};
use soroban_sdk::{Address, Env, String, Vec};
use udonfi_shared::{LedgerSequence, Timestamp};

pub fn initialize_default_config(
    env: &Env,
    admin: Address,
    guardian: Address,
    reason: String,
) -> Result<CurrentConfig, LendingError> {
    if has_config_engine(env) {
        return Err(LendingError::AlreadyInitialized);
    }
    if reason.is_empty() {
        return Err(LendingError::InvalidAmount);
    }

    admin.require_auth();
    if admin == env.current_contract_address() {
        return Err(LendingError::InvalidAdmin);
    }
    if guardian == env.current_contract_address() {
        return Err(LendingError::InvalidGuardian);
    }

    let now = Timestamp(env.ledger().timestamp());
    let access = ConfigAccessControl {
        admin: admin.clone(),
        guardian,
        created_at: now,
        updated_at: now,
    };

    let config = CurrentConfig {
        protocol: default_protocol_config(now),
        risk: default_risk_config(),
        interest: default_interest_config(),
        oracle: default_oracle_config(),
        governance: default_governance_config(),
        validation: default_validation_config(),
    };

    validate_protocol_config(&config.protocol)?;
    validate_risk_config(&config.risk)?;
    validate_interest_config(&config.interest)?;
    validate_oracle_config(&config.oracle)?;
    validate_governance_config(&config.governance)?;
    validate_validation_config(&config.validation)?;

    write_access_control(env, &access);
    write_latest_protocol_config(env, &config.protocol);
    write_latest_risk_config(env, &config.risk);
    write_latest_interest_config(env, &config.interest);
    write_latest_oracle_config(env, &config.oracle);
    write_latest_governance_config(env, &config.governance);
    write_latest_validation_config(env, &config.validation);

    let context = ConfigUpdateContext::governance(admin, reason);
    let metadata =
        create_history_metadata(env, 0, INITIAL_CONFIG_VERSION, ConfigSection::All, &context);
    commit_version(env, &metadata, &config)?;

    Ok(config)
}

pub fn get_current_config(env: &Env) -> Result<CurrentConfig, LendingError> {
    Ok(CurrentConfig {
        protocol: read_latest_protocol_config(env).ok_or(LendingError::NotInitialized)?,
        risk: read_latest_risk_config(env).ok_or(LendingError::NotInitialized)?,
        interest: read_latest_interest_config(env).ok_or(LendingError::NotInitialized)?,
        oracle: read_latest_oracle_config(env).ok_or(LendingError::NotInitialized)?,
        governance: read_latest_governance_config(env).ok_or(LendingError::NotInitialized)?,
        validation: read_latest_validation_config(env).ok_or(LendingError::NotInitialized)?,
    })
}

pub fn get_config_version(env: &Env) -> Result<u32, LendingError> {
    read_current_version(env).ok_or(LendingError::NotInitialized)
}

pub fn get_config_history_metadata(env: &Env) -> Result<Vec<ConfigHistoryMetadata>, LendingError> {
    if !has_config_engine(env) {
        return Err(LendingError::NotInitialized);
    }

    let count = read_history_count(env);
    let mut metadata = Vec::new(env);
    for version in 1..=count {
        if let Some(entry) = read_history_metadata(env, version) {
            metadata.push_back(entry);
        }
    }
    Ok(metadata)
}

pub fn get_config_history_metadata_for_version(
    env: &Env,
    version: u32,
) -> Result<ConfigHistoryMetadata, LendingError> {
    read_history_metadata(env, version).ok_or(LendingError::InvalidIndex)
}

pub fn get_protocol_config_at_version(
    env: &Env,
    version: u32,
) -> Result<ProtocolConfig, LendingError> {
    read_protocol_config_version(env, version).ok_or(LendingError::InvalidIndex)
}

pub fn get_risk_config_at_version(env: &Env, version: u32) -> Result<RiskConfig, LendingError> {
    read_risk_config_version(env, version).ok_or(LendingError::InvalidIndex)
}

pub fn get_interest_config_at_version(
    env: &Env,
    version: u32,
) -> Result<InterestConfig, LendingError> {
    read_interest_config_version(env, version).ok_or(LendingError::InvalidIndex)
}

pub fn get_oracle_config_at_version(env: &Env, version: u32) -> Result<OracleConfig, LendingError> {
    read_oracle_config_version(env, version).ok_or(LendingError::InvalidIndex)
}

pub fn get_governance_config_at_version(
    env: &Env,
    version: u32,
) -> Result<GovernanceConfig, LendingError> {
    read_governance_config_version(env, version).ok_or(LendingError::InvalidIndex)
}

pub fn get_validation_config_at_version(
    env: &Env,
    version: u32,
) -> Result<ValidationConfig, LendingError> {
    read_validation_config_version(env, version).ok_or(LendingError::InvalidIndex)
}

fn current_ledger(env: &Env) -> LedgerSequence {
    LedgerSequence(env.ledger().sequence())
}

pub fn update_protocol_config(
    env: &Env,
    context: ConfigUpdateContext,
    mut next: ProtocolConfig,
) -> Result<ProtocolConfig, LendingError> {
    require_authority(env, &context)?;

    let mut current = get_current_config(env)?;
    let governance = current.governance;
    let previous = current.protocol.clone();
    let (previous_version, version) = next_config_version(env)?;
    let now = Timestamp(env.ledger().timestamp());
    stamp_protocol_version(&mut next, version, now);
    validate_protocol_config(&next)?;

    let risk_increasing = protocol_change_increases_risk(&previous, &next);
    let risk_reducing_or_pause = protocol_change_reduces_risk_or_pauses(&previous, &next);
    validate_guardian_reduction(&context, risk_reducing_or_pause)?;
    validate_governance_constraints(env, &context, &governance, risk_increasing)?;

    current.protocol = next.clone();
    write_latest_protocol_config(env, &next);

    let metadata = create_history_metadata(
        env,
        previous_version,
        version,
        ConfigSection::Protocol,
        &context,
    );
    commit_version(env, &metadata, &current)?;

    publish_protocol_config_updated(
        env,
        ProtocolConfigUpdated {
            config_version: version,
            changed_section: ConfigSection::Protocol,
            actor: context.actor,
            ledger: current_ledger(env),
            emergency: context.emergency,
        },
    );

    Ok(next)
}

pub fn update_risk_config(
    env: &Env,
    context: ConfigUpdateContext,
    next: RiskConfig,
) -> Result<RiskConfig, LendingError> {
    require_authority(env, &context)?;
    validate_risk_config(&next)?;

    let mut current = get_current_config(env)?;
    let governance = current.governance;
    let previous = current.risk;
    let risk_increasing = risk_change_increases_risk(&previous, &next);
    let risk_reducing = risk_change_reduces_risk(&previous, &next);
    validate_guardian_reduction(&context, risk_reducing)?;
    validate_governance_constraints(env, &context, &governance, risk_increasing)?;

    let (previous_version, version) = next_config_version(env)?;
    let now = Timestamp(env.ledger().timestamp());
    stamp_protocol_version(&mut current.protocol, version, now);
    current.risk = next;

    write_latest_protocol_config(env, &current.protocol);
    write_latest_risk_config(env, &next);
    let metadata = create_history_metadata(
        env,
        previous_version,
        version,
        ConfigSection::Risk,
        &context,
    );
    commit_version(env, &metadata, &current)?;

    publish_risk_config_updated(
        env,
        RiskConfigUpdated {
            config_version: version,
            changed_section: ConfigSection::Risk,
            actor: context.actor,
            ledger: current_ledger(env),
            emergency: context.emergency,
        },
    );

    Ok(next)
}

pub fn update_interest_config(
    env: &Env,
    context: ConfigUpdateContext,
    next: InterestConfig,
) -> Result<InterestConfig, LendingError> {
    require_authority(env, &context)?;
    validate_interest_config(&next)?;

    let mut current = get_current_config(env)?;
    let governance = current.governance;
    let previous = current.interest;
    let risk_increasing = interest_change_increases_risk(&previous, &next);
    let risk_reducing = interest_change_reduces_risk(&previous, &next);
    validate_guardian_reduction(&context, risk_reducing)?;
    validate_governance_constraints(env, &context, &governance, risk_increasing)?;

    let (previous_version, version) = next_config_version(env)?;
    let now = Timestamp(env.ledger().timestamp());
    stamp_protocol_version(&mut current.protocol, version, now);
    current.interest = next;

    write_latest_protocol_config(env, &current.protocol);
    write_latest_interest_config(env, &next);
    let metadata = create_history_metadata(
        env,
        previous_version,
        version,
        ConfigSection::Interest,
        &context,
    );
    commit_version(env, &metadata, &current)?;

    publish_interest_config_updated(
        env,
        InterestConfigUpdated {
            config_version: version,
            changed_section: ConfigSection::Interest,
            actor: context.actor,
            ledger: current_ledger(env),
            emergency: context.emergency,
        },
    );

    Ok(next)
}

pub fn update_oracle_config(
    env: &Env,
    context: ConfigUpdateContext,
    next: OracleConfig,
) -> Result<OracleConfig, LendingError> {
    require_authority(env, &context)?;
    validate_oracle_config(&next)?;

    let mut current = get_current_config(env)?;
    let governance = current.governance;
    let previous = current.oracle;
    let risk_increasing = oracle_change_increases_risk(&previous, &next);
    let risk_reducing = oracle_change_reduces_risk(&previous, &next);
    validate_guardian_reduction(&context, risk_reducing)?;
    validate_governance_constraints(env, &context, &governance, risk_increasing)?;

    let (previous_version, version) = next_config_version(env)?;
    let now = Timestamp(env.ledger().timestamp());
    stamp_protocol_version(&mut current.protocol, version, now);
    current.oracle = next;

    write_latest_protocol_config(env, &current.protocol);
    write_latest_oracle_config(env, &next);
    let metadata = create_history_metadata(
        env,
        previous_version,
        version,
        ConfigSection::Oracle,
        &context,
    );
    commit_version(env, &metadata, &current)?;

    publish_oracle_config_updated(
        env,
        OracleConfigUpdated {
            config_version: version,
            changed_section: ConfigSection::Oracle,
            actor: context.actor,
            ledger: current_ledger(env),
            emergency: context.emergency,
        },
    );

    Ok(next)
}

pub fn update_governance_config(
    env: &Env,
    context: ConfigUpdateContext,
    next: GovernanceConfig,
) -> Result<GovernanceConfig, LendingError> {
    require_authority(env, &context)?;
    validate_governance_config(&next)?;

    let mut current = get_current_config(env)?;
    let previous = current.governance;
    let risk_increasing = governance_change_increases_risk(&previous, &next);
    validate_guardian_reduction(&context, false)?;
    validate_governance_constraints(env, &context, &previous, risk_increasing)?;

    let (previous_version, version) = next_config_version(env)?;
    let now = Timestamp(env.ledger().timestamp());
    stamp_protocol_version(&mut current.protocol, version, now);
    current.governance = next;

    write_latest_protocol_config(env, &current.protocol);
    write_latest_governance_config(env, &next);
    let metadata = create_history_metadata(
        env,
        previous_version,
        version,
        ConfigSection::Governance,
        &context,
    );
    commit_version(env, &metadata, &current)?;

    publish_governance_config_updated(
        env,
        GovernanceConfigUpdated {
            config_version: version,
            changed_section: ConfigSection::Governance,
            actor: context.actor,
            ledger: current_ledger(env),
            emergency: context.emergency,
        },
    );

    Ok(next)
}

pub fn update_validation_config(
    env: &Env,
    context: ConfigUpdateContext,
    next: ValidationConfig,
) -> Result<ValidationConfig, LendingError> {
    require_authority(env, &context)?;
    validate_validation_config(&next)?;

    let mut current = get_current_config(env)?;
    let governance = current.governance;
    let previous = current.validation;
    let risk_increasing = validation_change_increases_risk(&previous, &next);
    let risk_reducing = validation_change_reduces_risk(&previous, &next);
    validate_guardian_reduction(&context, risk_reducing)?;
    validate_governance_constraints(env, &context, &governance, risk_increasing)?;

    let (previous_version, version) = next_config_version(env)?;
    let now = Timestamp(env.ledger().timestamp());
    stamp_protocol_version(&mut current.protocol, version, now);
    current.validation = next;

    write_latest_protocol_config(env, &current.protocol);
    write_latest_validation_config(env, &next);
    let metadata = create_history_metadata(
        env,
        previous_version,
        version,
        ConfigSection::Validation,
        &context,
    );
    commit_version(env, &metadata, &current)?;

    publish_validation_config_updated(
        env,
        ValidationConfigUpdated {
            config_version: version,
            changed_section: ConfigSection::Validation,
            actor: context.actor,
            ledger: current_ledger(env),
            emergency: context.emergency,
        },
    );

    Ok(next)
}
