//! Event serialization and emission helpers.

use crate::events::{
    category_symbol, event_topic_name_from_string, module_symbol, EventCategory, EventHeader,
    EventMetadata,
};
use soroban_sdk::{Env, Symbol, TryFromVal, Val};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventEnvelope<T> {
    pub header: EventHeader,
    pub metadata: EventMetadata,
    pub payload: T,
}

pub fn prepare_event<T>(
    header: EventHeader,
    metadata: EventMetadata,
    payload: T,
) -> EventEnvelope<T> {
    EventEnvelope {
        header,
        metadata,
        payload,
    }
}

pub fn event_topics(env: &Env, header: &EventHeader) -> (Symbol, Symbol, Symbol, Symbol, u32) {
    (
        Symbol::new(env, "udonfi"),
        module_symbol(env, header.module),
        category_symbol(env, header.category),
        Symbol::new(env, event_topic_name_from_string(env, &header.event_name)),
        header.event_version,
    )
}

pub fn emit_standard_event<T>(env: &Env, header: EventHeader, metadata: EventMetadata, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
    Val: TryFromVal<Env, T>,
{
    let topics = event_topics(env, &header);
    #[allow(deprecated)]
    env.events().publish(topics, (header, metadata, payload));
}

pub fn emit_system_event<T>(env: &Env, header: EventHeader, metadata: EventMetadata, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
    Val: TryFromVal<Env, T>,
{
    emit_category_event(env, EventCategory::System, header, metadata, payload);
}

pub fn emit_reserve_event<T>(env: &Env, header: EventHeader, metadata: EventMetadata, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
    Val: TryFromVal<Env, T>,
{
    emit_category_event(env, EventCategory::Reserve, header, metadata, payload);
}

pub fn emit_config_event<T>(env: &Env, header: EventHeader, metadata: EventMetadata, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
    Val: TryFromVal<Env, T>,
{
    emit_category_event(env, EventCategory::Configuration, header, metadata, payload);
}

pub fn emit_accounting_event<T>(env: &Env, header: EventHeader, metadata: EventMetadata, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
    Val: TryFromVal<Env, T>,
{
    emit_category_event(env, EventCategory::Accounting, header, metadata, payload);
}

pub fn emit_risk_event<T>(env: &Env, header: EventHeader, metadata: EventMetadata, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
    Val: TryFromVal<Env, T>,
{
    emit_category_event(env, EventCategory::Risk, header, metadata, payload);
}

pub fn emit_governance_event<T>(env: &Env, header: EventHeader, metadata: EventMetadata, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
    Val: TryFromVal<Env, T>,
{
    emit_category_event(env, EventCategory::Governance, header, metadata, payload);
}

pub fn emit_oracle_event<T>(env: &Env, header: EventHeader, metadata: EventMetadata, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
    Val: TryFromVal<Env, T>,
{
    emit_category_event(env, EventCategory::Oracle, header, metadata, payload);
}

pub fn emit_security_event<T>(env: &Env, header: EventHeader, metadata: EventMetadata, payload: T)
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
    Val: TryFromVal<Env, T>,
{
    emit_category_event(env, EventCategory::Security, header, metadata, payload);
}

fn emit_category_event<T>(
    env: &Env,
    category: EventCategory,
    mut header: EventHeader,
    metadata: EventMetadata,
    payload: T,
) where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
    Val: TryFromVal<Env, T>,
{
    header.category = category;
    emit_standard_event(env, header, metadata, payload);
}
