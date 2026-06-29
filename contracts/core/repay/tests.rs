#![cfg(test)]
#![allow(deprecated)]

use crate::{
    execute_repay, prepare_repay, RepayRequest, VALIDATION_STATUS_ACCOUNTING_VALID,
    VALIDATION_STATUS_AMOUNT_CAPPED, VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED,
    VALIDATION_STATUS_REPAY_ALLOWED,
};
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
use udonfi_config_engine::{
    default_validation_config, storage::write_latest_validation_config, ValidationConfig,
};
use udonfi_pool_state::{storage::write_pool_state, Pool, ProtocolStatus};
use udonfi_reserve_registry::{storage::write_reserve, Reserve, ReserveStatus};
use udonfi_shared::{
    BasisPoints, LedgerSequence, LendingError, Ltv, Ray, ReserveFactor, ReserveId, ScaledBalance,
    ScaledDebt, Timestamp, Wad, RAY, REPAY_COMPLETED,
};

#[contract]
pub struct MockRepayContract;

#[contractimpl]
impl MockRepayContract {
    pub fn dummy(_env: Env) {}
}

fn ledger(value: u32) -> LedgerSequence {
    LedgerSequence(value)
}

fn reserve_id() -> ReserveId {
    ReserveId(0)
}

fn seed_pool(env: &Env, status: ProtocolStatus) {
    let now = Timestamp(env.ledger().timestamp());
    write_pool_state(
        env,
        &Pool {
            protocol_version: 2,
            protocol_name: String::from_str(env, "UdonFi V2"),
            protocol_status: status,
            total_reserves: 1,
            active_reserves: if status == ProtocolStatus::Active {
                1
            } else {
                0
            },
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

fn seed_config(env: &Env, min_repay_amount: i128, max_transaction_amount: i128) {
    let mut validation: ValidationConfig = default_validation_config();
    validation.min_repay_amount = Wad(min_repay_amount);
    validation.max_transaction_amount = Wad(max_transaction_amount);
    write_latest_validation_config(env, &validation);
}

fn seed_reserve(env: &Env, status: ReserveStatus, last_accrual_ledger: LedgerSequence) -> Address {
    let asset = Address::generate(env);
    let now = Timestamp(env.ledger().timestamp());
    write_reserve(
        env,
        &Reserve {
            reserve_id: reserve_id(),
            asset_address: asset.clone(),
            asset_symbol: Symbol::new(env, "USDC"),
            asset_decimals: 6,
            reserve_status: status,
            supply_cap: Wad(1_000_000),
            borrow_cap: Wad(1_000_000),
            reserve_factor: ReserveFactor(1_000),
            max_ltv: Ltv(8_000),
            liquidation_threshold: BasisPoints(8_500),
            liquidation_bonus: BasisPoints(500),
            borrow_index: Ray(RAY),
            supply_index: Ray(RAY),
            last_accrual_ledger,
            created_at: now,
            updated_at: now,
        },
    );
    asset
}

fn seed_accounting(env: &Env, total_supply: i128, total_debt: i128, liquidity: i128) {
    seed_accounting_with_index(
        env,
        total_supply,
        total_debt,
        liquidity,
        ScaledDebt(total_debt),
        Ray(RAY),
    );
}

fn seed_accounting_with_index(
    env: &Env,
    total_supply: i128,
    total_debt: i128,
    liquidity: i128,
    total_scaled_debt: ScaledDebt,
    borrow_index: Ray,
) {
    let mut reserve = ReserveAccounting::new(reserve_id(), ledger(100));
    reserve.total_liquidity = Wad(liquidity);
    reserve.available_liquidity = Wad(liquidity);
    reserve.total_actual_supply = Wad(total_supply);
    reserve.total_scaled_supply = ScaledBalance(total_supply);
    reserve.total_actual_debt = Wad(total_debt);
    reserve.total_scaled_debt = total_scaled_debt;
    reserve.borrow_index = borrow_index;
    write_reserve_accounting(env, &reserve);

    let mut ledger_state = AccountingLedger::new(ledger(100));
    ledger_state.total_assets = Wad(total_supply);
    ledger_state.total_liabilities = Wad(total_supply);
    ledger_state.total_liquidity = Wad(liquidity);
    ledger_state.total_scaled_supply = ScaledBalance(total_supply);
    ledger_state.total_scaled_debt = total_scaled_debt;
    write_accounting_ledger(env, &ledger_state);
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
            last_updated_ledger: ledger(100),
        },
    );
}

fn seed_valid_state(env: &Env, user: Address) -> Address {
    seed_pool(env, ProtocolStatus::Active);
    seed_config(env, 1, 1_000_000);
    let asset = seed_reserve(env, ReserveStatus::Active, ledger(100));
    seed_accounting(env, 100_000, 40_000, 60_000);
    seed_user(env, user, 100_000, 40_000);
    asset
}

fn request(actor: Address, asset: Address, amount: i128) -> RepayRequest {
    request_at_ledger(actor, asset, amount, 100)
}

fn request_at_ledger(
    actor: Address,
    asset: Address,
    amount: i128,
    current_ledger: u32,
) -> RepayRequest {
    RepayRequest {
        actor,
        reserve_id: reserve_id(),
        asset_address: asset,
        amount: Wad(amount),
        current_ledger: ledger(current_ledger),
    }
}

#[test]
fn test_valid_repay_preparation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        let before = read_reserve_accounting(&env, reserve_id()).unwrap();

        let result = prepare_repay(&env, &request(user, asset, 10_000)).unwrap();

        assert!(result.is_valid);
        assert_eq!(result.reserve_id, reserve_id());
        assert_eq!(result.requested_amount, Wad(10_000));
        assert_eq!(result.actual_repay_amount, Wad(10_000));
        assert_eq!(result.current_actual_debt, Wad(40_000));
        assert_eq!(result.scaled_debt_to_burn, ScaledDebt(10_000));
        assert!(!result.requires_interest_accrual);
        assert_eq!(
            result.validation_status,
            VALIDATION_STATUS_REPAY_ALLOWED | VALIDATION_STATUS_ACCOUNTING_VALID
        );
        assert_eq!(read_reserve_accounting(&env, reserve_id()).unwrap(), before);
    });
}

