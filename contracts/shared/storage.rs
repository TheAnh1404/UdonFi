//! Namespaced storage keys for UdonFi V2.

use soroban_sdk::{contracttype, Address};

/// Namespaced storage keys to avoid key collisions.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StorageKey {
    // --- Global Admin & Configuration Keys ---
    Admin,
    Guardian,
    Paused,

    // --- Config Blocks ---
    ProtocolConfig,
    RiskConfig,
    OracleConfig,
    GovernanceConfig,
    PauseConfig,
    ValidationConfig,

    // --- Reserves Storage Keys ---
    ReserveCount,
    ReserveByIndex(u32),
    ReserveIndexByAsset(Address),
    ReserveState(u32),

    // --- Oracle Metadata Keys ---
    OracleMetadata,
    LastPrice(Address),
}
