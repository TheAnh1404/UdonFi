#![cfg(test)]

use crate::errors::LendingError;
use crate::model::{
    ConfigAuthority, ConfigSection, ConfigUpdateContext, DEFAULT_GOVERNANCE_TIMELOCK_DELAY_LEDGERS,
    INITIAL_CONFIG_VERSION,
};
use crate::updates::{
    get_config_history_metadata, get_config_history_metadata_for_version, get_config_version,
    get_current_config, get_protocol_config_at_version, get_risk_config_at_version,
    initialize_default_config, update_governance_config, update_oracle_config,
    update_protocol_config, update_risk_config, update_validation_config,
};
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env, String};
use udonfi_shared::{BasisPoints, HealthFactor, LedgerSequence, Wad, MIN_HEALTH_FACTOR};

#[contract]
pub struct MockConfigContract;

#[contractimpl]
impl MockConfigContract {
    pub fn dummy(_env: Env) {}
}

fn reason(env: &Env) -> String {
    String::from_str(env, "CORE-003 test update")
}

fn roles(env: &Env) -> (Address, Address) {
    let admin = Address::generate(env);
    let guardian = Address::generate(env);
    (admin, guardian)
}

fn initialize(env: &Env, admin: &Address, guardian: &Address) {
    initialize_default_config(env, admin.clone(), guardian.clone(), reason(env)).unwrap();
}

fn governance_context(env: &Env, admin: &Address) -> ConfigUpdateContext {
    ConfigUpdateContext::governance(admin.clone(), reason(env))
}

fn timelocked_context(env: &Env, admin: &Address) -> ConfigUpdateContext {
    ConfigUpdateContext::timelocked_governance(
        admin.clone(),
        reason(env),
        LedgerSequence(DEFAULT_GOVERNANCE_TIMELOCK_DELAY_LEDGERS),
        LedgerSequence(env.ledger().sequence()),
    )
}

fn guardian_context(env: &Env, guardian: &Address) -> ConfigUpdateContext {
    ConfigUpdateContext::guardian_emergency(guardian.clone(), reason(env))
}

#[test]
#[allow(deprecated)]
fn test_default_config_creation() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockConfigContract);
    let (admin, guardian) = roles(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
        let current = get_current_config(&env).unwrap();

        assert_eq!(current.protocol.protocol_version, 2);
        assert_eq!(current.protocol.config_version, INITIAL_CONFIG_VERSION);
        assert_eq!(
            current.risk.min_health_factor,
            HealthFactor(MIN_HEALTH_FACTOR)
        );
        assert_eq!(current.interest.optimal_utilization_bps, BasisPoints(8_000));
        assert_eq!(current.oracle.max_price_deviation_bps, BasisPoints(200));
        assert_eq!(current.governance.quorum_bps, BasisPoints(400));
        assert_eq!(get_config_version(&env).unwrap(), INITIAL_CONFIG_VERSION);

        let history = get_config_history_metadata(&env).unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history.get(0).unwrap().changed_section, ConfigSection::All);
        assert_eq!(history.get(0).unwrap().actor, admin);
    });
}

#[test]
#[allow(deprecated)]
fn test_valid_config_update() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockConfigContract);
    let (admin, guardian) = roles(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let mut risk = get_current_config(&env).unwrap().risk;
        risk.max_ltv_bps = BasisPoints(8_000);
        risk.max_liquidation_threshold_bps = BasisPoints(8_500);

        let updated = update_risk_config(&env, governance_context(&env, &admin), risk).unwrap();
        assert_eq!(updated.max_ltv_bps, BasisPoints(8_000));
        assert_eq!(get_current_config(&env).unwrap().risk, updated);
        assert_eq!(get_config_version(&env).unwrap(), 2);
    });
}

#[test]
#[allow(deprecated)]
fn test_invalid_bps_rejection() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockConfigContract);
    let (admin, guardian) = roles(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let mut oracle = get_current_config(&env).unwrap().oracle;
        oracle.max_price_deviation_bps = BasisPoints(10_001);

        let err = update_oracle_config(&env, governance_context(&env, &admin), oracle);
        assert_eq!(err, Err(LendingError::InvalidAmount));
        assert_eq!(get_config_version(&env).unwrap(), INITIAL_CONFIG_VERSION);
    });
}

#[test]
#[allow(deprecated)]
fn test_ltv_gte_liquidation_threshold_rejection() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockConfigContract);
    let (admin, guardian) = roles(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let mut risk = get_current_config(&env).unwrap().risk;
        risk.min_ltv_bps = BasisPoints(8_500);
        risk.min_liquidation_threshold_bps = BasisPoints(8_500);

        let err = update_risk_config(&env, governance_context(&env, &admin), risk);
        assert_eq!(err, Err(LendingError::InvalidLTV));
        assert_eq!(get_config_version(&env).unwrap(), INITIAL_CONFIG_VERSION);
    });
}

#[test]
#[allow(deprecated)]
fn test_version_increment_and_monotonicity() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockConfigContract);
    let (admin, guardian) = roles(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let mut validation = get_current_config(&env).unwrap().validation;
        validation.min_deposit_amount = Wad(10);
        update_validation_config(&env, governance_context(&env, &admin), validation).unwrap();
        assert_eq!(get_config_version(&env).unwrap(), 2);
    });

    env.as_contract(&contract_id, || {
        let mut oracle = get_current_config(&env).unwrap().oracle;
        oracle.max_price_staleness_ledgers = LedgerSequence(600);
        update_oracle_config(&env, governance_context(&env, &admin), oracle).unwrap();
        assert_eq!(get_config_version(&env).unwrap(), 3);

        let history = get_config_history_metadata(&env).unwrap();
        assert_eq!(history.len(), 3);
        assert_eq!(history.get(0).unwrap().config_version, 1);
        assert_eq!(history.get(1).unwrap().config_version, 2);
        assert_eq!(history.get(2).unwrap().config_version, 3);
        assert_eq!(history.get(2).unwrap().previous_version, 2);
    });
}

