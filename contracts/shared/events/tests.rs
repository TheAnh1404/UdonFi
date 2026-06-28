#![cfg(test)]

use crate::events::{
    category_symbol, create_event_header, create_event_metadata, current_event_version,
    deprecated_event_marker, empty_event_id, event_topics, is_breaking_change_compatible,
    is_compatible_event_version, is_deprecated, is_deprecated_event_name, is_registered_event,
    lookup_event, module_symbol, prepare_event, registered_events, validate_event_name,
    EventCategory, EventModule, EventStability, CONFIG_RISK_UPDATED, PROTOCOL_INITIALIZED,
    RESERVE_CREATED, RESERVE_TRANSITION_REJECTED,
};
use crate::{PoolId, ReserveId};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_event_header_creation() {
    let env = Env::default();
    let actor = Address::generate(&env);
    let id = empty_event_id(&env);
    let header = create_event_header(
        &env,
        String::from_str(&env, PROTOCOL_INITIALIZED),
        EventModule::Protocol,
        EventCategory::System,
        actor.clone(),
        id.clone(),
        id.clone(),
    );

    assert_eq!(
        header.event_name,
        String::from_str(&env, PROTOCOL_INITIALIZED)
    );
    assert_eq!(header.event_version, current_event_version());
    assert_eq!(header.protocol_version, 2);
    assert_eq!(header.module, EventModule::Protocol);
    assert_eq!(header.category, EventCategory::System);
    assert_eq!(header.actor, actor);
    assert_eq!(header.correlation_id, id);
}

#[test]
fn test_event_metadata_creation() {
    let env = Env::default();
    let asset = Address::generate(&env);
    let pool = Address::generate(&env);
    let metadata = create_event_metadata(EventModule::Reserve)
        .with_reserve_id(ReserveId(7))
        .with_asset_address(asset.clone())
        .with_pool_id(PoolId(pool.clone()))
        .with_config_version(3)
        .with_emergency(true)
        .with_reason(String::from_str(&env, "guardian pause"));

    assert_eq!(metadata.reserve_id, Some(7));
    assert_eq!(metadata.asset_address, Some(asset));
    assert_eq!(metadata.pool_id, Some(pool));
    assert_eq!(metadata.config_version, Some(3));
    assert!(metadata.emergency);
    assert_eq!(metadata.source_module, EventModule::Reserve);
    assert_eq!(
        metadata.reason,
        Some(String::from_str(&env, "guardian pause"))
    );
}

#[test]
fn test_event_name_validation() {
    assert!(validate_event_name(PROTOCOL_INITIALIZED));
    assert!(validate_event_name("supply.deposit.completed"));
    assert!(!validate_event_name(""));
    assert!(!validate_event_name(".protocol.initialized"));
    assert!(!validate_event_name("protocol..initialized"));
    assert!(!validate_event_name("Protocol.Initialized"));
    assert!(!validate_event_name("protocol_initialized"));
}

#[test]
fn test_category_mapping() {
    let env = Env::default();
    assert_eq!(
        category_symbol(&env, EventCategory::Configuration),
        soroban_sdk::Symbol::new(&env, "config")
    );
    assert_eq!(
        module_symbol(&env, EventModule::Reserve),
        soroban_sdk::Symbol::new(&env, "reserve")
    );
}

#[test]
fn test_registry_lookup() {
    let env = Env::default();
    let entry = lookup_event(&env, RESERVE_CREATED).unwrap();
    assert_eq!(entry.event_name, String::from_str(&env, RESERVE_CREATED));
    assert_eq!(entry.module, EventModule::Reserve);
    assert_eq!(entry.category, EventCategory::Reserve);
    assert_eq!(entry.version, current_event_version());
    assert_eq!(entry.stability, EventStability::Stable);
    assert!(is_registered_event(CONFIG_RISK_UPDATED));
    assert!(lookup_event(&env, "missing.event").is_none());
    assert!(registered_events(&env).len() >= 25);
}

#[test]
fn test_version_compatibility() {
    assert_eq!(current_event_version(), 1);
    assert!(is_compatible_event_version(1));
    assert!(!is_compatible_event_version(0));
    assert!(!is_compatible_event_version(2));
    assert!(is_breaking_change_compatible(1, 1));
    assert!(!is_breaking_change_compatible(1, 2));
}

#[test]
fn test_deprecated_event_handling() {
    assert_eq!(deprecated_event_marker(), EventStability::Deprecated);
    assert!(is_deprecated(EventStability::Deprecated));
    assert!(!is_deprecated(EventStability::Stable));
    assert!(!is_deprecated_event_name(RESERVE_TRANSITION_REJECTED));
}

#[test]
fn test_serialization_stability() {
    let env = Env::default();
    let actor = Address::generate(&env);
    let id = empty_event_id(&env);
    let header = create_event_header(
        &env,
        String::from_str(&env, RESERVE_CREATED),
        EventModule::Reserve,
        EventCategory::Reserve,
        actor,
        id.clone(),
        id,
    );
    let metadata = create_event_metadata(EventModule::Reserve).with_reserve_id(ReserveId(1));
    let envelope = prepare_event(header.clone(), metadata.clone(), ReserveId(1));

    assert_eq!(envelope.header, header);
    assert_eq!(envelope.metadata, metadata);
    assert_eq!(envelope.payload, ReserveId(1));

    let topics = event_topics(&env, &envelope.header);
    assert_eq!(topics.0, soroban_sdk::Symbol::new(&env, "udonfi"));
    assert_eq!(topics.1, soroban_sdk::Symbol::new(&env, "reserve"));
    assert_eq!(topics.2, soroban_sdk::Symbol::new(&env, "reserve"));
    assert_eq!(topics.3, soroban_sdk::Symbol::new(&env, "reserve_create"));
    assert_eq!(topics.4, current_event_version());
}
