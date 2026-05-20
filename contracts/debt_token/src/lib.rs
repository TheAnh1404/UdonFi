//! # UdonFi debtToken Contract
//!
//! Non-transferable token that tracks user debt positions.
//! Uses scaled balances — the actual debt at any point in time is:
//!
//!   actual_debt = scaled_balance × borrow_index
//!
//! Only the LendingPool Router can mint/burn tokens.
//! Transfer is ALWAYS rejected — debt cannot be moved between users.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, symbol_short, Address, Env, String, Symbol,
};
use udonfi_common::{LendingError, TokenDataKey, TTL_EXTEND_TO, TTL_THRESHOLD};

#[contract]
pub struct DebtTokenContract;

#[contractimpl]
impl DebtTokenContract {
    // ── Constructor ──────────────────────────

    /// Initialize the debtToken contract. Called once at deployment.
    ///
    /// # Arguments
    /// * `pool` - LendingPool Router address (only this can mint/burn)
    /// * `underlying_asset` - The asset this debt represents
    /// * `reserve_index` - Reserve index in the pool
    /// * `name` - Token display name (e.g., "UdonFi Debt USDC")
    /// * `symbol` - Token symbol (e.g., "debtUSDC")
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

    /// Mint debtTokens to record a new borrow. Only callable by LendingPool.
    ///
    /// # Arguments
    /// * `to` - Borrower address
    /// * `scaled_amount` - Amount in scaled terms (amount / borrow_index)
    pub fn mint(env: Env, to: Address, scaled_amount: i128) {
        Self::require_pool(&env);

        if scaled_amount <= 0 {
            panic!("invalid amount");
        }

        let current: i128 = env
            .storage()
            .persistent()
            .get(&TokenDataKey::ScaledBalance(to.clone()))
            .unwrap_or(0);
        let new_balance = current.checked_add(scaled_amount).expect("overflow");
        env.storage()
            .persistent()
            .set(&TokenDataKey::ScaledBalance(to.clone()), &new_balance);
        env.storage().persistent().extend_ttl(
            &TokenDataKey::ScaledBalance(to.clone()),
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );

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

        env.events().publish(
            (symbol_short!("mint"), to),
            scaled_amount,
        );
    }

    /// Burn debtTokens when a user repays. Only callable by LendingPool.
    ///
    /// # Arguments
    /// * `from` - Borrower address
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
            panic!("burn exceeds balance");
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

    // ── Non-Transferable ─────────────────────

    /// Transfer is ALWAYS rejected. Debt tokens cannot be moved between users.
    pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {
        panic!("debtToken is non-transferable");
    }

    // ── View Functions ───────────────────────

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
            .unwrap_or(String::from_str(&env, "UdonFi debtToken"))
    }

    /// Get the token symbol.
    pub fn symbol(env: Env) -> Symbol {
        env.storage()
            .instance()
            .get(&TokenDataKey::TokenSymbol)
            .unwrap_or(symbol_short!("debt"))
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

        let contract_id = env.register(DebtTokenContract, ());
        let client = DebtTokenContractClient::new(&env, &contract_id);

        let pool = Address::generate(&env);
        let user = Address::generate(&env);
        let asset = Address::generate(&env);

        client.initialize(
            &pool,
            &asset,
            &0u32,
            &String::from_str(&env, "debtUSDC"),
            &symbol_short!("dUSDC"),
            &7u32,
        );

        // Mint debt
        client.mint(&user, &500i128);
        assert_eq!(client.scaled_balance_of(&user), 500);
        assert_eq!(client.scaled_total_supply(), 500);

        // Repay (burn) partial
        client.burn(&user, &200i128);
        assert_eq!(client.scaled_balance_of(&user), 300);
        assert_eq!(client.scaled_total_supply(), 300);

        // Repay remaining
        client.burn(&user, &300i128);
        assert_eq!(client.scaled_balance_of(&user), 0);
        assert_eq!(client.scaled_total_supply(), 0);
    }

    #[test]
    #[should_panic(expected = "debtToken is non-transferable")]
    fn test_transfer_rejected() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(DebtTokenContract, ());
        let client = DebtTokenContractClient::new(&env, &contract_id);

        let pool = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let asset = Address::generate(&env);

        client.initialize(
            &pool,
            &asset,
            &0u32,
            &String::from_str(&env, "debtUSDC"),
            &symbol_short!("dUSDC"),
            &7u32,
        );

        client.mint(&user1, &100i128);
        client.transfer(&user1, &user2, &50i128); // Should panic
    }
}
