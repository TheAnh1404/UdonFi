#![cfg(test)]

use crate::accrual::{accrue_interest, accrue_reserve_interest};
use crate::errors::LendingError;
use crate::index::{delta_ledger, update_borrow_index, update_indices, update_supply_index};
use crate::model::{bps_to_ray_unchecked, InterestRateModel, InterestState, LEDGERS_PER_YEAR};
use crate::rates::{
    calculate_borrow_rate, calculate_rates, calculate_supply_rate, calculate_utilization_rate,
};
use crate::validation::{validate_interest_state, validate_rate_model};
use udonfi_accounting::ReserveAccounting;
use udonfi_shared::{LedgerSequence, Ray, ReserveId, Wad, RAY};

fn ledger(value: u32) -> LedgerSequence {
    LedgerSequence(value)
}

fn ray_bps(bps: u32) -> Ray {
    bps_to_ray_unchecked(bps)
}

fn default_model() -> InterestRateModel {
    InterestRateModel::default()
}

#[test]
fn test_inv_int_007_zero_utilization() {
    let utilization = calculate_utilization_rate(Wad(0), Wad(0)).unwrap();
    assert_eq!(utilization, Ray(0));

    let utilization = calculate_utilization_rate(Wad(1_000), Wad(0)).unwrap();
    assert_eq!(utilization, Ray(0));

    let (utilization, borrow_rate, supply_rate) =
        calculate_rates(Wad(1_000), Wad(0), &default_model()).unwrap();
    assert_eq!(utilization, Ray(0));
    assert_eq!(borrow_rate, ray_bps(100));
    assert_eq!(supply_rate, Ray(0));
}

#[test]
fn test_inv_int_007_full_utilization() {
    let utilization = calculate_utilization_rate(Wad(1_000), Wad(1_000)).unwrap();
    assert_eq!(utilization, Ray(RAY));

    let borrow_rate = calculate_borrow_rate(utilization, &default_model()).unwrap();
    let supply_rate = calculate_supply_rate(borrow_rate, utilization, ray_bps(1_000)).unwrap();

    assert_eq!(borrow_rate, ray_bps(9_000));
    assert_eq!(supply_rate, ray_bps(8_100));
}

#[test]
fn test_utilization_above_total_supply_is_rejected() {
    let err = calculate_utilization_rate(Wad(99), Wad(100));
    assert_eq!(err, Err(LendingError::InvalidAmount));
}

#[test]
fn test_utilization_below_optimal_borrow_rate() {
    let utilization = calculate_utilization_rate(Wad(1_000), Wad(400)).unwrap();
    let borrow_rate = calculate_borrow_rate(utilization, &default_model()).unwrap();

    assert_eq!(utilization, ray_bps(4_000));
    assert_eq!(borrow_rate, ray_bps(300));
}

#[test]
fn test_utilization_above_optimal_borrow_rate() {
    let utilization = calculate_utilization_rate(Wad(1_000), Wad(900)).unwrap();
    let borrow_rate = calculate_borrow_rate(utilization, &default_model()).unwrap();

    assert_eq!(utilization, ray_bps(9_000));
    assert_eq!(borrow_rate, ray_bps(4_750));
}

#[test]
fn test_inv_int_003_supply_rate_and_reserve_factor_effect() {
    let utilization = ray_bps(5_000);
    let borrow_rate = ray_bps(1_000);

    let no_reserve_factor = calculate_supply_rate(borrow_rate, utilization, ray_bps(0)).unwrap();
    let half_reserve_factor =
        calculate_supply_rate(borrow_rate, utilization, ray_bps(5_000)).unwrap();

    assert_eq!(no_reserve_factor, ray_bps(500));
    assert_eq!(half_reserve_factor, ray_bps(250));
    assert!(half_reserve_factor.0 <= borrow_rate.0);
}

#[test]
fn test_inv_int_005_delta_ledger_zero_keeps_indices_unchanged() {
    let state = InterestState {
        supply_index: Ray(RAY + 5),
        borrow_index: Ray(RAY + 7),
        utilization_rate: ray_bps(5_000),
        borrow_rate: ray_bps(1_000),
        supply_rate: ray_bps(500),
        reserve_factor: ray_bps(1_000),
        last_accrual_ledger: ledger(10),
        current_ledger: ledger(10),
    };

    let result = update_indices(&state).unwrap();
    assert_eq!(result.new_supply_index, state.supply_index);
    assert_eq!(result.new_borrow_index, state.borrow_index);
    assert_eq!(result.delta_ledger, ledger(0));
}

