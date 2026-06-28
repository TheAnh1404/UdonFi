//! Supply Engine request and validation models.

use soroban_sdk::{contracttype, Address};
use udonfi_shared::{LedgerSequence, ReserveId, Wad};

pub const SUPPLY_ENGINE_VERSION: u32 = 1;

pub const VALIDATION_FLAG_RESERVE_ACTIVE: u32 = 1 << 0;
pub const VALIDATION_FLAG_ACCOUNTING_VALID: u32 = 1 << 1;
pub const VALIDATION_FLAG_INTEREST_ACCRUAL_REQUIRED: u32 = 1 << 2;

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
    pub required_interest_accrual: bool,
    pub validation_flags: u32,
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
        required_interest_accrual: bool,
        current_ledger: LedgerSequence,
    ) -> Self {
        let mut validation_flags =
            VALIDATION_FLAG_RESERVE_ACTIVE | VALIDATION_FLAG_ACCOUNTING_VALID;
        if required_interest_accrual {
            validation_flags |= VALIDATION_FLAG_INTEREST_ACCRUAL_REQUIRED;
        }

        Self {
            is_valid: true,
            reserve_id,
            amount,
            current_available_liquidity,
            projected_total_supply,
            supply_cap,
            required_interest_accrual,
            validation_flags,
            current_ledger,
        }
    }
}
