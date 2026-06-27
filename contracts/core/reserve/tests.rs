#![cfg(test)]

use crate::errors::LendingError;
use crate::model::ReserveStatus;
use crate::registry::{
    create_reserve, deprecate_reserve, freeze_reserve, get_reserve, list_reserves, pause_reserve,
    reserve_exists, unfreeze_reserve, unpause_reserve,
};
use crate::validation::validate_state_transition;
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env, Symbol};

#[contract]
pub struct MockRegistryContract;

#[contractimpl]
impl MockRegistryContract {
    pub fn dummy(_env: Env) {}
}

#[test]
#[allow(deprecated)]
fn test_create_reserve() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRegistryContract);

    env.as_contract(&contract_id, || {
        let asset = Address::generate(&env);
        let symbol = Symbol::new(&env, "USDC");

        let id = create_reserve(&env, asset.clone(), symbol, 6, 8000, 8500, 500, 1000).unwrap();
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
            8000,
            8500,
            500,
            1000,
        )
        .unwrap();

        let err = create_reserve(&env, asset, symbol, 6, 8000, 8500, 500, 1000);
        assert_eq!(err, Err(LendingError::ReserveAlreadyExists));
    });
}

#[test]
#[allow(deprecated)]
fn test_lifecycle_transitions() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRegistryContract);

    env.as_contract(&contract_id, || {
        let asset = Address::generate(&env);
        let symbol = Symbol::new(&env, "USDC");

        let id = create_reserve(&env, asset, symbol, 6, 8000, 8500, 500, 1000).unwrap();

        // Active -> Frozen
        freeze_reserve(&env, id).unwrap();
        assert_eq!(
            get_reserve(&env, id).unwrap().reserve_status,
            ReserveStatus::Frozen
        );

        // Frozen -> Active
        unfreeze_reserve(&env, id).unwrap();
        assert_eq!(
            get_reserve(&env, id).unwrap().reserve_status,
            ReserveStatus::Active
        );

        // Active -> Paused
        pause_reserve(&env, id).unwrap();
        assert_eq!(
            get_reserve(&env, id).unwrap().reserve_status,
            ReserveStatus::Paused
        );

        // Paused -> Active
        unpause_reserve(&env, id).unwrap();
        assert_eq!(
            get_reserve(&env, id).unwrap().reserve_status,
            ReserveStatus::Active
        );

        // Active -> Deprecated
        deprecate_reserve(&env, id).unwrap();
        assert_eq!(
            get_reserve(&env, id).unwrap().reserve_status,
            ReserveStatus::Deprecated
        );

        // Deprecated is a terminal state
        let err = freeze_reserve(&env, id);
        assert_eq!(err, Err(LendingError::ReserveNotActive));
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

        // Invalid decimals (> 18)
        let err = create_reserve(
            &env,
            asset.clone(),
            symbol.clone(),
            19,
            8000,
            8500,
            500,
            1000,
        );
        assert_eq!(err, Err(LendingError::InvalidPrecision));

        // Invalid LTV (>= threshold)
        let err = create_reserve(
            &env,
            asset.clone(),
            symbol.clone(),
            6,
            8500,
            8500,
            500,
            1000,
        );
        assert_eq!(err, Err(LendingError::InvalidLTV));

        // Invalid reserve factor (> 10000 bps)
        let err = create_reserve(
            &env,
            asset.clone(),
            symbol.clone(),
            6,
            8000,
            8500,
            500,
            11000,
        );
        assert_eq!(err, Err(LendingError::InvalidReserveFactor));

        // Invalid LTV (> 9900 bps)
        let err = create_reserve(
            &env,
            asset.clone(),
            symbol.clone(),
            6,
            9950,
            9980,
            500,
            1000,
        );
        assert_eq!(err, Err(LendingError::InvalidLTV));

        // Invalid Threshold (> 10000 bps)
        let err = create_reserve(
            &env,
            asset.clone(),
            symbol.clone(),
            6,
            8000,
            10500,
            500,
            1000,
        );
        assert_eq!(err, Err(LendingError::InvalidLiquidationThreshold));

        // Invalid Bonus (> 10000 bps)
        let err = create_reserve(
            &env,
            asset.clone(),
            symbol.clone(),
            6,
            8000,
            8500,
            10500,
            1000,
        );
        assert_eq!(err, Err(LendingError::InvalidLiquidationBonus));
    });
}

#[test]
#[allow(deprecated)]
fn test_registry_lookup_and_iteration() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockRegistryContract);

    env.as_contract(&contract_id, || {
        let asset1 = Address::generate(&env);
        let asset2 = Address::generate(&env);

        create_reserve(
            &env,
            asset1.clone(),
            Symbol::new(&env, "USDC"),
            6,
            8000,
            8500,
            500,
            1000,
        )
        .unwrap();
        create_reserve(
            &env,
            asset2.clone(),
            Symbol::new(&env, "XLM"),
            7,
            7000,
            7500,
            500,
            1000,
        )
        .unwrap();

        let list = list_reserves(&env);
        assert_eq!(list.len(), 2);
        assert_eq!(list.get(0).unwrap().asset_address, asset1);
        assert_eq!(list.get(1).unwrap().asset_address, asset2);
    });
}

#[test]
fn test_state_transition_matrix() {
    let states = [
        ReserveStatus::Uninitialized,
        ReserveStatus::Active,
        ReserveStatus::Frozen,
        ReserveStatus::Paused,
        ReserveStatus::Deprecated,
    ];

    for &from in states.iter() {
        for &to in states.iter() {
            let res = validate_state_transition(from, to);
            if from == to {
                assert!(
                    res.is_ok(),
                    "No-op transition from {:?} to {:?} should be valid",
                    from,
                    to
                );
            } else {
                match (from, to) {
                    (ReserveStatus::Uninitialized, ReserveStatus::Active) => {
                        assert!(
                            res.is_ok(),
                            "Transition from {:?} to {:?} should be valid",
                            from,
                            to
                        );
                    }
                    (ReserveStatus::Active, ReserveStatus::Frozen)
                    | (ReserveStatus::Active, ReserveStatus::Paused)
                    | (ReserveStatus::Active, ReserveStatus::Deprecated) => {
                        assert!(
                            res.is_ok(),
                            "Transition from {:?} to {:?} should be valid",
                            from,
                            to
                        );
                    }
                    (ReserveStatus::Frozen, ReserveStatus::Active) => {
                        assert!(
                            res.is_ok(),
                            "Transition from {:?} to {:?} should be valid",
                            from,
                            to
                        );
                    }
                    (ReserveStatus::Paused, ReserveStatus::Active) => {
                        assert!(
                            res.is_ok(),
                            "Transition from {:?} to {:?} should be valid",
                            from,
                            to
                        );
                    }
                    _ => {
                        assert_eq!(
                            res,
                            Err(LendingError::ReserveNotActive),
                            "Transition from {:?} to {:?} should be forbidden",
                            from,
                            to
                        );
                    }
                }
            }
        }
    }
}
