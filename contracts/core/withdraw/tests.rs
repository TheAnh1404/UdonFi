#![cfg(test)]
#![allow(deprecated)]

use crate::flow::{
    execute_withdraw, prepare_withdraw, read_user_accounting_snapshot,
    write_user_accounting_snapshot,
};
use crate::model::{
    WithdrawRequest, VALIDATION_STATUS_ACCOUNTING_VALID,
    VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED, VALIDATION_STATUS_RESERVE_ACTIVE,
    VALIDATION_STATUS_RISK_CHECK_REQUIRED,
};
use soroban_sdk::{
    contract, contractimpl,
    testutils::{Address as _, Events},
    Address, Env, String, Symbol,
};
use udonfi_accounting::{
    actual_supply_to_scaled, read_accounting_ledger, read_reserve_accounting,
    write_accounting_ledger, write_reserve_accounting, AccountingLedger, ReserveAccounting,
    UserAccountingSnapshot, ACCOUNTING_VERSION,
};
use udonfi_config_engine::{default_validation_config, storage::write_latest_validation_config};
use udonfi_pool_state::{storage::write_pool_state, Pool, ProtocolStatus};
use udonfi_reserve_registry::{storage::write_reserve, Reserve, ReserveStatus};
use udonfi_shared::{
    empty_event_id, BasisPoints, LedgerSequence, LendingError, Ltv, Ray, ReserveFactor, ReserveId,
    ScaledBalance, ScaledDebt, Timestamp, Wad, RAY, WITHDRAW_COMPLETED,
};

#[contract]
pub struct MockWithdrawContract;

#[contractimpl]
impl MockWithdrawContract {
    pub fn dummy(_env: Env) {}
}

fn ledger(value: u32) -> LedgerSequence {
    LedgerSequence(value)
}

fn reserve_id() -> ReserveId {
    ReserveId(0)
}

fn seed_pool(env: &Env, status: ProtocolStatus, paused: bool) -> (Address, Address) {
    let admin = Address::generate(env);
    let guardian = Address::generate(env);
    let now = Timestamp(env.ledger().timestamp());
    let pool = Pool {
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
        guardian: guardian.clone(),
        admin: admin.clone(),
        treasury_address: Address::generate(env),
        insurance_fund_address: Address::generate(env),
        created_at: now,
        updated_at: now,
        initialized_at: now,
        current_config_version: 1,
    };
    write_pool_state(env, &pool);
    (admin, guardian)
}

fn seed_validation_config(env: &Env, dust_threshold: i128, max_transaction: i128) {
    let mut config = default_validation_config();
    config.dust_threshold = Wad(dust_threshold);
    config.max_transaction_amount = Wad(max_transaction);
    write_latest_validation_config(env, &config);
}

fn seed_reserve(
    env: &Env,
    status: ReserveStatus,
    supply_cap: i128,
    last_accrual_ledger: LedgerSequence,
) -> Address {
    let asset = Address::generate(env);
    let now = Timestamp(env.ledger().timestamp());
    let reserve = Reserve {
        reserve_id: reserve_id(),
        asset_address: asset.clone(),
        asset_symbol: Symbol::new(env, "USDC"),
        asset_decimals: 6,
        reserve_status: status,
        supply_cap: Wad(supply_cap),
        borrow_cap: Wad(0),
        reserve_factor: ReserveFactor(1_000),
        max_ltv: Ltv(8_000),
        liquidation_threshold: BasisPoints(8_500),
        liquidation_bonus: BasisPoints(500),
        borrow_index: Ray(RAY),
        supply_index: Ray(RAY),
        last_accrual_ledger,
        created_at: now,
        updated_at: now,
    };
    write_reserve(env, &reserve);
    asset
}

