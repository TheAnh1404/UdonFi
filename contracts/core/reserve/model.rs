//! Data structures for the Reserve Registry.

use soroban_sdk::{contracttype, Address, Symbol};
use udonfi_shared::{
    BasisPoints, LedgerSequence, Ltv, Ray, ReserveFactor, ReserveId, Timestamp, Wad,
};

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ReserveStatus {
    Uninitialized = 0,
    Active = 1,
    Frozen = 2,
    Paused = 3,
    Deprecated = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Reserve {
    pub reserve_id: ReserveId,
    pub asset_address: Address,
    pub asset_symbol: Symbol,
    pub asset_decimals: u32,
    pub reserve_status: ReserveStatus,
    pub supply_cap: Wad,
    pub borrow_cap: Wad,
    pub reserve_factor: ReserveFactor,
    pub max_ltv: Ltv,
    pub liquidation_threshold: BasisPoints,
    pub liquidation_bonus: BasisPoints,
    pub borrow_index: Ray,
    pub supply_index: Ray,
    pub last_accrual_ledger: LedgerSequence,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}
