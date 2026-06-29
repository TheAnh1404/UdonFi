//! Repay event payloads and Global Event Bus emitters.

use crate::model::{RepayExecutionResult, RepayValidationResult};
use soroban_sdk::{contracttype, Address, Env, Symbol, TryFromVal, Val};
use udonfi_shared::{
    category_symbol, create_event_header, create_event_metadata, emit_standard_event,
    empty_event_id, module_symbol, EventCategory, EventMetadata, EventModule, LedgerSequence, Ray,
    ReserveId, ScaledDebt, Wad, REPAY_COMPLETED,
};

pub const REPAY_PREPARED: &str = "repay.prepared";
pub const REPAY_REJECTED: &str = "repay.rejected";

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct RepayPrepared {
    pub reserve_id: ReserveId,
    pub requested_amount: Wad,
    pub actual_repay_amount: Wad,
    pub current_actual_debt: Wad,
    pub scaled_debt_to_burn: ScaledDebt,
    pub requires_interest_accrual: bool,
    pub current_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct RepayRejected {
    pub reserve_id: ReserveId,
    pub requested_amount: Wad,
    pub reason_code: u32,
    pub current_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RepayCompleted {
    pub actor: Address,
    pub reserve_id: ReserveId,
    pub requested_amount: Wad,
    pub actual_repay_amount: Wad,
    pub scaled_debt_burned: ScaledDebt,
    pub borrow_index: Ray,
    pub ledger: LedgerSequence,
}

fn repay_metadata(reserve_id: ReserveId) -> EventMetadata {
    create_event_metadata(EventModule::Repay).with_reserve_id(reserve_id)
}

fn repay_topic_name(event_name: &str) -> &'static str {
    match event_name {
        REPAY_PREPARED => "repay_prepare",
        REPAY_REJECTED => "repay_reject",
        _ => "repay_unknown",
    }
}

fn publish_repay_event<T>(
    env: &Env,
    event_name: &str,
    actor: Address,
    reserve_id: ReserveId,
    payload: T,
) where
    T: soroban_sdk::IntoVal<Env, Val>,
    Val: TryFromVal<Env, T>,
{
    let header = create_event_header(
        env,
        soroban_sdk::String::from_str(env, event_name),
        EventModule::Repay,
        EventCategory::Accounting,
        actor,
        empty_event_id(env),
        empty_event_id(env),
    );
    let topics = (
        Symbol::new(env, "udonfi"),
        module_symbol(env, header.module),
        category_symbol(env, header.category),
        Symbol::new(env, repay_topic_name(event_name)),
        header.event_version,
    );
    #[allow(deprecated)]
    env.events()
        .publish(topics, (header, repay_metadata(reserve_id), payload));
}

pub fn publish_repay_prepared(
    env: &Env,
    actor: Address,
    result: RepayValidationResult,
    current_ledger: LedgerSequence,
) {
    publish_repay_event(
        env,
        REPAY_PREPARED,
        actor,
        result.reserve_id,
        RepayPrepared {
            reserve_id: result.reserve_id,
            requested_amount: result.requested_amount,
            actual_repay_amount: result.actual_repay_amount,
            current_actual_debt: result.current_actual_debt,
            scaled_debt_to_burn: result.scaled_debt_to_burn,
            requires_interest_accrual: result.requires_interest_accrual,
            current_ledger,
        },
    );
}

pub fn publish_repay_rejected(
    env: &Env,
    actor: Address,
    reserve_id: ReserveId,
    requested_amount: Wad,
    reason_code: u32,
    current_ledger: LedgerSequence,
) {
    publish_repay_event(
        env,
        REPAY_REJECTED,
        actor,
        reserve_id,
        RepayRejected {
            reserve_id,
            requested_amount,
            reason_code,
            current_ledger,
        },
    );
}

pub fn publish_repay_completed(env: &Env, result: &RepayExecutionResult) {
    let header = create_event_header(
        env,
        soroban_sdk::String::from_str(env, REPAY_COMPLETED),
        EventModule::Repay,
        EventCategory::Accounting,
        result.actor.clone(),
        result.event_id.clone(),
        result.event_id.clone(),
    );
    emit_standard_event(
        env,
        header,
        repay_metadata(result.reserve_id),
        RepayCompleted {
            actor: result.actor.clone(),
            reserve_id: result.reserve_id,
            requested_amount: result.requested_amount,
            actual_repay_amount: result.actual_repay_amount,
            scaled_debt_burned: result.scaled_debt_burned,
            borrow_index: result.borrow_index,
            ledger: result.ledger,
        },
    );
}
