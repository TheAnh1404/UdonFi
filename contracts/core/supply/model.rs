//! Supply Engine request and validation models.

use soroban_sdk::{contracttype, Address, String};
use udonfi_shared::{LedgerSequence, Ray, ReserveId, ScaledBalance, Wad};

pub const SUPPLY_ENGINE_VERSION: u32 = 1;

pub const VALIDATION_STATUS_RESERVE_ACTIVE: u32 = 1 << 0;
pub const VALIDATION_STATUS_ACCOUNTING_VALID: u32 = 1 << 1;
pub const VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED: u32 = 1 << 2;

pub const VALIDATION_FLAG_RESERVE_ACTIVE: u32 = VALIDATION_STATUS_RESERVE_ACTIVE;
pub const VALIDATION_FLAG_ACCOUNTING_VALID: u32 = VALIDATION_STATUS_ACCOUNTING_VALID;
pub const VALIDATION_FLAG_INTEREST_ACCRUAL_REQUIRED: u32 =
    VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DepositRequest {
    pub actor: Address,
    pub reserve_id: ReserveId,
    pub asset_address: Address,
    pub amount: Wad,
    pub current_ledger: LedgerSequence,
    pub referral_code: Option<u32>,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct DepositValidationResult {
    pub is_valid: bool,
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub current_available_liquidity: Wad,
    pub projected_total_supply: Wad,
    pub supply_cap: Wad,
    pub requires_interest_accrual: bool,
    pub validation_status: u32,
    pub current_ledger: LedgerSequence,
}

impl DepositValidationResult {
    #[allow(clippy::too_many_arguments)]
    pub fn valid(
        reserve_id: ReserveId,
        amount: Wad,
        current_available_liquidity: Wad,
        projected_total_supply: Wad,
        supply_cap: Wad,
        requires_interest_accrual: bool,
        current_ledger: LedgerSequence,
    ) -> Self {
        let mut validation_status =
            VALIDATION_STATUS_RESERVE_ACTIVE | VALIDATION_STATUS_ACCOUNTING_VALID;
        if requires_interest_accrual {
            validation_status |= VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED;
        }

        Self {
            is_valid: true,
            reserve_id,
            amount,
            current_available_liquidity,
            projected_total_supply,
            supply_cap,
            requires_interest_accrual,
            validation_status,
            current_ledger,
        }
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DepositExecutionResult {
    pub actor: Address,
    pub reserve_id: ReserveId,
    pub amount: Wad,
    pub scaled_supply_minted: ScaledBalance,
    pub supply_index: Ray,
    pub previous_total_liquidity: Wad,
    pub updated_total_liquidity: Wad,
    pub previous_scaled_supply: ScaledBalance,
    pub updated_scaled_supply: ScaledBalance,
    pub ledger: LedgerSequence,
    pub accounting_version: u32,
    pub event_name: String,
}
