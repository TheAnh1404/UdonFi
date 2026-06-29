//! Repay Engine request, validation, and execution models.

use soroban_sdk::{contracttype, Address, BytesN, String};
use udonfi_shared::{LedgerSequence, Ray, ReserveId, ScaledDebt, Wad};

pub const VALIDATION_STATUS_REPAY_ALLOWED: u32 = 1 << 0;
pub const VALIDATION_STATUS_ACCOUNTING_VALID: u32 = 1 << 1;
pub const VALIDATION_STATUS_AMOUNT_CAPPED: u32 = 1 << 2;
pub const VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED: u32 = 1 << 3;

pub const VALIDATION_FLAG_REPAY_ALLOWED: u32 = VALIDATION_STATUS_REPAY_ALLOWED;
pub const VALIDATION_FLAG_ACCOUNTING_VALID: u32 = VALIDATION_STATUS_ACCOUNTING_VALID;
pub const VALIDATION_FLAG_AMOUNT_CAPPED: u32 = VALIDATION_STATUS_AMOUNT_CAPPED;
pub const VALIDATION_FLAG_INTEREST_ACCRUAL_REQUIRED: u32 =
    VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RepayRequest {
    pub actor: Address,
    pub reserve_id: ReserveId,
    pub asset_address: Address,
    pub amount: Wad,
    pub current_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct RepayValidationResult {
    pub is_valid: bool,
    pub reserve_id: ReserveId,
    pub requested_amount: Wad,
    pub actual_repay_amount: Wad,
    pub current_actual_debt: Wad,
    pub scaled_debt_to_burn: ScaledDebt,
    pub requires_interest_accrual: bool,
    pub validation_status: u32,
}

impl RepayValidationResult {
    #[allow(clippy::too_many_arguments)]
    pub fn valid(
        reserve_id: ReserveId,
        requested_amount: Wad,
        actual_repay_amount: Wad,
        current_actual_debt: Wad,
        scaled_debt_to_burn: ScaledDebt,
        requires_interest_accrual: bool,
    ) -> Self {
        let mut validation_status =
            VALIDATION_STATUS_REPAY_ALLOWED | VALIDATION_STATUS_ACCOUNTING_VALID;
        if actual_repay_amount.0 < requested_amount.0 {
            validation_status |= VALIDATION_STATUS_AMOUNT_CAPPED;
        }
        if requires_interest_accrual {
            validation_status |= VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED;
        }

        Self {
            is_valid: true,
            reserve_id,
            requested_amount,
            actual_repay_amount,
            current_actual_debt,
            scaled_debt_to_burn,
            requires_interest_accrual,
            validation_status,
        }
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RepayExecutionResult {
    pub actor: Address,
    pub reserve_id: ReserveId,
    pub requested_amount: Wad,
    pub actual_repay_amount: Wad,
    pub scaled_debt_burned: ScaledDebt,
    pub borrow_index: Ray,
    pub previous_scaled_debt: ScaledDebt,
    pub updated_scaled_debt: ScaledDebt,
    pub previous_liquidity: Wad,
    pub updated_liquidity: Wad,
    pub ledger: LedgerSequence,
    pub event_name: String,
    pub event_id: BytesN<32>,
}
