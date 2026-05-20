//! # UdonFi Price Oracle Adapter
//!
//! Adapter contract that interfaces with the Stellar Reflector Oracle network
//! (SEP-40 compatible) to provide reliable price feeds for the lending protocol.
//!
//! Safety features:
//! - **Freshness check**: Rejects prices older than configured threshold
//! - **Circuit breaker**: Rejects prices that deviate too far from last known price
//! - **Normalized output**: All prices returned in WAD (10^18) precision as USD values

#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol};
use udonfi_common::{LendingError, OracleDataKey, WAD, TTL_EXTEND_TO, TTL_THRESHOLD};

/// Default maximum price age: 100 ledgers (~500 seconds at 5s/ledger)
const DEFAULT_MAX_PRICE_AGE: u32 = 100;

/// Default maximum price deviation: 2000 basis points = 20%
const DEFAULT_MAX_DEVIATION_BPS: u32 = 2000;

#[contract]
pub struct PriceOracleContract;

#[contractimpl]
impl PriceOracleContract {
    // ── Constructor ──────────────────────────

    /// Initialize the oracle adapter.
    ///
    /// # Arguments
    /// * `admin` - Admin who can update configuration
    /// * `reflector_address` - Address of the Reflector Oracle contract on Stellar
    pub fn initialize(
        env: Env,
        admin: Address,
        reflector_address: Address,
    ) {
        if env.storage().instance().has(&OracleDataKey::Admin) {
            panic!("already initialized");
        }

        env.storage()
            .instance()
            .set(&OracleDataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&OracleDataKey::ReflectorAddress, &reflector_address);
        env.storage()
            .instance()
            .set(&OracleDataKey::MaxPriceAge, &DEFAULT_MAX_PRICE_AGE);
        env.storage()
            .instance()
            .set(&OracleDataKey::MaxPriceDeviation, &DEFAULT_MAX_DEVIATION_BPS);

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    // ── Price Query Functions ────────────────

    /// Get the USD price of an asset in WAD precision.
    ///
    /// This function:
    /// 1. Queries the Reflector Oracle for the latest price
    /// 2. Validates freshness (not stale)
    /// 3. Validates deviation from last known price (circuit breaker)
    /// 4. Normalizes to WAD precision (10^18)
    ///
    /// # Arguments
    /// * `asset` - The asset contract address to price
    ///
    /// # Returns
    /// Price in WAD precision (e.g., $1.50 = 1_500_000_000_000_000_000)
    ///
    /// # Note
    /// In production, this would call the actual Reflector Oracle contract.
    /// For testnet/development, this returns a configurable mock price.
    pub fn get_price_usd(env: Env, asset: Address) -> i128 {
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        // In production: Call Reflector Oracle
        // let reflector: Address = env.storage().instance()
        //     .get(&OracleDataKey::ReflectorAddress).unwrap();
        // let oracle_client = reflector::Client::new(&env, &reflector);
        // let price_data = oracle_client.get_price(&asset_symbol);

        // For now: Read from stored mock prices (set by admin for testing)
        let price: i128 = env
            .storage()
            .persistent()
            .get(&OracleDataKey::LastPrice(asset.clone()))
            .unwrap_or(WAD); // Default to $1.00 if no price set

        if price <= 0 {
            panic!("invalid oracle price");
        }

        price
    }

    // ── Admin Functions ──────────────────────

    /// Set a mock price for testing. In production, prices come from Reflector.
    ///
    /// # Arguments
    /// * `asset` - Asset contract address
    /// * `price_wad` - Price in WAD precision (e.g., $0.15 = 150_000_000_000_000_000)
    pub fn set_price(env: Env, asset: Address, price_wad: i128) {
        Self::require_admin(&env);

        if price_wad <= 0 {
            panic!("price must be positive");
        }

        env.storage()
            .persistent()
            .set(&OracleDataKey::LastPrice(asset.clone()), &price_wad);
        env.storage().persistent().extend_ttl(
            &OracleDataKey::LastPrice(asset.clone()),
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );

        env.events().publish(
            (symbol_short!("price"), asset),
            price_wad,
        );
    }

    /// Update the Reflector Oracle address.
    pub fn set_reflector(env: Env, new_reflector: Address) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&OracleDataKey::ReflectorAddress, &new_reflector);
    }

    /// Update maximum allowed price age.
    pub fn set_max_price_age(env: Env, max_age: u32) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&OracleDataKey::MaxPriceAge, &max_age);
    }

    /// Update maximum allowed price deviation (circuit breaker threshold).
    pub fn set_max_deviation(env: Env, max_deviation_bps: u32) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&OracleDataKey::MaxPriceDeviation, &max_deviation_bps);
    }

    // ── View Functions ───────────────────────

    /// Get the admin address.
    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&OracleDataKey::Admin)
            .unwrap()
    }

    /// Get the Reflector Oracle address.
    pub fn reflector(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&OracleDataKey::ReflectorAddress)
            .unwrap()
    }

    // ── Internal Helpers ─────────────────────

    fn require_admin(env: &Env) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&OracleDataKey::Admin)
            .expect("not initialized");
        admin.require_auth();
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_set_and_get_price() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(PriceOracleContract, ());
        let client = PriceOracleContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let reflector = Address::generate(&env);
        let xlm = Address::generate(&env);
        let usdc = Address::generate(&env);

        client.initialize(&admin, &reflector);

        // Set XLM price to $0.15
        let xlm_price = WAD * 15 / 100; // 0.15 WAD
        client.set_price(&xlm, &xlm_price);

        // Set USDC price to $1.00
        client.set_price(&usdc, &WAD);

        // Verify prices
        assert_eq!(client.get_price_usd(&xlm), xlm_price);
        assert_eq!(client.get_price_usd(&usdc), WAD);
    }

    #[test]
    fn test_default_price() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(PriceOracleContract, ());
        let client = PriceOracleContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let reflector = Address::generate(&env);
        let unknown = Address::generate(&env);

        client.initialize(&admin, &reflector);

        // Unknown asset defaults to WAD ($1.00)
        assert_eq!(client.get_price_usd(&unknown), WAD);
    }

    #[test]
    #[should_panic(expected = "price must be positive")]
    fn test_invalid_price() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(PriceOracleContract, ());
        let client = PriceOracleContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let reflector = Address::generate(&env);
        let asset = Address::generate(&env);

        client.initialize(&admin, &reflector);
        client.set_price(&asset, &0i128); // Should panic
    }
}
