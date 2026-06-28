//! Protocol Configuration Engine event payloads and emitters.

use crate::model::ConfigSection;
use soroban_sdk::{contracttype, Address, Env, Symbol};
use udonfi_shared::LedgerSequence;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProtocolConfigUpdated {
    pub config_version: u32,
    pub changed_section: ConfigSection,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub emergency: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RiskConfigUpdated {
    pub config_version: u32,
    pub changed_section: ConfigSection,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub emergency: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InterestConfigUpdated {
    pub config_version: u32,
    pub changed_section: ConfigSection,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub emergency: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OracleConfigUpdated {
    pub config_version: u32,
    pub changed_section: ConfigSection,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub emergency: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GovernanceConfigUpdated {
    pub config_version: u32,
    pub changed_section: ConfigSection,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub emergency: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ValidationConfigUpdated {
    pub config_version: u32,
    pub changed_section: ConfigSection,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub emergency: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigVersionCreated {
    pub previous_version: u32,
    pub config_version: u32,
    pub changed_section: ConfigSection,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub emergency: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EmergencyConfigChangeApplied {
    pub config_version: u32,
    pub changed_section: ConfigSection,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub emergency: bool,
}

#[allow(deprecated)]
fn publish_config_event<T>(env: &Env, event_name: &str, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
{
    env.events().publish(
        (Symbol::new(env, "config"), Symbol::new(env, event_name)),
        payload,
    );
}

pub fn publish_protocol_config_updated(env: &Env, payload: ProtocolConfigUpdated) {
    publish_config_event(env, "protocol_config_updated", payload);
}

pub fn publish_risk_config_updated(env: &Env, payload: RiskConfigUpdated) {
    publish_config_event(env, "risk_config_updated", payload);
}

pub fn publish_interest_config_updated(env: &Env, payload: InterestConfigUpdated) {
    publish_config_event(env, "interest_config_updated", payload);
}

pub fn publish_oracle_config_updated(env: &Env, payload: OracleConfigUpdated) {
    publish_config_event(env, "oracle_config_updated", payload);
}

pub fn publish_governance_config_updated(env: &Env, payload: GovernanceConfigUpdated) {
    publish_config_event(env, "governance_config_updated", payload);
}

pub fn publish_validation_config_updated(env: &Env, payload: ValidationConfigUpdated) {
    publish_config_event(env, "validation_config_updated", payload);
}

pub fn publish_config_version_created(env: &Env, payload: ConfigVersionCreated) {
    publish_config_event(env, "config_version_created", payload);
}

pub fn publish_emergency_config_change_applied(env: &Env, payload: EmergencyConfigChangeApplied) {
    publish_config_event(env, "emergency_config_change", payload);
}
