//! # UdonFi Price Oracle Adapter
//!
//! Adapter contract for SEP-40-style oracle feeds such as Reflector.
//!
//! The contract supports two explicit modes:
//! - `reflector`: production/Testnet/demo mode. Prices are read from the
//!   configured external oracle contract.
//! - `manual`: local test mode. Admin-set prices are accepted only in this mode.
//!
//! All returned prices are normalized to WAD (10^18) USD precision.

#![no_std]
#![allow(deprecated)]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};
use udonfi_common::{OracleDataKey, TTL_EXTEND_TO, TTL_THRESHOLD};

#[contracttype]
#[derive(Clone)]
pub enum LocalOracleKey {
    ReflectorAsset(Address),
    ManualPrice(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PriceData {
    pub price: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Asset {
    Stellar(Address),
    Other(Symbol),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ManualPriceData {
    pub price_wad: i128,
    pub updated_ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OracleStatus {
    pub mode: Symbol,
    pub price_wad: i128,
    pub updated_at: u64,
    pub current_ledger: u32,
    pub max_staleness_ledgers: u32,
    pub is_stale: bool,
}

#[soroban_sdk::contractclient(name = "ReflectorClient")]
pub trait ReflectorOracle {
    fn lastprice(env: Env, asset: Asset) -> Option<PriceData>;
    fn decimals(env: Env) -> u32;
}

const DEFAULT_MAX_PRICE_STALENESS_LEDGERS: u32 = 120;
const DEFAULT_MAX_DEVIATION_BPS: u32 = 2000;
const ESTIMATED_LEDGER_SECONDS: u64 = 5;

#[contract]
pub struct PriceOracleContract;

#[contractimpl]
impl PriceOracleContract {
    /// Initialize the oracle adapter.
    ///
    /// New deployments should configure `ORACLE_MODE=reflector` and set a real
    /// Reflector/SEP-40 oracle contract address. Tests can switch to `manual`.
    pub fn initialize(env: Env, admin: Address, reflector_address: Address) {
        if env.storage().instance().has(&OracleDataKey::Admin) {
            panic!("already initialized");
        }

        env.storage().instance().set(&OracleDataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&OracleDataKey::ReflectorAddress, &reflector_address);
        env.storage()
            .instance()
            .set(&OracleDataKey::OracleMode, &Self::reflector_mode(&env));
        env.storage().instance().set(
            &OracleDataKey::MaxPriceStalenessLedgers,
            &DEFAULT_MAX_PRICE_STALENESS_LEDGERS,
        );
        env.storage().instance().set(
            &OracleDataKey::MaxPriceAge,
            &DEFAULT_MAX_PRICE_STALENESS_LEDGERS,
        );
        env.storage().instance().set(
            &OracleDataKey::MaxPriceDeviation,
            &DEFAULT_MAX_DEVIATION_BPS,
        );

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    /// Get the oracle-adapter price for an asset in WAD precision.
    pub fn get_price(env: Env, asset: Address) -> i128 {
        Self::get_price_wad(env, asset)
    }

    /// Get the USD price of an asset in WAD precision.
    pub fn get_price_wad(env: Env, asset: Address) -> i128 {
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        let mode = Self::mode(&env);
        let price_wad = if mode == Self::manual_mode(&env) {
            Self::manual_price_wad(&env, &asset, true).0
        } else if mode == Self::reflector_mode(&env) {
            Self::reflector_price_wad(&env, &asset, true).0
        } else {
            panic!("invalid oracle mode");
        };

        if price_wad <= 0 {
            panic!("invalid oracle price");
        }

        price_wad
    }

    /// Backward-compatible alias used by existing pool/liquidation code.
    pub fn get_price_usd(env: Env, asset: Address) -> i128 {
        Self::get_price_wad(env, asset)
    }

    /// Return current oracle status for frontend warnings.
    pub fn get_oracle_status(env: Env, asset: Address) -> OracleStatus {
        let mode = Self::mode(&env);
        let max_staleness_ledgers = Self::max_staleness_ledgers(&env);
        let current_ledger = env.ledger().sequence();

        if mode == Self::manual_mode(&env) {
            let (price_wad, updated_ledger) = Self::manual_price_wad(&env, &asset, false);
            return OracleStatus {
                mode,
                price_wad,
                updated_at: updated_ledger as u64,
                current_ledger,
                max_staleness_ledgers,
                is_stale: Self::is_manual_stale(&env, updated_ledger),
            };
        }

        if mode == Self::reflector_mode(&env) {
            let (price_wad, timestamp) = Self::reflector_price_wad(&env, &asset, false);
            return OracleStatus {
                mode,
                price_wad,
                updated_at: timestamp,
                current_ledger,
                max_staleness_ledgers,
                is_stale: Self::is_reflector_stale(&env, timestamp),
            };
        }

        panic!("invalid oracle mode");
    }

    /// Map a reserve asset to a SEP-40 oracle asset.
    pub fn set_reflector_asset(env: Env, asset: Address, oracle_asset: Asset) {
        Self::require_admin(&env);
        env.storage()
            .persistent()
            .set(&LocalOracleKey::ReflectorAsset(asset.clone()), &oracle_asset);
        env.storage().persistent().extend_ttl(
            &LocalOracleKey::ReflectorAsset(asset),
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );
    }

    /// Convenience mapper for Stellar assets. Useful from deployment scripts.
    pub fn set_reflector_stellar_asset(env: Env, asset: Address, stellar_asset: Address) {
        Self::set_reflector_asset(env, asset, Asset::Stellar(stellar_asset));
    }

    /// Backward-compatible symbol mapper for SEP-40 `Asset::Other(Symbol)`.
    pub fn set_asset_symbol(env: Env, asset: Address, symbol: Symbol) {
        Self::set_reflector_asset(env, asset, Asset::Other(symbol));
    }

    /// Set a manual price for local tests.
    ///
    /// This function is deliberately disabled unless `oracle_mode` is `manual`.
    pub fn set_price(env: Env, asset: Address, price_wad: i128) {
        Self::require_admin(&env);

        if Self::mode(&env) != Self::manual_mode(&env) {
            panic!("manual oracle mode required");
        }
        if price_wad <= 0 {
            panic!("price must be positive");
        }

        let manual = ManualPriceData {
            price_wad,
            updated_ledger: env.ledger().sequence(),
        };
        env.storage()
            .persistent()
            .set(&LocalOracleKey::ManualPrice(asset.clone()), &manual);
        env.storage().persistent().extend_ttl(
            &LocalOracleKey::ManualPrice(asset.clone()),
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );

        Self::store_last_price(&env, &asset, price_wad);

        env.events()
            .publish((symbol_short!("price"), asset), price_wad);
    }

    /// Update the Reflector Oracle address.
    pub fn set_reflector(env: Env, new_reflector: Address) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&OracleDataKey::ReflectorAddress, &new_reflector);
    }

    /// Set oracle mode to `reflector` or `manual`.
    pub fn set_oracle_mode(env: Env, mode: Symbol) {
        Self::require_admin(&env);
        if mode != Self::reflector_mode(&env) && mode != Self::manual_mode(&env) {
            panic!("invalid oracle mode");
        }
        env.storage().instance().set(&OracleDataKey::OracleMode, &mode);
    }

    /// Update maximum allowed price staleness in ledgers.
    pub fn set_max_price_staleness_ledgers(env: Env, max_staleness_ledgers: u32) {
        Self::require_admin(&env);
        if max_staleness_ledgers == 0 {
            panic!("invalid staleness");
        }
        env.storage().instance().set(
            &OracleDataKey::MaxPriceStalenessLedgers,
            &max_staleness_ledgers,
        );
        env.storage()
            .instance()
            .set(&OracleDataKey::MaxPriceAge, &max_staleness_ledgers);
    }

    /// Backward-compatible alias for legacy scripts.
    pub fn set_max_price_age(env: Env, max_age: u32) {
        Self::set_max_price_staleness_ledgers(env, max_age);
    }

    /// Update maximum allowed price deviation (basis points).
    pub fn set_max_deviation(env: Env, max_deviation_bps: u32) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&OracleDataKey::MaxPriceDeviation, &max_deviation_bps);
    }

    /// Get the admin address.
    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&OracleDataKey::Admin).unwrap()
    }

