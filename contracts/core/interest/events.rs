//! Interest Engine event payloads and Global Event Bus emitters.

use crate::model::{IndexUpdateResult, InterestAccrualResult};
use soroban_sdk::{contracttype, Address, Env, String, Symbol, TryFromVal, Val};
use udonfi_shared::{
    category_symbol, create_event_header, create_event_metadata, empty_event_id, module_symbol,
    EventCategory, EventMetadata, EventModule, LedgerSequence, Ray, ReserveId, INTEREST_ACCRUED,
};

pub const INTEREST_INDEX_UPDATED: &str = "interest.index.updated";
pub const INTEREST_RATE_UPDATED: &str = "interest.rate.updated";

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct InterestAccrued {
    pub reserve_id: ReserveId,
    pub previous_supply_index: Ray,
    pub previous_borrow_index: Ray,
    pub new_supply_index: Ray,
    pub new_borrow_index: Ray,
    pub utilization_rate: Ray,
    pub borrow_rate: Ray,
    pub supply_rate: Ray,
    pub delta_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct InterestIndexUpdated {
    pub reserve_id: ReserveId,
    pub previous_supply_index: Ray,
    pub previous_borrow_index: Ray,
    pub new_supply_index: Ray,
    pub new_borrow_index: Ray,
    pub delta_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct InterestRateUpdated {
    pub reserve_id: ReserveId,
    pub utilization_rate: Ray,
    pub borrow_rate: Ray,
    pub supply_rate: Ray,
}

fn interest_metadata(reserve_id: ReserveId) -> EventMetadata {
    create_event_metadata(EventModule::Interest).with_reserve_id(reserve_id)
}

fn interest_topic_name(event_name: &str) -> &'static str {
    match event_name {
        INTEREST_ACCRUED => "interest_accrue",
        INTEREST_INDEX_UPDATED => "interest_index",
        INTEREST_RATE_UPDATED => "interest_rate",
        _ => "interest_unknown",
    }
}

fn publish_interest_event<T>(
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
        EventModule::Interest,
        EventCategory::Accounting,
        actor,
        empty_event_id(env),
        empty_event_id(env),
    );
    let metadata = interest_metadata(reserve_id);
    let topics = (
        Symbol::new(env, "udonfi"),
        module_symbol(env, header.module),
        category_symbol(env, header.category),
        Symbol::new(env, interest_topic_name(event_name)),
        header.event_version,
    );
    #[allow(deprecated)]
    env.events().publish(topics, (header, metadata, payload));
}

pub fn publish_interest_accrued(
    env: &Env,
    actor: Address,
    reserve_id: ReserveId,
    result: InterestAccrualResult,
) {
    publish_interest_event(
        env,
        INTEREST_ACCRUED,
        actor,
        reserve_id,
        InterestAccrued {
            reserve_id,
            previous_supply_index: result.previous_supply_index,
            previous_borrow_index: result.previous_borrow_index,
            new_supply_index: result.new_supply_index,
            new_borrow_index: result.new_borrow_index,
            utilization_rate: result.utilization_rate,
            borrow_rate: result.borrow_rate,
            supply_rate: result.supply_rate,
            delta_ledger: result.delta_ledger,
        },
    );
}

pub fn publish_interest_index_updated(
    env: &Env,
    actor: Address,
    reserve_id: ReserveId,
    result: IndexUpdateResult,
) {
    publish_interest_event(
        env,
        INTEREST_INDEX_UPDATED,
        actor,
        reserve_id,
        InterestIndexUpdated {
            reserve_id,
            previous_supply_index: result.previous_supply_index,
            previous_borrow_index: result.previous_borrow_index,
            new_supply_index: result.new_supply_index,
            new_borrow_index: result.new_borrow_index,
            delta_ledger: result.delta_ledger,
        },
    );
}

pub fn publish_interest_rate_updated(
    env: &Env,
    actor: Address,
    reserve_id: ReserveId,
    utilization_rate: Ray,
    borrow_rate: Ray,
    supply_rate: Ray,
) {
    publish_interest_event(
        env,
        INTEREST_RATE_UPDATED,
        actor,
        reserve_id,
        InterestRateUpdated {
            reserve_id,
            utilization_rate,
            borrow_rate,
            supply_rate,
        },
    );
}
