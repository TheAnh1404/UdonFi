//! Treasury accounting primitives.

use crate::balance::{checked_add_wad, checked_sub_wad, validate_wad_amount};
use crate::errors::{AccountingResult, LendingError};
use crate::model::{AccountingLedger, ReserveAccounting};
use udonfi_shared::{LedgerSequence, Wad};

pub fn increase_treasury_balance(
    ledger: &mut AccountingLedger,
    amount: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_wad_amount(amount)?;

    let treasury_balance = checked_add_wad(ledger.treasury_balance, amount)?;
    let protocol_equity = checked_add_wad(ledger.protocol_equity, amount)?;

    ledger.treasury_balance = treasury_balance;
    ledger.protocol_equity = protocol_equity;
    ledger.touch(current_ledger);

    Ok(())
}

pub fn accrue_to_treasury(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    amount: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_wad_amount(amount)?;

    let reserve_treasury = checked_add_wad(reserve.accrued_to_treasury, amount)?;
    let treasury_balance = checked_add_wad(ledger.treasury_balance, amount)?;
    let protocol_equity = checked_add_wad(ledger.protocol_equity, amount)?;

    reserve.accrued_to_treasury = reserve_treasury;
    ledger.treasury_balance = treasury_balance;
    ledger.protocol_equity = protocol_equity;
    reserve.touch(current_ledger);
    ledger.touch(current_ledger);

    Ok(())
}

pub fn withdraw_from_treasury_accounting(
    ledger: &mut AccountingLedger,
    reserve: &mut ReserveAccounting,
    amount: Wad,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    validate_wad_amount(amount)?;
    if amount.0 > ledger.treasury_balance.0 || amount.0 > reserve.accrued_to_treasury.0 {
        return Err(LendingError::InsufficientLiquidity);
    }
    if amount.0 > reserve.available_liquidity.0 || amount.0 > ledger.total_liquidity.0 {
        return Err(LendingError::InsufficientLiquidity);
    }

    let reserve_treasury = checked_sub_wad(reserve.accrued_to_treasury, amount)?;
    let reserve_total_liquidity = checked_sub_wad(reserve.total_liquidity, amount)?;
    let reserve_available_liquidity = checked_sub_wad(reserve.available_liquidity, amount)?;
    let treasury_balance = checked_sub_wad(ledger.treasury_balance, amount)?;
    let protocol_equity = checked_sub_wad(ledger.protocol_equity, amount)?;
    let ledger_liquidity = checked_sub_wad(ledger.total_liquidity, amount)?;
    let ledger_assets = checked_sub_wad(ledger.total_assets, amount)?;

    reserve.accrued_to_treasury = reserve_treasury;
    reserve.total_liquidity = reserve_total_liquidity;
    reserve.available_liquidity = reserve_available_liquidity;
    ledger.treasury_balance = treasury_balance;
    ledger.protocol_equity = protocol_equity;
    ledger.total_liquidity = ledger_liquidity;
    ledger.total_assets = ledger_assets;
    reserve.touch(current_ledger);
    ledger.touch(current_ledger);

    Ok(())
}
