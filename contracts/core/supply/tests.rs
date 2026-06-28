#![cfg(test)]

use crate::flow::prepare_deposit;
use crate::model::{
    DepositRequest, VALIDATION_FLAG_ACCOUNTING_VALID, VALIDATION_FLAG_INTEREST_ACCRUAL_REQUIRED,
    VALIDATION_FLAG_RESERVE_ACTIVE,
};
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env, String, Symbol};
use udonfi_accounting::{write_reserve_accounting, ReserveAccounting};
use udonfi_config_engine::{default_validation_config, storage::write_latest_validation_config};
use udonfi_pool_state::{storage::write_pool_state, Pool, ProtocolStatus};
use udonfi_reserve_registry::{storage::write_reserve, Reserve, ReserveStatus};
use udonfi_shared::{
    BasisPoints, LedgerSequence, LendingError, Ltv, Ray, ReserveFactor, ReserveId, Timestamp, Wad,
    RAY,
};

#[contract]
pub struct MockSupplyContract;

#[contractimpl]
impl MockSupplyContract {
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

fn seed_validation_config(env: &Env, min_deposit: i128, max_transaction: i128) {
    let mut config = default_validation_config();
    config.min_deposit_amount = Wad(min_deposit);
    config.max_transaction_amount = Wad(max_transaction);
    config.dust_threshold = Wad(1);
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

fn seed_accounting(env: &Env, current_supply: i128, last_updated_ledger: LedgerSequence) {
    let mut accounting = ReserveAccounting::new(reserve_id(), last_updated_ledger);
    accounting.total_liquidity = Wad(current_supply);
    accounting.available_liquidity = Wad(current_supply);
    accounting.total_actual_supply = Wad(current_supply);
    accounting.total_scaled_supply = udonfi_shared::ScaledBalance(current_supply);
    write_reserve_accounting(env, &accounting);
}

fn request(env: &Env, asset: Address, amount: i128, current_ledger: u32) -> DepositRequest {
    DepositRequest {
        actor: Address::generate(env),
        reserve_id: reserve_id(),
        asset_address: asset,
        amount: Wad(amount),
        current_ledger: ledger(current_ledger),
        referral_code: None,
    }
}

fn seed_valid_state(env: &Env, reserve_last_accrual: u32, accounting_last_updated: u32) -> Address {
    seed_pool(env, ProtocolStatus::Active, false);
    seed_validation_config(env, 10, 1_000);
    let asset = seed_reserve(
        env,
        ReserveStatus::Active,
        1_000,
        ledger(reserve_last_accrual),
    );
    seed_accounting(env, 100, ledger(accounting_last_updated));
    asset
}

#[test]
#[allow(deprecated)]
fn test_valid_deposit_preparation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        let asset = seed_valid_state(&env, 20, 20);
        let result = prepare_deposit(&env, &request(&env, asset, 50, 20)).unwrap();

        assert!(result.is_valid);
        assert_eq!(result.reserve_id, reserve_id());
        assert_eq!(result.amount, Wad(50));
        assert_eq!(result.current_available_liquidity, Wad(100));
        assert_eq!(result.projected_total_supply, Wad(150));
        assert_eq!(result.supply_cap, Wad(1_000));
        assert!(!result.required_interest_accrual);
        assert_eq!(
            result.validation_flags,
            VALIDATION_FLAG_RESERVE_ACTIVE | VALIDATION_FLAG_ACCOUNTING_VALID
        );
    });
}

#[test]
#[allow(deprecated)]
fn test_rejected_when_protocol_paused() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        let asset = seed_valid_state(&env, 20, 20);
        seed_pool(&env, ProtocolStatus::Paused, true);

        let err = prepare_deposit(&env, &request(&env, asset, 50, 20));
        assert_eq!(err, Err(LendingError::Paused));
    });
}

#[test]
#[allow(deprecated)]
fn test_rejected_when_reserve_missing() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        seed_pool(&env, ProtocolStatus::Active, false);

        let err = prepare_deposit(&env, &request(&env, Address::generate(&env), 50, 20));
        assert_eq!(err, Err(LendingError::ReserveNotFound));
    });
}

