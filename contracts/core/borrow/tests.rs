#![cfg(test)]
#![allow(deprecated)]

use crate::{
    execute_borrow, prepare_borrow, BorrowRequest, VALIDATION_STATUS_ACCOUNTING_VALID,
    VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED, VALIDATION_STATUS_RESERVE_ACTIVE,
    VALIDATION_STATUS_RISK_CHECK_REQUIRED,
};
use soroban_sdk::{
    contract, contractimpl,
    testutils::{Address as _, Events},
    Address, Env, String, Symbol,
};
use udonfi_accounting::{
    read_accounting_ledger, read_reserve_accounting, read_user_accounting_snapshot,
    write_accounting_ledger, write_reserve_accounting, write_user_accounting_snapshot,
    AccountingLedger, ReserveAccounting, UserAccountingSnapshot, ACCOUNTING_VERSION,
};
use udonfi_config_engine::{
    default_risk_config, default_validation_config, storage::write_latest_risk_config,
    storage::write_latest_validation_config, ValidationConfig,
};
use udonfi_pool_state::{storage::write_pool_state, Pool, ProtocolStatus};
use udonfi_reserve_registry::{storage::write_reserve, Reserve, ReserveStatus};
use udonfi_shared::{
    BasisPoints, LedgerSequence, LendingError, Ltv, Ray, ReserveFactor, ReserveId, ScaledBalance,
    ScaledDebt, Timestamp, Wad, BORROW_CREATED, RAY,
};

#[contract]
pub struct MockBorrowContract;

#[contractimpl]
impl MockBorrowContract {
    pub fn dummy(_env: Env) {}
}

fn ledger(value: u32) -> LedgerSequence {
    LedgerSequence(value)
}

fn reserve_id() -> ReserveId {
    ReserveId(0)
}

fn seed_pool(env: &Env, status: ProtocolStatus, paused: bool) {
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
            paused,
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

fn seed_config(env: &Env, min_borrow_amount: i128, max_transaction_amount: i128) {
    let mut validation: ValidationConfig = default_validation_config();
    validation.min_borrow_amount = Wad(min_borrow_amount);
    validation.max_transaction_amount = Wad(max_transaction_amount);
    write_latest_validation_config(env, &validation);
    write_latest_risk_config(env, &default_risk_config());
}

fn seed_reserve(
    env: &Env,
    status: ReserveStatus,
    borrow_cap: i128,
    last_accrual_ledger: LedgerSequence,
) -> Address {
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
            borrow_cap: Wad(borrow_cap),
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

fn seed_accounting(env: &Env, total_supply: i128, total_debt: i128, available_liquidity: i128) {
    let mut reserve = ReserveAccounting::new(reserve_id(), ledger(100));
    reserve.total_liquidity = Wad(available_liquidity);
    reserve.available_liquidity = Wad(available_liquidity);
    reserve.total_actual_supply = Wad(total_supply);
    reserve.total_scaled_supply = ScaledBalance(total_supply);
    reserve.total_actual_debt = Wad(total_debt);
    reserve.total_scaled_debt = ScaledDebt(total_debt);
    write_reserve_accounting(env, &reserve);

    let mut ledger_state = AccountingLedger::new(ledger(100));
    ledger_state.total_assets = Wad(total_supply);
    ledger_state.total_liabilities = Wad(total_supply);
    ledger_state.total_liquidity = Wad(available_liquidity);
    ledger_state.total_scaled_supply = ScaledBalance(total_supply);
    ledger_state.total_scaled_debt = ScaledDebt(total_debt);
    write_accounting_ledger(env, &ledger_state);
}

fn set_borrow_index(env: &Env, borrow_index: Ray) {
    let mut reserve = read_reserve_accounting(env, reserve_id()).unwrap();
    reserve.borrow_index = borrow_index;
    write_reserve_accounting(env, &reserve);
}

fn set_total_scaled_debt(env: &Env, scaled_debt: ScaledDebt) {
    let mut reserve = read_reserve_accounting(env, reserve_id()).unwrap();
    reserve.total_scaled_debt = scaled_debt;
    write_reserve_accounting(env, &reserve);

    let mut ledger_state = read_accounting_ledger(env).unwrap();
    ledger_state.total_scaled_debt = scaled_debt;
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
    seed_pool(env, ProtocolStatus::Active, false);
    seed_config(env, 1, 1_000_000);
    let asset = seed_reserve(env, ReserveStatus::Active, 100_000, ledger(100));
    seed_accounting(env, 100_000, 0, 100_000);
    seed_user(env, user, 100_000, 0);
    asset
}

fn request(actor: Address, asset: Address, amount: i128) -> BorrowRequest {
    request_at_ledger(actor, asset, amount, 100)
}

fn request_at_ledger(
    actor: Address,
    asset: Address,
    amount: i128,
    current_ledger: u32,
) -> BorrowRequest {
    BorrowRequest {
        actor,
        reserve_id: reserve_id(),
        asset_address: asset,
        amount: Wad(amount),
        current_ledger: ledger(current_ledger),
    }
}

#[test]
fn test_valid_borrow_preparation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        let before = read_reserve_accounting(&env, reserve_id()).unwrap();

        let result = prepare_borrow(&env, &request(user, asset, 50_000)).unwrap();

        assert!(result.is_valid);
        assert_eq!(result.reserve_id, reserve_id());
        assert_eq!(result.amount, Wad(50_000));
        assert_eq!(result.projected_total_borrow, Wad(50_000));
        assert_eq!(result.borrow_cap, Wad(100_000));
        assert_eq!(result.available_liquidity, Wad(100_000));
        assert!(!result.requires_interest_accrual);
        assert!(result.requires_risk_check);
        assert_eq!(
            result.validation_status,
            VALIDATION_STATUS_RESERVE_ACTIVE
                | VALIDATION_STATUS_ACCOUNTING_VALID
                | VALIDATION_STATUS_RISK_CHECK_REQUIRED
        );
        assert_eq!(read_reserve_accounting(&env, reserve_id()).unwrap(), before);
    });
}

