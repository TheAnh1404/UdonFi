//! Withdraw event payloads and Global Event Bus emitters.

use crate::model::{WithdrawExecutionResult, WithdrawValidationResult};
use soroban_sdk::{contracttype, Address, Env, String, Symbol, TryFromVal, Val};
use udonfi_shared::{
    category_symbol, create_event_header, create_event_metadata, emit_standard_event,
    empty_event_id, module_symbol, EventCategory, EventMetadata, EventModule, LedgerSequence, Ray,
    ReserveId, ScaledBalance, Wad, WITHDRAW_COMPLETED,
};

pub const WITHDRAW_PREPARED: &str = "withdraw.prepared";
pub const WITHDRAW_REJECTED: &str = "withdraw.rejected";

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct WithdrawPrepared {
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub scaled_supply_to_burn: ScaledBalance,
    pub requires_interest_accrual: bool,
    pub requires_risk_check: bool,
    pub current_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct WithdrawRejected {
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub reason_code: u32,
    pub current_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawCompleted {
    pub actor: Address,
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub scaled_supply_burned: ScaledBalance,
    pub supply_index: Ray,
    pub ledger: LedgerSequence,
    pub accounting_version: u32,
}

fn withdraw_metadata(reserve_id: ReserveId) -> EventMetadata {
    create_event_metadata(EventModule::Withdraw).with_reserve_id(reserve_id)
}

fn withdraw_topic_name(event_name: &str) -> &'static str {
    match event_name {
        WITHDRAW_PREPARED => "withdraw_prepare",
        WITHDRAW_REJECTED => "withdraw_reject",
        _ => "withdraw_unknown",
    }
}

fn publish_withdraw_event<T>(
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
        String::from_str(env, event_name),
        EventModule::Withdraw,
        EventCategory::Accounting,
        actor,
        empty_event_id(env),
        empty_event_id(env),
    );
    let metadata = withdraw_metadata(reserve_id);
    let topics = (
        Symbol::new(env, "udonfi"),
        module_symbol(env, header.module),
        category_symbol(env, header.category),
        Symbol::new(env, withdraw_topic_name(event_name)),
        header.event_version,
    );
    #[allow(deprecated)]
    env.events().publish(topics, (header, metadata, payload));
}

pub fn publish_withdraw_prepared(
    env: &Env,
    actor: Address,
    result: WithdrawValidationResult,
    current_ledger: LedgerSequence,
) {
    publish_withdraw_event(
        env,
        WITHDRAW_PREPARED,
        actor,
        result.reserve_id,
        WithdrawPrepared {
            reserve_id: result.reserve_id,
            amount: result.amount,
            scaled_supply_to_burn: result.scaled_supply_to_burn,
            requires_interest_accrual: result.requires_interest_accrual,
            requires_risk_check: result.requires_risk_check,
            current_ledger,
        },
    );
}

pub fn publish_withdraw_rejected(
    env: &Env,
    actor: Address,
    reserve_id: ReserveId,
    amount: Wad,
    reason_code: u32,
    current_ledger: LedgerSequence,
) {
    publish_withdraw_event(
        env,
        WITHDRAW_REJECTED,
        actor,
        reserve_id,
        WithdrawRejected {
            reserve_id,
            amount,
            reason_code,
            current_ledger,
        },
    );
}

pub fn publish_withdraw_completed(env: &Env, result: &WithdrawExecutionResult) {
    let header = create_event_header(
        env,
        String::from_str(env, WITHDRAW_COMPLETED),
        EventModule::Withdraw,
        EventCategory::Accounting,
        result.actor.clone(),
        empty_event_id(env),
        empty_event_id(env),
    );
    emit_standard_event(
        env,
        header,
        withdraw_metadata(result.reserve_id),
        WithdrawCompleted {
            actor: result.actor.clone(),
            reserve_id: result.reserve_id,
            amount: result.amount,
            scaled_supply_burned: result.scaled_supply_burned,
            supply_index: result.supply_index,
            ledger: result.ledger,
            accounting_version: result.accounting_version,
        },
    );
}
