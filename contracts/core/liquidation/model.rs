//! Basic liquidation request, validation, and execution models.

use soroban_sdk::{contracttype, Address, String};
use udonfi_shared::{
    BasisPoints, HealthFactor, LedgerSequence, ReserveId, ScaledBalance, ScaledDebt, Wad,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LiquidationRequest {
    pub liquidator: Address,
    pub borrower: Address,
    pub debt_reserve_id: ReserveId,
    pub collateral_reserve_id: ReserveId,
    pub debt_asset_address: Address,
    pub collateral_asset_address: Address,
    pub repay_amount: Wad,
    pub current_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct LiquidationValidationResult {
    pub is_valid: bool,
    pub debt_reserve_id: ReserveId,
    pub collateral_reserve_id: ReserveId,
    pub requested_repay_amount: Wad,
    pub debt_to_cover: Wad,
    pub collateral_to_seize: Wad,
    pub borrower_debt: Wad,
    pub borrower_collateral: Wad,
    pub health_factor: HealthFactor,
    pub close_factor_bps: BasisPoints,
    pub liquidation_bonus_bps: BasisPoints,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LiquidationExecutionResult {
    pub liquidator: Address,
    pub borrower: Address,
    pub debt_reserve_id: ReserveId,
    pub collateral_reserve_id: ReserveId,
    pub debt_repaid: Wad,
    pub collateral_seized: Wad,
    pub scaled_debt_burned: ScaledDebt,
    pub scaled_collateral_burned: ScaledBalance,
    pub previous_borrower_scaled_debt: ScaledDebt,
    pub updated_borrower_scaled_debt: ScaledDebt,
    pub previous_borrower_collateral: ScaledBalance,
    pub updated_borrower_collateral: ScaledBalance,
    pub health_factor_before: HealthFactor,
    pub ledger: LedgerSequence,
    pub accounting_version: u32,
    pub event_name: String,
}
