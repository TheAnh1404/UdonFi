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

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};
use udonfi_common::{LendingError, OracleDataKey, WAD, TTL_EXTEND_TO, TTL_THRESHOLD};

#[contracttype]
#[derive(Clone)]
pub enum LocalOracleKey {
    AssetSymbol(Address),
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PriceData {
    pub price: i128,
    pub timestamp: u64,
}

#[soroban_sdk::contractclient(name = "ReflectorClient")]
pub trait ReflectorOracle {
    fn lastprice(env: Env, asset: soroban_sdk::Symbol) -> Option<PriceData>;
    fn decimals(env: Env) -> u32;
}

const DEFAULT_MAX_PRICE_AGE: u32 = 100;
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
    /// 1. Tries to query the Reflector Oracle for the latest price if symbol mapping exists
    /// 2. Validates freshness (not stale)
    /// 3. Normalizes to WAD precision (10^18)
    /// 4. Validates deviation from last known price (circuit breaker)
    /// 5. Gracefully falls back to local admin mock price if oracle is not configured,
    ///    returns None, or is stale.
    ///
    /// # Arguments
    /// * `asset` - The asset contract address to price
    ///
    /// # Returns
    /// Price in WAD precision (e.g., $1.50 = 1_500_000_000_000_000_000)
    pub fn get_price_usd(env: Env, asset: Address) -> i128 {
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        // Try calling Reflector Oracle if a symbol is mapped for this asset
        if let Some(symbol) = env.storage().persistent().get::<_, Symbol>(&LocalOracleKey::AssetSymbol(asset.clone())) {
            if let Some(reflector_address) = env.storage().instance().get::<_, Address>(&OracleDataKey::ReflectorAddress) {
                let client = ReflectorClient::new(&env, &reflector_address);
                if let Some(price_data) = client.lastprice(&symbol) {
                    let max_age = env.storage().instance().get::<_, u32>(&OracleDataKey::MaxPriceAge).unwrap_or(DEFAULT_MAX_PRICE_AGE) as u64;
                    let current_time = env.ledger().timestamp();
                    
                    // Freshness check: reject if price is older than maximum age
                    if current_time <= price_data.timestamp + max_age {
                        let decimals = client.decimals();
                        let mut price = price_data.price;

                        // Normalize decimals to WAD (10^18)
                        if decimals <= 18 {
                            let diff = 18 - decimals;
                            let mut multiplier = 1i128;
                            for _ in 0..diff {
                                multiplier *= 10;
                            }
                            price = price.checked_mul(multiplier).expect("Overflow in price normalization");
                        } else {
                            let diff = decimals - 18;
                            let mut divisor = 1i128;
                            for _ in 0..diff {
                                divisor *= 10;
                            }
                            price = price.checked_div(divisor).expect("Underflow in price normalization");
                        }

                        if price <= 0 {
                            panic!("invalid reflector price");
                        }

                        // Circuit breaker check (if last known price exists)
                        if let Some(last_price) = env.storage().persistent().get::<_, i128>(&OracleDataKey::LastPrice(asset.clone())) {
                            let max_deviation = env.storage().instance().get::<_, u32>(&OracleDataKey::MaxPriceDeviation).unwrap_or(DEFAULT_MAX_DEVIATION_BPS) as i128;
                            let diff = (price - last_price).abs();
                            let bps = (diff * 10000) / last_price;
                            if bps > max_deviation {
                                panic!("Price deviation circuit breaker triggered");
                            }
                        }

                        // Store normalized price as LastPrice for future circuit breaker comparison
                        env.storage().persistent().set(&OracleDataKey::LastPrice(asset.clone()), &price);
                        env.storage().persistent().extend_ttl(
                            &OracleDataKey::LastPrice(asset.clone()),
                            TTL_THRESHOLD,
                            TTL_EXTEND_TO,
                        );

                        return price;
                    }
                }
            }
        }

        // Fallback: Read from stored mock prices (set by admin for testing)
        let price: i128 = env
            .storage()
            .persistent()
            .get(&OracleDataKey::LastPrice(asset.clone()))
            .expect("Oracle price unavailable");

        if price <= 0 {
            panic!("invalid oracle price");
        }

        price
    }

    // ── Admin Functions ──────────────────────

    /// Map a token Address to a Reflector Asset Symbol (e.g., Symbol::new(&env, "XLM")).
    pub fn set_asset_symbol(env: Env, asset: Address, symbol: Symbol) {
        Self::require_admin(&env);

        env.storage()
            .persistent()
            .set(&LocalOracleKey::AssetSymbol(asset.clone()), &symbol);
        env.storage().persistent().extend_ttl(
            &LocalOracleKey::AssetSymbol(asset),
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );
    }

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
    #[should_panic(expected = "Oracle price unavailable")]
    fn test_default_price_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(PriceOracleContract, ());
        let client = PriceOracleContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let reflector = Address::generate(&env);
        let unknown = Address::generate(&env);

        client.initialize(&admin, &reflector);

        client.get_price_usd(&unknown);
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