#[test]
fn test_protocol_paused_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        seed_pool(&env, ProtocolStatus::Active, true);

        let err = prepare_borrow(&env, &request(user, asset, 1));
        assert_eq!(err, Err(LendingError::Paused));
    });
}

#[test]
fn test_missing_reserve_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        let asset = Address::generate(&env);

        let err = prepare_borrow(&env, &request(user, asset, 1));
        assert_eq!(err, Err(LendingError::ReserveNotFound));
    });
}

#[test]
fn test_frozen_reserve_borrow_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        let asset = seed_reserve(&env, ReserveStatus::Frozen, 100_000, ledger(100));

        let err = prepare_borrow(&env, &request(user, asset, 1));
        assert_eq!(err, Err(LendingError::ReserveFrozen));
    });
}

#[test]
fn test_paused_reserve_borrow_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        let asset = seed_reserve(&env, ReserveStatus::Paused, 100_000, ledger(100));

        let err = prepare_borrow(&env, &request(user, asset, 1));
        assert_eq!(err, Err(LendingError::ReservePaused));
    });
}

#[test]
fn test_deprecated_reserve_borrow_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        let asset = seed_reserve(&env, ReserveStatus::Deprecated, 100_000, ledger(100));

        let err = prepare_borrow(&env, &request(user, asset, 1));
        assert_eq!(err, Err(LendingError::ReserveNotActive));
    });
}

#[test]
fn test_zero_amount_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let err = prepare_borrow(&env, &request(user, asset, 0));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
fn test_below_minimum_amount_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        seed_config(&env, 100, 1_000_000);

        let err = prepare_borrow(&env, &request(user, asset, 99));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
fn test_above_max_transaction_amount_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        seed_config(&env, 1, 1_000);

        let err = prepare_borrow(&env, &request(user, asset, 1_001));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
fn test_insufficient_liquidity_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, 200_000, ledger(100));
        seed_accounting(&env, 100_000, 90_000, 10_000);
        seed_user(&env, user.clone(), 100_000, 0);

        let err = prepare_borrow(&env, &request(user, asset, 20_000));
        assert_eq!(err, Err(LendingError::InsufficientLiquidity));
    });
}

