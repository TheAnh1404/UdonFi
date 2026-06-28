//! Event schema descriptors.

use soroban_sdk::contracttype;

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum EventStability {
    Draft = 0,
    Stable = 1,
    Deprecated = 2,
}

pub const SCHEMA_HEADER_METADATA_PAYLOAD: &str = "header,metadata,payload";
pub const SCHEMA_HEADER_METADATA_ONLY: &str = "header,metadata";
pub const SCHEMA_FUTURE_BUSINESS_PAYLOAD: &str = "future_payload";

pub fn is_stable(stability: EventStability) -> bool {
    stability == EventStability::Stable
}

pub fn is_deprecated(stability: EventStability) -> bool {
    stability == EventStability::Deprecated
}
