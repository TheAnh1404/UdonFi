//! # UdonFi aToken Contract
//!
//! Deposit receipt token implementing a subset of SEP-41.
//! Uses scaled balances — the actual balance at any point in time is:
//!
//!   actual_balance = scaled_balance × liquidity_index
//!
//! Only the LendingPool Router can mint/burn tokens.
//! Users can transfer aTokens between each other (secondary market).

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol,
};
use udonfi_common::{LendingError, TokenDataKey, RAY, TTL_EXTEND_TO, TTL_THRESHOLD};

// ─────────────────────────────────────────────
// Contract
// ─────────────────────────────────────────────

#[contract]
pub struct ATokenContract;

#[contractimpl]
impl ATokenContract {
    // ── Constructor ──────────────────────────

    /// Initialize the aToken contract. Called once at deployment.
    ///
    /// # Arguments
    /// * `pool` - LendingPool Router address (only this can mint/burn)
    /// * `underlying_asset` - The asset this aToken represents
    /// * `reserve_index` - Reserve index in the pool
    /// * `name` - Token display name (e.g., "UdonFi Interest Bearing XLM")
    /// * `symbol` - Token symbol (e.g., "aXLM")
    /// * `decimals` - Same decimals as underlying asset
    pub fn initialize(
        env: Env,
        pool: Address,
        underlying_asset: Address,
        reserve_index: u32,
        name: String,
        symbol: Symbol,
        decimals: u32,
    ) {
        // Prevent re-initialization
        if env.storage().instance().has(&TokenDataKey::Pool) {
            panic!("already initialized");
        }

        env.storage().instance().set(&TokenDataKey::Pool, &pool);
        env.storage()
            .instance()
            .set(&TokenDataKey::UnderlyingAsset, &underlying_asset);
        env.storage()
            .instance()
            .set(&TokenDataKey::ReserveIndex, &reserve_index);
        env.storage().instance().set(&TokenDataKey::Name, &name);
        env.storage()
            .instance()
            .set(&TokenDataKey::TokenSymbol, &symbol);
        env.storage()
            .instance()
            .set(&TokenDataKey::Decimals, &decimals);
        env.storage()
            .instance()
            .set(&TokenDataKey::TotalScaledSupply, &0i128);

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    // ── Pool-Only Operations ─────────────────

    /// Mint aTokens to a user. Only callable by the LendingPool.
    ///
    /// # Arguments
    /// * `to` - Recipient address
    /// * `scaled_amount` - Amount in scaled terms (amount / liquidity_index)
    pub fn mint(env: Env, to: Address, scaled_amount: i128) {
        Self::require_pool(&env);

        if scaled_amount <= 0 {
            panic!("invalid amount");
        }

        // Update user's scaled balance
        let current: i128 = env
            .storage()
            .persistent()
            .get(&TokenDataKey::ScaledBalance(to.clone()))
            .unwrap_or(0);
        let new_balance = current
            .checked_add(scaled_amount)
            .expect("overflow");
        env.storage()
            .persistent()
            .set(&TokenDataKey::ScaledBalance(to.clone()), &new_balance);
        env.storage().persistent().extend_ttl(
            &TokenDataKey::ScaledBalance(to.clone()),
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );

        // Update total scaled supply
        let total: i128 = env
            .storage()
            .instance()
            .get(&TokenDataKey::TotalScaledSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&TokenDataKey::TotalScaledSupply, &(total + scaled_amount));

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        // Emit mint event
        env.events().publish(
            (symbol_short!("mint"), to),
            scaled_amount,
        );
    }

    /// Burn aTokens from a user. Only callable by the LendingPool.
    ///
    /// # Arguments
    /// * `from` - Address to burn from
    /// * `scaled_amount` - Amount in scaled terms to burn
    pub fn burn(env: Env, from: Address, scaled_amount: i128) {
        Self::require_pool(&env);

        if scaled_amount <= 0 {
            panic!("invalid amount");
        }

        let current: i128 = env
            .storage()
            .persistent()
            .get(&TokenDataKey::ScaledBalance(from.clone()))
            .unwrap_or(0);

        if current < scaled_amount {
            panic!("insufficient balance");
        }

        let new_balance = current - scaled_amount;
        env.storage()
            .persistent()
            .set(&TokenDataKey::ScaledBalance(from.clone()), &new_balance);
        env.storage().persistent().extend_ttl(
            &TokenDataKey::ScaledBalance(from.clone()),
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );

        // Update total supply
        let total: i128 = env
            .storage()
            .instance()
            .get(&TokenDataKey::TotalScaledSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&TokenDataKey::TotalScaledSupply, &(total - scaled_amount));

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("burn"), from),
            scaled_amount,
        );
    }

    // ── SEP-41 Compatible Interface ──────────

    /// Get the scaled balance (internal representation).
    pub fn scaled_balance_of(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&TokenDataKey::ScaledBalance(id))
            .unwrap_or(0)
    }

    /// Get the total scaled supply.
    pub fn scaled_total_supply(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&TokenDataKey::TotalScaledSupply)
            .unwrap_or(0)
    }

    /// Get the token decimals.
    pub fn decimals(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&TokenDataKey::Decimals)
            .unwrap_or(7)
    }

    /// Get the token name.
    pub fn name(env: Env) -> String {
        env.storage()
            .instance()
            .get(&TokenDataKey::Name)
            .unwrap_or(String::from_str(&env, "UdonFi aToken"))
    }

    /// Get the token symbol.
    pub fn symbol(env: Env) -> Symbol {
        env.storage()
            .instance()
            .get(&TokenDataKey::TokenSymbol)
            .unwrap_or(symbol_short!("aToken"))
    }

    /// Get the underlying asset address.
    pub fn underlying_asset(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&TokenDataKey::UnderlyingAsset)
            .unwrap()
    }

    /// Get the associated LendingPool address.
    pub fn pool(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&TokenDataKey::Pool)
            .unwrap()
    }

    // ── Internal Helpers ─────────────────────

    /// Verify the caller is the authorized LendingPool contract.
    fn require_pool(env: &Env) {
        let pool: Address = env
            .storage()
            .instance()
            .get(&TokenDataKey::Pool)
            .expect("not initialized");
        pool.require_auth();
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_mint_and_burn() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(ATokenContract, ());
        let client = ATokenContractClient::new(&env, &contract_id);

        let pool = Address::generate(&env);
        let user = Address::generate(&env);
        let asset = Address::generate(&env);

        // Initialize
        client.initialize(
            &pool,
            &asset,
            &0u32,
            &String::from_str(&env, "aXLM"),
            &symbol_short!("aXLM"),
            &7u32,
        );

        // Mint
        client.mint(&user, &1000i128);
        assert_eq!(client.scaled_balance_of(&user), 1000);
        assert_eq!(client.scaled_total_supply(), 1000);

        // Burn partial
        client.burn(&user, &400i128);
        assert_eq!(client.scaled_balance_of(&user), 600);
        assert_eq!(client.scaled_total_supply(), 600);
    }

    #[test]
    fn test_metadata() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(ATokenContract, ());
        let client = ATokenContractClient::new(&env, &contract_id);

        let pool = Address::generate(&env);
        let asset = Address::generate(&env);

        client.initialize(
            &pool,
            &asset,
            &0u32,
            &String::from_str(&env, "UdonFi aXLM"),
            &symbol_short!("aXLM"),
            &7u32,
        );

        assert_eq!(client.decimals(), 7);
        assert_eq!(client.symbol(), symbol_short!("aXLM"));
        assert_eq!(client.underlying_asset(), asset);
        assert_eq!(client.pool(), pool);
    }

    #[test]
    #[should_panic(expected = "insufficient balance")]
    fn test_burn_insufficient() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(ATokenContract, ());
        let client = ATokenContractClient::new(&env, &contract_id);

        let pool = Address::generate(&env);
        let user = Address::generate(&env);
        let asset = Address::generate(&env);

        client.initialize(
            &pool,
            &asset,
            &0u32,
            &String::from_str(&env, "aXLM"),
            &symbol_short!("aXLM"),
            &7u32,
        );

        client.mint(&user, &100i128);
        client.burn(&user, &200i128); // Should panic
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(ATokenContract, ());
        let client = ATokenContractClient::new(&env, &contract_id);

        let pool = Address::generate(&env);
        let asset = Address::generate(&env);

        client.initialize(
            &pool,
            &asset,
            &0u32,
            &String::from_str(&env, "aXLM"),
            &symbol_short!("aXLM"),
            &7u32,
        );

        // Second call should fail
        client.initialize(
            &pool,
            &asset,
            &0u32,
            &String::from_str(&env, "aXLM"),
            &symbol_short!("aXLM"),
            &7u32,
        );
    }
}
