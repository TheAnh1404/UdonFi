//! Standard event header.

use crate::events::{EventCategory, EventModule};
use crate::{LedgerSequence, Timestamp};
use soroban_sdk::{contracttype, Address, BytesN, Env, String};

pub const PROTOCOL_EVENT_VERSION: u32 = 1;
pub const DEFAULT_PROTOCOL_VERSION: u32 = 2;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventHeader {
    pub event_name: String,
    pub event_version: u32,
    pub protocol_version: u32,
    pub module: EventModule,
    pub category: EventCategory,
    pub ledger_sequence: LedgerSequence,
    pub timestamp: Timestamp,
    pub actor: Address,
    pub correlation_id: BytesN<32>,
    pub trace_id: BytesN<32>,
}

pub fn empty_event_id(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[0; 32])
}

pub fn create_event_header(
    env: &Env,
    event_name: String,
    module: EventModule,
    category: EventCategory,
    actor: Address,
    correlation_id: BytesN<32>,
    trace_id: BytesN<32>,
) -> EventHeader {
    create_versioned_event_header(
        env,
        event_name,
        PROTOCOL_EVENT_VERSION,
        DEFAULT_PROTOCOL_VERSION,
        module,
        category,
        actor,
        correlation_id,
        trace_id,
    )
}

#[allow(clippy::too_many_arguments)]
pub fn create_versioned_event_header(
    env: &Env,
    event_name: String,
    event_version: u32,
    protocol_version: u32,
    module: EventModule,
    category: EventCategory,
    actor: Address,
    correlation_id: BytesN<32>,
    trace_id: BytesN<32>,
) -> EventHeader {
    EventHeader {
        event_name,
        event_version,
        protocol_version,
        module,
        category,
        ledger_sequence: LedgerSequence(env.ledger().sequence()),
        timestamp: Timestamp(env.ledger().timestamp()),
        actor,
        correlation_id,
        trace_id,
    }
}
