//! Canonical dot-separated event names.

use soroban_sdk::{Env, String};

pub const PROTOCOL_INITIALIZED: &str = "protocol.initialized";
pub const PROTOCOL_PAUSED: &str = "protocol.paused";
pub const PROTOCOL_UNPAUSED: &str = "protocol.unpaused";

pub const RESERVE_CREATED: &str = "reserve.created";
pub const RESERVE_UPDATED: &str = "reserve.updated";
pub const RESERVE_ACTIVATED: &str = "reserve.activated";
pub const RESERVE_FROZEN: &str = "reserve.frozen";
pub const RESERVE_UNFROZEN: &str = "reserve.unfrozen";
pub const RESERVE_PAUSED: &str = "reserve.paused";
pub const RESERVE_UNPAUSED: &str = "reserve.unpaused";
pub const RESERVE_DEPRECATED: &str = "reserve.deprecated";
pub const RESERVE_TRANSITION_REJECTED: &str = "reserve.transition.rejected";

pub const CONFIG_PROTOCOL_UPDATED: &str = "config.protocol.updated";
pub const CONFIG_RISK_UPDATED: &str = "config.risk.updated";
pub const CONFIG_INTEREST_UPDATED: &str = "config.interest.updated";
pub const CONFIG_ORACLE_UPDATED: &str = "config.oracle.updated";
pub const CONFIG_GOVERNANCE_UPDATED: &str = "config.governance.updated";
pub const CONFIG_VALIDATION_UPDATED: &str = "config.validation.updated";

pub const INTEREST_ACCRUED: &str = "interest.accrued";
pub const SUPPLY_DEPOSIT_COMPLETED: &str = "supply.deposit.completed";
pub const WITHDRAW_COMPLETED: &str = "withdraw.completed";
pub const BORROW_CREATED: &str = "borrow.created";
pub const REPAY_COMPLETED: &str = "repay.completed";
pub const LIQUIDATION_EXECUTED: &str = "liquidation.executed";
pub const ORACLE_PRICE_UPDATED: &str = "oracle.price.updated";
pub const GOVERNANCE_PROPOSAL_CREATED: &str = "governance.proposal.created";

pub fn validate_event_name(name: &str) -> bool {
    let bytes = name.as_bytes();
    if bytes.is_empty() || bytes[0] == b'.' || bytes[bytes.len() - 1] == b'.' {
        return false;
    }

    let mut last_was_dot = false;
    for byte in bytes {
        let is_lower = *byte >= b'a' && *byte <= b'z';
        let is_digit = *byte >= b'0' && *byte <= b'9';
        let is_dot = *byte == b'.';
        if !(is_lower || is_digit || is_dot) {
            return false;
        }
        if is_dot && last_was_dot {
            return false;
        }
        last_was_dot = is_dot;
    }
    true
}

pub fn event_topic_name(name: &str) -> &'static str {
    match name {
        PROTOCOL_INITIALIZED => "protocol_init",
        PROTOCOL_PAUSED => "protocol_pause",
        PROTOCOL_UNPAUSED => "protocol_unpause",
        RESERVE_CREATED => "reserve_create",
        RESERVE_UPDATED => "reserve_update",
        RESERVE_ACTIVATED => "reserve_active",
        RESERVE_FROZEN => "reserve_freeze",
        RESERVE_UNFROZEN => "reserve_unfreeze",
        RESERVE_PAUSED => "reserve_pause",
        RESERVE_UNPAUSED => "reserve_unpause",
        RESERVE_DEPRECATED => "reserve_deprec",
        RESERVE_TRANSITION_REJECTED => "reserve_reject",
        CONFIG_PROTOCOL_UPDATED => "cfg_protocol",
        CONFIG_RISK_UPDATED => "cfg_risk",
        CONFIG_INTEREST_UPDATED => "cfg_interest",
        CONFIG_ORACLE_UPDATED => "cfg_oracle",
        CONFIG_GOVERNANCE_UPDATED => "cfg_governance",
        CONFIG_VALIDATION_UPDATED => "cfg_validation",
        INTEREST_ACCRUED => "interest_accrue",
        SUPPLY_DEPOSIT_COMPLETED => "supply_done",
        WITHDRAW_COMPLETED => "withdraw_done",
        BORROW_CREATED => "borrow_create",
        REPAY_COMPLETED => "repay_done",
        LIQUIDATION_EXECUTED => "liq_execute",
        ORACLE_PRICE_UPDATED => "oracle_price",
        GOVERNANCE_PROPOSAL_CREATED => "gov_proposal",
        _ => "event_unknown",
    }
}