#[test]
fn test_borrow_cap_exceeded_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, 100_000, ledger(100));
        seed_accounting(&env, 190_000, 90_000, 100_000);
        seed_user(&env, user.clone(), 190_000, 0);

        let err = prepare_borrow(&env, &request(user, asset, 20_000));
        assert_eq!(err, Err(LendingError::BorrowCapViolation));
    });
}

#[test]
fn test_interest_accrual_required() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, 100_000, ledger(99));
        seed_accounting(&env, 100_000, 0, 100_000);
        seed_user(&env, user.clone(), 100_000, 0);

        let result = prepare_borrow(&env, &request(user, asset, 50_000)).unwrap();
        assert!(result.requires_interest_accrual);
        assert_eq!(
            result.validation_status,
            VALIDATION_STATUS_RESERVE_ACTIVE
                | VALIDATION_STATUS_ACCOUNTING_VALID
                | VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED
                | VALIDATION_STATUS_RISK_CHECK_REQUIRED
        );
    });
}

#[test]
fn test_current_ledger_cannot_go_backwards() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let err = prepare_borrow(&env, &request_at_ledger(user, asset, 1, 99));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
fn test_risk_check_required() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = prepare_borrow(&env, &request(user, asset, 1)).unwrap();
        assert!(result.requires_risk_check);
        assert_eq!(
            result.validation_status & VALIDATION_STATUS_RISK_CHECK_REQUIRED,
            VALIDATION_STATUS_RISK_CHECK_REQUIRED
        );
    });
}

#[test]
fn test_unhealthy_borrow_rejected_by_risk_engine() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, 1_000_000, ledger(100));
        seed_accounting(&env, 1_000, 800, 200);
        seed_user(&env, user.clone(), 1_000, 800);

        let err = prepare_borrow(&env, &request(user, asset, 100));
        assert_eq!(err, Err(LendingError::HFTooLow));
    });
}

#[test]
fn test_successful_borrow_execution() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = execute_borrow(&env, &request(user.clone(), asset, 50_000)).unwrap();

        assert_eq!(result.actor, user.clone());
        assert_eq!(result.reserve_id, reserve_id());
        assert_eq!(result.amount, Wad(50_000));
        assert_eq!(result.scaled_debt_minted, ScaledDebt(50_000));
        assert_eq!(result.borrow_index, Ray(RAY));
        assert_eq!(result.previous_total_liquidity, Wad(100_000));
        assert_eq!(result.updated_total_liquidity, Wad(50_000));
        assert_eq!(result.previous_scaled_debt, ScaledDebt(0));
        assert_eq!(result.updated_scaled_debt, ScaledDebt(50_000));
        assert_eq!(result.ledger, ledger(100));
        assert_eq!(result.accounting_version, ACCOUNTING_VERSION);
        assert_eq!(result.event_name, String::from_str(&env, BORROW_CREATED));

        let reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        assert_eq!(reserve.total_liquidity, Wad(50_000));
        assert_eq!(reserve.available_liquidity, Wad(50_000));
        assert_eq!(reserve.total_actual_debt, Wad(50_000));
        assert_eq!(reserve.total_scaled_debt, ScaledDebt(50_000));

        let ledger_state = read_accounting_ledger(&env).unwrap();
        assert_eq!(ledger_state.total_assets, Wad(100_000));
        assert_eq!(ledger_state.total_liquidity, Wad(50_000));
        assert_eq!(ledger_state.total_scaled_debt, ScaledDebt(50_000));

        let user_snapshot = read_user_accounting_snapshot(&env, &user, reserve_id()).unwrap();
        assert_eq!(user_snapshot.scaled_debt, ScaledDebt(50_000));
    });
}

#[test]
fn test_validation_failure_prevents_execution() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        let before_reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        let before_ledger = read_accounting_ledger(&env).unwrap();
        let before_user = read_user_accounting_snapshot(&env, &user, reserve_id()).unwrap();

        let err = execute_borrow(&env, &request(user.clone(), asset, 200_000));

        assert_eq!(err, Err(LendingError::InsufficientLiquidity));
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
fn test_scaled_debt_mint_calculation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        set_borrow_index(&env, Ray(RAY * 2));

        let result = execute_borrow(&env, &request(user, asset, 50)).unwrap();

        assert_eq!(result.borrow_index, Ray(RAY * 2));
        assert_eq!(result.scaled_debt_minted, ScaledDebt(25));
        assert_eq!(result.updated_scaled_debt, ScaledDebt(25));
    });
}

