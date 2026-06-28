//! Event structures for the Reserve Registry.

use crate::model::ReserveStatus;
use soroban_sdk::{contracttype, Address, Env, String, Symbol};
use udonfi_shared::{BasisPoints, LedgerSequence, Ltv, ReserveFactor, ReserveId, Wad};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveCreated {
    pub asset: Address,
    pub reserve_index: u32,
    pub ltv: u32,
    pub liquidation_threshold: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveConfigurationUpdated {
    pub asset: Address,
    pub supply_cap: Wad,
    pub borrow_cap: Wad,
    pub reserve_factor: ReserveFactor,
    pub max_ltv: Ltv,
    pub liquidation_threshold: BasisPoints,
    pub liquidation_bonus: BasisPoints,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveActivated {
    pub reserve_id: ReserveId,
    pub previous_status: ReserveStatus,
    pub new_status: ReserveStatus,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub reason: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveFrozen {
    pub reserve_id: ReserveId,
    pub previous_status: ReserveStatus,
    pub new_status: ReserveStatus,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub reason: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveUnfrozen {
    pub reserve_id: ReserveId,
    pub previous_status: ReserveStatus,
    pub new_status: ReserveStatus,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub reason: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReservePaused {
    pub reserve_id: ReserveId,
    pub previous_status: ReserveStatus,
    pub new_status: ReserveStatus,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub reason: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveUnpaused {
    pub reserve_id: ReserveId,
    pub previous_status: ReserveStatus,
    pub new_status: ReserveStatus,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub reason: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveDeprecated {
    pub reserve_id: ReserveId,
    pub previous_status: ReserveStatus,
    pub new_status: ReserveStatus,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub reason: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveTransitionRejected {
    pub reserve_id: ReserveId,
    pub previous_status: ReserveStatus,
    pub new_status: ReserveStatus,
    pub actor: Address,
    pub ledger: LedgerSequence,
    pub reason: String,
}

#[allow(deprecated)]
fn publish_reserve_event<T>(env: &Env, event_name: &str, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
{
    env.events().publish(
        (Symbol::new(env, "reserve"), Symbol::new(env, event_name)),
        payload,
    );
}

pub fn publish_reserve_activated(env: &Env, payload: ReserveActivated) {
    publish_reserve_event(env, "reserve_activated", payload);
}

pub fn publish_reserve_frozen(env: &Env, payload: ReserveFrozen) {
    publish_reserve_event(env, "reserve_frozen", payload);
}

pub fn publish_reserve_unfrozen(env: &Env, payload: ReserveUnfrozen) {
    publish_reserve_event(env, "reserve_unfrozen", payload);
}

pub fn publish_reserve_paused(env: &Env, payload: ReservePaused) {
    publish_reserve_event(env, "reserve_paused", payload);
}

pub fn publish_reserve_unpaused(env: &Env, payload: ReserveUnpaused) {
    publish_reserve_event(env, "reserve_unpaused", payload);
}

pub fn publish_reserve_deprecated(env: &Env, payload: ReserveDeprecated) {
    publish_reserve_event(env, "reserve_deprecated", payload);
}

pub fn publish_reserve_transition_rejected(env: &Env, payload: ReserveTransitionRejected) {
    publish_reserve_event(env, "reserve_transition_rejected", payload);
}
