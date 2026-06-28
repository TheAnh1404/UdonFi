//! Accounting invariant validation helpers.

use crate::balance::{
    checked_add_wad, validate_scaled_balance_amount, validate_scaled_debt_amount,
    validate_wad_amount,
};
use crate::errors::{AccountingResult, LendingError};
use crate::model::{AccountingLedger, ReserveAccounting};

pub fn validate_accounting_equation(ledger: &AccountingLedger) -> AccountingResult<()> {
    validate_non_negative_balances(ledger)?;

    let expected_assets = checked_add_wad(ledger.total_liabilities, ledger.protocol_equity)?;
    if ledger.total_assets != expected_assets {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_reserve_accounting_equation(reserve: &ReserveAccounting) -> AccountingResult<()> {
    validate_reserve_non_negative_balances(reserve)?;

    let assets = checked_add_wad(reserve.total_liquidity, reserve.total_actual_debt)?;
    let liabilities_and_treasury =
        checked_add_wad(reserve.total_actual_supply, reserve.accrued_to_treasury)?;
    let expected_assets = checked_add_wad(liabilities_and_treasury, reserve.accrued_to_insurance)?;

    if assets != expected_assets {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_non_negative_balances(ledger: &AccountingLedger) -> AccountingResult<()> {
    validate_wad_amount(ledger.total_assets)?;
    validate_wad_amount(ledger.total_liabilities)?;
    validate_wad_amount(ledger.protocol_equity)?;
    validate_wad_amount(ledger.total_liquidity)?;
    validate_scaled_balance_amount(ledger.total_scaled_supply)?;
    validate_scaled_debt_amount(ledger.total_scaled_debt)?;
    validate_wad_amount(ledger.total_bad_debt)?;
    validate_wad_amount(ledger.treasury_balance)?;
    validate_wad_amount(ledger.insurance_fund_balance)?;
    Ok(())
}

pub fn validate_reserve_non_negative_balances(reserve: &ReserveAccounting) -> AccountingResult<()> {
    validate_wad_amount(reserve.total_liquidity)?;
    validate_wad_amount(reserve.available_liquidity)?;
    validate_scaled_balance_amount(reserve.total_scaled_supply)?;
    validate_scaled_debt_amount(reserve.total_scaled_debt)?;
    validate_wad_amount(reserve.total_actual_supply)?;
    validate_wad_amount(reserve.total_actual_debt)?;
    validate_wad_amount(reserve.accrued_to_treasury)?;
    validate_wad_amount(reserve.accrued_to_insurance)?;
    validate_wad_amount(reserve.bad_debt)?;
    Ok(())
}

pub fn validate_liquidity_bounds(reserve: &ReserveAccounting) -> AccountingResult<()> {
    validate_reserve_non_negative_balances(reserve)?;
    if reserve.available_liquidity.0 > reserve.total_liquidity.0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_debt_bounds(reserve: &ReserveAccounting) -> AccountingResult<()> {
    validate_reserve_non_negative_balances(reserve)?;
    if reserve.bad_debt.0 > reserve.total_actual_debt.0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_reserve_indices(reserve: &ReserveAccounting) -> AccountingResult<()> {
    if reserve.supply_index.0 <= 0 || reserve.borrow_index.0 <= 0 {
        return Err(LendingError::DivisionByZero);
    }
    Ok(())
}

pub fn validate_accounting_ledger(ledger: &AccountingLedger) -> AccountingResult<()> {
    validate_non_negative_balances(ledger)?;
    validate_accounting_equation(ledger)
}

pub fn validate_reserve_accounting(reserve: &ReserveAccounting) -> AccountingResult<()> {
    validate_reserve_non_negative_balances(reserve)?;
    validate_liquidity_bounds(reserve)?;
    validate_debt_bounds(reserve)?;
    validate_reserve_indices(reserve)?;
    validate_reserve_accounting_equation(reserve)
}
