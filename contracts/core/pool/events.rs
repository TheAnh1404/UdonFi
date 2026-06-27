//! Pool State event payloads and emitters.

use soroban_sdk::{contracttype, Address, Env, String, Symbol};
use udonfi_shared::Timestamp;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProtocolInitialized {
    pub protocol_name: String,
    pub protocol_version: u32,
    pub admin: Address,
    pub guardian: Address,
    pub treasury_address: Address,
    pub insurance_fund_address: Address,
    pub initialized_at: Timestamp,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProtocolPaused {
    pub by: Address,
    pub paused_at: Timestamp,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProtocolUnpaused {
    pub by: Address,
    pub unpaused_at: Timestamp,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GuardianUpdated {
    pub old_guardian: Address,
    pub new_guardian: Address,
    pub updated_by: Address,
    pub updated_at: Timestamp,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TreasuryUpdated {
    pub old_treasury: Address,
    pub new_treasury: Address,
    pub updated_by: Address,
    pub updated_at: Timestamp,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InsuranceFundUpdated {
    pub old_insurance_fund: Address,
    pub new_insurance_fund: Address,
    pub updated_by: Address,
    pub updated_at: Timestamp,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProtocolMetadataUpdated {
    pub protocol_name: String,
    pub protocol_version: u32,
    pub current_config_version: u32,
    pub updated_by: Address,
    pub updated_at: Timestamp,
}

#[allow(deprecated)]
fn publish_pool_event<T>(env: &Env, event_name: &str, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
{
    env.events().publish(
        (Symbol::new(env, "pool"), Symbol::new(env, event_name)),
        payload,
    );
}

pub fn publish_protocol_initialized(env: &Env, payload: ProtocolInitialized) {
    publish_pool_event(env, "protocol_initialized", payload);
}

pub fn publish_protocol_paused(env: &Env, payload: ProtocolPaused) {
    publish_pool_event(env, "protocol_paused", payload);
}

pub fn publish_protocol_unpaused(env: &Env, payload: ProtocolUnpaused) {
    publish_pool_event(env, "protocol_unpaused", payload);
}

pub fn publish_guardian_updated(env: &Env, payload: GuardianUpdated) {
    publish_pool_event(env, "guardian_updated", payload);
}

pub fn publish_treasury_updated(env: &Env, payload: TreasuryUpdated) {
    publish_pool_event(env, "treasury_updated", payload);
}

pub fn publish_insurance_fund_updated(env: &Env, payload: InsuranceFundUpdated) {
    publish_pool_event(env, "insurance_updated", payload);
}

pub fn publish_protocol_metadata_updated(env: &Env, payload: ProtocolMetadataUpdated) {
    publish_pool_event(env, "metadata_updated", payload);
}
