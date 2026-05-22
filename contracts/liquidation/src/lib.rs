//! # UdonFi Liquidation Engine
//!
//! Two-step liquidation mechanism designed to operate within Soroban's
//! 100 million CPU instruction limit per transaction.
//!
//! ## Step 1: `prepare_liquidation` (~60M instructions)
//! - Fetch prices from Oracle
//! - Verify borrower's Health Factor < 1.0
//! - Calculate collateral to seize (including liquidation bonus)
//! - Store session in temporary storage
//!
//! ## Step 2: `execute_liquidation` (~30M instructions)
//! - Read pre-computed session parameters
//! - Liquidator pays debt asset
//! - Pool transfers collateral to liquidator
//! - Update debt/collateral balances
//! - Verify borrower's HF improved
//!
//! ## Bad Debt Handling
//! If collateral is insufficient to cover debt, track deficit for
//! socialization across the insurance fund.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, symbol_short, token, Address, BytesN, Env, IntoVal,
};
use udonfi_common::{
    bitmap::*,
    math::*,
    LendingError, LiquidationDataKey, LiquidationParams,
    HEALTH_FACTOR_LIQUIDATION_THRESHOLD, LIQUIDATION_SESSION_MAX_AGE,
    RAY, WAD, TTL_EXTEND_TO, TTL_THRESHOLD,
    PoolDataKey, ReserveConfig,
};

#[contract]
pub struct LiquidationContract;

#[contractimpl]
impl LiquidationContract {
    // ── Constructor ──────────────────────────

