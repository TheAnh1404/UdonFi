#![cfg(test)]

use crate::bad_debt::{get_bad_debt, record_bad_debt, reduce_bad_debt};
use crate::balance::{
    decrease_liquidity, decrease_scaled_supply, increase_liquidity, increase_scaled_supply,
};
use crate::debt::{decrease_scaled_debt, increase_scaled_debt};
use crate::errors::LendingError;
use crate::insurance::{accrue_to_insurance, cover_bad_debt};
use crate::ledger::new_accounting_ledger;
use crate::model::{AccountingLedger, BadDebtRecord, ReserveAccounting, ACCOUNTING_VERSION};
use crate::reserve::{new_reserve_accounting, set_reserve_indices};
use crate::shares::{
    actual_debt_to_scaled, actual_supply_to_scaled, scaled_debt_to_actual, scaled_supply_to_actual,
};
use crate::storage::{
    has_accounting_ledger, read_accounting_ledger, read_accounting_version, read_bad_debt_record,
    read_reserve_accounting, write_accounting_ledger, write_accounting_version,
    write_bad_debt_record, write_reserve_accounting,
};
use crate::treasury::{accrue_to_treasury, withdraw_from_treasury_accounting};
use crate::validation::{
    validate_accounting_equation, validate_debt_bounds, validate_liquidity_bounds,
    validate_non_negative_balances, validate_reserve_accounting_equation,
};
use soroban_sdk::{contract, contractimpl, Env};
use udonfi_shared::{LedgerSequence, Ray, ReserveId, ScaledBalance, ScaledDebt, Wad, RAY};

#[contract]
pub struct MockAccountingContract;

#[contractimpl]
impl MockAccountingContract {
    pub fn dummy(_env: Env) {}
}

fn ledger_seq(value: u32) -> LedgerSequence {
    LedgerSequence(value)
}

fn empty_ledger() -> AccountingLedger {
    new_accounting_ledger(ledger_seq(1))
}

fn empty_reserve() -> ReserveAccounting {
    new_reserve_accounting(ReserveId(0), ledger_seq(1))
}

fn balanced_liquidity_supply_state(amount: i128) -> (AccountingLedger, ReserveAccounting) {
    let mut ledger = empty_ledger();
    let mut reserve = empty_reserve();
    increase_liquidity(&mut ledger, &mut reserve, Wad(amount), ledger_seq(2)).unwrap();
    increase_scaled_supply(
        &mut ledger,
        &mut reserve,
        ScaledBalance(amount),
        Wad(amount),
        ledger_seq(2),
    )
    .unwrap();
    (ledger, reserve)
}

fn balanced_bad_debt_state() -> (AccountingLedger, ReserveAccounting) {
    let mut ledger = AccountingLedger::new(ledger_seq(10));
    ledger.total_assets = Wad(1_000);
    ledger.total_liabilities = Wad(900);
    ledger.protocol_equity = Wad(100);
    ledger.total_liquidity = Wad(600);
    ledger.total_scaled_debt = ScaledDebt(400);
    ledger.total_bad_debt = Wad(100);
    ledger.insurance_fund_balance = Wad(100);

    let mut reserve = ReserveAccounting::new(ReserveId(0), ledger_seq(10));
    reserve.total_liquidity = Wad(600);
    reserve.available_liquidity = Wad(600);
    reserve.total_scaled_debt = ScaledDebt(400);
    reserve.total_actual_debt = Wad(400);
    reserve.total_actual_supply = Wad(900);
    reserve.accrued_to_insurance = Wad(100);
    reserve.bad_debt = Wad(100);

    (ledger, reserve)
}