#[test]
fn test_missing_reserve_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active);
        seed_config(&env, 1, 1_000_000);
        let asset = Address::generate(&env);

        let err = prepare_repay(&env, &request(user, asset, 10_000));
        assert_eq!(err, Err(LendingError::ReserveNotFound));
    });
}

#[test]
fn test_frozen_reserve_repay_allowed_by_lifecycle() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Frozen, ledger(100));
        seed_accounting(&env, 100_000, 40_000, 60_000);
        seed_user(&env, user.clone(), 100_000, 40_000);

        let result = prepare_repay(&env, &request(user, asset, 10_000)).unwrap();
        assert!(result.is_valid);
    });
}

#[test]
fn test_paused_reserve_repay_allowed_by_lifecycle() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Paused, ledger(100));
        seed_accounting(&env, 100_000, 40_000, 60_000);
        seed_user(&env, user.clone(), 100_000, 40_000);

        let result = prepare_repay(&env, &request(user, asset, 10_000)).unwrap();
        assert!(result.is_valid);
    });
}

#[test]
fn test_deprecated_reserve_repay_allowed_by_lifecycle() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Deprecated, ledger(100));
        seed_accounting(&env, 100_000, 40_000, 60_000);
        seed_user(&env, user.clone(), 100_000, 40_000);

        let result = prepare_repay(&env, &request(user, asset, 10_000)).unwrap();
        assert!(result.is_valid);
    });
}

#[test]
fn test_uninitialized_reserve_repay_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Uninitialized, ledger(100));

        let err = prepare_repay(&env, &request(user, asset, 10_000));
        assert_eq!(err, Err(LendingError::ReserveNotActive));
    });
}

#[test]
fn test_zero_amount_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let err = prepare_repay(&env, &request(user, asset, 0));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
fn test_below_minimum_amount_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        seed_config(&env, 100, 1_000_000);

        let err = prepare_repay(&env, &request(user, asset, 99));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
fn test_above_max_transaction_amount_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        seed_config(&env, 1, 1_000);

        let err = prepare_repay(&env, &request(user, asset, 1_001));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
fn test_no_debt_rejected() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        seed_user(&env, user.clone(), 100_000, 0);

        let err = prepare_repay(&env, &request(user, asset, 10_000));
        assert_eq!(err, Err(LendingError::NoDebtToRepay));
    });
}

#[test]
fn test_missing_user_snapshot_rejected_as_no_debt() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, ledger(100));
        seed_accounting(&env, 100_000, 40_000, 60_000);

        let err = prepare_repay(&env, &request(user, asset, 10_000));
        assert_eq!(err, Err(LendingError::NoDebtToRepay));
    });
}

#[test]
fn test_over_repay_capped_to_actual_debt() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = prepare_repay(&env, &request(user, asset, 100_000)).unwrap();

        assert_eq!(result.requested_amount, Wad(100_000));
        assert_eq!(result.actual_repay_amount, Wad(40_000));
        assert_eq!(result.current_actual_debt, Wad(40_000));
        assert_eq!(result.scaled_debt_to_burn, ScaledDebt(40_000));
        assert_eq!(
            result.validation_status,
            VALIDATION_STATUS_REPAY_ALLOWED
                | VALIDATION_STATUS_ACCOUNTING_VALID
                | VALIDATION_STATUS_AMOUNT_CAPPED
        );
    });
}