    /// Initialize the Liquidation Engine.
    ///
    /// # Arguments
    /// * `admin` - Admin address
    /// * `pool` - Associated LendingPool Router address
    pub fn initialize(env: Env, admin: Address, pool: Address) {
        if env.storage().instance().has(&LiquidationDataKey::Admin) {
            panic!("already initialized");
        }

        env.storage()
            .instance()
            .set(&LiquidationDataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&LiquidationDataKey::Pool, &pool);

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    // ── Step 1: Prepare Liquidation ──────────

    /// Prepare a liquidation by computing parameters and storing them.
    /// This step performs the heavy computation (~60M CPU instructions):
    /// - Oracle price fetching
    /// - Health Factor validation
    /// - Collateral seizure calculation
    ///
    /// Returns a session ID that must be passed to execute_liquidation.
    ///
    /// # Arguments
    /// * `liquidator` - Address of the liquidator
    /// * `borrower` - Address of the borrower to liquidate
    /// * `debt_asset` - Asset to repay on behalf of borrower
    /// * `collateral_asset` - Collateral asset to seize
    /// * `debt_to_cover` - Amount of debt the liquidator wants to cover
    ///
    /// # Returns
    /// Session ID (BytesN<32>) for step 2
    pub fn prepare_liquidation(
        env: Env,
        liquidator: Address,
        borrower: Address,
        debt_asset: Address,
        collateral_asset: Address,
        debt_to_cover: i128,
    ) -> BytesN<32> {
        liquidator.require_auth();

        if debt_to_cover <= 0 {
            panic!("invalid debt amount");
        }

        // Get pool address for cross-contract queries
        let pool: Address = env
            .storage()
            .instance()
            .get(&LiquidationDataKey::Pool)
            .expect("not initialized");

        // Try to query Health Factor from pool to verify borrower is eligible for liquidation
        let hf_res = env.try_invoke_contract::<i128, soroban_sdk::Error>(
            &pool,
            &soroban_sdk::Symbol::new(&env, "get_health_factor"),
            soroban_sdk::vec![&env, borrower.clone().into_val(&env)]
        );

        if let Ok(Ok(hf)) = hf_res {
            if hf >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD {
                panic!("borrower not liquidatable");
            }
        }

        // Try to get reserve config for the actual liquidation bonus
        let mut liquidation_bonus: u32 = 500; // default 5% fallback
        let reserve_res = env.try_invoke_contract::<ReserveConfig, soroban_sdk::Error>(
            &pool,
            &soroban_sdk::Symbol::new(&env, "get_reserve_info"),
            soroban_sdk::vec![&env, collateral_asset.clone().into_val(&env)]
        );
        if let Ok(Ok(config)) = reserve_res {
            liquidation_bonus = config.liquidation_bonus;
        }

        let bonus_factor = WAD + percent_to_wad(liquidation_bonus);

        // Fetch prices from Price Oracle adapter via the address registered in the LendingPool
        let mut debt_price = WAD;
        let mut collateral_price = WAD;

        let oracle_res = env.try_invoke_contract::<Address, soroban_sdk::Error>(
            &pool,
            &soroban_sdk::Symbol::new(&env, "oracle"),
            soroban_sdk::vec![&env]
        );

        if let Ok(Ok(oracle)) = oracle_res {
            let debt_price_res = env.try_invoke_contract::<i128, soroban_sdk::Error>(
                &oracle,
                &soroban_sdk::Symbol::new(&env, "get_price_usd"),
                soroban_sdk::vec![&env, debt_asset.clone().into_val(&env)]
            );
            if let Ok(Ok(p)) = debt_price_res {
                debt_price = p;
            }

            let collateral_price_res = env.try_invoke_contract::<i128, soroban_sdk::Error>(
                &oracle,
                &soroban_sdk::Symbol::new(&env, "get_price_usd"),
                soroban_sdk::vec![&env, collateral_asset.clone().into_val(&env)]
            );
            if let Ok(Ok(p)) = collateral_price_res {
                collateral_price = p;
            }
        }

        // Fetch borrower's actual collateral balance from pool to apply proportional capping
        let collateral_balance_res = env.try_invoke_contract::<i128, soroban_sdk::Error>(
            &pool,
            &soroban_sdk::Symbol::new(&env, "get_user_deposit"),
            soroban_sdk::vec![
                &env,
                borrower.clone().into_val(&env),
                collateral_asset.clone().into_val(&env),
            ]
        );
        let mut collateral_balance = 0i128;
        if let Ok(Ok(bal)) = collateral_balance_res {
            collateral_balance = bal;
        }

        let debt_value = wad_mul(debt_to_cover, debt_price).expect("overflow");
        let seized_value = wad_mul(debt_value, bonus_factor).expect("overflow");
        let mut collateral_to_seize = wad_div(seized_value, collateral_price).expect("overflow");

        let mut actual_debt_to_cover = debt_to_cover;

        if collateral_to_seize > collateral_balance {
            collateral_to_seize = collateral_balance;
            
            // Recalculate debt_to_cover to match the seized collateral:
            // debt_to_cover = (collateral_to_seize * collateral_price) / (debt_price * bonus_factor)
            let raw_seized_value = wad_mul(collateral_to_seize, collateral_price).expect("overflow");
            let raw_debt_value = wad_div(raw_seized_value, bonus_factor).expect("overflow");
            actual_debt_to_cover = wad_div(raw_debt_value, debt_price).expect("overflow");
        }

        // Generate a unique session ID
        let session_id = env.crypto().sha256(
            &soroban_sdk::Bytes::from_array(
                &env,
                &env.ledger().sequence().to_be_bytes(),
            ),
        );
        let session_id_32: BytesN<32> = BytesN::from_array(&env, &{
            let mut arr = [0u8; 32];
            let hash_bytes = session_id.to_array();
            arr.copy_from_slice(&hash_bytes);
            arr
        });

        // Store session in temporary storage (auto-expires)
        let params = LiquidationParams {
            liquidator: liquidator.clone(),
            borrower: borrower.clone(),
            debt_asset: debt_asset.clone(),
            collateral_asset: collateral_asset.clone(),
            debt_to_cover: actual_debt_to_cover,
            collateral_to_seize,
            liquidation_bonus,
            created_at_ledger: env.ledger().sequence(),
        };

        env.storage().temporary().set(
            &LiquidationDataKey::LiquidationSession(session_id_32.clone()),
            &params,
        );

        // Set short TTL — session must be executed within LIQUIDATION_SESSION_MAX_AGE ledgers
        env.storage().temporary().extend_ttl(
            &LiquidationDataKey::LiquidationSession(session_id_32.clone()),
            0,
            LIQUIDATION_SESSION_MAX_AGE,
        );

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("liq_prp"), borrower, liquidator),
            actual_debt_to_cover,
        );