#[test]
fn test_debt_rounds_up() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        set_borrow_index(&env, Ray(RAY * 3));

        let result = execute_borrow(&env, &request(user.clone(), asset, 10)).unwrap();

        assert_eq!(result.scaled_debt_minted, ScaledDebt(4));
        let user_snapshot = read_user_accounting_snapshot(&env, &user, reserve_id()).unwrap();
        assert_eq!(user_snapshot.scaled_debt, ScaledDebt(4));
    });
}

#[test]
fn test_execute_insufficient_liquidity_rejected() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, 200_000, ledger(100));
        seed_accounting(&env, 100_000, 90_000, 10_000);
        seed_user(&env, user.clone(), 100_000, 0);

        let err = execute_borrow(&env, &request(user, asset, 20_000));
        assert_eq!(err, Err(LendingError::InsufficientLiquidity));
        assert_eq!(env.events().all().events().len(), 0);
    });
}

#[test]
fn test_execute_borrow_cap_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, 100_000, ledger(100));
        seed_accounting(&env, 190_000, 90_000, 100_000);
        seed_user(&env, user.clone(), 190_000, 0);

        let err = execute_borrow(&env, &request(user, asset, 20_000));
        assert_eq!(err, Err(LendingError::BorrowCapViolation));
        assert_eq!(env.events().all().events().len(), 0);
    });
}

#[test]
fn test_liquidity_decrease() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = execute_borrow(&env, &request(user, asset, 1_000)).unwrap();

        assert_eq!(result.previous_total_liquidity, Wad(100_000));
        assert_eq!(result.updated_total_liquidity, Wad(99_000));
        let reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        assert_eq!(reserve.available_liquidity, Wad(99_000));
    });
}

#[test]
fn test_scaled_debt_increase() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = execute_borrow(&env, &request(user.clone(), asset, 1_000)).unwrap();

        assert_eq!(result.previous_scaled_debt, ScaledDebt(0));
        assert_eq!(result.updated_scaled_debt, ScaledDebt(1_000));
        let reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        assert_eq!(reserve.total_scaled_debt, ScaledDebt(1_000));
        let user_snapshot = read_user_accounting_snapshot(&env, &user, reserve_id()).unwrap();
        assert_eq!(user_snapshot.scaled_debt, ScaledDebt(1_000));
    });
}

#[test]
fn test_borrow_created_event_emitted() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = execute_borrow(&env, &request(user, asset, 1_000)).unwrap();

        assert_eq!(result.event_name, String::from_str(&env, BORROW_CREATED));
        assert_eq!(env.events().all().events().len(), 1);
    });
}

#[test]
fn test_overflow_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());
        set_total_scaled_debt(&env, ScaledDebt(i128::MAX));
        let before_reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        let before_ledger = read_accounting_ledger(&env).unwrap();

        let err = execute_borrow(&env, &request(user, asset, 1));

        assert_eq!(err, Err(LendingError::MathOverflow));
        assert_eq!(
            read_reserve_accounting(&env, reserve_id()).unwrap(),
            before_reserve
        );
        assert_eq!(read_accounting_ledger(&env).unwrap(), before_ledger);
        assert_eq!(env.events().all().events().len(), 0);
    });
}

#[test]
fn test_ledger_metadata_update() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockBorrowContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone());

        let result = execute_borrow(&env, &request_at_ledger(user, asset, 1_000, 105)).unwrap();

        assert_eq!(result.ledger, ledger(105));
        assert_eq!(result.accounting_version, ACCOUNTING_VERSION);
        assert_eq!(
            read_reserve_accounting(&env, reserve_id())
                .unwrap()
                .last_updated_ledger,
            ledger(105)
        );
        assert_eq!(
            read_accounting_ledger(&env).unwrap().last_updated_ledger,
            ledger(105)
        );
    });
}