#[test]
fn test_interest_accrual_required() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, ledger(99));
        seed_accounting(&env, 100_000, 40_000, 60_000);
        seed_user(&env, user.clone(), 100_000, 40_000);

        let result = prepare_repay(&env, &request(user, asset, 10_000)).unwrap();
        assert!(result.requires_interest_accrual);
        assert_eq!(
            result.validation_status,
            VALIDATION_STATUS_REPAY_ALLOWED
                | VALIDATION_STATUS_ACCOUNTING_VALID
                | VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED
        );
    });
}

#[test]
fn test_no_interest_accrual_needed() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = prepare_repay(&env, &request(user, asset, 10_000)).unwrap();
        assert!(!result.requires_interest_accrual);
    });
}

#[test]
fn test_current_ledger_cannot_go_backwards() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let err = prepare_repay(&env, &request_at_ledger(user, asset, 10_000, 99));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
fn test_invalid_accounting_state_rejected_before_execution() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        let mut reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        reserve.total_actual_debt = Wad(41_000);
        write_reserve_accounting(&env, &reserve);

        let err = prepare_repay(&env, &request(user, asset, 10_000));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
fn test_successful_repay_execution() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = execute_repay(&env, &request(user.clone(), asset, 10_000)).unwrap();

        assert_eq!(result.actor, user.clone());
        assert_eq!(result.reserve_id, reserve_id());
        assert_eq!(result.requested_amount, Wad(10_000));
        assert_eq!(result.actual_repay_amount, Wad(10_000));
        assert_eq!(result.scaled_debt_burned, ScaledDebt(10_000));
        assert_eq!(result.borrow_index, Ray(RAY));
        assert_eq!(result.previous_scaled_debt, ScaledDebt(40_000));
        assert_eq!(result.updated_scaled_debt, ScaledDebt(30_000));
        assert_eq!(result.previous_liquidity, Wad(60_000));
        assert_eq!(result.updated_liquidity, Wad(70_000));
        assert_eq!(result.ledger, ledger(100));
        assert_eq!(result.event_name, String::from_str(&env, REPAY_COMPLETED));

        let reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        assert_eq!(reserve.total_actual_debt, Wad(30_000));
        assert_eq!(reserve.total_scaled_debt, ScaledDebt(30_000));
        assert_eq!(reserve.total_liquidity, Wad(70_000));
        assert_eq!(reserve.available_liquidity, Wad(70_000));

        let ledger_state = read_accounting_ledger(&env).unwrap();
        assert_eq!(ledger_state.total_assets, Wad(100_000));
        assert_eq!(ledger_state.total_liquidity, Wad(70_000));
        assert_eq!(ledger_state.total_scaled_debt, ScaledDebt(30_000));

        let snapshot = read_user_accounting_snapshot(&env, &user, reserve_id()).unwrap();
        assert_eq!(snapshot.scaled_debt, ScaledDebt(30_000));
        assert_eq!(env.events().all().events().len(), 1);
    });
}

#[test]
fn test_partial_repay_execution() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = execute_repay(&env, &request(user.clone(), asset, 15_000)).unwrap();

        assert_eq!(result.actual_repay_amount, Wad(15_000));
        assert_eq!(result.scaled_debt_burned, ScaledDebt(15_000));
        assert_eq!(result.updated_scaled_debt, ScaledDebt(25_000));
        assert_eq!(result.updated_liquidity, Wad(75_000));
        assert_eq!(
            read_user_accounting_snapshot(&env, &user, reserve_id())
                .unwrap()
                .scaled_debt,
            ScaledDebt(25_000)
        );
    });
}

#[test]
fn test_full_repay_execution() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = execute_repay(&env, &request(user.clone(), asset, 40_000)).unwrap();

        assert_eq!(result.actual_repay_amount, Wad(40_000));
        assert_eq!(result.scaled_debt_burned, ScaledDebt(40_000));
        assert_eq!(result.updated_scaled_debt, ScaledDebt(0));
        assert_eq!(result.updated_liquidity, Wad(100_000));

        let reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        assert_eq!(reserve.total_actual_debt, Wad(0));
        assert_eq!(reserve.total_scaled_debt, ScaledDebt(0));
        assert_eq!(
            read_user_accounting_snapshot(&env, &user, reserve_id())
                .unwrap()
                .scaled_debt,
            ScaledDebt(0)
        );
    });
}

