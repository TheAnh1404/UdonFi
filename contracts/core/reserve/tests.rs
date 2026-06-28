#![cfg(test)]

use crate::errors::LendingError;
use crate::lifecycle::{
    activate_reserve, can_reserve_accept_supply, can_reserve_allow_borrow, can_reserve_allow_repay,
    can_reserve_allow_withdraw, deprecate_reserve, freeze_reserve, get_reserve_status,
    pause_reserve, unfreeze_reserve, unpause_reserve,
};
use crate::model::{Reserve, ReserveStatus};
use crate::permissions::LifecycleContext;
use crate::registry::{
    create_reserve, get_reserve, list_reserves, reserve_exists, update_configuration,
};
use crate::storage::write_reserve;
use crate::validation::validate_state_transition;
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env, String, Symbol};
use udonfi_shared::{
    BasisPoints, LedgerSequence, Ltv, Ray, ReserveFactor, ReserveId, Timestamp, Wad, RAY,
};

#[contract]
pub struct MockRegistryContract;

#[contractimpl]
impl MockRegistryContract {
    pub fn dummy(_env: Env) {}
}

fn reason(env: &Env) -> String {
    String::from_str(env, "CORE-004 lifecycle update")
}

fn roles(env: &Env) -> (Address, Address) {
    (Address::generate(env), Address::generate(env))
}

fn governance_context(env: &Env, governance: &Address, guardian: &Address) -> LifecycleContext {
    LifecycleContext::governance(governance.clone(), guardian.clone(), reason(env))
}

fn timelocked_context(env: &Env, governance: &Address, guardian: &Address) -> LifecycleContext {
    LifecycleContext::timelocked_governance(
        governance.clone(),
        guardian.clone(),
        reason(env),
        LedgerSequence(env.ledger().sequence()),
    )
}

fn guardian_context(env: &Env, guardian: &Address, governance: &Address) -> LifecycleContext {
    LifecycleContext::guardian(guardian.clone(), governance.clone(), reason(env))
}

fn create_active_reserve(env: &Env) -> ReserveId {
    create_reserve(
        env,
        Address::generate(env),
        Symbol::new(env, "USDC"),
        6,
        8_000,
        8_500,
        500,
        1_000,
    )
    .unwrap()
}

fn seed_reserve(env: &Env, reserve_id: ReserveId, status: ReserveStatus) {
    let now = Timestamp(env.ledger().timestamp());
    let reserve = Reserve {
        reserve_id,
        asset_address: Address::generate(env),
        asset_symbol: Symbol::new(env, "TEST"),
        asset_decimals: 7,
        reserve_status: status,
        supply_cap: Wad(0),
        borrow_cap: Wad(0),
        reserve_factor: ReserveFactor(1_000),
        max_ltv: Ltv(8_000),
        liquidation_threshold: BasisPoints(8_500),
        liquidation_bonus: BasisPoints(500),
        borrow_index: Ray(RAY),
        supply_index: Ray(RAY),
        last_accrual_ledger: LedgerSequence(env.ledger().sequence()),
        created_at: now,
        updated_at: now,
    };
    write_reserve(env, &reserve);
}

fn assert_permissions(
    env: &Env,
    reserve_id: ReserveId,
    supply: bool,
    borrow: bool,
    withdraw: bool,
    repay: bool,
) {
    assert_eq!(can_reserve_accept_supply(env, reserve_id), supply);
    assert_eq!(can_reserve_allow_borrow(env, reserve_id), borrow);
    assert_eq!(can_reserve_allow_withdraw(env, reserve_id), withdraw);
    assert_eq!(can_reserve_allow_repay(env, reserve_id), repay);
}

#[test]
#[allow(deprecated)]
fn test_create_reserve() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRegistryContract);

    env.as_contract(&contract_id, || {
        let asset = Address::generate(&env);
        let symbol = Symbol::new(&env, "USDC");

        let id = create_reserve(&env, asset.clone(), symbol, 6, 8_000, 8_500, 500, 1_000).unwrap();
        assert_eq!(id.0, 0);
        assert!(reserve_exists(&env, &asset));

        let reserve = get_reserve(&env, id).unwrap();
        assert_eq!(reserve.asset_address, asset);
        assert_eq!(reserve.asset_decimals, 6);
        assert_eq!(reserve.reserve_status, ReserveStatus::Active);
    });
}

