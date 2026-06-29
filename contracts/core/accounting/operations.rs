//! Shared helpers for reusable accounting operations.

use crate::balance::{checked_add_wad, validate_wad_amount};
use crate::errors::{AccountingResult, LendingError};
use crate::model::{AccountingLedger, ReserveAccounting, ACCOUNTING_VERSION};
use crate::validation::{
    validate_debt_bounds, validate_liquidity_bounds, validate_non_negative_balances,
    validate_reserve_indices, validate_reserve_non_negative_balances,
};
use udonfi_shared::{LedgerSequence, ScaledBalance, ScaledDebt, Wad};

pub(crate) fn validate_operation_context(
    ledger: &AccountingLedger,
    reserve: &ReserveAccounting,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_current_ledger(ledger, reserve, current_ledger)?;
    validate_non_negative_balances(ledger)?;
    validate_reserve_non_negative_balances(reserve)?;
    validate_liquidity_bounds(reserve)?;
    validate_debt_bounds(reserve)?;
    validate_reserve_indices(reserve)?;
    validate_accounting_version(ledger)
}

pub(crate) fn validate_operation_post_state(
    ledger: &AccountingLedger,
    reserve: &ReserveAccounting,
) -> AccountingResult<()> {
    validate_non_negative_balances(ledger)?;
    validate_reserve_non_negative_balances(reserve)?;
    validate_liquidity_bounds(reserve)?;
    validate_debt_bounds(reserve)?;
    validate_reserve_indices(reserve)?;
    validate_accounting_version(ledger)
}

pub(crate) fn validate_current_ledger(
    ledger: &AccountingLedger,
    reserve: &ReserveAccounting,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    if current_ledger.0 < ledger.last_updated_ledger.0
        || current_ledger.0 < reserve.last_updated_ledger.0
    {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub(crate) fn validate_supply_cap(
    current_supply: Wad,
    delta: Wad,
    supply_cap: Option<Wad>,
) -> AccountingResult<Wad> {
    validate_optional_cap(
        current_supply,
        delta,
        supply_cap,
        LendingError::SupplyCapViolation,
    )
}

pub(crate) fn validate_borrow_cap(
    current_debt: Wad,
    delta: Wad,
    borrow_cap: Option<Wad>,
) -> AccountingResult<Wad> {
    validate_optional_cap(
        current_debt,
        delta,
        borrow_cap,
        LendingError::BorrowCapViolation,
    )
}

pub(crate) fn ensure_scaled_supply_available(
    ledger: &AccountingLedger,
    reserve: &ReserveAccounting,
    scaled_delta: ScaledBalance,
    actual_delta: Wad,
) -> AccountingResult<()> {
    if scaled_delta.0 > reserve.total_scaled_supply.0
        || scaled_delta.0 > ledger.total_scaled_supply.0
        || actual_delta.0 > reserve.total_actual_supply.0
        || actual_delta.0 > ledger.total_liabilities.0
    {
        return Err(LendingError::MathUnderflow);
    }
    Ok(())
}

pub(crate) fn ensure_scaled_debt_available(
    ledger: &AccountingLedger,
    reserve: &ReserveAccounting,
    scaled_delta: ScaledDebt,
    actual_delta: Wad,
) -> AccountingResult<()> {
    if scaled_delta.0 > reserve.total_scaled_debt.0
        || scaled_delta.0 > ledger.total_scaled_debt.0
        || actual_delta.0 > reserve.total_actual_debt.0
        || actual_delta.0 > ledger.total_assets.0
    {
        return Err(LendingError::NoDebtToRepay);
    }
    Ok(())
}

pub(crate) fn ensure_positive_delta_has_supply_shares(
    actual_delta: Wad,
    scaled_delta: ScaledBalance,
) -> AccountingResult<()> {
    if actual_delta.0 > 0 && scaled_delta.0 == 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub(crate) fn ensure_positive_delta_has_debt_shares(
    actual_delta: Wad,
    scaled_delta: ScaledDebt,
) -> AccountingResult<()> {
    if actual_delta.0 > 0 && scaled_delta.0 == 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub(crate) fn ensure_insurance_coverage_available(
    ledger: &AccountingLedger,
    reserve: &ReserveAccounting,
    amount: Wad,
) -> AccountingResult<()> {
    if amount.0 > ledger.insurance_fund_balance.0 || amount.0 > reserve.accrued_to_insurance.0 {
        return Err(LendingError::InsufficientLiquidity);
    }
    if amount.0 > ledger.total_bad_debt.0 || amount.0 > reserve.bad_debt.0 {
        return Err(LendingError::MathUnderflow);
    }
    Ok(())
}

fn validate_optional_cap(
    current_value: Wad,
    delta: Wad,
    cap: Option<Wad>,
    cap_error: LendingError,
) -> AccountingResult<Wad> {
    validate_wad_amount(current_value)?;
    validate_wad_amount(delta)?;

    let projected_value = checked_add_wad(current_value, delta)?;
    if let Some(cap) = cap {
        validate_wad_amount(cap)?;
        if projected_value.0 > cap.0 {
            return Err(cap_error);
        }
    }

    Ok(projected_value)
}

fn validate_accounting_version(ledger: &AccountingLedger) -> AccountingResult<()> {
    if ledger.accounting_version != ACCOUNTING_VERSION {
        return Err(LendingError::InvalidIndex);
    }
    Ok(())
}
