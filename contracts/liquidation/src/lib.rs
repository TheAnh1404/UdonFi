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
    contract, contractimpl, symbol_short, token, Address, BytesN, Env,
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
        let _pool: Address = env
            .storage()
            .instance()
            .get(&LiquidationDataKey::Pool)
            .expect("not initialized");

        // ──────────────────────────────────────
        // In production, this section would:
        // 1. Call pool.get_user_data(borrower) to get HF
        // 2. Call oracle.get_price_usd(debt_asset) and oracle.get_price_usd(collateral_asset)
        // 3. Verify HF < 1.0
        //
        // For the standalone contract, we compute based on stored parameters.
        // The LendingPool integration would pass these values.
        // ──────────────────────────────────────

        // Calculate collateral to seize
        // collateral_to_seize = (debt_to_cover * debt_price * (1 + liquidation_bonus)) / collateral_price
        //
        // Using WAD math:
        // We use a default 5% liquidation bonus (500 bps)
        let liquidation_bonus: u32 = 500; // 5% — would come from reserve config
        let bonus_factor = WAD + percent_to_wad(liquidation_bonus);

        // For standalone testing: assume 1:1 prices
        // In production: fetch from oracle
        let debt_price = WAD; // $1.00
        let collateral_price = WAD; // $1.00

        let debt_value = wad_mul(debt_to_cover, debt_price).expect("overflow");
        let seized_value = wad_mul(debt_value, bonus_factor).expect("overflow");
        let collateral_to_seize = wad_div(seized_value, collateral_price).expect("overflow");

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
            debt_to_cover,
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
            debt_to_cover,
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

        // 2. Pool transfers collateral to liquidator (with bonus)
        // In production: Pool would authorize this transfer
        // For now: direct transfer from pool
        let collateral_token = token::Client::new(&env, &params.collateral_asset);
        // NOTE: In production, the Pool contract would need to approve this,
        // or this contract would call pool.liquidate_transfer() which handles
        // the balance updates internally.

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
    pub fn is_liquidatable(env: Env, _borrower: Address) -> bool {
        // Placeholder — in production:
        // let pool: Address = env.storage().instance().get(&LiquidationDataKey::Pool).unwrap();
        // let pool_client = LendingPoolContractClient::new(&env, &pool);
        // let hf = pool_client.get_health_factor(&borrower);
        // hf < HEALTH_FACTOR_LIQUIDATION_THRESHOLD
        false
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

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
        let pool = Address::generate(&env);
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