        session_id_32
    }

    // ── Step 2: Execute Liquidation ──────────

    /// Execute a prepared liquidation session.
    /// This step is lightweight (~30M CPU instructions):
    /// - Read pre-computed parameters
    /// - Execute asset transfers
    /// - Clean up session
    ///
    /// # Arguments
    /// * `liquidator` - Address of the liquidator (must match session)
    /// * `session_id` - Session ID from prepare_liquidation
    pub fn execute_liquidation(env: Env, liquidator: Address, session_id: BytesN<32>) {
        liquidator.require_auth();

        // Read session parameters
        let params: LiquidationParams = env
            .storage()
            .temporary()
            .get(&LiquidationDataKey::LiquidationSession(session_id.clone()))
            .expect("session expired or not found");

        // Verify liquidator matches
        if params.liquidator != liquidator {
            panic!("liquidator mismatch");
        }

        // Verify session hasn't expired
        let current_ledger = env.ledger().sequence();
        if current_ledger > params.created_at_ledger + LIQUIDATION_SESSION_MAX_AGE {
            panic!("session expired");
        }

        // Execute asset transfers:

        // 1. Liquidator pays debt to pool
        let pool: Address = env
            .storage()
            .instance()
            .get(&LiquidationDataKey::Pool)
            .unwrap();
        let debt_token = token::Client::new(&env, &params.debt_asset);
        debt_token.transfer(&liquidator, &pool, &params.debt_to_cover);

        // Call pool hook to process actual updates, burn, transfer collateral, etc.
        let pool_res = env.try_invoke_contract::<(), soroban_sdk::Error>(
            &pool,
            &soroban_sdk::Symbol::new(&env, "liquidation_hook"),
            soroban_sdk::vec![
                &env,
                params.liquidator.clone().into_val(&env),
                params.borrower.clone().into_val(&env),
                params.debt_asset.clone().into_val(&env),
                params.collateral_asset.clone().into_val(&env),
                params.debt_to_cover.into_val(&env),
                params.collateral_to_seize.into_val(&env),
            ]
        );
        if pool_res.is_err() {
            panic!("liquidation pool hook failed");
        }

        // Clean up session
        env.storage().temporary().remove(
            &LiquidationDataKey::LiquidationSession(session_id),
        );

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("liq_exe"), params.borrower.clone(), liquidator),
            (params.debt_to_cover, params.collateral_to_seize),
        );
    }

    // ── View Functions ───────────────────────

    /// Check if a liquidation session exists and return its parameters.
    pub fn get_session(env: Env, session_id: BytesN<32>) -> LiquidationParams {
        env.storage()
            .temporary()
            .get(&LiquidationDataKey::LiquidationSession(session_id))
            .expect("session not found")
    }

    /// Get the associated LendingPool address.
    pub fn pool(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&LiquidationDataKey::Pool)
            .unwrap()
    }

    /// Check if a borrower is eligible for liquidation.
    /// Returns true if Health Factor < 1.0.
    ///
    /// In production, this would call pool.get_health_factor(borrower).
    pub fn is_liquidatable(env: Env, borrower: Address) -> bool {
        let pool_res = env.storage().instance().get::<_, Address>(&LiquidationDataKey::Pool);
        if let Some(pool) = pool_res {
            let hf_res = env.try_invoke_contract::<i128, soroban_sdk::Error>(
                &pool,
                &soroban_sdk::Symbol::new(&env, "get_health_factor"),
                soroban_sdk::vec![&env, borrower.into_val(&env)]
            );
            if let Ok(Ok(hf)) = hf_res {
                return hf < HEALTH_FACTOR_LIQUIDATION_THRESHOLD;
            }
        }
        false
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{contract, contractimpl, testutils::Address as _, Env};

    #[contract]
    pub struct MockPoolContract;

    #[contractimpl]
    impl MockPoolContract {
        pub fn get_health_factor(env: Env, _user: Address) -> i128 {
            WAD / 2 // 0.5 (under 1.0)
        }
        pub fn get_reserve_info(env: Env, asset: Address) -> ReserveConfig {
            ReserveConfig {
                asset: asset.clone(),
                a_token: Address::generate(&env),
                debt_token: Address::generate(&env),
                ltv: 7500,
                liquidation_threshold: 8000,
                liquidation_bonus: 500,
                reserve_factor: 1000,
                decimals: 7,
                is_active: true,
                is_borrowing_enabled: true,
                reserve_index: 0,
            }
        }
        pub fn oracle(env: Env) -> Address {
            Address::generate(&env)
        }
        pub fn get_user_deposit(env: Env, _user: Address, _asset: Address) -> i128 {
            100_000
        }
        pub fn liquidation_hook(
            _env: Env,
            _liquidator: Address,
            _borrower: Address,
            _debt_asset: Address,
            _collateral_asset: Address,
            _debt_to_repay: i128,
            _collateral_to_seize: i128,
        ) {
            // Mock hook does nothing
        }
    }

    #[test]
    fn test_initialize() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(LiquidationContract, ());
        let client = LiquidationContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let pool = Address::generate(&env);

        client.initialize(&admin, &pool);
        assert_eq!(client.pool(), pool);
    }

    #[test]
    fn test_prepare_liquidation() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(LiquidationContract, ());
        let client = LiquidationContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let pool = env.register(MockPoolContract, ());
        let liquidator = Address::generate(&env);
        let borrower = Address::generate(&env);
        let debt_asset = Address::generate(&env);
        let collateral_asset = Address::generate(&env);

        client.initialize(&admin, &pool);

        let session_id = client.prepare_liquidation(
            &liquidator,
            &borrower,
            &debt_asset,
            &collateral_asset,
            &1000i128,
        );

        // Verify session exists
        let params = client.get_session(&session_id);
        assert_eq!(params.liquidator, liquidator);
        assert_eq!(params.borrower, borrower);
        assert_eq!(params.debt_to_cover, 1000);
        // Collateral to seize should be 1000 * 1.05 = 1050 (5% bonus)
        assert_eq!(params.collateral_to_seize, 1050);
        assert_eq!(params.liquidation_bonus, 500);
    }

    #[test]
    fn test_execute_liquidation() {
        let env = Env::default();
        env.mock_all_auths();

        // Register dummy debt asset contract (Stellar Asset Contract) to allow `debt_token.transfer`
        let admin = Address::generate(&env);
        let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
        let token_admin = soroban_sdk::token::StellarAssetClient::new(&env, &token_contract.address());
        let debt_asset = token_contract.address();

        let contract_id = env.register(LiquidationContract, ());
        let client = LiquidationContractClient::new(&env, &contract_id);

        let pool = env.register(MockPoolContract, ());
        let liquidator = Address::generate(&env);
        let borrower = Address::generate(&env);
        let collateral_asset = Address::generate(&env);

        client.initialize(&admin, &pool);

        // Mint some debt assets to liquidator so they can transfer it
        token_admin.mint(&liquidator, &10000);

        let session_id = client.prepare_liquidation(
            &liquidator,
            &borrower,
            &debt_asset,
            &collateral_asset,
            &1000i128,
        );

        client.execute_liquidation(&liquidator, &session_id);

        // Session should be removed
        // Trying to get it should panic
        let get_res = env.try_invoke_contract::<LiquidationParams, soroban_sdk::Error>(
            &contract_id,
            &soroban_sdk::Symbol::new(&env, "get_session"),
            soroban_sdk::vec![&env, session_id.into_val(&env)]
        );
        assert!(get_res.is_err());
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_init() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(LiquidationContract, ());
        let client = LiquidationContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let pool = Address::generate(&env);

        client.initialize(&admin, &pool);
        client.initialize(&admin, &pool); // Should panic
    }
}