fn seed_accounting_with_index(
    env: &Env,
    current_liquidity: i128,
    last_updated_ledger: LedgerSequence,
    supply_index: Ray,
) {
    let scaled_supply = actual_supply_to_scaled(Wad(current_liquidity), supply_index).unwrap();
    let mut accounting = ReserveAccounting::new(reserve_id(), last_updated_ledger);
    accounting.total_liquidity = Wad(current_liquidity);
    accounting.available_liquidity = Wad(current_liquidity);
    accounting.total_actual_supply = Wad(current_liquidity);
    accounting.total_scaled_supply = scaled_supply;
    accounting.supply_index = supply_index;
    write_reserve_accounting(env, &accounting);

    let mut ledger_state = AccountingLedger::new(last_updated_ledger);
    ledger_state.total_assets = Wad(current_liquidity);
    ledger_state.total_liabilities = Wad(current_liquidity);
    ledger_state.total_liquidity = Wad(current_liquidity);
    ledger_state.total_scaled_supply = scaled_supply;
    write_accounting_ledger(env, &ledger_state);
}

fn seed_accounting(env: &Env, current_liquidity: i128, last_updated_ledger: LedgerSequence) {
    seed_accounting_with_index(env, current_liquidity, last_updated_ledger, Ray(RAY));
}

fn seed_user_snapshot(
    env: &Env,
    user: Address,
    reserve_id: ReserveId,
    scaled_supply: i128,
    scaled_debt: i128,
    collateral_enabled: bool,
    last_updated_ledger: LedgerSequence,
) {
    let snapshot = UserAccountingSnapshot {
        user,
        reserve_id,
        scaled_supply: ScaledBalance(scaled_supply),
        scaled_debt: ScaledDebt(scaled_debt),
        collateral_enabled,
        last_updated_ledger,
    };
    write_user_accounting_snapshot(env, &snapshot);
}

fn request(
    _env: &Env,
    actor: Address,
    asset: Address,
    amount: i128,
    current_ledger: u32,
) -> WithdrawRequest {
    WithdrawRequest {
        actor,
        reserve_id: reserve_id(),
        asset_address: asset,
        amount: Wad(amount),
        current_ledger: ledger(current_ledger),
    }
}

fn seed_valid_state(
    env: &Env,
    user: Address,
    reserve_last_accrual: u32,
    accounting_last_updated: u32,
    user_supply: i128,
) -> Address {
    seed_pool(env, ProtocolStatus::Active, false);
    seed_validation_config(env, 10, 1_000_000);
    let asset = seed_reserve(
        env,
        ReserveStatus::Active,
        1_000_000,
        ledger(reserve_last_accrual),
    );
    seed_accounting(env, 100_000, ledger(accounting_last_updated));
    seed_user_snapshot(
        env,
        user,
        reserve_id(),
        user_supply,
        0,
        false,
        ledger(accounting_last_updated),
    );
    asset
}

#[test]
fn test_valid_withdraw_preparation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone(), 100, 100, 50_000);

        let req = request(&env, user, asset, 20_000, 100);
        let res = prepare_withdraw(&env, &req).unwrap();

        assert!(res.is_valid);
        assert_eq!(res.reserve_id, reserve_id());
        assert_eq!(res.amount, Wad(20_000));
        assert_eq!(res.scaled_supply_to_burn, ScaledBalance(20_000));
        assert_eq!(res.available_supply, Wad(50_000));
        assert_eq!(res.available_liquidity, Wad(100_000));
        assert!(!res.requires_interest_accrual);
        assert!(!res.requires_risk_check);
        assert_eq!(
            res.validation_status,
            VALIDATION_STATUS_RESERVE_ACTIVE | VALIDATION_STATUS_ACCOUNTING_VALID
        );
    });
}

