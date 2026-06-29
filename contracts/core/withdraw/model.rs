//! Withdraw Engine request and validation models.

use soroban_sdk::{contracttype, Address, BytesN, String};
use udonfi_shared::{LedgerSequence, Ray, ReserveId, ScaledBalance, Wad};

pub const VALIDATION_STATUS_RESERVE_ACTIVE: u32 = 1 << 0;
pub const VALIDATION_STATUS_ACCOUNTING_VALID: u32 = 1 << 1;
pub const VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED: u32 = 1 << 2;
pub const VALIDATION_STATUS_RISK_CHECK_REQUIRED: u32 = 1 << 3;

pub const VALIDATION_FLAG_RESERVE_ACTIVE: u32 = VALIDATION_STATUS_RESERVE_ACTIVE;
pub const VALIDATION_FLAG_ACCOUNTING_VALID: u32 = VALIDATION_STATUS_ACCOUNTING_VALID;
pub const VALIDATION_FLAG_INTEREST_ACCRUAL_REQUIRED: u32 =
    VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED;
pub const VALIDATION_FLAG_RISK_CHECK_REQUIRED: u32 = VALIDATION_STATUS_RISK_CHECK_REQUIRED;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawRequest {
    pub actor: Address,
    pub reserve_id: ReserveId,
    pub asset_address: Address,
    pub amount: Wad,
    pub current_ledger: LedgerSequence,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct WithdrawValidationResult {
    pub is_valid: bool,
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub scaled_supply_to_burn: ScaledBalance,
    pub available_supply: Wad,
    pub available_liquidity: Wad,
    pub requires_interest_accrual: bool,
    pub requires_risk_check: bool,
    pub validation_status: u32,
}

impl WithdrawValidationResult {
    #[allow(clippy::too_many_arguments)]
    pub fn valid(
        reserve_id: ReserveId,
        amount: Wad,
        scaled_supply_to_burn: ScaledBalance,
        available_supply: Wad,
        available_liquidity: Wad,
        requires_interest_accrual: bool,
        requires_risk_check: bool,
    ) -> Self {
        let mut validation_status =
            VALIDATION_STATUS_RESERVE_ACTIVE | VALIDATION_STATUS_ACCOUNTING_VALID;
        if requires_interest_accrual {
            validation_status |= VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED;
        }
        if requires_risk_check {
            validation_status |= VALIDATION_STATUS_RISK_CHECK_REQUIRED;
        }

        Self {
            is_valid: true,
            reserve_id,
            amount,
            scaled_supply_to_burn,
            available_supply,
            available_liquidity,
            requires_interest_accrual,
            requires_risk_check,
            validation_status,
        }
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawExecutionResult {
    pub actor: Address,
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub scaled_supply_burned: ScaledBalance,
    pub supply_index: Ray,
    pub previous_total_liquidity: Wad,
    pub updated_total_liquidity: Wad,
    pub previous_available_liquidity: Wad,
    pub updated_available_liquidity: Wad,
    pub previous_scaled_supply: ScaledBalance,
    pub updated_scaled_supply: ScaledBalance,
    pub previous_user_scaled_supply: ScaledBalance,
    pub updated_user_scaled_supply: ScaledBalance,
    pub previous_reserve_scaled_supply: ScaledBalance,
    pub updated_reserve_scaled_supply: ScaledBalance,
    pub ledger: LedgerSequence,
    pub accounting_version: u32,
    pub event_name: String,
    pub event_id: BytesN<32>,
}
