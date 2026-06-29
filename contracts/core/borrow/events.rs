//! Borrow event payloads and Global Event Bus emitters.

use crate::model::{BorrowExecutionResult, BorrowValidationResult};
use soroban_sdk::{contracttype, Address, Env, Symbol, TryFromVal, Val};
use udonfi_shared::{
    category_symbol, create_event_header, create_event_metadata, emit_standard_event,
    empty_event_id, module_symbol, EventCategory, EventMetadata, EventModule, LedgerSequence, Ray,
    ReserveId, ScaledDebt, Wad, BORROW_CREATED,
};

pub const BORROW_PREPARED: &str = "borrow.prepared";
pub const BORROW_REJECTED: &str = "borrow.rejected";

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct BorrowPrepared {
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub projected_total_borrow: Wad,
    pub borrow_cap: Wad,
    pub available_liquidity: Wad,
    pub requires_interest_accrual: bool,
    pub requires_risk_check: bool,
    pub current_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct BorrowRejected {
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub reason_code: u32,
    pub current_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BorrowCreated {
    pub actor: Address,
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub scaled_debt_minted: ScaledDebt,
    pub borrow_index: Ray,
    pub ledger: LedgerSequence,
    pub accounting_version: u32,
}

fn borrow_metadata(reserve_id: ReserveId) -> EventMetadata {
    create_event_metadata(EventModule::Borrow).with_reserve_id(reserve_id)
}

fn borrow_topic_name(event_name: &str) -> &'static str {
    match event_name {
        BORROW_PREPARED => "borrow_prepare",
        BORROW_REJECTED => "borrow_reject",
        _ => "borrow_unknown",
    }
}

fn publish_borrow_event<T>(
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
        EventModule::Borrow,
        EventCategory::Accounting,
        actor,
        empty_event_id(env),
        empty_event_id(env),
    );
    let topics = (
        Symbol::new(env, "udonfi"),
        module_symbol(env, header.module),
        category_symbol(env, header.category),
        Symbol::new(env, borrow_topic_name(event_name)),
        header.event_version,
    );
    #[allow(deprecated)]
    env.events()
        .publish(topics, (header, borrow_metadata(reserve_id), payload));
}

pub fn publish_borrow_prepared(
    env: &Env,
    actor: Address,
    result: BorrowValidationResult,
    current_ledger: LedgerSequence,
) {
    publish_borrow_event(
        env,
        BORROW_PREPARED,
        actor,
        result.reserve_id,
        BorrowPrepared {
            reserve_id: result.reserve_id,
            amount: result.amount,
            projected_total_borrow: result.projected_total_borrow,
            borrow_cap: result.borrow_cap,
            available_liquidity: result.available_liquidity,
            requires_interest_accrual: result.requires_interest_accrual,
            requires_risk_check: result.requires_risk_check,
            current_ledger,
        },
    );
}

pub fn publish_borrow_rejected(
    env: &Env,
    actor: Address,
    reserve_id: ReserveId,
    amount: Wad,
    reason_code: u32,
    current_ledger: LedgerSequence,
) {
    publish_borrow_event(
        env,
        BORROW_REJECTED,
        actor,
        reserve_id,
        BorrowRejected {
            reserve_id,
            amount,
            reason_code,
            current_ledger,
        },
    );
}

pub fn publish_borrow_created(env: &Env, result: &BorrowExecutionResult) {
    let header = create_event_header(
        env,
        soroban_sdk::String::from_str(env, BORROW_CREATED),
        EventModule::Borrow,
        EventCategory::Accounting,
        result.actor.clone(),
        result.event_id.clone(),
        result.event_id.clone(),
    );
    emit_standard_event(
        env,
        header,
        borrow_metadata(result.reserve_id),
        BorrowCreated {
            actor: result.actor.clone(),
            reserve_id: result.reserve_id,
            amount: result.amount,
            scaled_debt_minted: result.scaled_debt_minted,
            borrow_index: result.borrow_index,
            ledger: result.ledger,
            accounting_version: result.accounting_version,
        },
    );
}
