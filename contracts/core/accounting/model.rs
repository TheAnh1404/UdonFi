//! Accounting Engine state models.

use soroban_sdk::{contracttype, Address};
use udonfi_shared::{LedgerSequence, Ray, ReserveId, ScaledBalance, ScaledDebt, Wad, RAY};

pub const ACCOUNTING_VERSION: u32 = 1;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccountingLedger {
    pub total_assets: Wad,
    pub total_liabilities: Wad,
    pub protocol_equity: Wad,
    pub total_liquidity: Wad,
    pub total_scaled_supply: ScaledBalance,
    pub total_scaled_debt: ScaledDebt,
    pub total_bad_debt: Wad,
    pub treasury_balance: Wad,
    pub insurance_fund_balance: Wad,
    pub last_updated_ledger: LedgerSequence,
    pub accounting_version: u32,
}

impl AccountingLedger {
    pub fn new(last_updated_ledger: LedgerSequence) -> Self {
        Self {
            total_assets: Wad(0),
            total_liabilities: Wad(0),
            protocol_equity: Wad(0),
            total_liquidity: Wad(0),
            total_scaled_supply: ScaledBalance(0),
            total_scaled_debt: ScaledDebt(0),
            total_bad_debt: Wad(0),
            treasury_balance: Wad(0),
            insurance_fund_balance: Wad(0),
            last_updated_ledger,
            accounting_version: ACCOUNTING_VERSION,
        }
    }

    pub fn touch(&mut self, ledger: LedgerSequence) {
        self.last_updated_ledger = ledger;
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReserveAccounting {
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
    pub supply_index: Ray,
    pub borrow_index: Ray,
    pub last_updated_ledger: LedgerSequence,
}

impl ReserveAccounting {
    pub fn new(reserve_id: ReserveId, last_updated_ledger: LedgerSequence) -> Self {
        Self {
            reserve_id,
            total_liquidity: Wad(0),
            available_liquidity: Wad(0),
            total_scaled_supply: ScaledBalance(0),
            total_scaled_debt: ScaledDebt(0),
            total_actual_supply: Wad(0),
            total_actual_debt: Wad(0),
            accrued_to_treasury: Wad(0),
            accrued_to_insurance: Wad(0),
            bad_debt: Wad(0),
            supply_index: Ray(RAY),
            borrow_index: Ray(RAY),
            last_updated_ledger,
        }
    }

    pub fn touch(&mut self, ledger: LedgerSequence) {
        self.last_updated_ledger = ledger;
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserAccountingSnapshot {
    pub user: Address,
    pub reserve_id: ReserveId,
    pub scaled_supply: ScaledBalance,
    pub scaled_debt: ScaledDebt,
    pub collateral_enabled: bool,
    pub last_updated_ledger: LedgerSequence,
}

impl UserAccountingSnapshot {
    pub fn new(user: Address, reserve_id: ReserveId, last_updated_ledger: LedgerSequence) -> Self {
        Self {
            user,
            reserve_id,
            scaled_supply: ScaledBalance(0),
            scaled_debt: ScaledDebt(0),
            collateral_enabled: false,
            last_updated_ledger,
        }
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadDebtRecord {
    pub reserve_id: ReserveId,
    pub recorded_amount: Wad,
    pub covered_amount: Wad,
    pub remaining_amount: Wad,
    pub last_updated_ledger: LedgerSequence,
}

impl BadDebtRecord {
    pub fn new(reserve_id: ReserveId, amount: Wad, last_updated_ledger: LedgerSequence) -> Self {
        Self {
            reserve_id,
            recorded_amount: amount,
            covered_amount: Wad(0),
            remaining_amount: amount,
            last_updated_ledger,
        }
    }
}
