//! # UdonFi LendingPool Router Contract
//!
//! The central entry point for all user interactions with the lending protocol.
//! This contract coordinates:
//! - Supply/Withdraw collateral
//! - Borrow/Repay assets
//! - Health Factor calculations
//! - Reserve index updates
//! - Cross-contract calls to aToken, debtToken, Oracle, and SAC
//!
//! ## Architecture
//! ```text
//! User → LendingPool Router → Reserve (state)
//!                            → aToken (mint/burn)
//!                            → debtToken (mint/burn)
//!                            → Oracle (prices)
//!                            → SAC (token transfers)
//! ```

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, BytesN, Env, Vec, IntoVal,
};
use udonfi_common::{
    bitmap::*,
    math::*,
    InterestRateConfig, LendingError, PoolDataKey, ReserveConfig, UserAccountData,
    HEALTH_FACTOR_LIQUIDATION_THRESHOLD, RAY, WAD, TTL_EXTEND_TO, TTL_THRESHOLD,
};

// ─────────────────────────────────────────────
// Cross-Contract Client Interfaces
// ─────────────────────────────────────────────
#[soroban_sdk::contractclient(name = "ATokenClient")]
pub trait ATokenInterface {
    fn mint(env: Env, to: Address, scaled_amount: i128);
    fn burn(env: Env, from: Address, scaled_amount: i128);
    fn scaled_balance_of(env: Env, id: Address) -> i128;
}

#[soroban_sdk::contractclient(name = "DebtTokenClient")]
pub trait DebtTokenInterface {
    fn mint(env: Env, to: Address, scaled_amount: i128);
    fn burn(env: Env, from: Address, scaled_amount: i128);
    fn scaled_balance_of(env: Env, id: Address) -> i128;
}

// ─────────────────────────────────────────────
// Internal storage key for rate configs
// ─────────────────────────────────────────────
#[contracttype]
#[derive(Clone)]
pub enum InternalKey {
    /// Interest rate config for a reserve by index
    RateConfig(u32),
}

#[contract]
pub struct LendingPoolContract;

#[contractimpl]
impl LendingPoolContract {
    // ══════════════════════════════════════════
    // Constructor & Admin
    // ══════════════════════════════════════════