#[test]
fn test_execute_over_repay_capped() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = execute_repay(&env, &request(user.clone(), asset, 100_000)).unwrap();

        assert_eq!(result.requested_amount, Wad(100_000));
        assert_eq!(result.actual_repay_amount, Wad(40_000));
        assert_eq!(result.scaled_debt_burned, ScaledDebt(40_000));
        assert_eq!(result.updated_scaled_debt, ScaledDebt(0));
        assert_eq!(
            read_user_accounting_snapshot(&env, &user, reserve_id())
                .unwrap()
                .scaled_debt,
            ScaledDebt(0)
        );
    });
}

#[test]
fn test_execute_no_debt_rejected() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        seed_user(&env, user.clone(), 100_000, 0);
        let before_reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        let before_ledger = read_accounting_ledger(&env).unwrap();
        let before_user = read_user_accounting_snapshot(&env, &user, reserve_id()).unwrap();

        let err = execute_repay(&env, &request(user.clone(), asset, 10_000));

        assert_eq!(err, Err(LendingError::NoDebtToRepay));
        assert_eq!(
            read_reserve_accounting(&env, reserve_id()).unwrap(),
            before_reserve
        );
        assert_eq!(read_accounting_ledger(&env).unwrap(), before_ledger);
        assert_eq!(
            read_user_accounting_snapshot(&env, &user, reserve_id()).unwrap(),
            before_user
        );
        assert_eq!(env.events().all().events().len(), 0);
    });
}

#[test]
fn test_scaled_debt_decreases_with_indexed_debt() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, ledger(100));
        seed_accounting_with_index(
            &env,
            100_000,
            80_000,
            20_000,
            ScaledDebt(40_000),
            Ray(RAY * 2),
        );
        seed_user(&env, user.clone(), 100_000, 40_000);

        let result = execute_repay(&env, &request(user.clone(), asset, 10_000)).unwrap();

        assert_eq!(result.scaled_debt_burned, ScaledDebt(5_000));
        assert_eq!(result.previous_scaled_debt, ScaledDebt(40_000));
        assert_eq!(result.updated_scaled_debt, ScaledDebt(35_000));
        assert_eq!(
            read_user_accounting_snapshot(&env, &user, reserve_id())
                .unwrap()
                .scaled_debt,
            ScaledDebt(35_000)
        );
    });
}

#[test]
fn test_liquidity_increases_on_repay() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = execute_repay(&env, &request(user, asset, 1_000)).unwrap();

        assert_eq!(result.previous_liquidity, Wad(60_000));
        assert_eq!(result.updated_liquidity, Wad(61_000));
        let reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        assert_eq!(reserve.total_liquidity, Wad(61_000));
        assert_eq!(reserve.available_liquidity, Wad(61_000));
    });
}

#[test]
fn test_full_repay_rounding_does_not_create_negative_debt() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, ledger(100));
        seed_accounting_with_index(&env, 100, 2, 98, ScaledDebt(1), Ray(RAY * 3 / 2));
        seed_user(&env, user.clone(), 100, 1);

        let result = execute_repay(&env, &request(user.clone(), asset, 100)).unwrap();

        assert_eq!(result.actual_repay_amount, Wad(2));
        assert_eq!(result.scaled_debt_burned, ScaledDebt(1));
        assert_eq!(result.updated_scaled_debt, ScaledDebt(0));

        let reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        assert_eq!(reserve.total_actual_debt, Wad(0));
        assert_eq!(reserve.total_scaled_debt, ScaledDebt(0));
        assert_eq!(
            read_user_accounting_snapshot(&env, &user, reserve_id())
                .unwrap()
                .scaled_debt,
            ScaledDebt(0)
        );
    });
}

#[test]
fn test_repay_completed_event_emitted() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = execute_repay(&env, &request(user, asset, 1_000)).unwrap();

        assert_eq!(result.event_name, String::from_str(&env, REPAY_COMPLETED));
        assert_eq!(env.events().all().events().len(), 1);
    });
}

#[test]
fn test_validation_failure_prevents_execution() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRepayContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        let before_reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        let before_ledger = read_accounting_ledger(&env).unwrap();
        let before_user = read_user_accounting_snapshot(&env, &user, reserve_id()).unwrap();

        let err = execute_repay(&env, &request(user.clone(), asset, 0));

        assert_eq!(err, Err(LendingError::InvalidAmount));
        assert_eq!(
            read_reserve_accounting(&env, reserve_id()).unwrap(),
            before_reserve
        );
        assert_eq!(read_accounting_ledger(&env).unwrap(), before_ledger);
        assert_eq!(
            read_user_accounting_snapshot(&env, &user, reserve_id()).unwrap(),
            before_user
        );
        assert_eq!(env.events().all().events().len(), 0);
    });
}
