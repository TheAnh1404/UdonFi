//! Balance and liquidity accounting primitives.

use crate::errors::{AccountingResult, LendingError};
use crate::model::{AccountingLedger, ReserveAccounting};
use udonfi_shared::{LedgerSequence, ScaledBalance, ScaledDebt, Wad};

pub fn validate_wad_amount(amount: Wad) -> AccountingResult<()> {
    if amount.0 < 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_scaled_balance_amount(amount: ScaledBalance) -> AccountingResult<()> {
    if amount.0 < 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_scaled_debt_amount(amount: ScaledDebt) -> AccountingResult<()> {
    if amount.0 < 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

pub fn checked_add_wad(lhs: Wad, rhs: Wad) -> AccountingResult<Wad> {
    validate_wad_amount(lhs)?;
    validate_wad_amount(rhs)?;
    lhs.0
        .checked_add(rhs.0)
        .map(Wad)
        .ok_or(LendingError::MathOverflow)
}

pub fn checked_sub_wad(lhs: Wad, rhs: Wad) -> AccountingResult<Wad> {
    validate_wad_amount(lhs)?;
    validate_wad_amount(rhs)?;
    if rhs.0 > lhs.0 {
        return Err(LendingError::MathUnderflow);
    }
    lhs.0
        .checked_sub(rhs.0)
        .map(Wad)
        .ok_or(LendingError::MathUnderflow)
}

pub fn checked_add_scaled_balance(
    lhs: ScaledBalance,
    rhs: ScaledBalance,
) -> AccountingResult<ScaledBalance> {
    validate_scaled_balance_amount(lhs)?;
    validate_scaled_balance_amount(rhs)?;
    lhs.0
        .checked_add(rhs.0)
        .map(ScaledBalance)
        .ok_or(LendingError::MathOverflow)
}

pub fn checked_sub_scaled_balance(
    lhs: ScaledBalance,
    rhs: ScaledBalance,
) -> AccountingResult<ScaledBalance> {
    validate_scaled_balance_amount(lhs)?;
    validate_scaled_balance_amount(rhs)?;
    if rhs.0 > lhs.0 {
        return Err(LendingError::MathUnderflow);
    }
    lhs.0
        .checked_sub(rhs.0)
        .map(ScaledBalance)
        .ok_or(LendingError::MathUnderflow)
}

pub fn checked_add_scaled_debt(lhs: ScaledDebt, rhs: ScaledDebt) -> AccountingResult<ScaledDebt> {
    validate_scaled_debt_amount(lhs)?;
    validate_scaled_debt_amount(rhs)?;
    lhs.0
        .checked_add(rhs.0)
        .map(ScaledDebt)
        .ok_or(LendingError::MathOverflow)
}

pub fn checked_sub_scaled_debt(lhs: ScaledDebt, rhs: ScaledDebt) -> AccountingResult<ScaledDebt> {
    validate_scaled_debt_amount(lhs)?;
    validate_scaled_debt_amount(rhs)?;
    if rhs.0 > lhs.0 {
        return Err(LendingError::MathUnderflow);
    }
    lhs.0
        .checked_sub(rhs.0)
        .map(ScaledDebt)
        .ok_or(LendingError::MathUnderflow)
}

pub fn increase_liquidity(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    amount: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_wad_amount(amount)?;

    let reserve_total_liquidity = checked_add_wad(reserve.total_liquidity, amount)?;
    let reserve_available_liquidity = checked_add_wad(reserve.available_liquidity, amount)?;
    let ledger_total_liquidity = checked_add_wad(ledger.total_liquidity, amount)?;
    let ledger_total_assets = checked_add_wad(ledger.total_assets, amount)?;

    reserve.total_liquidity = reserve_total_liquidity;
    reserve.available_liquidity = reserve_available_liquidity;
    ledger.total_liquidity = ledger_total_liquidity;
    ledger.total_assets = ledger_total_assets;
    reserve.touch(current_ledger);
    ledger.touch(current_ledger);

    Ok(())
}

pub fn decrease_liquidity(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    amount: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_wad_amount(amount)?;
    if amount.0 > reserve.available_liquidity.0 || amount.0 > ledger.total_liquidity.0 {
        return Err(LendingError::InsufficientLiquidity);
    }

    let reserve_total_liquidity = checked_sub_wad(reserve.total_liquidity, amount)?;
    let reserve_available_liquidity = checked_sub_wad(reserve.available_liquidity, amount)?;
    let ledger_total_liquidity = checked_sub_wad(ledger.total_liquidity, amount)?;
    let ledger_total_assets = checked_sub_wad(ledger.total_assets, amount)?;

    reserve.total_liquidity = reserve_total_liquidity;
    reserve.available_liquidity = reserve_available_liquidity;
    ledger.total_liquidity = ledger_total_liquidity;
    ledger.total_assets = ledger_total_assets;
    reserve.touch(current_ledger);
    ledger.touch(current_ledger);

    Ok(())
}

pub fn increase_scaled_supply(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    scaled_amount: ScaledBalance,
    actual_amount: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_scaled_balance_amount(scaled_amount)?;
    validate_wad_amount(actual_amount)?;

    let reserve_scaled_supply =
        checked_add_scaled_balance(reserve.total_scaled_supply, scaled_amount)?;
    let reserve_actual_supply = checked_add_wad(reserve.total_actual_supply, actual_amount)?;
    let ledger_scaled_supply =
        checked_add_scaled_balance(ledger.total_scaled_supply, scaled_amount)?;
    let ledger_liabilities = checked_add_wad(ledger.total_liabilities, actual_amount)?;

    reserve.total_scaled_supply = reserve_scaled_supply;
    reserve.total_actual_supply = reserve_actual_supply;
    ledger.total_scaled_supply = ledger_scaled_supply;
    ledger.total_liabilities = ledger_liabilities;
    reserve.touch(current_ledger);
    ledger.touch(current_ledger);

    Ok(())
}

pub fn decrease_scaled_supply(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    scaled_amount: ScaledBalance,
    actual_amount: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_scaled_balance_amount(scaled_amount)?;
    validate_wad_amount(actual_amount)?;

    let reserve_scaled_supply =
        checked_sub_scaled_balance(reserve.total_scaled_supply, scaled_amount)?;
    let reserve_actual_supply = checked_sub_wad(reserve.total_actual_supply, actual_amount)?;
    let ledger_scaled_supply =
        checked_sub_scaled_balance(ledger.total_scaled_supply, scaled_amount)?;
    let ledger_liabilities = checked_sub_wad(ledger.total_liabilities, actual_amount)?;

    reserve.total_scaled_supply = reserve_scaled_supply;
    reserve.total_actual_supply = reserve_actual_supply;
    ledger.total_scaled_supply = ledger_scaled_supply;
    ledger.total_liabilities = ledger_liabilities;
    reserve.touch(current_ledger);
    ledger.touch(current_ledger);

    Ok(())
}
