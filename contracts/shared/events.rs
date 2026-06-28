//! Protocol-wide event structures for UdonFi V2.

pub mod category;
pub mod header;
pub mod metadata;
pub mod names;
pub mod registry;
pub mod schema;
pub mod serialization;
pub mod versioning;

#[cfg(test)]
pub mod tests;

use soroban_sdk::{contracttype, Address, Symbol};

pub use category::*;
pub use header::*;
pub use metadata::*;
pub use names::*;
pub use registry::*;
pub use schema::*;
pub use serialization::*;
pub use versioning::*;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveCreatedEvent {
    pub asset: Address,
    pub reserve_index: u32,
    pub ltv: u32,
    pub liquidation_threshold: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveUpdatedEvent {
    pub asset: Address,
    pub ltv: u32,
    pub liquidation_threshold: u32,
    pub reserve_factor: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveFrozenEvent {
    pub asset: Address,
    pub is_frozen: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReservePausedEvent {
    pub asset: Address,
    pub is_paused: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigurationChangedEvent {
    pub parameter: Symbol,
    pub old_value: u32,
    pub new_value: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProtocolPausedEvent {
    pub by: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProtocolUnpausedEvent {
    pub by: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GuardianChangedEvent {
    pub old_guardian: Address,
    pub new_guardian: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigUpdatedEvent {
    pub admin: Address,
    pub oracle: Address,
}
