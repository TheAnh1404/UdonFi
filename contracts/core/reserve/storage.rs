//! Storage helper utilities for the Reserve Registry.

use crate::model::Reserve;
use soroban_sdk::{Address, Env};
use udonfi_shared::{ReserveId, StorageKey};

pub fn read_reserve(env: &Env, reserve_id: ReserveId) -> Option<Reserve> {
    let key = StorageKey::ReserveByIndex(reserve_id.0);
    env.storage().persistent().get(&key)
}

pub fn write_reserve(env: &Env, reserve: &Reserve) {
    let key = StorageKey::ReserveByIndex(reserve.reserve_id.0);
    env.storage().persistent().set(&key, reserve);
    // Extend TTL of reserve storage
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_reserve_index_by_asset(env: &Env, asset: &Address) -> Option<ReserveId> {
    let key = StorageKey::ReserveIndexByAsset(asset.clone());
    env.storage().persistent().get(&key)
}

pub fn write_reserve_index_by_asset(env: &Env, asset: &Address, id: ReserveId) {
    let key = StorageKey::ReserveIndexByAsset(asset.clone());
    env.storage().persistent().set(&key, &id);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_reserve_count(env: &Env) -> u32 {
    let key = StorageKey::ReserveCount;
    env.storage().persistent().get(&key).unwrap_or(0)
}

pub fn write_reserve_count(env: &Env, count: u32) {
    let key = StorageKey::ReserveCount;
    env.storage().persistent().set(&key, &count);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}