#[test]
fn test_successful_withdraw_execution_updates_accounting_and_emits_event() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone(), 100, 100, 50_000);
        let req = request(&env, user.clone(), asset, 20_000, 100);

        let result = execute_withdraw(&env, &req).unwrap();

        assert_eq!(result.actor, user.clone());
        assert_eq!(result.reserve_id, reserve_id());
        assert_eq!(result.amount, Wad(20_000));
        assert_eq!(result.scaled_supply_burned, ScaledBalance(20_000));
        assert_eq!(result.previous_total_liquidity, Wad(100_000));
        assert_eq!(result.updated_total_liquidity, Wad(80_000));
        assert_eq!(result.previous_scaled_supply, ScaledBalance(100_000));
        assert_eq!(result.updated_scaled_supply, ScaledBalance(80_000));
        assert_eq!(result.previous_user_scaled_supply, ScaledBalance(50_000));
        assert_eq!(result.updated_user_scaled_supply, ScaledBalance(30_000));
        assert_eq!(
            result.previous_reserve_scaled_supply,
            ScaledBalance(100_000)
        );
        assert_eq!(result.updated_reserve_scaled_supply, ScaledBalance(80_000));
        assert_eq!(result.ledger, ledger(100));
        assert_eq!(result.accounting_version, ACCOUNTING_VERSION);
        assert_eq!(
            result.event_name,
            String::from_str(&env, WITHDRAW_COMPLETED)
        );
        assert_eq!(result.event_id, empty_event_id(&env));

        let reserve_accounting = read_reserve_accounting(&env, reserve_id()).unwrap();
        assert_eq!(reserve_accounting.total_liquidity, Wad(80_000));
        assert_eq!(reserve_accounting.available_liquidity, Wad(80_000));
        assert_eq!(reserve_accounting.total_actual_supply, Wad(80_000));
        assert_eq!(
            reserve_accounting.total_scaled_supply,
            ScaledBalance(80_000)
        );
        assert_eq!(reserve_accounting.last_updated_ledger, ledger(100));

        let ledger_accounting = read_accounting_ledger(&env).unwrap();
        assert_eq!(ledger_accounting.total_assets, Wad(80_000));
        assert_eq!(ledger_accounting.total_liabilities, Wad(80_000));
        assert_eq!(ledger_accounting.total_liquidity, Wad(80_000));
        assert_eq!(ledger_accounting.total_scaled_supply, ScaledBalance(80_000));
        assert_eq!(ledger_accounting.last_updated_ledger, ledger(100));

        let snapshot = read_user_accounting_snapshot(&env, &user, reserve_id()).unwrap();
        assert_eq!(snapshot.scaled_supply, ScaledBalance(30_000));
        assert_eq!(snapshot.last_updated_ledger, ledger(100));
        assert_eq!(env.events().all().events().len(), 1);
    });
}

#[test]
fn test_scaled_supply_burn_uses_current_supply_index_and_rounds_down() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_validation_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, 1_000_000, ledger(100));
        let supply_index = Ray(RAY * 3);
        seed_accounting_with_index(&env, 99_000, ledger(100), supply_index);
        seed_user_snapshot(
            &env,
            user.clone(),
            reserve_id(),
            33_000,
            0,
            false,
            ledger(100),
        );

        let result = execute_withdraw(&env, &request(&env, user.clone(), asset, 10, 100)).unwrap();

        assert_eq!(result.supply_index, supply_index);
        assert_eq!(result.scaled_supply_burned, ScaledBalance(3));
        assert_eq!(
            result.scaled_supply_burned,
            actual_supply_to_scaled(Wad(10), supply_index).unwrap()
        );
        assert_eq!(result.previous_scaled_supply, ScaledBalance(33_000));
        assert_eq!(result.updated_scaled_supply, ScaledBalance(32_997));
        assert_eq!(result.previous_user_scaled_supply, ScaledBalance(33_000));
        assert_eq!(result.updated_user_scaled_supply, ScaledBalance(32_997));

        let reserve_accounting = read_reserve_accounting(&env, reserve_id()).unwrap();
        assert_eq!(reserve_accounting.total_actual_supply, Wad(98_990));
        assert_eq!(
            reserve_accounting.total_scaled_supply,
            ScaledBalance(32_997)
        );
        let snapshot = read_user_accounting_snapshot(&env, &user, reserve_id()).unwrap();
        assert_eq!(snapshot.scaled_supply, ScaledBalance(32_997));
    });
}