#[test]
#[allow(deprecated)]
fn test_rejected_when_reserve_frozen() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        seed_valid_state(&env, 20, 20);
        let asset = seed_reserve(&env, ReserveStatus::Frozen, 1_000, ledger(20));

        let err = prepare_deposit(&env, &request(&env, asset, 50, 20));
        assert_eq!(err, Err(LendingError::ReserveFrozen));
    });
}

#[test]
#[allow(deprecated)]
fn test_rejected_when_reserve_paused() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        seed_valid_state(&env, 20, 20);
        let asset = seed_reserve(&env, ReserveStatus::Paused, 1_000, ledger(20));

        let err = prepare_deposit(&env, &request(&env, asset, 50, 20));
        assert_eq!(err, Err(LendingError::ReservePaused));
    });
}

#[test]
#[allow(deprecated)]
fn test_rejected_when_reserve_deprecated() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        seed_valid_state(&env, 20, 20);
        let asset = seed_reserve(&env, ReserveStatus::Deprecated, 1_000, ledger(20));

        let err = prepare_deposit(&env, &request(&env, asset, 50, 20));
        assert_eq!(err, Err(LendingError::ReserveNotActive));
    });
}

#[test]
#[allow(deprecated)]
fn test_rejected_when_amount_is_zero() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        let asset = seed_valid_state(&env, 20, 20);

        let err = prepare_deposit(&env, &request(&env, asset, 0, 20));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
#[allow(deprecated)]
fn test_rejected_when_amount_below_minimum() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        let asset = seed_valid_state(&env, 20, 20);

        let err = prepare_deposit(&env, &request(&env, asset, 9, 20));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
#[allow(deprecated)]
fn test_rejected_when_amount_exceeds_max_transaction_amount() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        let asset = seed_valid_state(&env, 20, 20);

        let err = prepare_deposit(&env, &request(&env, asset, 1_001, 20));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
#[allow(deprecated)]
fn test_inv_acc_002_rejected_when_projected_supply_exceeds_supply_cap() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        let asset = seed_valid_state(&env, 20, 20);

        let err = prepare_deposit(&env, &request(&env, asset, 901, 20));
        assert_eq!(err, Err(LendingError::SupplyCapViolation));
    });
}

#[test]
#[allow(deprecated)]
fn test_interest_accrual_required_flag() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        let asset = seed_valid_state(&env, 20, 20);
        let result = prepare_deposit(&env, &request(&env, asset, 50, 25)).unwrap();

        assert!(result.required_interest_accrual);
        assert_eq!(
            result.validation_flags,
            VALIDATION_FLAG_RESERVE_ACTIVE
                | VALIDATION_FLAG_ACCOUNTING_VALID
                | VALIDATION_FLAG_INTEREST_ACCRUAL_REQUIRED
        );
    });
}

#[test]
#[allow(deprecated)]
fn test_no_interest_accrual_needed_when_current_ledger_equals_last_accrual_ledger() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        let asset = seed_valid_state(&env, 25, 20);
        let result = prepare_deposit(&env, &request(&env, asset, 50, 25)).unwrap();

        assert!(!result.required_interest_accrual);
    });
}

#[test]
#[allow(deprecated)]
fn test_current_ledger_cannot_go_backwards() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        let asset = seed_valid_state(&env, 25, 20);

        let err = prepare_deposit(&env, &request(&env, asset, 50, 24));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
#[allow(deprecated)]
fn test_stale_accounting_state_detected_before_update() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        let asset = seed_valid_state(&env, 20, 30);

        let err = prepare_deposit(&env, &request(&env, asset, 50, 25));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}

#[test]
#[allow(deprecated)]
fn test_invalid_reserve_accounting_rejected() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockSupplyContract);

    env.as_contract(&contract_id, || {
        let asset = seed_valid_state(&env, 20, 20);
        let mut accounting = ReserveAccounting::new(reserve_id(), ledger(20));
        accounting.total_liquidity = Wad(100);
        accounting.available_liquidity = Wad(101);
        accounting.total_actual_supply = Wad(100);
        write_reserve_accounting(&env, &accounting);

        let err = prepare_deposit(&env, &request(&env, asset, 50, 20));
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });
}
