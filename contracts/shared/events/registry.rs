//! Canonical event registry for indexers and future modules.

use crate::events::{
    EventCategory, EventModule, EventStability, BORROW_CREATED, CONFIG_GOVERNANCE_UPDATED,
    CONFIG_INTEREST_UPDATED, CONFIG_ORACLE_UPDATED, CONFIG_PROTOCOL_UPDATED, CONFIG_RISK_UPDATED,
    CONFIG_VALIDATION_UPDATED, GOVERNANCE_PROPOSAL_CREATED, INTEREST_ACCRUED, LIQUIDATION_EXECUTED,
    ORACLE_PRICE_UPDATED, PROTOCOL_INITIALIZED, PROTOCOL_PAUSED, PROTOCOL_UNPAUSED,
    REPAY_COMPLETED, RESERVE_ACTIVATED, RESERVE_CREATED, RESERVE_DEPRECATED, RESERVE_FROZEN,
    RESERVE_PAUSED, RESERVE_TRANSITION_REJECTED, RESERVE_UNFROZEN, RESERVE_UNPAUSED,
    RESERVE_UPDATED, SCHEMA_FUTURE_BUSINESS_PAYLOAD, SCHEMA_HEADER_METADATA_ONLY,
    SCHEMA_HEADER_METADATA_PAYLOAD, SUPPLY_DEPOSIT_COMPLETED, WITHDRAW_COMPLETED,
};
use soroban_sdk::{contracttype, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventRegistryEntry {
    pub event_name: String,
    pub module: EventModule,
    pub category: EventCategory,
    pub version: u32,
    pub payload_schema: String,
    pub stability: EventStability,
}

#[derive(Copy, Clone, Debug, Eq, PartialEq)]
struct EventRegistrySpec {
    event_name: &'static str,
    module: EventModule,
    category: EventCategory,
    version: u32,
    payload_schema: &'static str,
    stability: EventStability,
}

const REGISTRY: &[EventRegistrySpec] = &[
    entry(
        PROTOCOL_INITIALIZED,
        EventModule::Protocol,
        EventCategory::System,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        PROTOCOL_PAUSED,
        EventModule::Protocol,
        EventCategory::Security,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        PROTOCOL_UNPAUSED,
        EventModule::Protocol,
        EventCategory::Admin,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        RESERVE_CREATED,
        EventModule::Reserve,
        EventCategory::Reserve,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        RESERVE_UPDATED,
        EventModule::Reserve,
        EventCategory::Reserve,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        RESERVE_ACTIVATED,
        EventModule::Reserve,
        EventCategory::Reserve,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        RESERVE_FROZEN,
        EventModule::Reserve,
        EventCategory::Security,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        RESERVE_UNFROZEN,
        EventModule::Reserve,
        EventCategory::Admin,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        RESERVE_PAUSED,
        EventModule::Reserve,
        EventCategory::Security,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        RESERVE_UNPAUSED,
        EventModule::Reserve,
        EventCategory::Admin,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        RESERVE_DEPRECATED,
        EventModule::Reserve,
        EventCategory::Governance,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        RESERVE_TRANSITION_REJECTED,
        EventModule::Reserve,
        EventCategory::Security,
        SCHEMA_HEADER_METADATA_ONLY,
        EventStability::Draft,
    ),
    entry(
        CONFIG_PROTOCOL_UPDATED,
        EventModule::Config,
        EventCategory::Configuration,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        CONFIG_RISK_UPDATED,
        EventModule::Config,
        EventCategory::Configuration,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        CONFIG_INTEREST_UPDATED,
        EventModule::Config,
        EventCategory::Configuration,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        CONFIG_ORACLE_UPDATED,
        EventModule::Config,
        EventCategory::Configuration,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        CONFIG_GOVERNANCE_UPDATED,
        EventModule::Config,
        EventCategory::Configuration,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        CONFIG_VALIDATION_UPDATED,
        EventModule::Config,
        EventCategory::Configuration,
        SCHEMA_HEADER_METADATA_PAYLOAD,
        EventStability::Stable,
    ),
    entry(
        INTEREST_ACCRUED,
        EventModule::Interest,
        EventCategory::Accounting,
        SCHEMA_FUTURE_BUSINESS_PAYLOAD,
        EventStability::Draft,
    ),
    entry(
        SUPPLY_DEPOSIT_COMPLETED,
        EventModule::Supply,
        EventCategory::Accounting,
        SCHEMA_FUTURE_BUSINESS_PAYLOAD,
        EventStability::Draft,
    ),
    entry(
        WITHDRAW_COMPLETED,
        EventModule::Withdraw,
        EventCategory::Accounting,
        SCHEMA_FUTURE_BUSINESS_PAYLOAD,
        EventStability::Draft,
    ),
    entry(
        BORROW_CREATED,
        EventModule::Borrow,
        EventCategory::Accounting,
        SCHEMA_FUTURE_BUSINESS_PAYLOAD,
        EventStability::Draft,
    ),
    entry(
        REPAY_COMPLETED,
        EventModule::Repay,
        EventCategory::Accounting,
        SCHEMA_FUTURE_BUSINESS_PAYLOAD,
        EventStability::Draft,
    ),
    entry(
        LIQUIDATION_EXECUTED,
        EventModule::Liquidation,
        EventCategory::Risk,
        SCHEMA_FUTURE_BUSINESS_PAYLOAD,
        EventStability::Draft,
    ),
    entry(
        ORACLE_PRICE_UPDATED,
        EventModule::Oracle,
        EventCategory::Oracle,
        SCHEMA_FUTURE_BUSINESS_PAYLOAD,
        EventStability::Draft,
    ),
    entry(
        GOVERNANCE_PROPOSAL_CREATED,
        EventModule::Governance,
        EventCategory::Governance,
        SCHEMA_FUTURE_BUSINESS_PAYLOAD,
        EventStability::Draft,
    ),
];

const fn entry(
    event_name: &'static str,
    module: EventModule,
    category: EventCategory,
    payload_schema: &'static str,
    stability: EventStability,
) -> EventRegistrySpec {
    EventRegistrySpec {
        event_name,
        module,
        category,
        version: crate::events::CURRENT_EVENT_VERSION,
        payload_schema,
        stability,
    }
}

pub fn lookup_event(env: &Env, event_name: &str) -> Option<EventRegistryEntry> {
    REGISTRY
        .iter()
        .find(|entry| entry.event_name == event_name)
        .map(|entry| to_entry(env, entry))
}

pub fn is_registered_event(event_name: &str) -> bool {
    REGISTRY.iter().any(|entry| entry.event_name == event_name)
}

pub fn registered_events(env: &Env) -> Vec<EventRegistryEntry> {
    let mut events = Vec::new(env);
    for entry in REGISTRY.iter() {
        events.push_back(to_entry(env, entry));
    }
    events
}

pub fn is_deprecated_event_name(event_name: &str) -> bool {
    REGISTRY.iter().any(|entry| {
        entry.event_name == event_name && entry.stability == EventStability::Deprecated
    })
}

fn to_entry(env: &Env, entry: &EventRegistrySpec) -> EventRegistryEntry {
    EventRegistryEntry {
        event_name: String::from_str(env, entry.event_name),
        module: entry.module,
        category: entry.category,
        version: entry.version,
        payload_schema: String::from_str(env, entry.payload_schema),
        stability: entry.stability,
    }
}