#[test]
fn test_zero_scaled_supply_burn_is_rejected_without_mutation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_validation_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, 1_000_000, ledger(100));
        let supply_index = Ray(RAY * 2);
        seed_accounting_with_index(&env, 100_000, ledger(100), supply_index);
        seed_user_snapshot(
            &env,
            user.clone(),
            reserve_id(),
            50_000,
            0,
            false,
            ledger(100),
        );
        let previous_reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        let previous_ledger = read_accounting_ledger(&env).unwrap();

        let err = execute_withdraw(&env, &request(&env, user, asset, 1, 100));

        assert_eq!(err, Err(LendingError::InvalidAmount));
        assert_eq!(
            read_reserve_accounting(&env, reserve_id()).unwrap(),
            previous_reserve
        );
        assert_eq!(read_accounting_ledger(&env).unwrap(), previous_ledger);
        assert_eq!(env.events().all().events().len(), 0);
    });
}

#[test]
fn test_execute_withdraw_rejects_over_withdraw_without_mutation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone(), 100, 100, 10_000);
        let previous_reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        let previous_ledger = read_accounting_ledger(&env).unwrap();

        let err = execute_withdraw(&env, &request(&env, user, asset, 20_000, 100));

        assert_eq!(err, Err(LendingError::InsufficientCollateral));
        assert_eq!(
            read_reserve_accounting(&env, reserve_id()).unwrap(),
            previous_reserve
        );
        assert_eq!(read_accounting_ledger(&env).unwrap(), previous_ledger);
        assert_eq!(env.events().all().events().len(), 0);
    });
}

#[test]
fn test_execute_withdraw_rejects_insufficient_scaled_supply_without_mutation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_validation_config(&env, 1, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, 1_000_000, ledger(100));
        let supply_index = Ray(RAY * 2);
        seed_accounting_with_index(&env, 100_000, ledger(100), supply_index);
        seed_user_snapshot(&env, user.clone(), reserve_id(), 4, 0, false, ledger(100));
        let previous_reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        let previous_ledger = read_accounting_ledger(&env).unwrap();

        let err = execute_withdraw(&env, &request(&env, user, asset, 10, 100));

        assert_eq!(err, Err(LendingError::InsufficientCollateral));
        assert_eq!(
            read_reserve_accounting(&env, reserve_id()).unwrap(),
            previous_reserve
        );
        assert_eq!(read_accounting_ledger(&env).unwrap(), previous_ledger);
        assert_eq!(env.events().all().events().len(), 0);
    });
}

#[test]
fn test_execute_withdraw_rejects_insufficient_liquidity_without_mutation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone(), 100, 100, 200_000);
        let previous_reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        let previous_ledger = read_accounting_ledger(&env).unwrap();

        let err = execute_withdraw(&env, &request(&env, user, asset, 150_000, 100));

        assert_eq!(err, Err(LendingError::InsufficientLiquidity));
        assert_eq!(
            read_reserve_accounting(&env, reserve_id()).unwrap(),
            previous_reserve
        );
        assert_eq!(read_accounting_ledger(&env).unwrap(), previous_ledger);
        assert_eq!(env.events().all().events().len(), 0);
    });
}

#[test]
fn test_execute_withdraw_updates_ledger_metadata() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone(), 125, 100, 50_000);

        let result =
            execute_withdraw(&env, &request(&env, user.clone(), asset, 20_000, 125)).unwrap();

        assert_eq!(result.ledger, ledger(125));
        let reserve_accounting = read_reserve_accounting(&env, reserve_id()).unwrap();
        assert_eq!(reserve_accounting.last_updated_ledger, ledger(125));
        let ledger_accounting = read_accounting_ledger(&env).unwrap();
        assert_eq!(ledger_accounting.last_updated_ledger, ledger(125));
        let snapshot = read_user_accounting_snapshot(&env, &user, reserve_id()).unwrap();
        assert_eq!(snapshot.last_updated_ledger, ledger(125));
    });
}