#[test]
fn test_inv_int_001_002_index_monotonicity() {
    let state = InterestState {
        supply_index: Ray(RAY),
        borrow_index: Ray(RAY),
        utilization_rate: ray_bps(5_000),
        borrow_rate: ray_bps(1_000),
        supply_rate: ray_bps(450),
        reserve_factor: ray_bps(1_000),
        last_accrual_ledger: ledger(10),
        current_ledger: ledger(10 + LEDGERS_PER_YEAR as u32),
    };

    let result = update_indices(&state).unwrap();
    assert!(result.new_borrow_index.0 >= state.borrow_index.0);
    assert!(result.new_supply_index.0 >= state.supply_index.0);
    assert!(result.new_borrow_index.0 > result.new_supply_index.0);
}

#[test]
fn test_borrow_index_rounds_up() {
    let updated = update_borrow_index(Ray(RAY), Ray(1), ledger(1)).unwrap();
    assert_eq!(updated, Ray(RAY + 1));
}

#[test]
fn test_supply_index_rounds_down() {
    let updated = update_supply_index(Ray(RAY), Ray(LEDGERS_PER_YEAR - 1), ledger(1)).unwrap();
    assert_eq!(updated, Ray(RAY));
}

#[test]
fn test_inv_int_004_max_borrow_rate_cap() {
    let model = InterestRateModel::new(
        ray_bps(100),
        ray_bps(400),
        ray_bps(9_500),
        ray_bps(8_000),
        ray_bps(9_000),
        ray_bps(1_000),
    );

    let borrow_rate = calculate_borrow_rate(Ray(RAY), &model).unwrap();
    assert_eq!(borrow_rate, ray_bps(9_000));
}

#[test]
fn test_current_ledger_before_last_accrual_rejected() {
    assert_eq!(
        delta_ledger(ledger(11), ledger(10)),
        Err(LendingError::InvalidAmount)
    );

    let state = InterestState {
        supply_index: Ray(RAY),
        borrow_index: Ray(RAY),
        utilization_rate: ray_bps(5_000),
        borrow_rate: ray_bps(1_000),
        supply_rate: ray_bps(500),
        reserve_factor: ray_bps(1_000),
        last_accrual_ledger: ledger(11),
        current_ledger: ledger(10),
    };
    assert_eq!(
        validate_interest_state(&state),
        Err(LendingError::InvalidAmount)
    );
}

#[test]
fn test_invalid_rate_model_rejected() {
    let mut model = default_model();
    model.optimal_utilization = Ray(0);
    assert_eq!(
        validate_rate_model(&model),
        Err(LendingError::InvalidOptimalUtilization)
    );

    model = default_model();
    model.reserve_factor = Ray(RAY + 1);
    assert_eq!(
        validate_rate_model(&model),
        Err(LendingError::InvalidReserveFactor)
    );
}

#[test]
fn test_accrual_result_does_not_update_user_balances() {
    let result = accrue_interest(
        Wad(1_000),
        Wad(500),
        Ray(RAY),
        Ray(RAY),
        ledger(10),
        ledger(110),
        &default_model(),
    )
    .unwrap();

    assert_eq!(result.total_supply, Wad(1_000));
    assert_eq!(result.total_borrow, Wad(500));
    assert_eq!(result.utilization_rate, ray_bps(5_000));
    assert_eq!(result.borrow_rate, ray_bps(350));
    assert!(result.new_borrow_index.0 >= result.previous_borrow_index.0);
    assert!(result.new_supply_index.0 >= result.previous_supply_index.0);
}

#[test]
fn test_accrue_reserve_interest_reuses_accounting_state() {
    let mut reserve = ReserveAccounting::new(ReserveId(7), ledger(20));
    reserve.total_actual_supply = Wad(2_000);
    reserve.total_actual_debt = Wad(1_000);

    let result = accrue_reserve_interest(&reserve, ledger(30), &default_model()).unwrap();

    assert_eq!(result.total_supply, Wad(2_000));
    assert_eq!(result.total_borrow, Wad(1_000));
    assert_eq!(result.previous_supply_index, Ray(RAY));
    assert_eq!(result.previous_borrow_index, Ray(RAY));
    assert_eq!(result.delta_ledger, ledger(10));
}

#[test]
fn test_overflow_protection() {
    let err = update_borrow_index(Ray(i128::MAX), ray_bps(9_000), ledger(1));
    assert_eq!(err, Err(LendingError::MathOverflow));

    let err = calculate_borrow_rate(
        Ray(RAY - 1),
        &InterestRateModel::new(Ray(0), Ray(RAY - 1), Ray(0), Ray(RAY), Ray(RAY), Ray(0)),
    );
    assert_eq!(err, Err(LendingError::MathOverflow));
}
