#![cfg(test)]
#![allow(deprecated)]

use crate::{execute_liquidation, prepare_liquidation, LiquidationRequest};
use soroban_sdk::{
    contract, contractimpl,
    testutils::{Address as _, Events},
    Address, Env, String, Symbol,
};
use udonfi_accounting::{
    read_accounting_ledger, read_reserve_accounting, read_user_accounting_snapshot,
    write_accounting_ledger, write_reserve_accounting, write_user_accounting_snapshot,
    AccountingLedger, ReserveAccounting, UserAccountingSnapshot,
};
use udonfi_config_engine::{default_risk_config, storage::write_latest_risk_config, RiskConfig};
use udonfi_pool_state::{storage::write_pool_state, Pool, ProtocolStatus};
use udonfi_reserve_registry::{storage::write_reserve, Reserve, ReserveStatus};
use udonfi_shared::{
    BasisPoints, HealthFactor, LedgerSequence, LendingError, Ltv, Ray, ReserveFactor, ReserveId,
    ScaledBalance, ScaledDebt, Timestamp, Wad, LIQUIDATION_EXECUTED, MIN_HEALTH_FACTOR, RAY,
};

#[contract]
pub struct MockLiquidationContract;

#[contractimpl]
impl MockLiquidationContract {
    pub fn dummy(_env: Env) {}
}

fn ledger(value: u32) -> LedgerSequence {
    LedgerSequence(value)
}

fn reserve_id() -> ReserveId {
    ReserveId(0)
}

fn seed_pool(env: &Env) {
    let now = Timestamp(env.ledger().timestamp());
    write_pool_state(
        env,
        &Pool {
            protocol_version: 2,
            protocol_name: String::from_str(env, "UdonFi V2"),
            protocol_status: ProtocolStatus::Active,
            total_reserves: 1,
            active_reserves: 1,
            paused: false,
            guardian: Address::generate(env),
            admin: Address::generate(env),
            treasury_address: Address::generate(env),
            insurance_fund_address: Address::generate(env),
            created_at: now,
            updated_at: now,
            initialized_at: now,
            current_config_version: 1,
        },
    );
}

fn seed_risk_config(env: &Env) {
    let mut config: RiskConfig = default_risk_config();
    config.min_health_factor = HealthFactor(MIN_HEALTH_FACTOR);
    config.max_close_factor_bps = BasisPoints(5_000);
    write_latest_risk_config(env, &config);
}

fn seed_reserve(env: &Env, threshold: u32, bonus: u32) -> Address {
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
            max_ltv: Ltv(8_000),
            liquidation_threshold: BasisPoints(threshold),
            liquidation_bonus: BasisPoints(bonus),
            borrow_index: Ray(RAY),
            supply_index: Ray(RAY),
            last_accrual_ledger: ledger(100),
            created_at: now,
            updated_at: now,
        },
    );
    asset
}

fn seed_position(env: &Env, borrower: Address, supply: i128, debt: i128, liquidity: i128) {
    let mut reserve = ReserveAccounting::new(reserve_id(), ledger(100));
    reserve.total_liquidity = Wad(liquidity);
    reserve.available_liquidity = Wad(liquidity);
    reserve.total_actual_supply = Wad(supply);
    reserve.total_scaled_supply = ScaledBalance(supply);
    reserve.total_actual_debt = Wad(debt);
    reserve.total_scaled_debt = ScaledDebt(debt);
    write_reserve_accounting(env, &reserve);

    let mut ledger_state = AccountingLedger::new(ledger(100));
    ledger_state.total_assets = Wad(supply);
    ledger_state.total_liabilities = Wad(supply);
    ledger_state.total_liquidity = Wad(liquidity);
    ledger_state.total_scaled_supply = ScaledBalance(supply);
    ledger_state.total_scaled_debt = ScaledDebt(debt);
    write_accounting_ledger(env, &ledger_state);

    write_user_accounting_snapshot(
        env,
        &UserAccountingSnapshot {
            user: borrower,
            reserve_id: reserve_id(),
            scaled_supply: ScaledBalance(supply),
            scaled_debt: ScaledDebt(debt),
            collateral_enabled: true,
            last_updated_ledger: ledger(100),
        },
    );
}

fn seed_state(env: &Env, borrower: Address, threshold: u32, supply: i128, debt: i128) -> Address {
    seed_pool(env);
    seed_risk_config(env);
    let asset = seed_reserve(env, threshold, 500);
    seed_position(env, borrower, supply, debt, supply - debt);
    asset
}