#[test]
fn test_execute_withdraw_rejects_scaled_conversion_overflow_without_mutation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_validation_config(&env, 1, i128::MAX);
        let asset = seed_reserve(&env, ReserveStatus::Active, i128::MAX, ledger(100));

        let mut reserve_accounting = ReserveAccounting::new(reserve_id(), ledger(100));
        reserve_accounting.total_liquidity = Wad(i128::MAX);
        reserve_accounting.available_liquidity = Wad(i128::MAX);
        reserve_accounting.total_actual_supply = Wad(i128::MAX);
        reserve_accounting.total_scaled_supply = ScaledBalance(i128::MAX);
        reserve_accounting.supply_index = Ray(1);
        write_reserve_accounting(&env, &reserve_accounting);

        let mut ledger_accounting = AccountingLedger::new(ledger(100));
        ledger_accounting.total_assets = Wad(i128::MAX);
        ledger_accounting.total_liabilities = Wad(i128::MAX);
        ledger_accounting.total_liquidity = Wad(i128::MAX);
        ledger_accounting.total_scaled_supply = ScaledBalance(i128::MAX);
        write_accounting_ledger(&env, &ledger_accounting);
        seed_user_snapshot(
            &env,
            user.clone(),
            reserve_id(),
            i128::MAX,
            0,
            false,
            ledger(100),
        );

        let err = execute_withdraw(&env, &request(&env, user, asset, i128::MAX, 100));

        assert_eq!(err, Err(LendingError::MathOverflow));
        assert_eq!(
            read_reserve_accounting(&env, reserve_id()).unwrap(),
            reserve_accounting
        );
        assert_eq!(read_accounting_ledger(&env).unwrap(), ledger_accounting);
        assert_eq!(env.events().all().events().len(), 0);
    });
}

#[test]
fn test_rejected_when_amount_is_zero() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone(), 100, 100, 50_000);

        let req = request(&env, user, asset, 0, 100);
        let res = prepare_withdraw(&env, &req);
        assert_eq!(res.unwrap_err(), LendingError::InvalidAmount);
    });
}

#[test]
fn test_rejected_when_amount_below_minimum() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone(), 100, 100, 50_000);

        // dust_threshold is seeded as 10. Withdraw 5.
        let req = request(&env, user, asset, 5, 100);
        let res = prepare_withdraw(&env, &req);
        assert_eq!(res.unwrap_err(), LendingError::InvalidAmount);
    });
}

#[test]
fn test_rejected_when_amount_exceeds_max_transaction_amount() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone(), 100, 100, 50_000);

        // max_transaction_amount is seeded as 1_000_000. Withdraw 2_000_000.
        let req = request(&env, user, asset, 2_000_000, 100);
        let res = prepare_withdraw(&env, &req);
        assert_eq!(res.unwrap_err(), LendingError::InvalidAmount);
    });
}

#[test]
fn test_rejected_when_protocol_paused() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone(), 100, 100, 50_000);
        seed_pool(&env, ProtocolStatus::Active, true); // global pause

        let req = request(&env, user, asset, 20_000, 100);
        let res = prepare_withdraw(&env, &req);
        assert_eq!(res.unwrap_err(), LendingError::Paused);
    });
}

#[test]
fn test_rejected_when_reserve_missing() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_validation_config(&env, 10, 1_000_000);

        let req = request(&env, user, asset, 20_000, 100);
        let res = prepare_withdraw(&env, &req);
        assert_eq!(res.unwrap_err(), LendingError::ReserveNotFound);
    });
}

#[test]
fn test_frozen_reserve_withdraw_allowed() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_validation_config(&env, 10, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Frozen, 1_000_000, ledger(100));
        seed_accounting(&env, 100_000, ledger(100));
        seed_user_snapshot(
            &env,
            user.clone(),
            reserve_id(),
            50_000,
            0,
            false,
            ledger(100),
        );

        let req = request(&env, user, asset, 20_000, 100);
        let res = prepare_withdraw(&env, &req).unwrap();
        assert!(res.is_valid);
    });
}

#[test]
fn test_paused_reserve_withdraw_allowed() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_validation_config(&env, 10, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Paused, 1_000_000, ledger(100));
        seed_accounting(&env, 100_000, ledger(100));
        seed_user_snapshot(
            &env,
            user.clone(),
            reserve_id(),
            50_000,
            0,
            false,
            ledger(100),
        );

        let req = request(&env, user, asset, 20_000, 100);
        let res = prepare_withdraw(&env, &req).unwrap();
        assert!(res.is_valid);
    });
}

