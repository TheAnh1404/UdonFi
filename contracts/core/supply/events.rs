//! Supply event payloads and Global Event Bus emitters.

use crate::model::{DepositExecutionResult, DepositValidationResult};
use soroban_sdk::{contracttype, Address, Env, String, Symbol, TryFromVal, Val};
use udonfi_shared::{
    category_symbol, create_event_header, create_event_metadata, emit_standard_event,
    empty_event_id, module_symbol, EventCategory, EventMetadata, EventModule, LedgerSequence, Ray,
    ReserveId, ScaledBalance, Wad, SUPPLY_DEPOSIT_COMPLETED,
};

pub const SUPPLY_DEPOSIT_PREPARED: &str = "supply.deposit.prepared";
pub const SUPPLY_DEPOSIT_REJECTED: &str = "supply.deposit.rejected";

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct SupplyDepositPrepared {
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub projected_total_supply: Wad,
    pub supply_cap: Wad,
    pub requires_interest_accrual: bool,
    pub current_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct SupplyDepositRejected {
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub reason_code: u32,
    pub current_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SupplyDepositCompleted {
    pub actor: Address,
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub scaled_supply_minted: ScaledBalance,
    pub supply_index: Ray,
    pub ledger: LedgerSequence,
    pub accounting_version: u32,
}

fn supply_metadata(reserve_id: ReserveId) -> EventMetadata {
    create_event_metadata(EventModule::Supply).with_reserve_id(reserve_id)
}

fn supply_topic_name(event_name: &str) -> &'static str {
    match event_name {
        SUPPLY_DEPOSIT_PREPARED => "supply_prepare",
        SUPPLY_DEPOSIT_REJECTED => "supply_reject",
        _ => "supply_unknown",
    }
}

fn publish_supply_event<T>(
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
        EventModule::Supply,
        EventCategory::Accounting,
        actor,
        empty_event_id(env),
        empty_event_id(env),
    );
    let metadata = supply_metadata(reserve_id);
    let topics = (
        Symbol::new(env, "udonfi"),
        module_symbol(env, header.module),
        category_symbol(env, header.category),
        Symbol::new(env, supply_topic_name(event_name)),
        header.event_version,
    );
    #[allow(deprecated)]
    env.events().publish(topics, (header, metadata, payload));
}

pub fn publish_deposit_prepared(env: &Env, actor: Address, result: DepositValidationResult) {
    publish_supply_event(
        env,
        SUPPLY_DEPOSIT_PREPARED,
        actor,
        result.reserve_id,
        SupplyDepositPrepared {
            reserve_id: result.reserve_id,
            amount: result.amount,
            projected_total_supply: result.projected_total_supply,
            supply_cap: result.supply_cap,
            requires_interest_accrual: result.requires_interest_accrual,
            current_ledger: result.current_ledger,
        },
    );
}

pub fn publish_deposit_rejected(
    env: &Env,
    actor: Address,
    reserve_id: ReserveId,
    amount: Wad,
    reason_code: u32,
    current_ledger: LedgerSequence,
) {
    publish_supply_event(
        env,
        SUPPLY_DEPOSIT_REJECTED,
        actor,
        reserve_id,
        SupplyDepositRejected {
            reserve_id,
            amount,
            reason_code,
            current_ledger,
        },
    );
}

pub fn publish_deposit_completed(env: &Env, result: &DepositExecutionResult) {
    let header = create_event_header(
        env,
        String::from_str(env, SUPPLY_DEPOSIT_COMPLETED),
        EventModule::Supply,
        EventCategory::Accounting,
        result.actor.clone(),
        empty_event_id(env),
        empty_event_id(env),
    );
    emit_standard_event(
        env,
        header,
        supply_metadata(result.reserve_id),
        SupplyDepositCompleted {
            actor: result.actor.clone(),
            reserve_id: result.reserve_id,
            amount: result.amount,
            scaled_supply_minted: result.scaled_supply_minted,
            supply_index: result.supply_index,
            ledger: result.ledger,
            accounting_version: result.accounting_version,
        },
    );
}
