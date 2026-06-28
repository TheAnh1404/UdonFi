//! Accounting event payloads and Global Event Bus emitters.

use crate::model::{AccountingLedger, ReserveAccounting};
use soroban_sdk::{contracttype, Address, Env, String, TryFromVal, Val};
use udonfi_shared::{
    create_event_header, create_event_metadata,
    emit_accounting_event as emit_shared_accounting_event, empty_event_id, EventCategory,
    EventMetadata, EventModule, LedgerSequence, ReserveId, ScaledBalance, ScaledDebt, Wad,
};

pub const ACCOUNTING_LEDGER_UPDATED: &str = "accounting.ledger.updated";
pub const ACCOUNTING_RESERVE_UPDATED: &str = "accounting.reserve.updated";
pub const ACCOUNTING_BAD_DEBT_RECORDED: &str = "accounting.bad_debt.recorded";
pub const ACCOUNTING_BAD_DEBT_COVERED: &str = "accounting.bad_debt.covered";
pub const ACCOUNTING_TREASURY_ACCRUED: &str = "accounting.treasury.accrued";
pub const ACCOUNTING_INSURANCE_ACCRUED: &str = "accounting.insurance.accrued";

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccountingLedgerUpdated {
    pub total_assets: Wad,
    pub total_liabilities: Wad,
    pub protocol_equity: Wad,
    pub total_liquidity: Wad,
    pub total_scaled_supply: ScaledBalance,
    pub total_scaled_debt: ScaledDebt,
    pub total_bad_debt: Wad,
    pub treasury_balance: Wad,
    pub insurance_fund_balance: Wad,
    pub ledger: LedgerSequence,
    pub accounting_version: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccountingReserveUpdated {
    pub reserve_id: ReserveId,
    pub total_liquidity: Wad,
    pub available_liquidity: Wad,
    pub total_scaled_supply: ScaledBalance,
    pub total_scaled_debt: ScaledDebt,
    pub total_actual_supply: Wad,
    pub total_actual_debt: Wad,
    pub accrued_to_treasury: Wad,
    pub accrued_to_insurance: Wad,
    pub bad_debt: Wad,
    pub ledger: LedgerSequence,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccountingBadDebtRecorded {
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub reserve_bad_debt: Wad,
    pub total_bad_debt: Wad,
    pub ledger: LedgerSequence,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccountingBadDebtCovered {
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub remaining_reserve_bad_debt: Wad,
    pub remaining_total_bad_debt: Wad,
    pub insurance_fund_balance: Wad,
    pub ledger: LedgerSequence,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccountingTreasuryAccrued {
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub reserve_accrued_to_treasury: Wad,
    pub treasury_balance: Wad,
    pub ledger: LedgerSequence,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccountingInsuranceAccrued {
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub reserve_accrued_to_insurance: Wad,
    pub insurance_fund_balance: Wad,
    pub ledger: LedgerSequence,
}

fn accounting_metadata(reserve_id: Option<ReserveId>) -> EventMetadata {
    let metadata = create_event_metadata(EventModule::Pool);
    if let Some(id) = reserve_id {
        metadata.with_reserve_id(id)
    } else {
        metadata
    }
}

fn publish_accounting_event<T>(
    env: &Env,
    event_name: &str,
    actor: Address,
    reserve_id: Option<ReserveId>,
    payload: T,
) where
    T: soroban_sdk::IntoVal<Env, Val>,
    Val: TryFromVal<Env, T>,
{
    let header = create_event_header(
        env,
        String::from_str(env, event_name),
        EventModule::Pool,
        EventCategory::Accounting,
        actor,
        empty_event_id(env),
        empty_event_id(env),
    );
    emit_shared_accounting_event(env, header, accounting_metadata(reserve_id), payload);
}

pub fn publish_ledger_updated(env: &Env, actor: Address, ledger: &AccountingLedger) {
    publish_accounting_event(
        env,
        ACCOUNTING_LEDGER_UPDATED,
        actor,
        None,
        AccountingLedgerUpdated {
            total_assets: ledger.total_assets,
            total_liabilities: ledger.total_liabilities,
            protocol_equity: ledger.protocol_equity,
            total_liquidity: ledger.total_liquidity,
            total_scaled_supply: ledger.total_scaled_supply,
            total_scaled_debt: ledger.total_scaled_debt,
            total_bad_debt: ledger.total_bad_debt,
            treasury_balance: ledger.treasury_balance,
            insurance_fund_balance: ledger.insurance_fund_balance,
            ledger: ledger.last_updated_ledger,
            accounting_version: ledger.accounting_version,
        },
    );
}

pub fn publish_reserve_updated(env: &Env, actor: Address, reserve: &ReserveAccounting) {
    publish_accounting_event(
        env,
        ACCOUNTING_RESERVE_UPDATED,
        actor,
        Some(reserve.reserve_id),
        AccountingReserveUpdated {
            reserve_id: reserve.reserve_id,
            total_liquidity: reserve.total_liquidity,
            available_liquidity: reserve.available_liquidity,
            total_scaled_supply: reserve.total_scaled_supply,
            total_scaled_debt: reserve.total_scaled_debt,
            total_actual_supply: reserve.total_actual_supply,
            total_actual_debt: reserve.total_actual_debt,
            accrued_to_treasury: reserve.accrued_to_treasury,
            accrued_to_insurance: reserve.accrued_to_insurance,
            bad_debt: reserve.bad_debt,
            ledger: reserve.last_updated_ledger,
        },
    );
}

pub fn publish_bad_debt_recorded(
    env: &Env,
    actor: Address,
    reserve: &ReserveAccounting,
    ledger: &AccountingLedger,
    amount: Wad,
) {
    publish_accounting_event(
        env,
        ACCOUNTING_BAD_DEBT_RECORDED,
        actor,
        Some(reserve.reserve_id),
        AccountingBadDebtRecorded {
            reserve_id: reserve.reserve_id,
            amount,
            reserve_bad_debt: reserve.bad_debt,
            total_bad_debt: ledger.total_bad_debt,
            ledger: ledger.last_updated_ledger,
        },
    );
}

pub fn publish_bad_debt_covered(
    env: &Env,
    actor: Address,
    reserve: &ReserveAccounting,
    ledger: &AccountingLedger,
    amount: Wad,
) {
    publish_accounting_event(
        env,
        ACCOUNTING_BAD_DEBT_COVERED,
        actor,
        Some(reserve.reserve_id),
        AccountingBadDebtCovered {
            reserve_id: reserve.reserve_id,
            amount,
            remaining_reserve_bad_debt: reserve.bad_debt,
            remaining_total_bad_debt: ledger.total_bad_debt,
            insurance_fund_balance: ledger.insurance_fund_balance,
            ledger: ledger.last_updated_ledger,
        },
    );
}

pub fn publish_treasury_accrued(
    env: &Env,
    actor: Address,
    reserve: &ReserveAccounting,
    ledger: &AccountingLedger,
    amount: Wad,
) {
    publish_accounting_event(
        env,
        ACCOUNTING_TREASURY_ACCRUED,
        actor,
        Some(reserve.reserve_id),
        AccountingTreasuryAccrued {
            reserve_id: reserve.reserve_id,
            amount,
            reserve_accrued_to_treasury: reserve.accrued_to_treasury,
            treasury_balance: ledger.treasury_balance,
            ledger: ledger.last_updated_ledger,
        },
    );
}

pub fn publish_insurance_accrued(
    env: &Env,
    actor: Address,
    reserve: &ReserveAccounting,
    ledger: &AccountingLedger,
    amount: Wad,
) {
    publish_accounting_event(
        env,
        ACCOUNTING_INSURANCE_ACCRUED,
        actor,
        Some(reserve.reserve_id),
        AccountingInsuranceAccrued {
            reserve_id: reserve.reserve_id,
            amount,
            reserve_accrued_to_insurance: reserve.accrued_to_insurance,
            insurance_fund_balance: ledger.insurance_fund_balance,
            ledger: ledger.last_updated_ledger,
        },
    );
}
