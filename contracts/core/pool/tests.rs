#![cfg(test)]

use crate::errors::LendingError;
use crate::initialization::initialize_protocol;
use crate::model::ProtocolStatus;
use crate::state::{
    assert_protocol_active, get_pool, pause_protocol, set_guardian, set_insurance_fund,
    set_treasury, unpause_protocol, update_protocol_metadata,
};
use crate::storage::{read_guardian, read_insurance_fund, read_protocol_config, read_treasury};
use crate::validation::validate_state_transition;
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env, String};

#[contract]
pub struct MockPoolContract;

#[contractimpl]
impl MockPoolContract {
    pub fn dummy(_env: Env) {}
}

fn protocol_name(env: &Env) -> String {
    String::from_str(env, "UdonFi V2")
}

fn initialize(env: &Env, admin: &Address, guardian: &Address) -> (Address, Address) {
    let treasury = Address::generate(env);
    let insurance = Address::generate(env);
    initialize_protocol(
        env,
        admin.clone(),
        protocol_name(env),
        2,
        guardian.clone(),
        treasury.clone(),
        insurance.clone(),
    )
    .unwrap();
    (treasury, insurance)
}

#[test]
#[allow(deprecated)]
fn test_successful_initialization() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockPoolContract);

    env.as_contract(&contract_id, || {
        let admin = Address::generate(&env);
        let guardian = Address::generate(&env);
        let treasury = Address::generate(&env);
        let insurance = Address::generate(&env);

        let pool = initialize_protocol(
            &env,
            admin.clone(),
            protocol_name(&env),
            2,
            guardian.clone(),
            treasury.clone(),
            insurance.clone(),
        )
        .unwrap();

        assert_eq!(pool.protocol_status, ProtocolStatus::Active);
        assert_eq!(pool.total_reserves, 0);
        assert_eq!(pool.active_reserves, 0);
        assert!(!pool.paused);
        assert_eq!(read_guardian(&env), Some(guardian.clone()));
        assert_eq!(read_treasury(&env), Some(treasury.clone()));
        assert_eq!(read_insurance_fund(&env), Some(insurance));
        assert_eq!(read_protocol_config(&env).unwrap().guardian, guardian);
        assert_eq!(read_protocol_config(&env).unwrap().treasury, treasury);
    });
}

#[test]
#[allow(deprecated)]
fn test_double_initialization_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockPoolContract);
    let admin = Address::generate(&env);
    let guardian = Address::generate(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let err = initialize_protocol(
            &env,
            admin.clone(),
            protocol_name(&env),
            2,
            guardian.clone(),
            Address::generate(&env),
            Address::generate(&env),
        );
        assert_eq!(err, Err(LendingError::AlreadyInitialized));
    });
}

#[test]
#[allow(deprecated)]
fn test_pause_and_unpause() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockPoolContract);
    let admin = Address::generate(&env);
    let guardian = Address::generate(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let paused = pause_protocol(&env, guardian.clone()).unwrap();
        assert_eq!(paused.protocol_status, ProtocolStatus::Paused);
        assert!(paused.paused);
        assert_eq!(assert_protocol_active(&env), Err(LendingError::Paused));
    });

    env.as_contract(&contract_id, || {
        let active = unpause_protocol(&env, admin).unwrap();
        assert_eq!(active.protocol_status, ProtocolStatus::Active);
        assert!(!active.paused);
        assert!(assert_protocol_active(&env).is_ok());
    });
}

#[test]
#[allow(deprecated)]
fn test_guardian_update() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockPoolContract);
    let admin = Address::generate(&env);
    let guardian = Address::generate(&env);
    let new_guardian = Address::generate(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let pool = set_guardian(&env, admin, new_guardian.clone()).unwrap();
        assert_eq!(pool.guardian, new_guardian.clone());
        assert_eq!(read_guardian(&env), Some(new_guardian.clone()));
        assert_eq!(read_protocol_config(&env).unwrap().guardian, new_guardian);
    });
}

#[test]
#[allow(deprecated)]
fn test_treasury_and_insurance_updates() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockPoolContract);
    let admin = Address::generate(&env);
    let guardian = Address::generate(&env);
    let new_treasury = Address::generate(&env);
    let new_insurance = Address::generate(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let pool = set_treasury(&env, admin.clone(), new_treasury.clone()).unwrap();
        assert_eq!(pool.treasury_address, new_treasury.clone());
        assert_eq!(read_treasury(&env), Some(new_treasury.clone()));
        assert_eq!(read_protocol_config(&env).unwrap().treasury, new_treasury);
    });

    env.as_contract(&contract_id, || {
        let pool = set_insurance_fund(&env, admin, new_insurance.clone()).unwrap();
        assert_eq!(pool.insurance_fund_address, new_insurance.clone());
        assert_eq!(read_insurance_fund(&env), Some(new_insurance));
    });
}

#[test]
fn test_invalid_transitions() {
    assert!(
        validate_state_transition(ProtocolStatus::Uninitialized, ProtocolStatus::Initializing)
            .is_ok()
    );
    assert!(
        validate_state_transition(ProtocolStatus::Initializing, ProtocolStatus::Active).is_ok()
    );
    assert!(validate_state_transition(ProtocolStatus::Active, ProtocolStatus::Paused).is_ok());
    assert_eq!(
        validate_state_transition(ProtocolStatus::Active, ProtocolStatus::Initializing),
        Err(LendingError::ReserveNotActive)
    );
    assert_eq!(
        validate_state_transition(ProtocolStatus::Deprecated, ProtocolStatus::Active),
        Err(LendingError::ReserveNotActive)
    );
}

#[test]
#[allow(deprecated)]
fn test_unauthorized_access() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockPoolContract);
    let admin = Address::generate(&env);
    let guardian = Address::generate(&env);
    let outsider = Address::generate(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let err = set_treasury(&env, outsider.clone(), Address::generate(&env));
        assert_eq!(err, Err(LendingError::Unauthorized));
    });

    env.as_contract(&contract_id, || {
        let err = update_protocol_metadata(&env, outsider, protocol_name(&env), 3, 2);
        assert_eq!(err, Err(LendingError::Unauthorized));
        assert_eq!(get_pool(&env).unwrap().admin, admin);
    });
}