fn request(env: &Env, borrower: Address, asset: Address, amount: i128) -> LiquidationRequest {
    LiquidationRequest {
        liquidator: Address::generate(env),
        borrower,
        debt_reserve_id: reserve_id(),
        collateral_reserve_id: reserve_id(),
        debt_asset_address: asset.clone(),
        collateral_asset_address: asset,
        repay_amount: Wad(amount),
        current_ledger: ledger(100),
    }
}

#[test]
fn test_liquidation_rejected_when_hf_gte_one() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockLiquidationContract);

    env.as_contract(&contract_id, || {
        let borrower = Address::generate(&env);
        let asset = seed_state(&env, borrower.clone(), 8_500, 1_000, 500);

        let err = prepare_liquidation(&env, &request(&env, borrower, asset, 100));
        assert_eq!(err, Err(LendingError::LiquidationNotAllowed));
    });
}

#[test]
fn test_liquidation_allowed_when_hf_below_one() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockLiquidationContract);

    env.as_contract(&contract_id, || {
        let borrower = Address::generate(&env);
        let asset = seed_state(&env, borrower.clone(), 8_000, 1_000, 900);

        let result = prepare_liquidation(&env, &request(&env, borrower, asset, 400)).unwrap();

        assert!(result.is_valid);
        assert!(result.health_factor.0 < MIN_HEALTH_FACTOR);
        assert_eq!(result.debt_to_cover, Wad(400));
        assert_eq!(result.collateral_to_seize, Wad(420));
    });
}

#[test]
fn test_liquidation_caps_repay_to_close_factor() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockLiquidationContract);

    env.as_contract(&contract_id, || {
        let borrower = Address::generate(&env);
        let asset = seed_state(&env, borrower.clone(), 8_000, 1_000, 900);

        let result = prepare_liquidation(&env, &request(&env, borrower, asset, 900)).unwrap();

        assert_eq!(result.debt_to_cover, Wad(450));
        assert_eq!(result.collateral_to_seize, Wad(472));
    });
}

#[test]
fn test_execute_liquidation_reduces_debt_seizes_collateral_and_emits_event() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockLiquidationContract);

    env.as_contract(&contract_id, || {
        let borrower = Address::generate(&env);
        let asset = seed_state(&env, borrower.clone(), 8_000, 1_000, 900);
        let req = request(&env, borrower.clone(), asset, 400);

        let result = execute_liquidation(&env, &req).unwrap();

        assert_eq!(result.borrower, borrower.clone());
        assert_eq!(result.debt_repaid, Wad(400));
        assert_eq!(result.collateral_seized, Wad(420));
        assert_eq!(result.scaled_debt_burned, ScaledDebt(400));
        assert_eq!(result.scaled_collateral_burned, ScaledBalance(420));
        assert_eq!(result.previous_borrower_scaled_debt, ScaledDebt(900));
        assert_eq!(result.updated_borrower_scaled_debt, ScaledDebt(500));
        assert_eq!(result.previous_borrower_collateral, ScaledBalance(1_000));
        assert_eq!(result.updated_borrower_collateral, ScaledBalance(580));
        assert_eq!(
            result.event_name,
            String::from_str(&env, LIQUIDATION_EXECUTED)
        );

        let reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        assert_eq!(reserve.total_actual_debt, Wad(500));
        assert_eq!(reserve.total_scaled_debt, ScaledDebt(500));
        assert_eq!(reserve.total_actual_supply, Wad(580));
        assert_eq!(reserve.total_scaled_supply, ScaledBalance(580));
        assert_eq!(reserve.total_liquidity, Wad(80));
        assert_eq!(reserve.available_liquidity, Wad(80));

        let ledger_state = read_accounting_ledger(&env).unwrap();
        assert_eq!(ledger_state.total_assets, Wad(580));
        assert_eq!(ledger_state.total_liabilities, Wad(580));
        assert_eq!(ledger_state.total_liquidity, Wad(80));

        let snapshot = read_user_accounting_snapshot(&env, &borrower, reserve_id()).unwrap();
        assert_eq!(snapshot.scaled_debt, ScaledDebt(500));
        assert_eq!(snapshot.scaled_supply, ScaledBalance(580));
        assert_eq!(env.events().all().events().len(), 1);
    });
}