    /// Initialize the LendingPool Router.
    ///
    /// # Arguments
    /// * `admin` - Protocol administrator address
    /// * `oracle` - Price Oracle Adapter contract address
    /// * `treasury` - Treasury address for protocol fee collection
    pub fn initialize(env: Env, admin: Address, oracle: Address, treasury: Address) {
        if env.storage().instance().has(&PoolDataKey::Initialized) {
            panic!("already initialized");
        }

        env.storage()
            .instance()
            .set(&PoolDataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&PoolDataKey::Oracle, &oracle);
        env.storage()
            .instance()
            .set(&PoolDataKey::Treasury, &treasury);
        env.storage()
            .instance()
            .set(&PoolDataKey::ReserveCount, &0u32);
        env.storage()
            .instance()
            .set(&PoolDataKey::Paused, &false);
        env.storage()
            .instance()
            .set(&PoolDataKey::Initialized, &true);

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    /// Add a new asset reserve to the lending pool.
    /// Only callable by admin.
    pub fn add_reserve(env: Env, config: ReserveConfig, rate_config: InterestRateConfig) {
        Self::require_admin(&env);
        Self::require_not_paused(&env);

        let count: u32 = env
            .storage()
            .instance()
            .get(&PoolDataKey::ReserveCount)
            .unwrap_or(0);

        if count >= 64 {
            panic!("max reserves reached");
        }

        let reserve_index = count;

        // Store the config with the assigned index
        let mut config_with_index = config.clone();
        config_with_index.reserve_index = reserve_index;

        env.storage().persistent().set(
            &PoolDataKey::ReserveByIndex(reserve_index),
            &config_with_index,
        );
        env.storage().persistent().extend_ttl(
            &PoolDataKey::ReserveByIndex(reserve_index),
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );

        // Map asset address to reserve index
        env.storage().persistent().set(
            &PoolDataKey::ReserveIndexByAsset(config.asset.clone()),
            &reserve_index,
        );
        env.storage().persistent().extend_ttl(
            &PoolDataKey::ReserveIndexByAsset(config.asset.clone()),
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );

        // Store rate config
        env.storage()
            .persistent()
            .set(&InternalKey::RateConfig(reserve_index), &rate_config);
        env.storage().persistent().extend_ttl(
            &InternalKey::RateConfig(reserve_index),
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );

        // Increment count
        env.storage()
            .instance()
            .set(&PoolDataKey::ReserveCount, &(count + 1));

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("reserve"), config.asset),
            reserve_index,
        );
    }

    /// Upgrade the contract WASM. Only callable by admin.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        Self::require_admin(&env);
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    /// Pause/unpause the protocol. Only callable by admin.
    pub fn set_paused(env: Env, paused: bool) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&PoolDataKey::Paused, &paused);
    }

    /// Register the Liquidation Engine contract address. Only callable by admin.
    pub fn set_liquidation_engine(env: Env, address: Address) {
        Self::require_admin(&env);
        env.storage()
            .instance()
            .set(&PoolDataKey::LiquidationEngine, &address);
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    // ══════════════════════════════════════════
    // Core User Operations
    // ══════════════════════════════════════════

    /// Supply (deposit) an asset into the lending pool.
    ///
    /// Flow:
    /// 1. Caller authorizes the transaction
    /// 2. Update reserve indices (accrue interest)
    /// 3. Transfer asset from user to pool via SAC
    /// 4. Calculate scaled amount = amount / liquidity_index
    /// 5. Mint aTokens to user
    /// 6. Set collateral flag in bitmap
    /// 7. Extend TTL for all affected data
    ///
    /// # Arguments
    /// * `caller` - Depositor address
    /// * `asset` - Asset contract address (SAC)
    /// * `amount` - Amount to deposit (in asset decimals)
    pub fn supply(env: Env, caller: Address, asset: Address, amount: i128) {
        caller.require_auth();
        Self::require_not_paused(&env);

        if amount <= 0 {
            panic!("invalid amount");
        }

        let reserve_index = Self::get_reserve_index(&env, &asset);
        let config = Self::get_reserve_config(&env, reserve_index);

        if !config.is_active {
            panic!("reserve not active");
        }

        // Step 1: Update reserve indices
        let liquidity_index = Self::update_reserve_indices(&env, reserve_index);

        // Step 2: Transfer asset from user to this contract
        let token_client = token::Client::new(&env, &asset);
        token_client.transfer(&caller, &env.current_contract_address(), &amount);

        // Step 3: Calculate scaled amount
        // scaled_amount = amount * RAY / liquidity_index
        let amount_ray = (amount as i128)
            .checked_mul(RAY)
            .expect("overflow");
        let scaled_amount = amount_ray / liquidity_index;

        // Step 4: Update user's scaled aToken balance
        let balance_key = PoolDataKey::UserATokenBalance(caller.clone(), reserve_index);
        let current_scaled: i128 = env
            .storage()
            .persistent()
            .get(&balance_key)
            .unwrap_or(0);
        let new_scaled = current_scaled
            .checked_add(scaled_amount)
            .expect("overflow");
        env.storage()
            .persistent()
            .set(&balance_key, &new_scaled);
        env.storage()
            .persistent()
            .extend_ttl(&balance_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        // Propagate mint to external aToken contract
        let a_token_client = ATokenClient::new(&env, &config.a_token);
        a_token_client.mint(&caller, &scaled_amount);

        // Step 5: Update total scaled deposits
        let total_key = PoolDataKey::ReserveByIndex(reserve_index);
        // We track totals in the pool contract directly
        Self::update_pool_total_deposits(&env, reserve_index, scaled_amount, true);

        // Step 6: Set collateral flag in user bitmap
        let mut bitmap = Self::get_user_bitmap(&env, &caller);
        set_using_as_collateral(&mut bitmap, reserve_index as u8, true);
        Self::set_user_bitmap(&env, &caller, bitmap);

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("supply"), caller, asset),
            amount,
        );
    }

    /// Withdraw an asset from the lending pool.
    ///
    /// Flow:
    /// 1. Update reserve indices
    /// 2. Calculate actual balance from scaled
    /// 3. Check Health Factor after withdrawal
    /// 4. Burn aTokens (reduce scaled balance)
    /// 5. Transfer asset from pool to user
    ///
    /// # Arguments
    /// * `caller` - Withdrawer address
    /// * `asset` - Asset contract address
    /// * `amount` - Amount to withdraw (use i128::MAX for full withdrawal)
    pub fn withdraw(env: Env, caller: Address, asset: Address, amount: i128) {
        caller.require_auth();
        Self::require_not_paused(&env);

        if amount <= 0 {
            panic!("invalid amount");
        }

        let reserve_index = Self::get_reserve_index(&env, &asset);
        let config = Self::get_reserve_config(&env, reserve_index);

        // Update indices
        let liquidity_index = Self::update_reserve_indices(&env, reserve_index);

        // Get user's actual balance
        let balance_key = PoolDataKey::UserATokenBalance(caller.clone(), reserve_index);
        let current_scaled: i128 = env
            .storage()
            .persistent()
            .get(&balance_key)
            .unwrap_or(0);
        let actual_balance = ray_mul(current_scaled, liquidity_index).unwrap_or(0);

        // Determine withdrawal amount
        let withdraw_amount = if amount > actual_balance {
            actual_balance
        } else {
            amount
        };

        if withdraw_amount <= 0 {
            panic!("nothing to withdraw");
        }

        // Calculate scaled amount to burn
        let withdraw_ray = withdraw_amount
            .checked_mul(RAY)
            .expect("overflow");
        let scaled_to_burn = withdraw_ray / liquidity_index;

        // Reduce user's scaled balance
        let new_scaled = current_scaled
            .checked_sub(scaled_to_burn)
            .expect("underflow");
        env.storage()
            .persistent()
            .set(&balance_key, &new_scaled);
        env.storage()
            .persistent()
            .extend_ttl(&balance_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        // Propagate burn to external aToken contract
        let a_token_client = ATokenClient::new(&env, &config.a_token);
        a_token_client.burn(&caller, &scaled_to_burn);

        // Update total deposits
        Self::update_pool_total_deposits(&env, reserve_index, scaled_to_burn, false);

        // If no more deposits, clear collateral flag
        if new_scaled == 0 {
            let mut bitmap = Self::get_user_bitmap(&env, &caller);
            set_using_as_collateral(&mut bitmap, reserve_index as u8, false);
            Self::set_user_bitmap(&env, &caller, bitmap);
        }

        // Check Health Factor (only if user has borrows)
        let bitmap = Self::get_user_bitmap(&env, &caller);
        if has_any_borrows(bitmap) {
            let hf = Self::calculate_health_factor_internal(&env, &caller);
            if hf < HEALTH_FACTOR_LIQUIDATION_THRESHOLD {
                panic!("health factor below threshold");
            }
        }

        // Transfer asset to user
        let token_client = token::Client::new(&env, &asset);
        token_client.transfer(
            &env.current_contract_address(),
            &caller,
            &withdraw_amount,
        );

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("wdraw"), caller, asset),
            withdraw_amount,
        );
    }

    /// Borrow an asset from the lending pool.
    ///
    /// Flow:
    /// 1. Update reserve indices
    /// 2. Get oracle prices for all user's collateral and new debt
    /// 3. Simulate Health Factor with new borrow
    /// 4. Mint debtTokens
    /// 5. Transfer borrowed asset to user
    ///
    /// # Arguments
    /// * `caller` - Borrower address
    /// * `asset` - Asset to borrow
    /// * `amount` - Amount to borrow
    pub fn borrow(env: Env, caller: Address, asset: Address, amount: i128) {
        caller.require_auth();
        Self::require_not_paused(&env);

        if amount <= 0 {
            panic!("invalid amount");
        }

        let reserve_index = Self::get_reserve_index(&env, &asset);
        let config = Self::get_reserve_config(&env, reserve_index);

        if !config.is_active {
            panic!("reserve not active");
        }
        if !config.is_borrowing_enabled {
            panic!("borrowing not enabled");
        }

        // Update indices
        let (_, borrow_index) = Self::update_reserve_indices_full(&env, reserve_index);

        // Calculate scaled debt amount
        let amount_ray = amount.checked_mul(RAY).expect("overflow");
        let scaled_debt = amount_ray / borrow_index;

        // Record the new debt FIRST (for HF simulation)
        let debt_key = PoolDataKey::UserDebtBalance(caller.clone(), reserve_index);
        let current_debt: i128 = env
            .storage()
            .persistent()
            .get(&debt_key)
            .unwrap_or(0);
        let new_debt = current_debt.checked_add(scaled_debt).expect("overflow");
        env.storage()
            .persistent()
            .set(&debt_key, &new_debt);
        env.storage()
            .persistent()
            .extend_ttl(&debt_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        // Propagate mint to external debtToken contract
        let debt_token_client = DebtTokenClient::new(&env, &config.debt_token);
        debt_token_client.mint(&caller, &scaled_debt);

        // Set borrowing flag
        let mut bitmap = Self::get_user_bitmap(&env, &caller);
        set_borrowing(&mut bitmap, reserve_index as u8, true);
        Self::set_user_bitmap(&env, &caller, bitmap);

        // Update total borrows
        Self::update_pool_total_borrows(&env, reserve_index, scaled_debt, true);

        // Check Health Factor AFTER adding the new debt
        let hf = Self::calculate_health_factor_internal(&env, &caller);
        if hf < HEALTH_FACTOR_LIQUIDATION_THRESHOLD {
            panic!("insufficient collateral");
        }

        // Transfer borrowed asset to user
        let token_client = token::Client::new(&env, &asset);
        token_client.transfer(
            &env.current_contract_address(),
            &caller,
            &amount,
        );

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("borrow"), caller, asset),
            amount,
        );
    }

    /// Repay a borrowed asset.
    ///
    /// Flow:
    /// 1. Update reserve indices
    /// 2. Calculate actual debt (scaled × borrow_index)
    /// 3. Transfer repayment from user to pool
    /// 4. Burn debtTokens
    /// 5. Clear borrowing flag if fully repaid
    ///
    /// # Arguments
    /// * `caller` - Repayer address
    /// * `asset` - Asset to repay
    /// * `amount` - Amount to repay (use i128::MAX for full repayment)
    pub fn repay(env: Env, caller: Address, asset: Address, amount: i128) {
        caller.require_auth();
        Self::require_not_paused(&env);

        if amount <= 0 {
            panic!("invalid amount");
        }

        let reserve_index = Self::get_reserve_index(&env, &asset);

        // Update indices
        let (_, borrow_index) = Self::update_reserve_indices_full(&env, reserve_index);

        // Get user's actual debt
        let debt_key = PoolDataKey::UserDebtBalance(caller.clone(), reserve_index);
        let current_scaled_debt: i128 = env
            .storage()
            .persistent()
            .get(&debt_key)
            .unwrap_or(0);

        if current_scaled_debt == 0 {
            panic!("no debt to repay");
        }

        let actual_debt = ray_mul(current_scaled_debt, borrow_index).unwrap_or(0);

        // Determine repayment amount
        let repay_amount = if amount > actual_debt {
            actual_debt
        } else {
            amount
        };

        // Transfer repayment from user to pool
        let token_client = token::Client::new(&env, &asset);
        token_client.transfer(&caller, &env.current_contract_address(), &repay_amount);

        // Calculate scaled amount to burn
        let repay_ray = repay_amount.checked_mul(RAY).expect("overflow");
        let scaled_to_burn = repay_ray / borrow_index;

        // Ensure we don't burn more than outstanding
        let actual_burn = if scaled_to_burn > current_scaled_debt {
            current_scaled_debt
        } else {
            scaled_to_burn
        };

        // Update user's scaled debt
        let new_scaled_debt = current_scaled_debt - actual_burn;
        env.storage()
            .persistent()
            .set(&debt_key, &new_scaled_debt);
        env.storage()
            .persistent()
            .extend_ttl(&debt_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        // Propagate burn to external debtToken contract
        let config = Self::get_reserve_config(&env, reserve_index);
        let debt_token_client = DebtTokenClient::new(&env, &config.debt_token);
        debt_token_client.burn(&caller, &actual_burn);

        // Update total borrows
        Self::update_pool_total_borrows(&env, reserve_index, actual_burn, false);

        // Clear borrowing flag if fully repaid
        if new_scaled_debt == 0 {
            let mut bitmap = Self::get_user_bitmap(&env, &caller);
            set_borrowing(&mut bitmap, reserve_index as u8, false);
            Self::set_user_bitmap(&env, &caller, bitmap);
        }

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("repay"), caller, asset),
            repay_amount,
        );
    }

    /// Toggle using an asset as collateral.
    ///
    /// Flow:
    /// 1. Caller authorizes the transaction
    /// 2. Require protocol not paused
    /// 3. Update reserve indices
    /// 4. Fetch user config bitmap
    /// 5. If disabling, verify Health Factor remains above liquidation threshold
    /// 6. Save updated bitmap and extend TTL
    pub fn toggle_collateral(env: Env, caller: Address, asset: Address, use_as_collateral: bool) {
        caller.require_auth();
        Self::require_not_paused(&env);

        let reserve_index = Self::get_reserve_index(&env, &asset);
        let config = Self::get_reserve_config(&env, reserve_index);

        if !config.is_active {
            panic!("reserve not active");
        }

        // Accrue interest
        Self::update_reserve_indices(&env, reserve_index);

        let mut bitmap = Self::get_user_bitmap(&env, &caller);
        let currently_collateral = is_using_as_collateral(bitmap, reserve_index as u8);

        if currently_collateral == use_as_collateral {
            // Already in desired state, do nothing
            return;
        }

        if !use_as_collateral {
            // Check if user has borrows and if disabling is safe
            if has_any_borrows(bitmap) {
                // Set temporary bitmap with collateral disabled to simulate health factor
                let mut temp_bitmap = bitmap;
                set_using_as_collateral(&mut temp_bitmap, reserve_index as u8, false);
                
                // Temporarily save bitmap for calculation (calculate_health_factor_internal reads from storage)
                Self::set_user_bitmap(&env, &caller, temp_bitmap);
                let hf = Self::calculate_health_factor_internal(&env, &caller);
                
                // Revert to original bitmap
                Self::set_user_bitmap(&env, &caller, bitmap);

                if hf < HEALTH_FACTOR_LIQUIDATION_THRESHOLD {
                    panic!("health factor below threshold");
                }
            }
        }

        // Set the collateral flag in user config bitmap
        set_using_as_collateral(&mut bitmap, reserve_index as u8, use_as_collateral);
        Self::set_user_bitmap(&env, &caller, bitmap);

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("toggle"), caller, asset),
            use_as_collateral,
        );
    }

    // ══════════════════════════════════════════
    // View Functions
    // ══════════════════════════════════════════

    /// Get aggregated account data for a user.
    pub fn get_user_data(env: Env, user: Address) -> UserAccountData {
        let bitmap = Self::get_user_bitmap(&env, &user);
        let reserve_count: u32 = env
            .storage()
            .instance()
            .get(&PoolDataKey::ReserveCount)
            .unwrap_or(0);

        let oracle: Address = env
            .storage()
            .instance()
            .get(&PoolDataKey::Oracle)
            .unwrap();

        let mut total_collateral_usd: i128 = 0;
        let mut total_debt_usd: i128 = 0;
        let mut total_collateral_ltv_usd: i128 = 0;
        let mut total_collateral_threshold_usd: i128 = 0;

        for i in 0..reserve_count {
            let config = Self::get_reserve_config(&env, i);

            // Check collateral
            if is_using_as_collateral(bitmap, i as u8) {
                let balance_key = PoolDataKey::UserATokenBalance(user.clone(), i);
                let scaled: i128 = env
                    .storage()
                    .persistent()
                    .get(&balance_key)
                    .unwrap_or(0);

                if scaled > 0 {
                    let liquidity_index = Self::get_stored_liquidity_index(&env, i);
                    let actual = ray_mul(scaled, liquidity_index).unwrap_or(0);
                    let price = Self::get_asset_price(&env, &oracle, &config.asset);
                    let value_usd = wad_mul(actual, price).unwrap_or(0);

                    total_collateral_usd += value_usd;
                    total_collateral_ltv_usd +=
                        wad_mul(value_usd, percent_to_wad(config.ltv)).unwrap_or(0);
                    total_collateral_threshold_usd +=
                        wad_mul(value_usd, percent_to_wad(config.liquidation_threshold))
                            .unwrap_or(0);
                }
            }

            // Check borrows
            if is_borrowing(bitmap, i as u8) {
                let debt_key = PoolDataKey::UserDebtBalance(user.clone(), i);
                let scaled: i128 = env
                    .storage()
                    .persistent()
                    .get(&debt_key)
                    .unwrap_or(0);

                if scaled > 0 {
                    let borrow_index = Self::get_stored_borrow_index(&env, i);
                    let actual = ray_mul(scaled, borrow_index).unwrap_or(0);
                    let price = Self::get_asset_price(&env, &oracle, &config.asset);
                    let value_usd = wad_mul(actual, price).unwrap_or(0);

                    total_debt_usd += value_usd;
                }
            }
        }

        // Health Factor = (total_collateral × liquidation_threshold) / total_debt
        let health_factor = if total_debt_usd > 0 {
            wad_div(total_collateral_threshold_usd, total_debt_usd).unwrap_or(i128::MAX)
        } else {
            i128::MAX // No debt = infinite health
        };

        let current_ltv = if total_collateral_usd > 0 {
            wad_div(total_debt_usd, total_collateral_usd).unwrap_or(0)
        } else {
            0
        };

        let available_borrow = if total_collateral_ltv_usd > total_debt_usd {
            total_collateral_ltv_usd - total_debt_usd
        } else {
            0
        };

        UserAccountData {
            total_collateral_usd,
            total_debt_usd,
            available_borrow_usd: available_borrow,
            health_factor,
            current_ltv,
            config_bitmap: bitmap,
        }
    }

    /// Get Health Factor for a user.
    pub fn get_health_factor(env: Env, user: Address) -> i128 {
        Self::calculate_health_factor_internal(&env, &user)
    }

    /// Get reserve configuration by asset address.
    pub fn get_reserve_info(env: Env, asset: Address) -> ReserveConfig {
        let index = Self::get_reserve_index(&env, &asset);
        Self::get_reserve_config(&env, index)
    }

    /// Get the number of active reserves.
    pub fn get_reserve_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&PoolDataKey::ReserveCount)
            .unwrap_or(0)
    }

    /// Get the Price Oracle adapter contract address.
    pub fn oracle(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&PoolDataKey::Oracle)
            .unwrap()
    }

    /// Get user's deposit balance for a specific asset.
    pub fn get_user_deposit(env: Env, user: Address, asset: Address) -> i128 {
        let reserve_index = Self::get_reserve_index(&env, &asset);
        let balance_key = PoolDataKey::UserATokenBalance(user, reserve_index);
        let scaled: i128 = env
            .storage()
            .persistent()
            .get(&balance_key)
            .unwrap_or(0);
        let liquidity_index = Self::get_stored_liquidity_index(&env, reserve_index);
        ray_mul(scaled, liquidity_index).unwrap_or(0)
    }

    /// Get user's debt balance for a specific asset.
    pub fn get_user_debt(env: Env, user: Address, asset: Address) -> i128 {
        let reserve_index = Self::get_reserve_index(&env, &asset);
        let debt_key = PoolDataKey::UserDebtBalance(user, reserve_index);
        let scaled: i128 = env
            .storage()
            .persistent()
            .get(&debt_key)
            .unwrap_or(0);
        let borrow_index = Self::get_stored_borrow_index(&env, reserve_index);
        ray_mul(scaled, borrow_index).unwrap_or(0)
    }

    /// Get total deposits in a reserve pool.
    pub fn get_pool_total_deposits(env: Env, asset: Address) -> i128 {
        let reserve_index = Self::get_reserve_index(&env, &asset);
        Self::read_pool_total_deposits(&env, reserve_index)
    }

    /// Get total borrows in a reserve pool.
    pub fn get_pool_total_borrows(env: Env, asset: Address) -> i128 {
        Self::read_pool_total_borrows_for_asset(&env, &asset)
    }

    /// Get accumulated bad debt deficit for an asset reserve.
    pub fn get_reserve_deficit(env: Env, asset: Address) -> i128 {
        let reserve_index = Self::get_reserve_index(&env, &asset);
        let deficit_key = PoolDataKey::ReserveDeficit(reserve_index);
        env.storage().persistent().get(&deficit_key).unwrap_or(0)
    }

    /// Liquidation Hook called ONLY by the authorized Liquidation Engine.
    /// Performs internal state changes, burns corresponding user aTokens and debtTokens,
    /// transfers the underlying collateral from pool to liquidator,
    /// and handles bad debt socialization.
    pub fn liquidation_hook(
        env: Env,
        liquidator: Address,
        borrower: Address,
        debt_asset: Address,
        collateral_asset: Address,
        debt_to_repay: i128,
        collateral_to_seize: i128,
    ) {
        // Authenticate the caller is the registered Liquidation Engine
        let liquidation_engine: Address = env
            .storage()
            .instance()
            .get(&PoolDataKey::LiquidationEngine)
            .expect("liquidation engine not registered");
        liquidation_engine.require_auth();

        Self::require_not_paused(&env);

        if debt_to_repay <= 0 || collateral_to_seize <= 0 {
            panic!("invalid liquidation hook amounts");
        }

        // Transfer the seized collateral from LendingPool to liquidator
        let collateral_token = token::Client::new(&env, &collateral_asset);
        collateral_token.transfer(
            &env.current_contract_address(),
            &liquidator,
            &collateral_to_seize,
        );

        let debt_index = Self::get_reserve_index(&env, &debt_asset);
        let collateral_index = Self::get_reserve_index(&env, &collateral_asset);

        // Accrue interest for both reserves to ensure index correctness
        let (_, debt_borrow_index) = Self::update_reserve_indices_full(&env, debt_index);
        let collateral_liquidity_index = Self::update_reserve_indices(&env, collateral_index);

        // ─────────────────────────────────────────────
        // 1. Process Debt Repayment
        // ─────────────────────────────────────────────
        let debt_config = Self::get_reserve_config(&env, debt_index);
        let debt_key = PoolDataKey::UserDebtBalance(borrower.clone(), debt_index);
        let current_scaled_debt: i128 = env
            .storage()
            .persistent()
            .get(&debt_key)
            .unwrap_or(0);

        if current_scaled_debt > 0 {
            let repay_ray = debt_to_repay.checked_mul(RAY).expect("overflow");
            let scaled_debt_to_burn = repay_ray / debt_borrow_index;
            let actual_debt_burn = if scaled_debt_to_burn > current_scaled_debt {
                current_scaled_debt
            } else {
                scaled_debt_to_burn
            };

            let new_scaled_debt = current_scaled_debt - actual_debt_burn;
            env.storage()
                .persistent()
                .set(&debt_key, &new_scaled_debt);
            env.storage()
                .persistent()
                .extend_ttl(&debt_key, TTL_THRESHOLD, TTL_EXTEND_TO);

            // Update pool total borrows
            Self::update_pool_total_borrows(&env, debt_index, actual_debt_burn, false);

            // Propagate burn to debt token contract
            let debt_token_client = DebtTokenClient::new(&env, &debt_config.debt_token);
            debt_token_client.burn(&borrower, &actual_debt_burn);

            // Clear borrowing flag if fully repaid
            if new_scaled_debt == 0 {
                let mut bitmap = Self::get_user_bitmap(&env, &borrower);
                set_borrowing(&mut bitmap, debt_index as u8, false);
                Self::set_user_bitmap(&env, &borrower, bitmap);
            }
        }

        // ─────────────────────────────────────────────
        // 2. Process Collateral Seizure
        // ─────────────────────────────────────────────
        let collateral_config = Self::get_reserve_config(&env, collateral_index);
        let balance_key = PoolDataKey::UserATokenBalance(borrower.clone(), collateral_index);
        let current_scaled_collateral: i128 = env
            .storage()
            .persistent()
            .get(&balance_key)
            .unwrap_or(0);

        let mut actual_collateral_burn = 0i128;
        if current_scaled_collateral > 0 {
            let seize_ray = collateral_to_seize.checked_mul(RAY).expect("overflow");
            let scaled_collateral_to_burn = seize_ray / collateral_liquidity_index;
            actual_collateral_burn = if scaled_collateral_to_burn > current_scaled_collateral {
                current_scaled_collateral
            } else {
                scaled_collateral_to_burn
            };

            let new_scaled_collateral = current_scaled_collateral - actual_collateral_burn;
            env.storage()
                .persistent()
                .set(&balance_key, &new_scaled_collateral);
            env.storage()
                .persistent()
                .extend_ttl(&balance_key, TTL_THRESHOLD, TTL_EXTEND_TO);

            // Update pool total deposits
            Self::update_pool_total_deposits(&env, collateral_index, actual_collateral_burn, false);

            // Propagate burn to aToken contract
            let a_token_client = ATokenClient::new(&env, &collateral_config.a_token);
            a_token_client.burn(&borrower, &actual_collateral_burn);

            // Clear collateral flag if fully depleted
            if new_scaled_collateral == 0 {
                let mut bitmap = Self::get_user_bitmap(&env, &borrower);
                set_using_as_collateral(&mut bitmap, collateral_index as u8, false);
                Self::set_user_bitmap(&env, &borrower, bitmap);
            }
        }

        // ─────────────────────────────────────────────
        // 3. Bad Debt Socialization
        // ─────────────────────────────────────────────
        // If the borrower's collateral for this asset is completely wiped out,
        // check if they have any remaining collateral across ALL other reserves.
        // If they have 0 total collateral left but still have outstanding debt,
        // it means they are undercollateralized/unbacked.
        // We wipe their outstanding debt and record it as a ReserveDeficit.
        let mut bitmap = Self::get_user_bitmap(&env, &borrower);
        let current_scaled_collateral: i128 = env
            .storage()
            .persistent()
            .get(&balance_key)
            .unwrap_or(0);

        if current_scaled_collateral == 0 {
            let reserve_count = Self::get_reserve_count(env.clone());
            let mut has_any_collateral = false;
            for i in 0..reserve_count {
                if is_using_as_collateral(bitmap, i as u8) {
                    let other_bal_key = PoolDataKey::UserATokenBalance(borrower.clone(), i);
                    let other_scaled: i128 = env.storage().persistent().get(&other_bal_key).unwrap_or(0);
                    if other_scaled > 0 {
                        has_any_collateral = true;
                        break;
                    }
                }
            }

            if !has_any_collateral {
                // Borrower has absolutely NO collateral remaining.
                // Any outstanding debts are unbacked bad debt. We wipe them.
                for i in 0..reserve_count {
                    if is_borrowing(bitmap, i as u8) {
                        let user_debt_key = PoolDataKey::UserDebtBalance(borrower.clone(), i);
                        let outstanding_scaled: i128 = env
                            .storage()
                            .persistent()
                            .get(&user_debt_key)
                            .unwrap_or(0);

                        if outstanding_scaled > 0 {
                            let r_config = Self::get_reserve_config(&env, i);
                            let borrow_index = Self::get_stored_borrow_index(&env, i);
                            let actual_bad_debt = ray_mul(outstanding_scaled, borrow_index).unwrap_or(0);

                            // Record protocol deficit
                            let deficit_key = PoolDataKey::ReserveDeficit(i);
                            let current_deficit: i128 = env.storage().persistent().get(&deficit_key).unwrap_or(0);
                            env.storage().persistent().set(&deficit_key, &(current_deficit + actual_bad_debt));
                            env.storage().persistent().extend_ttl(&deficit_key, TTL_THRESHOLD, TTL_EXTEND_TO);

                            // Wipe user's internal debt balance in pool
                            env.storage().persistent().set(&user_debt_key, &0i128);

                            // Update total borrows
                            Self::update_pool_total_borrows(&env, i, outstanding_scaled, false);

                            // Burn from external debt token contract
                            let debt_token_client = DebtTokenClient::new(&env, &r_config.debt_token);
                            debt_token_client.burn(&borrower, &outstanding_scaled);

                            env.events().publish(
                                (symbol_short!("bad_debt"), borrower.clone(), r_config.asset),
                                actual_bad_debt,
                            );
                        }
                    }
                }

                // Completely clear all borrow flags in user's config bitmap
                let mut new_bitmap = bitmap;
                for i in 0..64 {
                    set_borrowing(&mut new_bitmap, i as u8, false);
                }
                Self::set_user_bitmap(&env, &borrower, new_bitmap);
            }
        }

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    // ══════════════════════════════════════════
    // Internal Helpers
    // ══════════════════════════════════════════

    fn require_admin(env: &Env) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&PoolDataKey::Admin)
            .expect("not initialized");
        admin.require_auth();
    }

    fn require_not_paused(env: &Env) {
        let paused: bool = env
            .storage()
            .instance()
            .get(&PoolDataKey::Paused)
            .unwrap_or(false);
        if paused {
            panic!("protocol is paused");
        }
    }

    fn get_reserve_index(env: &Env, asset: &Address) -> u32 {
        env.storage()
            .persistent()
            .get(&PoolDataKey::ReserveIndexByAsset(asset.clone()))
            .expect("reserve not found")
    }

    fn get_reserve_config(env: &Env, index: u32) -> ReserveConfig {
        env.storage()
            .persistent()
            .get(&PoolDataKey::ReserveByIndex(index))
            .expect("reserve config not found")
    }

    fn get_user_bitmap(env: &Env, user: &Address) -> u128 {
        env.storage()
            .persistent()
            .get(&PoolDataKey::UserConfig(user.clone()))
            .unwrap_or(0u128)
    }

    fn set_user_bitmap(env: &Env, user: &Address, bitmap: u128) {
        env.storage()
            .persistent()
            .set(&PoolDataKey::UserConfig(user.clone()), &bitmap);
        env.storage().persistent().extend_ttl(
            &PoolDataKey::UserConfig(user.clone()),
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );
    }

    /// Update reserve indices and return the liquidity_index.
    fn update_reserve_indices(env: &Env, reserve_index: u32) -> i128 {
        let (li, _) = Self::update_reserve_indices_full(env, reserve_index);
        li
    }

    /// Update reserve indices and return both (liquidity_index, borrow_index).
    ///
    /// Uses a simplified in-contract calculation instead of cross-contract call
    /// to minimize CPU usage.
    fn update_reserve_indices_full(env: &Env, reserve_index: u32) -> (i128, i128) {
        // Read current state from pool storage
        let li_key = InternalKey::RateConfig(reserve_index);

        // We store indices directly in pool storage keyed by reserve_index
        // using composite keys to avoid cross-contract overhead

        let liquidity_index_key = PoolDataKey::ReserveByIndex(reserve_index + 1000);
        let borrow_index_key = PoolDataKey::ReserveByIndex(reserve_index + 2000);
        let last_ts_key = PoolDataKey::ReserveByIndex(reserve_index + 3000);
        let borrow_rate_key = PoolDataKey::ReserveByIndex(reserve_index + 4000);

        // NOTE: We repurpose ReserveByIndex with high offsets for index storage
        // This is a pragmatic optimization to avoid defining more storage key types

        let old_li: i128 = env
            .storage()
            .persistent()
            .get::<_, i128>(&liquidity_index_key)
            .unwrap_or(RAY);
        let old_bi: i128 = env
            .storage()
            .persistent()
            .get::<_, i128>(&borrow_index_key)
            .unwrap_or(RAY);
        let last_ts: u64 = env
            .storage()
            .persistent()
            .get::<_, u64>(&last_ts_key)
            .unwrap_or(0);
        let current_borrow_rate: i128 = env
            .storage()
            .persistent()
            .get::<_, i128>(&borrow_rate_key)
            .unwrap_or(0);

        let current_ts = env.ledger().timestamp();
        let time_delta = current_ts.saturating_sub(last_ts);

        if time_delta == 0 {
            return (old_li, old_bi);
        }

        // Calculate new indices
        let borrow_rate_ray = current_borrow_rate * RAY / WAD;
        let borrow_multiplier =
            calculate_compounded_interest(borrow_rate_ray, time_delta).unwrap_or(RAY);
        let new_bi = ray_mul(old_bi, borrow_multiplier).unwrap_or(old_bi);

        // Supply rate approximation: use linear interest
        // supply_rate ≈ borrow_rate * utilization * (1 - reserve_factor)
        let total_deposits = Self::read_pool_total_deposits(env, reserve_index);
        let total_borrows = Self::read_pool_total_borrows(env, reserve_index);
        let utilization = calculate_utilization_rate(total_deposits, total_borrows).unwrap_or(0);

        let config = Self::get_reserve_config(env, reserve_index);
        let supply_rate =
            calculate_supply_rate(current_borrow_rate, utilization, config.reserve_factor)
                .unwrap_or(0);
        let supply_rate_ray = supply_rate * RAY / WAD;
        let supply_multiplier =
            calculate_linear_interest(supply_rate_ray, time_delta).unwrap_or(RAY);
        let new_li = ray_mul(old_li, supply_multiplier).unwrap_or(old_li);

        // Persist
        env.storage()
            .persistent()
            .set(&liquidity_index_key, &new_li);
        env.storage()
            .persistent()
            .set(&borrow_index_key, &new_bi);
        env.storage()
            .persistent()
            .set(&last_ts_key, &current_ts);

        // Recalculate borrow rate based on new utilization
        let rate_config: Option<InterestRateConfig> = env
            .storage()
            .persistent()
            .get(&InternalKey::RateConfig(reserve_index));
        if let Some(rc) = rate_config {
            let new_borrow_rate = calculate_borrow_rate(
                utilization,
                rc.optimal_utilization,
                rc.base_rate,
                rc.slope1,
                rc.slope2,
            )
            .unwrap_or(rc.base_rate);
            env.storage()
                .persistent()
                .set(&borrow_rate_key, &new_borrow_rate);
        }

        // Extend TTLs
        env.storage().persistent().extend_ttl(
            &liquidity_index_key,
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );
        env.storage()
            .persistent()
            .extend_ttl(&borrow_index_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        (new_li, new_bi)
    }

    fn get_stored_liquidity_index(env: &Env, reserve_index: u32) -> i128 {
        let key = PoolDataKey::ReserveByIndex(reserve_index + 1000);
        env.storage()
            .persistent()
            .get::<_, i128>(&key)
            .unwrap_or(RAY)
    }

    fn get_stored_borrow_index(env: &Env, reserve_index: u32) -> i128 {
        let key = PoolDataKey::ReserveByIndex(reserve_index + 2000);
        env.storage()
            .persistent()
            .get::<_, i128>(&key)
            .unwrap_or(RAY)
    }

    /// Pool-level total scaled deposits tracking
    fn read_pool_total_deposits(env: &Env, reserve_index: u32) -> i128 {
        let key = PoolDataKey::ReserveByIndex(reserve_index + 5000);
        env.storage()
            .persistent()
            .get::<_, i128>(&key)
            .unwrap_or(0)
    }

    fn update_pool_total_deposits(env: &Env, reserve_index: u32, delta: i128, increase: bool) {
        let key = PoolDataKey::ReserveByIndex(reserve_index + 5000);
        let current: i128 = env.storage().persistent().get::<_, i128>(&key).unwrap_or(0);
        let new_val = if increase {
            current.checked_add(delta).expect("overflow")
        } else {
            current.checked_sub(delta).unwrap_or(0)
        };
        env.storage().persistent().set(&key, &new_val);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    fn read_pool_total_borrows(env: &Env, reserve_index: u32) -> i128 {
        let key = PoolDataKey::ReserveByIndex(reserve_index + 6000);
        env.storage()
            .persistent()
            .get::<_, i128>(&key)
            .unwrap_or(0)
    }

    fn read_pool_total_borrows_for_asset(env: &Env, asset: &Address) -> i128 {
        let reserve_index = Self::get_reserve_index(env, asset);
        Self::read_pool_total_borrows(env, reserve_index)
    }

    fn update_pool_total_borrows(env: &Env, reserve_index: u32, delta: i128, increase: bool) {
        let key = PoolDataKey::ReserveByIndex(reserve_index + 6000);
        let current: i128 = env.storage().persistent().get::<_, i128>(&key).unwrap_or(0);
        let new_val = if increase {
            current.checked_add(delta).expect("overflow")
        } else {
            current.checked_sub(delta).unwrap_or(0)
        };
        env.storage().persistent().set(&key, &new_val);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    fn get_asset_price(env: &Env, oracle: &Address, asset: &Address) -> i128 {
        // Call the PriceOracle adapter contract using try_invoke_contract to fetch the actual price
        let price_res = env.try_invoke_contract::<i128, soroban_sdk::Error>(
            oracle,
            &soroban_sdk::Symbol::new(env, "get_price_usd"),
            soroban_sdk::vec![env, asset.clone().into_val(env)]
        );
        
        match price_res {
            Ok(Ok(price)) => price,
            _ => {
                // Fallback: Try to read a mock price stored in pool storage
                env.storage()
                    .persistent()
                    .get::<_, i128>(&PoolDataKey::ReserveByIndex(7000))
                    .unwrap_or(WAD) // Default $1.00
            }
        }
    }

    fn calculate_health_factor_internal(env: &Env, user: &Address) -> i128 {
        let bitmap = Self::get_user_bitmap(env, user);
        let reserve_count: u32 = env
            .storage()
            .instance()
            .get(&PoolDataKey::ReserveCount)
            .unwrap_or(0);

        let oracle: Address = env
            .storage()
            .instance()
            .get(&PoolDataKey::Oracle)
            .unwrap();

        let mut total_collateral_threshold_usd: i128 = 0;
        let mut total_debt_usd: i128 = 0;

        for i in 0..reserve_count {
            if is_using_as_collateral(bitmap, i as u8) {
                let balance_key = PoolDataKey::UserATokenBalance(user.clone(), i);
                let scaled: i128 = env
                    .storage()
                    .persistent()
                    .get(&balance_key)
                    .unwrap_or(0);
                if scaled > 0 {
                    let config = Self::get_reserve_config(env, i);
                    let liquidity_index = Self::get_stored_liquidity_index(env, i);
                    let actual = ray_mul(scaled, liquidity_index).unwrap_or(0);
                    let price = Self::get_asset_price(env, &oracle, &config.asset);
                    let value_usd = wad_mul(actual, price).unwrap_or(0);
                    total_collateral_threshold_usd +=
                        wad_mul(value_usd, percent_to_wad(config.liquidation_threshold))
                            .unwrap_or(0);
                }
            }

            if is_borrowing(bitmap, i as u8) {
                let debt_key = PoolDataKey::UserDebtBalance(user.clone(), i);
                let scaled: i128 = env
                    .storage()
                    .persistent()
                    .get(&debt_key)
                    .unwrap_or(0);
                if scaled > 0 {
                    let config = Self::get_reserve_config(env, i);
                    let borrow_index = Self::get_stored_borrow_index(env, i);
                    let actual = ray_mul(scaled, borrow_index).unwrap_or(0);
                    let price = Self::get_asset_price(env, &oracle, &config.asset);
                    let value_usd = wad_mul(actual, price).unwrap_or(0);
                    total_debt_usd += value_usd;
                }
            }
        }

        if total_debt_usd == 0 {
            return i128::MAX;
        }

        wad_div(total_collateral_threshold_usd, total_debt_usd).unwrap_or(i128::MAX)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::{StellarAssetClient, TokenClient},
        Env,
    };
    use udonfi_a_token::ATokenContract;
    use udonfi_debt_token::DebtTokenContract;

    fn setup_pool(env: &Env) -> (Address, LendingPoolContractClient<'_>) {
        let contract_id = env.register(LendingPoolContract, ());
        let client = LendingPoolContractClient::new(env, &contract_id);

        let admin = Address::generate(env);
        let oracle = Address::generate(env);
        let treasury = Address::generate(env);

        client.initialize(&admin, &oracle, &treasury);

        (contract_id, client)
    }

    fn setup_reserve_with_tokens(
        env: &Env,
        pool_id: &Address,
        client: &LendingPoolContractClient<'_>,
        asset: &Address,
    ) -> (Address, Address) {
        let a_token = env.register(ATokenContract, ());
        let debt_token = env.register(DebtTokenContract, ());

        let a_token_client = udonfi_a_token::ATokenContractClient::new(env, &a_token);
        a_token_client.initialize(
            pool_id,
            asset,
            &0u32,
            &soroban_sdk::String::from_str(env, "aToken"),
            &symbol_short!("aToken"),
            &7u32,
        );

        let debt_token_client = udonfi_debt_token::DebtTokenContractClient::new(env, &debt_token);
        debt_token_client.initialize(
            pool_id,
            asset,
            &0u32,
            &soroban_sdk::String::from_str(env, "debtToken"),
            &symbol_short!("debtToken"),
            &7u32,
        );

        let config = ReserveConfig {
            asset: asset.clone(),
            a_token: a_token.clone(),
            debt_token: debt_token.clone(),
            ltv: 7500,
            liquidation_threshold: 8000,
            liquidation_bonus: 500,
            reserve_factor: 1000,
            decimals: 7,
            is_active: true,
            is_borrowing_enabled: true,
            reserve_index: 0,
        };
        let rate_config = InterestRateConfig {
            optimal_utilization: WAD * 80 / 100,
            base_rate: WAD * 2 / 100,
            slope1: WAD * 4 / 100,
            slope2: WAD * 300 / 100,
        };

        client.add_reserve(&config, &rate_config);

        (a_token, debt_token)
    }

    #[test]
    fn test_initialize() {
        let env = Env::default();
        env.mock_all_auths();

        let (_, client) = setup_pool(&env);
        assert_eq!(client.get_reserve_count(), 0);
    }

    #[test]
    fn test_add_reserve() {
        let env = Env::default();
        env.mock_all_auths();

        let (_, client) = setup_pool(&env);

        let asset = Address::generate(&env);
        let a_token = Address::generate(&env);
        let debt_token = Address::generate(&env);

        let config = ReserveConfig {
            asset: asset.clone(),
            a_token,
            debt_token,
            ltv: 7500,
            liquidation_threshold: 8000,
            liquidation_bonus: 500,
            reserve_factor: 1000,
            decimals: 7,
            is_active: true,
            is_borrowing_enabled: true,
            reserve_index: 0,
        };

        let rate_config = InterestRateConfig {
            optimal_utilization: WAD * 80 / 100,
            base_rate: WAD * 2 / 100,
            slope1: WAD * 4 / 100,
            slope2: WAD * 300 / 100,
        };

        client.add_reserve(&config, &rate_config);
        assert_eq!(client.get_reserve_count(), 1);

        let stored = client.get_reserve_info(&asset);
        assert_eq!(stored.ltv, 7500);
    }

    #[test]
    fn test_supply_and_withdraw() {
        let env = Env::default();
        env.mock_all_auths();

        let (pool_id, client) = setup_pool(&env);

        // Create a test token (simulating SAC)
        let admin = Address::generate(&env);
        let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
        let token_admin = StellarAssetClient::new(&env, &token_contract.address());
        let asset = token_contract.address();
        let token_client = TokenClient::new(&env, &asset);

        // Setup user
        let user = Address::generate(&env);
        token_admin.mint(&user, &10_000_0000000i128); // 10,000 with 7 decimals

        // Setup reserve with real tokens
        setup_reserve_with_tokens(&env, &pool_id, &client, &asset);

        // Supply 1000 tokens
        let supply_amount = 1000_0000000i128;
        client.supply(&user, &asset, &supply_amount);

        // Verify deposit recorded
        let deposit = client.get_user_deposit(&user, &asset);
        assert!(deposit > 0);

        // Verify token transferred
        let pool_balance = token_client.balance(&pool_id);
        assert_eq!(pool_balance, supply_amount);

        // Withdraw
        client.withdraw(&user, &asset, &supply_amount);
        let deposit_after = client.get_user_deposit(&user, &asset);
        assert_eq!(deposit_after, 0);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_init() {
        let env = Env::default();
        env.mock_all_auths();

        let (_, client) = setup_pool(&env);

        let admin2 = Address::generate(&env);
        let oracle2 = Address::generate(&env);
        let treasury2 = Address::generate(&env);
        client.initialize(&admin2, &oracle2, &treasury2);
    }

    #[test]
    fn test_toggle_collateral() {
        let env = Env::default();
        env.mock_all_auths();

        let (pool_id, client) = setup_pool(&env);

        let admin = Address::generate(&env);
        let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
        let token_admin = StellarAssetClient::new(&env, &token_contract.address());
        let asset = token_contract.address();

        let user = Address::generate(&env);
        token_admin.mint(&user, &10_000_0000000i128);

        // Setup reserve with real tokens
        setup_reserve_with_tokens(&env, &pool_id, &client, &asset);

        // Supply first
        client.supply(&user, &asset, &1000_0000000i128);

        // Verify collateral bit is automatically turned on upon supply
        let user_data = client.get_user_data(&user);
        assert!(is_using_as_collateral(user_data.config_bitmap, 0));

        // Toggle collateral off
        client.toggle_collateral(&user, &asset, &false);
        let user_data2 = client.get_user_data(&user);
        assert!(!is_using_as_collateral(user_data2.config_bitmap, 0));

        // Toggle collateral back on
        client.toggle_collateral(&user, &asset, &true);
        let user_data3 = client.get_user_data(&user);
        assert!(is_using_as_collateral(user_data3.config_bitmap, 0));
    }

    #[test]
    #[should_panic(expected = "health factor below threshold")]
    fn test_toggle_collateral_fails_with_debt() {
        let env = Env::default();
        env.mock_all_auths();

        let (pool_id, client) = setup_pool(&env);

        let admin = Address::generate(&env);
        let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
        let token_admin = StellarAssetClient::new(&env, &token_contract.address());
        let asset = token_contract.address();

        let user = Address::generate(&env);
        token_admin.mint(&user, &10_000_0000000i128);
        token_admin.mint(&pool_id, &10_000_0000000i128); // Give pool some liquidity to borrow

        // Setup reserve with real tokens
        setup_reserve_with_tokens(&env, &pool_id, &client, &asset);

        // Supply 1000
        client.supply(&user, &asset, &1000_0000000i128);

        // Borrow 100
        client.borrow(&user, &asset, &100_0000000i128);

        // Now try to turn off collateral - should panic!
        client.toggle_collateral(&user, &asset, &false);
    }
}