pub fn event_topic_name_from_string(env: &Env, name: &String) -> &'static str {
    if name == &String::from_str(env, PROTOCOL_INITIALIZED) {
        return event_topic_name(PROTOCOL_INITIALIZED);
    }
    if name == &String::from_str(env, PROTOCOL_PAUSED) {
        return event_topic_name(PROTOCOL_PAUSED);
    }
    if name == &String::from_str(env, PROTOCOL_UNPAUSED) {
        return event_topic_name(PROTOCOL_UNPAUSED);
    }
    if name == &String::from_str(env, RESERVE_CREATED) {
        return event_topic_name(RESERVE_CREATED);
    }
    if name == &String::from_str(env, RESERVE_UPDATED) {
        return event_topic_name(RESERVE_UPDATED);
    }
    if name == &String::from_str(env, RESERVE_ACTIVATED) {
        return event_topic_name(RESERVE_ACTIVATED);
    }
    if name == &String::from_str(env, RESERVE_FROZEN) {
        return event_topic_name(RESERVE_FROZEN);
    }
    if name == &String::from_str(env, RESERVE_UNFROZEN) {
        return event_topic_name(RESERVE_UNFROZEN);
    }
    if name == &String::from_str(env, RESERVE_PAUSED) {
        return event_topic_name(RESERVE_PAUSED);
    }
    if name == &String::from_str(env, RESERVE_UNPAUSED) {
        return event_topic_name(RESERVE_UNPAUSED);
    }
    if name == &String::from_str(env, RESERVE_DEPRECATED) {
        return event_topic_name(RESERVE_DEPRECATED);
    }
    if name == &String::from_str(env, RESERVE_TRANSITION_REJECTED) {
        return event_topic_name(RESERVE_TRANSITION_REJECTED);
    }
    if name == &String::from_str(env, CONFIG_PROTOCOL_UPDATED) {
        return event_topic_name(CONFIG_PROTOCOL_UPDATED);
    }
    if name == &String::from_str(env, CONFIG_RISK_UPDATED) {
        return event_topic_name(CONFIG_RISK_UPDATED);
    }
    if name == &String::from_str(env, CONFIG_INTEREST_UPDATED) {
        return event_topic_name(CONFIG_INTEREST_UPDATED);
    }
    if name == &String::from_str(env, CONFIG_ORACLE_UPDATED) {
        return event_topic_name(CONFIG_ORACLE_UPDATED);
    }
    if name == &String::from_str(env, CONFIG_GOVERNANCE_UPDATED) {
        return event_topic_name(CONFIG_GOVERNANCE_UPDATED);
    }
    if name == &String::from_str(env, CONFIG_VALIDATION_UPDATED) {
        return event_topic_name(CONFIG_VALIDATION_UPDATED);
    }
    if name == &String::from_str(env, INTEREST_ACCRUED) {
        return event_topic_name(INTEREST_ACCRUED);
    }
    if name == &String::from_str(env, SUPPLY_DEPOSIT_COMPLETED) {
        return event_topic_name(SUPPLY_DEPOSIT_COMPLETED);
    }
    if name == &String::from_str(env, WITHDRAW_COMPLETED) {
        return event_topic_name(WITHDRAW_COMPLETED);
    }
    if name == &String::from_str(env, BORROW_CREATED) {
        return event_topic_name(BORROW_CREATED);
    }
    if name == &String::from_str(env, REPAY_COMPLETED) {
        return event_topic_name(REPAY_COMPLETED);
    }
    if name == &String::from_str(env, LIQUIDATION_EXECUTED) {
        return event_topic_name(LIQUIDATION_EXECUTED);
    }
    if name == &String::from_str(env, ORACLE_PRICE_UPDATED) {
        return event_topic_name(ORACLE_PRICE_UPDATED);
    }
    if name == &String::from_str(env, GOVERNANCE_PROPOSAL_CREATED) {
        return event_topic_name(GOVERNANCE_PROPOSAL_CREATED);
    }
    event_topic_name("")
}
