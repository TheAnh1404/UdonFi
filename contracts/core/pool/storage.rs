//! Namespaced storage layout for Pool State.
//!
//! Persistent keys:
//! - `GlobalPoolState`: canonical `Pool` aggregate.
//! - `ProtocolConfiguration`: shared `ProtocolConfig` for admin, guardian, treasury, and reserve cap.
//! - `Guardian`: fast lookup for the emergency guardian.
//! - `Treasury`: fast lookup for protocol treasury routing.
//! - `InsuranceFund`: fast lookup for bad-debt backstop routing.

use crate::model::Pool;
use soroban_sdk::{contracttype, Address, Env};
use udonfi_shared::{ProtocolConfig, StorageKey};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PoolStorageKey {
    GlobalPoolState,
    ProtocolConfiguration,
    Guardian,
    Treasury,
    InsuranceFund,
}

pub fn pool_exists(env: &Env) -> bool {
    env.storage()
        .persistent()
        .has(&PoolStorageKey::GlobalPoolState)
}

pub fn read_pool_state(env: &Env) -> Option<Pool> {
    env.storage()
        .persistent()
        .get(&PoolStorageKey::GlobalPoolState)
}

pub fn write_pool_state(env: &Env, pool: &Pool) {
    let key = PoolStorageKey::GlobalPoolState;
    env.storage().persistent().set(&key, pool);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_protocol_config(env: &Env) -> Option<ProtocolConfig> {
    env.storage()
        .persistent()
        .get(&PoolStorageKey::ProtocolConfiguration)
}

pub fn write_protocol_config(env: &Env, config: &ProtocolConfig) {
    let key = PoolStorageKey::ProtocolConfiguration;
    env.storage().persistent().set(&key, config);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn write_guardian(env: &Env, guardian: &Address) {
    let key = PoolStorageKey::Guardian;
    env.storage().persistent().set(&key, guardian);
    env.storage()
        .persistent()
        .set(&StorageKey::Guardian, guardian);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &StorageKey::Guardian);
}

pub fn read_guardian(env: &Env) -> Option<Address> {
    env.storage().persistent().get(&PoolStorageKey::Guardian)
}

pub fn write_treasury(env: &Env, treasury: &Address) {
    let key = PoolStorageKey::Treasury;
    env.storage().persistent().set(&key, treasury);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_treasury(env: &Env) -> Option<Address> {
    env.storage().persistent().get(&PoolStorageKey::Treasury)
}

pub fn write_insurance_fund(env: &Env, insurance_fund: &Address) {
    let key = PoolStorageKey::InsuranceFund;
    env.storage().persistent().set(&key, insurance_fund);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_insurance_fund(env: &Env) -> Option<Address> {
    env.storage()
        .persistent()
        .get(&PoolStorageKey::InsuranceFund)
}