#[test]
fn test_inv_acc_001_liquidity_increase_decrease() {
    let mut ledger = empty_ledger();
    let mut reserve = empty_reserve();

    increase_liquidity(&mut ledger, &mut reserve, Wad(100), ledger_seq(2)).unwrap();
    assert_eq!(reserve.total_liquidity, Wad(100));
    assert_eq!(reserve.available_liquidity, Wad(100));
    assert_eq!(ledger.total_assets, Wad(100));

    decrease_liquidity(&mut ledger, &mut reserve, Wad(40), ledger_seq(3)).unwrap();
    assert_eq!(reserve.total_liquidity, Wad(60));
    assert_eq!(reserve.available_liquidity, Wad(60));
    assert_eq!(ledger.total_assets, Wad(60));
    assert!(validate_liquidity_bounds(&reserve).is_ok());

    let err = decrease_liquidity(&mut ledger, &mut reserve, Wad(61), ledger_seq(4));
    assert_eq!(err, Err(LendingError::InsufficientLiquidity));
}

#[test]
fn test_scaled_supply_increase_decrease_preserves_equation() {
    let (mut ledger, mut reserve) = balanced_liquidity_supply_state(1_000);
    assert!(validate_accounting_equation(&ledger).is_ok());
    assert!(validate_reserve_accounting_equation(&reserve).is_ok());

    decrease_scaled_supply(
        &mut ledger,
        &mut reserve,
        ScaledBalance(250),
        Wad(250),
        ledger_seq(3),
    )
    .unwrap();
    decrease_liquidity(&mut ledger, &mut reserve, Wad(250), ledger_seq(3)).unwrap();

    assert_eq!(reserve.total_scaled_supply, ScaledBalance(750));
    assert_eq!(reserve.total_actual_supply, Wad(750));
    assert_eq!(ledger.total_liabilities, Wad(750));
    assert!(validate_accounting_equation(&ledger).is_ok());
    assert!(validate_reserve_accounting_equation(&reserve).is_ok());
}

#[test]
fn test_scaled_debt_increase_decrease_preserves_equation() {
    let (mut ledger, mut reserve) = balanced_liquidity_supply_state(1_000);

    decrease_liquidity(&mut ledger, &mut reserve, Wad(300), ledger_seq(3)).unwrap();
    increase_scaled_debt(
        &mut ledger,
        &mut reserve,
        ScaledDebt(300),
        Wad(300),
        ledger_seq(3),
    )
    .unwrap();

    assert_eq!(reserve.available_liquidity, Wad(700));
    assert_eq!(reserve.total_actual_debt, Wad(300));
    assert_eq!(ledger.total_assets, Wad(1_000));
    assert!(validate_accounting_equation(&ledger).is_ok());
    assert!(validate_reserve_accounting_equation(&reserve).is_ok());

    decrease_scaled_debt(
        &mut ledger,
        &mut reserve,
        ScaledDebt(125),
        Wad(125),
        ledger_seq(4),
    )
    .unwrap();
    increase_liquidity(&mut ledger, &mut reserve, Wad(125), ledger_seq(4)).unwrap();

    assert_eq!(reserve.total_scaled_debt, ScaledDebt(175));
    assert_eq!(reserve.total_actual_debt, Wad(175));
    assert!(validate_accounting_equation(&ledger).is_ok());
    assert!(validate_reserve_accounting_equation(&reserve).is_ok());
}

#[test]
fn test_inv_acc_005_debt_rounding_up() {
    let borrow_index = Ray((RAY * 3) / 2);

    let scaled = actual_debt_to_scaled(Wad(10), borrow_index).unwrap();
    assert_eq!(scaled, ScaledDebt(7));

    let actual = scaled_debt_to_actual(scaled, borrow_index).unwrap();
    assert_eq!(actual, Wad(11));
    assert!(actual.0 >= 10);
}

#[test]
fn test_inv_acc_006_supply_rounding_down() {
    let supply_index = Ray((RAY * 3) / 2);

    let scaled = actual_supply_to_scaled(Wad(10), supply_index).unwrap();
    assert_eq!(scaled, ScaledBalance(6));

    let actual = scaled_supply_to_actual(scaled, supply_index).unwrap();
    assert_eq!(actual, Wad(9));
    assert!(actual.0 <= 10);
}

