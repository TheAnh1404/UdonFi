//! Persistent storage helpers for Accounting Engine state.

use crate::model::{AccountingLedger, BadDebtRecord, ReserveAccounting, UserAccountingSnapshot};
use soroban_sdk::{contracttype, Address, Env};
use udonfi_shared::ReserveId;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AccountingStorageKey {
    GlobalLedger,
    ReserveAccounting(u32),
    AccountingVersion,
    BadDebtRecord(u32),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum UserAccountingStorageKey {
    UserSnapshot(Address, u32),
}

pub fn has_accounting_ledger(env: &Env) -> bool {
    env.storage()
        .persistent()
        .has(&AccountingStorageKey::GlobalLedger)
}

pub fn read_accounting_ledger(env: &Env) -> Option<AccountingLedger> {
    env.storage()
        .persistent()
        .get(&AccountingStorageKey::GlobalLedger)
}

pub fn write_accounting_ledger(env: &Env, ledger: &AccountingLedger) {
    let key = AccountingStorageKey::GlobalLedger;
    env.storage().persistent().set(&key, ledger);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_reserve_accounting(env: &Env, reserve_id: ReserveId) -> Option<ReserveAccounting> {
    let key = AccountingStorageKey::ReserveAccounting(reserve_id.0);
    env.storage().persistent().get(&key)
}

pub fn write_reserve_accounting(env: &Env, reserve: &ReserveAccounting) {
    let key = AccountingStorageKey::ReserveAccounting(reserve.reserve_id.0);
    env.storage().persistent().set(&key, reserve);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_accounting_version(env: &Env) -> Option<u32> {
    env.storage()
        .persistent()
        .get(&AccountingStorageKey::AccountingVersion)
}

pub fn write_accounting_version(env: &Env, version: u32) {
    let key = AccountingStorageKey::AccountingVersion;
    env.storage().persistent().set(&key, &version);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_bad_debt_record(env: &Env, reserve_id: ReserveId) -> Option<BadDebtRecord> {
    let key = AccountingStorageKey::BadDebtRecord(reserve_id.0);
    env.storage().persistent().get(&key)
}

pub fn write_bad_debt_record(env: &Env, record: &BadDebtRecord) {
    let key = AccountingStorageKey::BadDebtRecord(record.reserve_id.0);
    env.storage().persistent().set(&key, record);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}

pub fn read_user_accounting_snapshot(
    env: &Env,
    user: &Address,
    reserve_id: ReserveId,
) -> Option<UserAccountingSnapshot> {
    let key = UserAccountingStorageKey::UserSnapshot(user.clone(), reserve_id.0);
    env.storage().persistent().get(&key)
}

pub fn write_user_accounting_snapshot(env: &Env, snapshot: &UserAccountingSnapshot) {
    let key = UserAccountingStorageKey::UserSnapshot(snapshot.user.clone(), snapshot.reserve_id.0);
    env.storage().persistent().set(&key, snapshot);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
}