#[test]
#[allow(deprecated)]
fn test_duplicate_reserve() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRegistryContract);

    env.as_contract(&contract_id, || {
        let asset = Address::generate(&env);
        let symbol = Symbol::new(&env, "USDC");

        create_reserve(
            &env,
            asset.clone(),
            symbol.clone(),
            6,
            8_000,
            8_500,
            500,
            1_000,
        )
        .unwrap();

        let err = create_reserve(&env, asset, symbol, 6, 8_000, 8_500, 500, 1_000);
        assert_eq!(err, Err(LendingError::ReserveAlreadyExists));
    });
}

#[test]
#[allow(deprecated)]
fn test_valid_lifecycle_transitions() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockRegistryContract);
    let (governance, guardian) = roles(&env);
    let uninitialized_id = ReserveId(42);

    env.as_contract(&contract_id, || {
        seed_reserve(&env, uninitialized_id, ReserveStatus::Uninitialized);
    });

    env.as_contract(&contract_id, || {
        let reserve = activate_reserve(
            &env,
            uninitialized_id,
            governance_context(&env, &governance, &guardian),
        )
        .unwrap();
        assert_eq!(reserve.reserve_status, ReserveStatus::Active);
    });

    env.as_contract(&contract_id, || {
        let reserve = freeze_reserve(
            &env,
            uninitialized_id,
            guardian_context(&env, &guardian, &governance),
        )
        .unwrap();
        assert_eq!(reserve.reserve_status, ReserveStatus::Frozen);
    });

    env.as_contract(&contract_id, || {
        let reserve = unfreeze_reserve(
            &env,
            uninitialized_id,
            governance_context(&env, &governance, &guardian),
        )
        .unwrap();
        assert_eq!(reserve.reserve_status, ReserveStatus::Active);
    });

    env.as_contract(&contract_id, || {
        let reserve = pause_reserve(
            &env,
            uninitialized_id,
            guardian_context(&env, &guardian, &governance),
        )
        .unwrap();
        assert_eq!(reserve.reserve_status, ReserveStatus::Paused);
    });

    env.as_contract(&contract_id, || {
        let reserve = freeze_reserve(
            &env,
            uninitialized_id,
            guardian_context(&env, &guardian, &governance),
        )
        .unwrap();
        assert_eq!(reserve.reserve_status, ReserveStatus::Frozen);
    });

    env.as_contract(&contract_id, || {
        let reserve = pause_reserve(
            &env,
            uninitialized_id,
            guardian_context(&env, &guardian, &governance),
        )
        .unwrap();
        assert_eq!(reserve.reserve_status, ReserveStatus::Paused);
    });

    env.as_contract(&contract_id, || {
        let reserve = unpause_reserve(
            &env,
            uninitialized_id,
            governance_context(&env, &governance, &guardian),
        )
        .unwrap();
        assert_eq!(reserve.reserve_status, ReserveStatus::Active);
    });

    env.as_contract(&contract_id, || {
        let reserve = deprecate_reserve(
            &env,
            uninitialized_id,
            timelocked_context(&env, &governance, &guardian),
        )
        .unwrap();
        assert_eq!(reserve.reserve_status, ReserveStatus::Deprecated);
    });
}