#[test]
fn test_deprecated_reserve_safe_exit_allowed() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_validation_config(&env, 10, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Deprecated, 1_000_000, ledger(100));
        seed_accounting(&env, 100_000, ledger(100));
        seed_user_snapshot(
            &env,
            user.clone(),
            reserve_id(),
            50_000,
            0,
            false,
            ledger(100),
        );

        let req = request(&env, user, asset, 20_000, 100);
        let res = prepare_withdraw(&env, &req).unwrap();
        assert!(res.is_valid);
    });
}

#[test]
fn test_insufficient_user_supply_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone(), 100, 100, 10_000); // user only has 10_000

        let req = request(&env, user, asset, 20_000, 100); // requests 20_000
        let res = prepare_withdraw(&env, &req);
        assert_eq!(res.unwrap_err(), LendingError::InsufficientCollateral);
    });
}

#[test]
fn test_insufficient_available_liquidity_rejection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone(), 100, 100, 200_000);
        // User has 200_000, but pool only has 100_000 liquidity (seeded in seed_accounting)

        let req = request(&env, user, asset, 150_000, 100);
        let res = prepare_withdraw(&env, &req);
        assert_eq!(res.unwrap_err(), LendingError::InsufficientLiquidity);
    });
}

#[test]
fn test_interest_accrual_required_flag() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone(), 100, 100, 50_000);

        let req = request(&env, user, asset, 20_000, 105); // ledger 105 > 100 (requires interest accrual)
        let res = prepare_withdraw(&env, &req).unwrap();

        assert!(res.requires_interest_accrual);
        assert_eq!(
            res.validation_status,
            VALIDATION_STATUS_RESERVE_ACTIVE
                | VALIDATION_STATUS_ACCOUNTING_VALID
                | VALIDATION_STATUS_INTEREST_ACCRUAL_REQUIRED
        );
    });
}

#[test]
fn test_risk_check_required_when_user_has_debt() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_validation_config(&env, 10, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, 1_000_000, ledger(100));
        seed_accounting(&env, 100_000, ledger(100));
        // User has 50_000 supply and 10_000 debt
        seed_user_snapshot(
            &env,
            user.clone(),
            reserve_id(),
            50_000,
            10_000,
            false,
            ledger(100),
        );

        let req = request(&env, user, asset, 20_000, 100);
        let res = prepare_withdraw(&env, &req).unwrap();

        assert!(res.requires_risk_check);
        assert_eq!(
            res.validation_status,
            VALIDATION_STATUS_RESERVE_ACTIVE
                | VALIDATION_STATUS_ACCOUNTING_VALID
                | VALIDATION_STATUS_RISK_CHECK_REQUIRED
        );
    });
}

#[test]
fn test_risk_check_required_when_collateral_enabled() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_pool(&env, ProtocolStatus::Active, false);
        seed_validation_config(&env, 10, 1_000_000);
        let asset = seed_reserve(&env, ReserveStatus::Active, 1_000_000, ledger(100));
        seed_accounting(&env, 100_000, ledger(100));
        // User has 50_000 supply, 0 debt, but collateral_enabled = true
        seed_user_snapshot(
            &env,
            user.clone(),
            reserve_id(),
            50_000,
            0,
            true,
            ledger(100),
        );

        let req = request(&env, user, asset, 20_000, 100);
        let res = prepare_withdraw(&env, &req).unwrap();

        assert!(res.requires_risk_check);
        assert_eq!(
            res.validation_status,
            VALIDATION_STATUS_RESERVE_ACTIVE
                | VALIDATION_STATUS_ACCOUNTING_VALID
                | VALIDATION_STATUS_RISK_CHECK_REQUIRED
        );
    });
}

#[test]
fn test_current_ledger_cannot_go_backwards() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockWithdrawContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        let asset = seed_valid_state(&env, user.clone(), 100, 100, 50_000);

        let req = request(&env, user, asset, 20_000, 95); // ledger 95 < 100
        let res = prepare_withdraw(&env, &req);
        assert_eq!(res.unwrap_err(), LendingError::InvalidAmount);
    });
}
