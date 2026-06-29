#![cfg(test)]
#![allow(deprecated)]

use crate::{
    calculate_borrow_value, calculate_collateral_value, calculate_health_factor, calculate_ltv,
    can_borrow, can_withdraw, write_mock_price,
};
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env, Symbol};
use udonfi_accounting::{
    write_reserve_accounting, write_user_accounting_snapshot, ReserveAccounting,
    UserAccountingSnapshot,
};
use udonfi_config_engine::{default_risk_config, storage::write_latest_risk_config, RiskConfig};
use udonfi_reserve_registry::{storage::write_reserve, Reserve, ReserveStatus};
use udonfi_shared::{
    BasisPoints, HealthFactor, LedgerSequence, LendingError, Ltv, Price, Ray, ReserveFactor,
    ReserveId, ScaledBalance, ScaledDebt, Timestamp, Wad, MIN_HEALTH_FACTOR, RAY, WAD,
};

#[contract]
pub struct MockRiskContract;

#[contractimpl]
impl MockRiskContract {
    pub fn dummy(_env: Env) {}
}

fn ledger(value: u32) -> LedgerSequence {
    LedgerSequence(value)
}

fn reserve_id() -> ReserveId {
    ReserveId(0)
}

fn seed_reserve(env: &Env, ltv: u32, threshold: u32) -> Address {
    let asset = Address::generate(env);
    let now = Timestamp(env.ledger().timestamp());
    write_reserve(
        env,
        &Reserve {
            reserve_id: reserve_id(),
            asset_address: asset.clone(),
            asset_symbol: Symbol::new(env, "USDC"),
            asset_decimals: 6,
            reserve_status: ReserveStatus::Active,
            supply_cap: Wad(1_000_000),
            borrow_cap: Wad(1_000_000),
            reserve_factor: ReserveFactor(1_000),
            max_ltv: Ltv(ltv),
            liquidation_threshold: BasisPoints(threshold),
            liquidation_bonus: BasisPoints(500),
            borrow_index: Ray(RAY),
            supply_index: Ray(RAY),
            last_accrual_ledger: ledger(1),
            created_at: now,
            updated_at: now,
        },
    );
    asset
}

fn seed_accounting(env: &Env) {
    let mut accounting = ReserveAccounting::new(reserve_id(), ledger(1));
    accounting.total_liquidity = Wad(1_000_000);
    accounting.available_liquidity = Wad(1_000_000);
    accounting.total_actual_supply = Wad(1_000_000);
    accounting.total_scaled_supply = ScaledBalance(1_000_000);
    write_reserve_accounting(env, &accounting);
}

fn seed_user(env: &Env, user: Address, supply: i128, debt: i128) {
    write_user_accounting_snapshot(
        env,
        &UserAccountingSnapshot {
            user,
            reserve_id: reserve_id(),
            scaled_supply: ScaledBalance(supply),
            scaled_debt: ScaledDebt(debt),
            collateral_enabled: true,
            last_updated_ledger: ledger(1),
        },
    );
}

fn seed_risk_config(env: &Env) {
    let mut config: RiskConfig = default_risk_config();
    config.min_health_factor = HealthFactor(MIN_HEALTH_FACTOR);
    write_latest_risk_config(env, &config);
}

#[test]
fn test_hf_above_one_safe() {
    let collateral = calculate_collateral_value(Wad(1_000), Price(WAD)).unwrap();
    let borrow = calculate_borrow_value(Wad(500), Price(WAD)).unwrap();
    let hf = calculate_health_factor(collateral, borrow, BasisPoints(8_500)).unwrap();

    assert!(hf.0 > MIN_HEALTH_FACTOR);
}

#[test]
fn test_hf_below_one_unsafe() {
    let collateral = calculate_collateral_value(Wad(1_000), Price(WAD)).unwrap();
    let borrow = calculate_borrow_value(Wad(900), Price(WAD)).unwrap();
    let hf = calculate_health_factor(collateral, borrow, BasisPoints(8_000)).unwrap();

    assert!(hf.0 < MIN_HEALTH_FACTOR);
}

#[test]
fn test_ltv_calculation() {
    let ltv = calculate_ltv(Wad(1_000), Wad(500)).unwrap();
    assert_eq!(ltv, BasisPoints(5_000));
}

#[test]
fn test_borrow_rejected_if_hf_would_fall_below_minimum() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRiskContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_reserve(&env, 8_000, 8_500);
        seed_accounting(&env);
        seed_risk_config(&env);
        seed_user(&env, user.clone(), 1_000, 800);
        write_mock_price(&env, reserve_id(), Price(WAD), ledger(1)).unwrap();

        let result = can_borrow(&env, &user, reserve_id(), Wad(100)).unwrap();
        assert!(!result.is_allowed);
        assert!(result.health_factor.0 < MIN_HEALTH_FACTOR);
    });
}

#[test]
fn test_withdraw_rejected_if_hf_would_fall_below_minimum() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRiskContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_reserve(&env, 8_000, 8_500);
        seed_accounting(&env);
        seed_risk_config(&env);
        seed_user(&env, user.clone(), 1_000, 700);

        let result = can_withdraw(&env, &user, reserve_id(), Wad(300)).unwrap();
        assert!(!result.is_allowed);
        assert!(result.health_factor.0 < MIN_HEALTH_FACTOR);
    });
}

#[test]
fn test_negative_price_rejected() {
    assert_eq!(
        calculate_borrow_value(Wad(1), Price(0)),
        Err(LendingError::InvalidPriceValue)
    );
}
