//! Pool State data structures.

use soroban_sdk::{contracttype, Address, String};
use udonfi_shared::Timestamp;

pub const INITIAL_CONFIG_VERSION: u32 = 1;

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ProtocolStatus {
    Uninitialized = 0,
    Initializing = 1,
    Active = 2,
    Paused = 3,
    Emergency = 4,
    Deprecated = 5,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Pool {
    pub protocol_version: u32,
    pub protocol_name: String,
    pub protocol_status: ProtocolStatus,
    pub total_reserves: u32,
    pub active_reserves: u32,
    pub paused: bool,
    pub guardian: Address,
    pub admin: Address,
    pub treasury_address: Address,
    pub insurance_fund_address: Address,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
    pub initialized_at: Timestamp,
    pub current_config_version: u32,
}

impl Pool {
    pub fn is_active(&self) -> bool {
        self.protocol_status == ProtocolStatus::Active && !self.paused
    }
}
