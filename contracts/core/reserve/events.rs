//! Event structures for the Reserve Registry.

use soroban_sdk::{contracttype, Address};
use udonfi_shared::{BasisPoints, Ltv, ReserveFactor, Wad};

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
pub struct ReserveFrozen {
    pub asset: Address,
    pub is_frozen: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveUnfrozen {
    pub asset: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReservePaused {
    pub asset: Address,
    pub is_paused: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveUnpaused {
    pub asset: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveDeprecated {
    pub asset: Address,
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
