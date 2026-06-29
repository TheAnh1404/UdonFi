//! Liquidation event payloads and Global Event Bus emitters.

use crate::model::LiquidationExecutionResult;
use soroban_sdk::{contracttype, Address, Env, String};
use udonfi_shared::{
    create_event_header, create_event_metadata, emit_standard_event, empty_event_id, EventCategory,
    EventModule, HealthFactor, LedgerSequence, ReserveId, ScaledBalance, ScaledDebt, Wad,
    LIQUIDATION_EXECUTED,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LiquidationExecuted {
    pub liquidator: Address,
    pub borrower: Address,
    pub debt_reserve_id: ReserveId,
    pub collateral_reserve_id: ReserveId,
    pub debt_repaid: Wad,
    pub collateral_seized: Wad,
    pub scaled_debt_burned: ScaledDebt,
    pub scaled_collateral_burned: ScaledBalance,
    pub health_factor_before: HealthFactor,
    pub ledger: LedgerSequence,
    pub accounting_version: u32,
}

pub fn publish_liquidation_executed(env: &Env, result: &LiquidationExecutionResult) {
    let header = create_event_header(
        env,
        String::from_str(env, LIQUIDATION_EXECUTED),
        EventModule::Liquidation,
        EventCategory::Risk,
        result.liquidator.clone(),
        empty_event_id(env),
        empty_event_id(env),
    );
    emit_standard_event(
        env,
        header,
        create_event_metadata(EventModule::Liquidation)
            .with_reserve_id(result.collateral_reserve_id),
        LiquidationExecuted {
            liquidator: result.liquidator.clone(),
            borrower: result.borrower.clone(),
            debt_reserve_id: result.debt_reserve_id,
            collateral_reserve_id: result.collateral_reserve_id,
            debt_repaid: result.debt_repaid,
            collateral_seized: result.collateral_seized,
            scaled_debt_burned: result.scaled_debt_burned,
            scaled_collateral_burned: result.scaled_collateral_burned,
            health_factor_before: result.health_factor_before,
            ledger: result.ledger,
            accounting_version: result.accounting_version,
        },
    );
}