#[test]
#[allow(deprecated)]
fn test_guardian_cannot_increase_risk() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockConfigContract);
    let (admin, guardian) = roles(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let mut risk = get_current_config(&env).unwrap().risk;
        risk.max_ltv_bps = BasisPoints(9_950);

        let err = update_risk_config(&env, guardian_context(&env, &guardian), risk);
        assert_eq!(err, Err(LendingError::InvalidLTV));
    });

    env.as_contract(&contract_id, || {
        let mut risk = get_current_config(&env).unwrap().risk;
        risk.max_liquidation_bonus_bps = BasisPoints(400);

        let err = update_risk_config(&env, guardian_context(&env, &guardian), risk);
        assert_eq!(err, Err(LendingError::Unauthorized));
        assert_eq!(get_config_version(&env).unwrap(), INITIAL_CONFIG_VERSION);
    });
}

#[test]
#[allow(deprecated)]
fn test_emergency_config_update() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockConfigContract);
    let (admin, guardian) = roles(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let mut protocol = get_current_config(&env).unwrap().protocol;
        protocol.emergency_mode_enabled = true;
        protocol.max_assets = 32;
        protocol.max_reserves = 32;

        let updated =
            update_protocol_config(&env, guardian_context(&env, &guardian), protocol).unwrap();
        assert!(updated.emergency_mode_enabled);
        assert_eq!(updated.config_version, 2);

        let metadata = get_config_history_metadata_for_version(&env, 2).unwrap();
        assert_eq!(metadata.changed_section, ConfigSection::Protocol);
        assert!(metadata.emergency);
        assert_eq!(metadata.actor, guardian);
    });
}

#[test]
#[allow(deprecated)]
fn test_timelock_required_for_risk_increase() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockConfigContract);
    let (admin, guardian) = roles(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let mut validation = get_current_config(&env).unwrap().validation;
        validation.max_transaction_amount = Wad(i128::MAX);
        validation.min_borrow_amount = Wad(0);

        let err = update_validation_config(&env, governance_context(&env, &admin), validation);
        assert_eq!(err, Err(LendingError::InvalidAmount));
    });

    env.as_contract(&contract_id, || {
        let mut risk = get_current_config(&env).unwrap().risk;
        risk.max_liquidation_bonus_bps = BasisPoints(400);

        let err = update_risk_config(&env, governance_context(&env, &admin), risk);
        assert_eq!(err, Err(LendingError::TimelockActive));
    });

    env.as_contract(&contract_id, || {
        let mut risk = get_current_config(&env).unwrap().risk;
        risk.max_liquidation_bonus_bps = BasisPoints(400);

        let updated = update_risk_config(&env, timelocked_context(&env, &admin), risk).unwrap();
        assert_eq!(updated.max_liquidation_bonus_bps, BasisPoints(400));
    });
}

#[test]
#[allow(deprecated)]
fn test_config_retrieval() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockConfigContract);
    let (admin, guardian) = roles(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let initial_risk = get_current_config(&env).unwrap().risk;

        let mut risk = initial_risk;
        risk.max_ltv_bps = BasisPoints(8_000);
        risk.max_liquidation_threshold_bps = BasisPoints(8_500);
        update_risk_config(&env, governance_context(&env, &admin), risk).unwrap();

        assert_eq!(
            get_protocol_config_at_version(&env, 1)
                .unwrap()
                .config_version,
            1
        );
        assert_eq!(get_risk_config_at_version(&env, 1).unwrap(), initial_risk);
        assert_eq!(get_risk_config_at_version(&env, 2).unwrap(), risk);
        assert_eq!(get_current_config(&env).unwrap().risk, risk);
    });
}

#[test]
#[allow(deprecated)]
fn test_config_history_metadata() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockConfigContract);
    let (admin, guardian) = roles(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let mut governance = get_current_config(&env).unwrap().governance;
        governance.quorum_bps = BasisPoints(500);

        update_governance_config(&env, governance_context(&env, &admin), governance).unwrap();

        let metadata = get_config_history_metadata_for_version(&env, 2).unwrap();
        assert_eq!(metadata.previous_version, 1);
        assert_eq!(metadata.config_version, 2);
        assert_eq!(metadata.changed_section, ConfigSection::Governance);
        assert_eq!(metadata.actor, admin);
        assert!(!metadata.emergency);
        assert_eq!(metadata.reason, reason(&env));
    });
}

#[test]
#[allow(deprecated)]
fn test_non_guardian_authority_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, MockConfigContract);
    let (admin, guardian) = roles(&env);

    env.as_contract(&contract_id, || {
        initialize(&env, &admin, &guardian);
    });

    env.as_contract(&contract_id, || {
        let outsider = Address::generate(&env);
        let mut risk = get_current_config(&env).unwrap().risk;
        risk.max_ltv_bps = BasisPoints(8_000);

        let context = ConfigUpdateContext {
            actor: outsider,
            authority: ConfigAuthority::Governance,
            reason: reason(&env),
            emergency: false,
            timelock_delay_ledgers: LedgerSequence(0),
            timelock_expires_at_ledger: LedgerSequence(0),
        };

        let err = update_risk_config(&env, context, risk);
        assert_eq!(err, Err(LendingError::Unauthorized));
    });
}