    /// Get the Reflector Oracle address.
    pub fn reflector(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&OracleDataKey::ReflectorAddress)
            .unwrap()
    }

    /// Get the current oracle mode.
    pub fn oracle_mode(env: Env) -> Symbol {
        Self::mode(&env)
    }

    fn reflector_price_wad(env: &Env, asset: &Address, enforce_freshness: bool) -> (i128, u64) {
        let reflector_address: Address = env
            .storage()
            .instance()
            .get(&OracleDataKey::ReflectorAddress)
            .expect("reflector not configured");
        let oracle_asset = env
            .storage()
            .persistent()
            .get::<_, Asset>(&LocalOracleKey::ReflectorAsset(asset.clone()))
            .unwrap_or_else(|| Asset::Stellar(asset.clone()));

        let client = ReflectorClient::new(env, &reflector_address);
        let price_data = client
            .lastprice(&oracle_asset)
            .expect("oracle price unavailable");

        if price_data.price <= 0 {
            panic!("invalid reflector price");
        }
        if enforce_freshness && Self::is_reflector_stale(env, price_data.timestamp) {
            panic!("stale oracle price");
        }

        let decimals = client.decimals();
        let price_wad = Self::normalize_to_wad(price_data.price, decimals);
        if price_wad <= 0 {
            panic!("invalid reflector price");
        }

        if enforce_freshness {
            Self::check_deviation(env, asset, price_wad);
            Self::store_last_price(env, asset, price_wad);
        }

        (price_wad, price_data.timestamp)
    }

    fn manual_price_wad(env: &Env, asset: &Address, enforce_freshness: bool) -> (i128, u32) {
        let manual = env
            .storage()
            .persistent()
            .get::<_, ManualPriceData>(&LocalOracleKey::ManualPrice(asset.clone()))
            .expect("Oracle price unavailable");

        if manual.price_wad <= 0 {
            panic!("invalid oracle price");
        }
        if enforce_freshness && Self::is_manual_stale(env, manual.updated_ledger) {
            panic!("stale oracle price");
        }

        (manual.price_wad, manual.updated_ledger)
    }

    fn normalize_to_wad(price: i128, decimals: u32) -> i128 {
        if decimals == 18 {
            return price;
        }
        if decimals < 18 {
            return price
                .checked_mul(Self::pow10(18 - decimals))
                .expect("price normalization overflow");
        }
        price
            .checked_div(Self::pow10(decimals - 18))
            .expect("price normalization underflow")
    }

    fn pow10(exp: u32) -> i128 {
        let mut value = 1i128;
        for _ in 0..exp {
            value = value.checked_mul(10).expect("pow10 overflow");
        }
        value
    }

    fn is_reflector_stale(env: &Env, timestamp: u64) -> bool {
        let now = env.ledger().timestamp();
        let max_age_seconds =
            Self::max_staleness_ledgers(env) as u64 * ESTIMATED_LEDGER_SECONDS;
        timestamp > now || now > timestamp.saturating_add(max_age_seconds)
    }

    fn is_manual_stale(env: &Env, updated_ledger: u32) -> bool {
        env.ledger().sequence().saturating_sub(updated_ledger) > Self::max_staleness_ledgers(env)
    }

    fn check_deviation(env: &Env, asset: &Address, price_wad: i128) {
        if let Some(last_price) = env
            .storage()
            .persistent()
            .get::<_, i128>(&OracleDataKey::LastPrice(asset.clone()))
        {
            if last_price <= 0 {
                return;
            }
            let max_deviation = env
                .storage()
                .instance()
                .get::<_, u32>(&OracleDataKey::MaxPriceDeviation)
                .unwrap_or(DEFAULT_MAX_DEVIATION_BPS) as i128;
            let diff = if price_wad > last_price {
                price_wad - last_price
            } else {
                last_price - price_wad
            };
            let bps = diff
                .checked_mul(10_000)
                .expect("deviation overflow")
                .checked_div(last_price)
                .expect("deviation underflow");
            if bps > max_deviation {
                panic!("price deviation circuit breaker triggered");
            }
        }
    }

    fn store_last_price(env: &Env, asset: &Address, price_wad: i128) {
        env.storage()
            .persistent()
            .set(&OracleDataKey::LastPrice(asset.clone()), &price_wad);
        env.storage().persistent().extend_ttl(
            &OracleDataKey::LastPrice(asset.clone()),
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );
    }

    fn mode(env: &Env) -> Symbol {
        env.storage()
            .instance()
            .get(&OracleDataKey::OracleMode)
            .unwrap_or_else(|| Self::reflector_mode(env))
    }

    fn max_staleness_ledgers(env: &Env) -> u32 {
        env.storage()
            .instance()
            .get(&OracleDataKey::MaxPriceStalenessLedgers)
            .or_else(|| env.storage().instance().get(&OracleDataKey::MaxPriceAge))
            .unwrap_or(DEFAULT_MAX_PRICE_STALENESS_LEDGERS)
    }

    fn reflector_mode(env: &Env) -> Symbol {
        Symbol::new(env, "reflector")
    }

    fn manual_mode(env: &Env) -> Symbol {
        Symbol::new(env, "manual")
    }

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
    use soroban_sdk::{
        contract, contractimpl,
        testutils::{Address as _, Ledger},
        Env,
    };
    use udonfi_common::WAD;

    #[contract]
    pub struct MockReflectorContract;

    #[contractimpl]
    impl MockReflectorContract {
        pub fn lastprice(env: Env, asset: Asset) -> Option<PriceData> {
            let timestamp = env.ledger().timestamp();
            match asset {
                Asset::Other(symbol) if symbol == Symbol::new(&env, "XLM") => Some(PriceData {
                    price: 15_000_000,
                    timestamp,
                }),
                Asset::Stellar(_) => Some(PriceData {
                    price: 25_000_000,
                    timestamp,
                }),
                _ => None,
            }
        }

        pub fn decimals(_env: Env) -> u32 {
            8
        }
    }

    fn setup_manual(env: &Env) -> (PriceOracleContractClient<'_>, Address, Address) {
        env.mock_all_auths();
        let contract_id = env.register(PriceOracleContract, ());
        let client = PriceOracleContractClient::new(env, &contract_id);
        let admin = Address::generate(env);
        let reflector = Address::generate(env);
        let xlm = Address::generate(env);
        client.initialize(&admin, &reflector);
        client.set_oracle_mode(&Symbol::new(env, "manual"));
        (client, admin, xlm)
    }

    #[test]
    fn test_manual_set_and_get_price() {
        let env = Env::default();
        let (client, _admin, xlm) = setup_manual(&env);
        let usdc = Address::generate(&env);

        let xlm_price = WAD * 15 / 100;
        client.set_price(&xlm, &xlm_price);
        client.set_price(&usdc, &WAD);

        assert_eq!(client.get_price(&xlm), xlm_price);
        assert_eq!(client.get_price_wad(&xlm), xlm_price);
        assert_eq!(client.get_price_usd(&usdc), WAD);
    }

    #[test]
    fn test_reflector_adapter_normalizes_decimals() {
        let env = Env::default();
        env.mock_all_auths();

        let reflector_id = env.register(MockReflectorContract, ());
        let contract_id = env.register(PriceOracleContract, ());
        let client = PriceOracleContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let xlm = Address::generate(&env);

        client.initialize(&admin, &reflector_id);
        client.set_asset_symbol(&xlm, &Symbol::new(&env, "XLM"));

        assert_eq!(client.get_price_wad(&xlm), WAD * 15 / 100);
    }

    #[test]
    fn test_reflector_stellar_asset_mapping_compiles() {
        let env = Env::default();
        env.mock_all_auths();

        let reflector_id = env.register(MockReflectorContract, ());
        let contract_id = env.register(PriceOracleContract, ());
        let client = PriceOracleContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let xlm = Address::generate(&env);

        client.initialize(&admin, &reflector_id);
        client.set_reflector_stellar_asset(&xlm, &xlm);

        assert_eq!(client.get_price_wad(&xlm), WAD / 4);
    }

    #[test]
    #[should_panic(expected = "Oracle price unavailable")]
    fn test_default_manual_price_fails() {
        let env = Env::default();
        let (client, _admin, _xlm) = setup_manual(&env);
        let unknown = Address::generate(&env);

        client.get_price_usd(&unknown);
    }

    #[test]
    #[should_panic(expected = "manual oracle mode required")]
    fn test_manual_set_price_disabled_in_reflector_mode() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(PriceOracleContract, ());
        let client = PriceOracleContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let reflector = Address::generate(&env);
        let asset = Address::generate(&env);

        client.initialize(&admin, &reflector);
        client.set_price(&asset, &WAD);
    }

    #[test]
    #[should_panic(expected = "price must be positive")]
    fn test_invalid_manual_price() {
        let env = Env::default();
        let (client, _admin, asset) = setup_manual(&env);

        client.set_price(&asset, &0i128);
    }

    #[test]
    #[should_panic(expected = "stale oracle price")]
    fn test_manual_stale_price_rejected() {
        let env = Env::default();
        let (client, _admin, asset) = setup_manual(&env);

        client.set_max_price_staleness_ledgers(&1);
        client.set_price(&asset, &WAD);
        env.ledger().set_sequence_number(env.ledger().sequence() + 2);

        client.get_price_wad(&asset);
    }

    #[test]
    fn test_oracle_status_reports_stale_manual_price() {
        let env = Env::default();
        let (client, _admin, asset) = setup_manual(&env);

        client.set_max_price_staleness_ledgers(&1);
        client.set_price(&asset, &WAD);
        env.ledger().set_sequence_number(env.ledger().sequence() + 2);

        let status = client.get_oracle_status(&asset);
        assert!(status.is_stale);
        assert_eq!(status.price_wad, WAD);
    }
}