#[test]
fn test_invalid_transitions() {
    let states = [
        ReserveStatus::Uninitialized,
        ReserveStatus::Active,
        ReserveStatus::Frozen,
        ReserveStatus::Paused,
        ReserveStatus::Deprecated,
    ];

    for &from in states.iter() {
        for &to in states.iter() {
            let expected_valid = matches!(
                (from, to),
                (ReserveStatus::Uninitialized, ReserveStatus::Active)
                    | (ReserveStatus::Active, ReserveStatus::Frozen)
                    | (ReserveStatus::Active, ReserveStatus::Paused)
                    | (ReserveStatus::Frozen, ReserveStatus::Active)
                    | (ReserveStatus::Frozen, ReserveStatus::Paused)
                    | (ReserveStatus::Paused, ReserveStatus::Active)
                    | (ReserveStatus::Paused, ReserveStatus::Frozen)
                    | (ReserveStatus::Active, ReserveStatus::Deprecated)
                    | (ReserveStatus::Frozen, ReserveStatus::Deprecated)
                    | (ReserveStatus::Paused, ReserveStatus::Deprecated)
            );
            let result = validate_state_transition(from, to);
            if expected_valid {
                assert!(
                    result.is_ok(),
                    "transition from {:?} to {:?} should be valid",
                    from,
                    to
                );
            } else {
                assert_eq!(
                    result,
                    Err(LendingError::ReserveNotActive),
                    "transition from {:?} to {:?} should be rejected",
                    from,
                    to
                );
            }
        }
    }
}

#[test]
#[allow(deprecated)]
fn test_guardian_freeze() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockRegistryContract);
    let (governance, guardian) = roles(&env);

    env.as_contract(&contract_id, || {
        let id = create_active_reserve(&env);
        let reserve =
            freeze_reserve(&env, id, guardian_context(&env, &guardian, &governance)).unwrap();
        assert_eq!(reserve.reserve_status, ReserveStatus::Frozen);
    });
}

#[test]
#[allow(deprecated)]
fn test_guardian_pause() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockRegistryContract);
    let (governance, guardian) = roles(&env);

    env.as_contract(&contract_id, || {
        let id = create_active_reserve(&env);
        let reserve =
            pause_reserve(&env, id, guardian_context(&env, &guardian, &governance)).unwrap();
        assert_eq!(reserve.reserve_status, ReserveStatus::Paused);
    });
}

#[test]
#[allow(deprecated)]
fn test_guardian_cannot_deprecate_or_unpause() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockRegistryContract);
    let (governance, guardian) = roles(&env);
    let id = ReserveId(7);

    env.as_contract(&contract_id, || {
        seed_reserve(&env, id, ReserveStatus::Paused);
    });

    env.as_contract(&contract_id, || {
        let err = deprecate_reserve(&env, id, guardian_context(&env, &guardian, &governance));
        assert_eq!(err, Err(LendingError::Unauthorized));
        assert_eq!(get_reserve_status(&env, id), ReserveStatus::Paused);
    });

    env.as_contract(&contract_id, || {
        let err = unpause_reserve(&env, id, guardian_context(&env, &guardian, &governance));
        assert_eq!(err, Err(LendingError::Unauthorized));
        assert_eq!(get_reserve_status(&env, id), ReserveStatus::Paused);
    });
}

#[test]
#[allow(deprecated)]
fn test_deprecate_requires_timelock() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockRegistryContract);
    let (governance, guardian) = roles(&env);
    let id = ReserveId(9);

    env.as_contract(&contract_id, || {
        seed_reserve(&env, id, ReserveStatus::Active);
    });

    env.as_contract(&contract_id, || {
        let err = deprecate_reserve(&env, id, governance_context(&env, &governance, &guardian));
        assert_eq!(err, Err(LendingError::TimelockActive));
        assert_eq!(get_reserve_status(&env, id), ReserveStatus::Active);
    });

    env.as_contract(&contract_id, || {
        let reserve =
            deprecate_reserve(&env, id, timelocked_context(&env, &governance, &guardian)).unwrap();
        assert_eq!(reserve.reserve_status, ReserveStatus::Deprecated);
    });
}

#[test]
#[allow(deprecated)]
fn test_active_permissions() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRegistryContract);

    env.as_contract(&contract_id, || {
        let id = ReserveId(1);
        seed_reserve(&env, id, ReserveStatus::Active);
        assert_permissions(&env, id, true, true, true, true);
    });
}