#[test]
fn test_inv_acc_004_treasury_accrual_and_withdrawal() {
    let mut ledger = AccountingLedger::new(ledger_seq(1));
    ledger.total_assets = Wad(1_000);
    ledger.total_liabilities = Wad(900);
    ledger.protocol_equity = Wad(100);
    ledger.total_liquidity = Wad(1_000);
    ledger.treasury_balance = Wad(100);

    let mut reserve = ReserveAccounting::new(ReserveId(0), ledger_seq(1));
    reserve.total_liquidity = Wad(1_000);
    reserve.available_liquidity = Wad(1_000);
    reserve.total_actual_supply = Wad(900);
    reserve.accrued_to_treasury = Wad(100);

    accrue_to_treasury(&mut ledger, &mut reserve, Wad(25), ledger_seq(2)).unwrap();
    assert_eq!(reserve.accrued_to_treasury, Wad(125));
    assert_eq!(ledger.treasury_balance, Wad(125));
    assert_eq!(ledger.protocol_equity, Wad(125));

    withdraw_from_treasury_accounting(&mut ledger, &mut reserve, Wad(20), ledger_seq(3)).unwrap();
    assert_eq!(reserve.accrued_to_treasury, Wad(105));
    assert_eq!(ledger.treasury_balance, Wad(105));
    assert_eq!(ledger.protocol_equity, Wad(105));
    assert_eq!(ledger.total_assets, Wad(980));
    assert_eq!(ledger.total_liquidity, Wad(980));

    let err = withdraw_from_treasury_accounting(&mut ledger, &mut reserve, Wad(106), ledger_seq(4));
    assert_eq!(err, Err(LendingError::InsufficientLiquidity));
}

#[test]
fn test_treasury_and_insurance_accrual_helpers() {
    let mut ledger = empty_ledger();
    let mut reserve = empty_reserve();

    accrue_to_treasury(&mut ledger, &mut reserve, Wad(30), ledger_seq(2)).unwrap();
    accrue_to_insurance(&mut ledger, &mut reserve, Wad(70), ledger_seq(2)).unwrap();

    assert_eq!(reserve.accrued_to_treasury, Wad(30));
    assert_eq!(reserve.accrued_to_insurance, Wad(70));
    assert_eq!(ledger.treasury_balance, Wad(30));
    assert_eq!(ledger.insurance_fund_balance, Wad(70));
    assert_eq!(ledger.protocol_equity, Wad(100));
}

#[test]
fn test_bad_debt_recording_reduction_and_bounds() {
    let mut ledger = empty_ledger();
    let mut reserve = empty_reserve();
    increase_scaled_debt(
        &mut ledger,
        &mut reserve,
        ScaledDebt(500),
        Wad(500),
        ledger_seq(2),
    )
    .unwrap();

    record_bad_debt(&mut ledger, &mut reserve, Wad(125), ledger_seq(3)).unwrap();
    assert_eq!(get_bad_debt(&reserve), Wad(125));
    assert_eq!(ledger.total_bad_debt, Wad(125));
    assert!(validate_debt_bounds(&reserve).is_ok());

    let err = record_bad_debt(&mut ledger, &mut reserve, Wad(376), ledger_seq(4));
    assert_eq!(err, Err(LendingError::InvalidAmount));

    reduce_bad_debt(&mut ledger, &mut reserve, Wad(25), ledger_seq(5)).unwrap();
    assert_eq!(get_bad_debt(&reserve), Wad(100));
    assert_eq!(ledger.total_bad_debt, Wad(100));

    let err = reduce_bad_debt(&mut ledger, &mut reserve, Wad(101), ledger_seq(6));
    assert_eq!(err, Err(LendingError::MathUnderflow));
}

