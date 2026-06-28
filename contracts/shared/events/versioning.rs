//! Event versioning rules and helpers.

use crate::events::EventStability;

pub const CURRENT_EVENT_VERSION: u32 = 1;
pub const MIN_SUPPORTED_EVENT_VERSION: u32 = 1;
pub const EVENT_SCHEMA_VERSION_V1: u32 = 1;

pub fn current_event_version() -> u32 {
    CURRENT_EVENT_VERSION
}

pub fn is_compatible_event_version(version: u32) -> bool {
    version >= MIN_SUPPORTED_EVENT_VERSION && version <= CURRENT_EVENT_VERSION
}

pub fn is_breaking_change_compatible(previous_version: u32, next_version: u32) -> bool {
    previous_version == next_version
}

pub fn deprecated_event_marker() -> EventStability {
    EventStability::Deprecated
}