#[test]
#[allow(deprecated)]
fn test_frozen_permissions() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRegistryContract);

    env.as_contract(&contract_id, || {
        let id = ReserveId(2);
        seed_reserve(&env, id, ReserveStatus::Frozen);
        assert_permissions(&env, id, false, false, true, true);
    });
}

#[test]
#[allow(deprecated)]
fn test_paused_permissions() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRegistryContract);

    env.as_contract(&contract_id, || {
        let id = ReserveId(3);
        seed_reserve(&env, id, ReserveStatus::Paused);
        assert_permissions(&env, id, false, false, true, true);
    });
}

#[test]
#[allow(deprecated)]
fn test_deprecated_permissions() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRegistryContract);

    env.as_contract(&contract_id, || {
        let id = ReserveId(4);
        seed_reserve(&env, id, ReserveStatus::Deprecated);
        assert_permissions(&env, id, false, false, true, true);
    });
}

#[test]
#[allow(deprecated)]
fn test_uninitialized_permissions() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRegistryContract);

    env.as_contract(&contract_id, || {
        let id = ReserveId(999);
        assert_eq!(get_reserve_status(&env, id), ReserveStatus::Uninitialized);
        assert_permissions(&env, id, false, false, false, false);
    });
}

#[test]
#[allow(deprecated)]
fn test_invalid_configuration() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRegistryContract);

    env.as_contract(&contract_id, || {
        let asset = Address::generate(&env);
        let symbol = Symbol::new(&env, "USDC");

        let err = create_reserve(
            &env,
            asset.clone(),
            symbol.clone(),
            19,
            8_000,
            8_500,
            500,
            1_000,
        );
        assert_eq!(err, Err(LendingError::InvalidPrecision));

        let err = create_reserve(
            &env,
            asset.clone(),
            symbol.clone(),
            6,
            8_500,
            8_500,
            500,
            1_000,
        );
        assert_eq!(err, Err(LendingError::InvalidLTV));

        let err = create_reserve(
            &env,
            asset.clone(),
            symbol.clone(),
            6,
            8_000,
            8_500,
            500,
            11_000,
        );
        assert_eq!(err, Err(LendingError::InvalidReserveFactor));

        let err = create_reserve(
            &env,
            asset.clone(),
            symbol.clone(),
            6,
            9_950,
            9_980,
            500,
            1_000,
        );
        assert_eq!(err, Err(LendingError::InvalidLTV));

        let err = create_reserve(
            &env,
            asset.clone(),
            symbol.clone(),
            6,
            8_000,
            10_500,
            500,
            1_000,
        );
        assert_eq!(err, Err(LendingError::InvalidLiquidationThreshold));

        let err = create_reserve(&env, asset, symbol, 6, 8_000, 8_500, 10_500, 1_000);
        assert_eq!(err, Err(LendingError::InvalidLiquidationBonus));
    });
}

#[test]
#[allow(deprecated)]
fn test_registry_lookup_iteration_and_configuration_update() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRegistryContract);

    env.as_contract(&contract_id, || {
        let asset1 = Address::generate(&env);
        let asset2 = Address::generate(&env);

        let id1 = create_reserve(
            &env,
            asset1.clone(),
            Symbol::new(&env, "USDC"),
            6,
            8_000,
            8_500,
            500,
            1_000,
        )
        .unwrap();
        create_reserve(
            &env,
            asset2.clone(),
            Symbol::new(&env, "XLM"),
            7,
            7_000,
            7_500,
            500,
            1_000,
        )
        .unwrap();

        update_configuration(&env, id1, 10_000, 5_000, 1_500, 7_500, 8_000, 600).unwrap();
        let updated = get_reserve(&env, id1).unwrap();
        assert_eq!(updated.supply_cap, Wad(10_000));
        assert_eq!(updated.borrow_cap, Wad(5_000));

        let list = list_reserves(&env);
        assert_eq!(list.len(), 2);
        assert_eq!(list.get(0).unwrap().asset_address, asset1);
        assert_eq!(list.get(1).unwrap().asset_address, asset2);
    });
}
