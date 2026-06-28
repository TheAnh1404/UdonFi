//! Namespaced persistent storage for the Protocol Configuration Engine.

use crate::model::{
    ConfigAccessControl, ConfigHistoryMetadata, GovernanceConfig, InterestConfig, OracleConfig,
    ProtocolConfig, RiskConfig, ValidationConfig,
};
use soroban_sdk::{contracttype, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ConfigStorageKey {
    AccessControl,
    CurrentVersion,
    HistoryCount,
    LatestProtocol,
    LatestRisk,
    LatestInterest,
    LatestOracle,
    LatestGovernance,
    LatestValidation,
    HistoryMetadata(u32),
    ProtocolVersion(u32),
    RiskVersion(u32),
    InterestVersion(u32),
    OracleVersion(u32),
    GovernanceVersion(u32),
    ValidationVersion(u32),
}

pub fn has_config_engine(env: &Env) -> bool {
    env.storage()
        .persistent()
        .has(&ConfigStorageKey::AccessControl)
}

pub fn read_access_control(env: &Env) -> Option<ConfigAccessControl> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::AccessControl)
}

pub fn write_access_control(env: &Env, access: &ConfigAccessControl) {
    let key = ConfigStorageKey::AccessControl;
    env.storage().persistent().set(&key, access);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_current_version(env: &Env) -> Option<u32> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::CurrentVersion)
}

pub fn write_current_version(env: &Env, version: u32) {
    let key = ConfigStorageKey::CurrentVersion;
    env.storage().persistent().set(&key, &version);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_history_count(env: &Env) -> u32 {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::HistoryCount)
        .unwrap_or(0)
}

pub fn write_history_count(env: &Env, count: u32) {
    let key = ConfigStorageKey::HistoryCount;
    env.storage().persistent().set(&key, &count);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_history_metadata(env: &Env, version: u32) -> Option<ConfigHistoryMetadata> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::HistoryMetadata(version))
}

pub fn write_history_metadata(env: &Env, metadata: &ConfigHistoryMetadata) {
    let key = ConfigStorageKey::HistoryMetadata(metadata.config_version);
    env.storage().persistent().set(&key, metadata);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_latest_protocol_config(env: &Env) -> Option<ProtocolConfig> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::LatestProtocol)
}

pub fn write_latest_protocol_config(env: &Env, config: &ProtocolConfig) {
    let key = ConfigStorageKey::LatestProtocol;
    env.storage().persistent().set(&key, config);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_latest_risk_config(env: &Env) -> Option<RiskConfig> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::LatestRisk)
}

pub fn write_latest_risk_config(env: &Env, config: &RiskConfig) {
    let key = ConfigStorageKey::LatestRisk;
    env.storage().persistent().set(&key, config);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_latest_interest_config(env: &Env) -> Option<InterestConfig> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::LatestInterest)
}

pub fn write_latest_interest_config(env: &Env, config: &InterestConfig) {
    let key = ConfigStorageKey::LatestInterest;
    env.storage().persistent().set(&key, config);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_latest_oracle_config(env: &Env) -> Option<OracleConfig> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::LatestOracle)
}

pub fn write_latest_oracle_config(env: &Env, config: &OracleConfig) {
    let key = ConfigStorageKey::LatestOracle;
    env.storage().persistent().set(&key, config);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_latest_governance_config(env: &Env) -> Option<GovernanceConfig> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::LatestGovernance)
}

pub fn write_latest_governance_config(env: &Env, config: &GovernanceConfig) {
    let key = ConfigStorageKey::LatestGovernance;
    env.storage().persistent().set(&key, config);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_latest_validation_config(env: &Env) -> Option<ValidationConfig> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::LatestValidation)
}

pub fn write_latest_validation_config(env: &Env, config: &ValidationConfig) {
    let key = ConfigStorageKey::LatestValidation;
    env.storage().persistent().set(&key, config);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn write_protocol_config_version(env: &Env, version: u32, config: &ProtocolConfig) {
    let key = ConfigStorageKey::ProtocolVersion(version);
    env.storage().persistent().set(&key, config);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_protocol_config_version(env: &Env, version: u32) -> Option<ProtocolConfig> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::ProtocolVersion(version))
}

pub fn write_risk_config_version(env: &Env, version: u32, config: &RiskConfig) {
    let key = ConfigStorageKey::RiskVersion(version);
    env.storage().persistent().set(&key, config);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_risk_config_version(env: &Env, version: u32) -> Option<RiskConfig> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::RiskVersion(version))
}

pub fn write_interest_config_version(env: &Env, version: u32, config: &InterestConfig) {
    let key = ConfigStorageKey::InterestVersion(version);
    env.storage().persistent().set(&key, config);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_interest_config_version(env: &Env, version: u32) -> Option<InterestConfig> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::InterestVersion(version))
}

pub fn write_oracle_config_version(env: &Env, version: u32, config: &OracleConfig) {
    let key = ConfigStorageKey::OracleVersion(version);
    env.storage().persistent().set(&key, config);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_oracle_config_version(env: &Env, version: u32) -> Option<OracleConfig> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::OracleVersion(version))
}

pub fn write_governance_config_version(env: &Env, version: u32, config: &GovernanceConfig) {
    let key = ConfigStorageKey::GovernanceVersion(version);
    env.storage().persistent().set(&key, config);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_governance_config_version(env: &Env, version: u32) -> Option<GovernanceConfig> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::GovernanceVersion(version))
}

pub fn write_validation_config_version(env: &Env, version: u32, config: &ValidationConfig) {
    let key = ConfigStorageKey::ValidationVersion(version);
    env.storage().persistent().set(&key, config);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_validation_config_version(env: &Env, version: u32) -> Option<ValidationConfig> {
    env.storage()
        .persistent()
        .get(&ConfigStorageKey::ValidationVersion(version))
}