#[test]
fn test_bad_debt_coverage_from_insurance_preserves_equation() {
    // Financial Spec 3.G and FMA-ECO-03/FMA-ECO-04:
    // insurance coverage cannot exceed the fund and bad debt cannot become negative.
    let (mut ledger, mut reserve) = balanced_bad_debt_state();
    assert!(validate_accounting_equation(&ledger).is_ok());
    assert!(validate_reserve_accounting_equation(&reserve).is_ok());

    cover_bad_debt(
        &mut ledger,
        &mut reserve,
        Wad(60),
        ScaledDebt(60),
        ledger_seq(11),
    )
    .unwrap();

    assert_eq!(reserve.bad_debt, Wad(40));
    assert_eq!(ledger.total_bad_debt, Wad(40));
    assert_eq!(reserve.accrued_to_insurance, Wad(40));
    assert_eq!(ledger.insurance_fund_balance, Wad(40));
    assert_eq!(reserve.total_actual_debt, Wad(340));
    assert_eq!(ledger.total_assets, Wad(940));
    assert!(validate_accounting_equation(&ledger).is_ok());
    assert!(validate_reserve_accounting_equation(&reserve).is_ok());

    let err = cover_bad_debt(
        &mut ledger,
        &mut reserve,
        Wad(41),
        ScaledDebt(41),
        ledger_seq(12),
    );
    assert_eq!(err, Err(LendingError::InsufficientLiquidity));
}

#[test]
fn test_accounting_equation_validation() {
    let (mut ledger, _) = balanced_liquidity_supply_state(1_000);
    assert!(validate_accounting_equation(&ledger).is_ok());

    ledger.protocol_equity = Wad(1);
    assert_eq!(
        validate_accounting_equation(&ledger),
        Err(LendingError::InvalidAmount)
    );
}

#[test]
fn test_non_negative_balance_validation() {
    let mut ledger = empty_ledger();
    ledger.total_assets = Wad(-1);
    assert_eq!(
        validate_non_negative_balances(&ledger),
        Err(LendingError::InvalidAmount)
    );

    let mut reserve = empty_reserve();
    reserve.available_liquidity = Wad(10);
    reserve.total_liquidity = Wad(9);
    assert_eq!(
        validate_liquidity_bounds(&reserve),
        Err(LendingError::InvalidAmount)
    );
}

#[test]
fn test_inv_int_001_002_index_updates_are_monotonic() {
    let mut reserve = empty_reserve();

    set_reserve_indices(&mut reserve, Ray(RAY + 10), Ray(RAY + 20), ledger_seq(2)).unwrap();
    assert_eq!(reserve.supply_index, Ray(RAY + 10));
    assert_eq!(reserve.borrow_index, Ray(RAY + 20));

    let err = set_reserve_indices(&mut reserve, Ray(RAY + 9), Ray(RAY + 20), ledger_seq(3));
    assert_eq!(err, Err(LendingError::InvalidAmount));
}

#[test]
fn test_overflow_protection() {
    let mut ledger = empty_ledger();
    let mut reserve = empty_reserve();
    ledger.total_assets = Wad(i128::MAX);
    ledger.total_liquidity = Wad(i128::MAX);
    reserve.total_liquidity = Wad(i128::MAX);
    reserve.available_liquidity = Wad(i128::MAX);

    let err = increase_liquidity(&mut ledger, &mut reserve, Wad(1), ledger_seq(2));
    assert_eq!(err, Err(LendingError::MathOverflow));
    assert_eq!(ledger.total_assets, Wad(i128::MAX));

    let err = actual_supply_to_scaled(Wad(i128::MAX), Ray(RAY - 1));
    assert_eq!(err, Err(LendingError::MathOverflow));
}

#[test]
#[allow(deprecated)]
fn test_storage_helpers() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockAccountingContract);

    env.as_contract(&contract_id, || {
        let ledger = AccountingLedger::new(ledger_seq(7));
        let reserve = ReserveAccounting::new(ReserveId(2), ledger_seq(7));
        let record = BadDebtRecord::new(ReserveId(2), Wad(55), ledger_seq(7));

        assert!(!has_accounting_ledger(&env));
        write_accounting_ledger(&env, &ledger);
        write_reserve_accounting(&env, &reserve);
        write_accounting_version(&env, ACCOUNTING_VERSION);
        write_bad_debt_record(&env, &record);

        assert!(has_accounting_ledger(&env));
        assert_eq!(read_accounting_ledger(&env), Some(ledger));
        assert_eq!(read_reserve_accounting(&env, ReserveId(2)), Some(reserve));
        assert_eq!(read_accounting_version(&env), Some(ACCOUNTING_VERSION));
        assert_eq!(read_bad_debt_record(&env, ReserveId(2)), Some(record));
    });
}
