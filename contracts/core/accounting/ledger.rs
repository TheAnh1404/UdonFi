//! Aggregate accounting ledger helpers.

use crate::balance::checked_add_wad;
use crate::errors::AccountingResult;
use crate::model::AccountingLedger;
use udonfi_shared::LedgerSequence;

pub fn new_accounting_ledger(current_ledger: LedgerSequence) -> AccountingLedger {
    AccountingLedger::new(current_ledger)
}

pub fn refresh_protocol_equity(
    ledger: &mut AccountingLedger,
    current_ledger: LedgerSequence,
) -> AccountingResult<()> {
    ledger.protocol_equity =
        checked_add_wad(ledger.treasury_balance, ledger.insurance_fund_balance)?;
    ledger.touch(current_ledger);
    Ok(())
}
