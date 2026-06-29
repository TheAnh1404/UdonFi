//! # UdonFi Reserve Contract
//!
//! Manages the configuration and interest rate state for a single asset reserve.
//! The reserve tracks:
//! - Static configuration (LTV, thresholds, fees)
//! - Interest rate parameters (kinked curve)
//! - Dynamic indices (liquidity_index, borrow_index)
//! - Current rates (borrow rate, supply rate)

#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env};
use udonfi_common::{
    math::*, InterestRateConfig, LendingError, ReserveConfig, ReserveDataKey, ReserveState, RAY,
    TTL_EXTEND_TO, TTL_THRESHOLD, WAD,
};

#[contract]
pub struct ReserveContract;

#[contractimpl]
impl ReserveContract {
    // ── Constructor ──────────────────────────

    /// Initialize a reserve with its configuration and interest rate model.
    pub fn initialize(env: Env, config: ReserveConfig, rate_config: InterestRateConfig) {
        if env.storage().instance().has(&ReserveDataKey::Config) {
            panic!("already initialized");
        }

        env.storage()
            .instance()
            .set(&ReserveDataKey::Config, &config);

        // Initialize state — indices start at 1.0 (RAY)
        let initial_state = ReserveState {
            liquidity_index: RAY,
            borrow_index: RAY,
            total_scaled_deposits: 0,
            total_scaled_borrows: 0,
            last_update_timestamp: env.ledger().timestamp(),
            current_borrow_rate: rate_config.base_rate,
            current_supply_rate: 0,
        };

        env.storage().instance().set(
            &ReserveDataKey::LiquidityIndex,
            &initial_state.liquidity_index,
        );
        env.storage()
            .instance()
            .set(&ReserveDataKey::BorrowIndex, &initial_state.borrow_index);
        env.storage().instance().set(
            &ReserveDataKey::TotalScaledDeposits,
            &initial_state.total_scaled_deposits,
        );
        env.storage().instance().set(
            &ReserveDataKey::TotalScaledBorrows,
            &initial_state.total_scaled_borrows,
        );
        env.storage().instance().set(
            &ReserveDataKey::LastUpdateTimestamp,
            &initial_state.last_update_timestamp,
        );
        env.storage().instance().set(
            &ReserveDataKey::CurrentBorrowRate,
            &initial_state.current_borrow_rate,
        );
        env.storage().instance().set(
            &ReserveDataKey::CurrentSupplyRate,
            &initial_state.current_supply_rate,
        );

        // Store interest rate config in separate keys for the reserve
        // (We'll encode it into the Config for simplicity)

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    // ── State Update Functions ───────────────

    /// Update the reserve indices based on elapsed time.
    /// This must be called before any supply/borrow/repay/withdraw operation.
    ///
    /// Returns the updated (liquidity_index, borrow_index).
    pub fn update_state(env: Env, rate_config: InterestRateConfig) -> (i128, i128) {
        let last_ts: u64 = env
            .storage()
            .instance()
            .get(&ReserveDataKey::LastUpdateTimestamp)
            .unwrap_or(0);

        let current_ts = env.ledger().timestamp();
        let time_delta = current_ts.saturating_sub(last_ts);

        if time_delta == 0 {
            let li: i128 = env
                .storage()
                .instance()
                .get(&ReserveDataKey::LiquidityIndex)
                .unwrap_or(RAY);
            let bi: i128 = env
                .storage()
                .instance()
                .get(&ReserveDataKey::BorrowIndex)
                .unwrap_or(RAY);
            return (li, bi);
        }

        let old_liquidity_index: i128 = env
            .storage()
            .instance()
            .get(&ReserveDataKey::LiquidityIndex)
            .unwrap_or(RAY);
        let old_borrow_index: i128 = env
            .storage()
            .instance()
            .get(&ReserveDataKey::BorrowIndex)
            .unwrap_or(RAY);
        let current_borrow_rate: i128 = env
            .storage()
            .instance()
            .get(&ReserveDataKey::CurrentBorrowRate)
            .unwrap_or(0);
        let current_supply_rate: i128 = env
            .storage()
            .instance()
            .get(&ReserveDataKey::CurrentSupplyRate)
            .unwrap_or(0);

        // Update borrow index with compounded interest
        let borrow_multiplier = calculate_compounded_interest(
            current_borrow_rate
                .checked_mul(1_000_000_000)
                .expect("rate overflow"), // Convert WAD rate to RAY
            time_delta,
        )
        .expect("interest calculation overflow");

        let new_borrow_index =
            ray_mul(old_borrow_index, borrow_multiplier).expect("borrow index overflow");

        // Update liquidity index with linear interest
        let supply_multiplier = calculate_linear_interest(
            current_supply_rate
                .checked_mul(1_000_000_000)
                .expect("rate overflow"),
            time_delta,
        )
        .expect("interest calculation overflow");

        let new_liquidity_index =
            ray_mul(old_liquidity_index, supply_multiplier).expect("liquidity index overflow");

        // Persist updated indices
        env.storage()
            .instance()
            .set(&ReserveDataKey::LiquidityIndex, &new_liquidity_index);
        env.storage()
            .instance()
            .set(&ReserveDataKey::BorrowIndex, &new_borrow_index);
        env.storage()
            .instance()
            .set(&ReserveDataKey::LastUpdateTimestamp, &current_ts);

        // Recalculate rates based on new utilization
        Self::recalculate_rates(&env, &rate_config);

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);

        (new_liquidity_index, new_borrow_index)
    }

    /// Update total scaled deposits.
    pub fn update_total_deposits(env: Env, delta: i128, is_increase: bool) {
        let current: i128 = env
            .storage()
            .instance()
            .get(&ReserveDataKey::TotalScaledDeposits)
            .unwrap_or(0);

        let new_total = if is_increase {
            current.checked_add(delta).expect("overflow")
        } else {
            current.checked_sub(delta).expect("underflow")
        };

        env.storage()
            .instance()
            .set(&ReserveDataKey::TotalScaledDeposits, &new_total);
    }

    /// Update total scaled borrows.
    pub fn update_total_borrows(env: Env, delta: i128, is_increase: bool) {
        let current: i128 = env
            .storage()
            .instance()
            .get(&ReserveDataKey::TotalScaledBorrows)
            .unwrap_or(0);

        let new_total = if is_increase {
            current.checked_add(delta).expect("overflow")
        } else {
            current.checked_sub(delta).expect("underflow")
        };

        env.storage()
            .instance()
            .set(&ReserveDataKey::TotalScaledBorrows, &new_total);
    }

    // ── View Functions ───────────────────────

    /// Get the reserve configuration.
    pub fn get_config(env: Env) -> ReserveConfig {
        env.storage()
            .instance()
            .get(&ReserveDataKey::Config)
            .expect("not initialized")
    }

    /// Get the current liquidity index.
    pub fn get_liquidity_index(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&ReserveDataKey::LiquidityIndex)
            .unwrap_or(RAY)
    }

    /// Get the current borrow index.
    pub fn get_borrow_index(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&ReserveDataKey::BorrowIndex)
            .unwrap_or(RAY)
    }

    /// Get the total actual deposits (scaled × liquidity_index).
    pub fn get_total_deposits(env: Env) -> i128 {
        let scaled: i128 = env
            .storage()
            .instance()
            .get(&ReserveDataKey::TotalScaledDeposits)
            .unwrap_or(0);
        let index: i128 = env
            .storage()
            .instance()
            .get(&ReserveDataKey::LiquidityIndex)
            .unwrap_or(RAY);
        ray_mul(scaled, index).unwrap_or(0)
    }

    /// Get the total actual borrows (scaled × borrow_index).
    pub fn get_total_borrows(env: Env) -> i128 {
        let scaled: i128 = env
            .storage()
            .instance()
            .get(&ReserveDataKey::TotalScaledBorrows)
            .unwrap_or(0);
        let index: i128 = env
            .storage()
            .instance()
            .get(&ReserveDataKey::BorrowIndex)
            .unwrap_or(RAY);
        ray_mul(scaled, index).unwrap_or(0)
    }

    /// Get the current borrow rate (WAD precision).
    pub fn get_borrow_rate(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&ReserveDataKey::CurrentBorrowRate)
            .unwrap_or(0)
    }

    /// Get the current supply rate (WAD precision).
    pub fn get_supply_rate(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&ReserveDataKey::CurrentSupplyRate)
            .unwrap_or(0)
    }

    // ── Internal Helpers ─────────────────────

    /// Recalculate borrow and supply rates based on current utilization.
    fn recalculate_rates(env: &Env, rate_config: &InterestRateConfig) {
        let total_deposits = Self::get_total_deposits(env.clone());
        let total_borrows = Self::get_total_borrows(env.clone());

        let utilization = calculate_utilization_rate(total_deposits, total_borrows).unwrap_or(0);

        let borrow_rate = calculate_borrow_rate(
            utilization,
            rate_config.optimal_utilization,
            rate_config.base_rate,
            rate_config.slope1,
            rate_config.slope2,
        )
        .unwrap_or(rate_config.base_rate);

        let config: ReserveConfig = env
            .storage()
            .instance()
            .get(&ReserveDataKey::Config)
            .unwrap();

        let supply_rate =
            calculate_supply_rate(borrow_rate, utilization, config.reserve_factor).unwrap_or(0);

        env.storage()
            .instance()
            .set(&ReserveDataKey::CurrentBorrowRate, &borrow_rate);
        env.storage()
            .instance()
            .set(&ReserveDataKey::CurrentSupplyRate, &supply_rate);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn create_test_config(env: &Env) -> (ReserveConfig, InterestRateConfig) {
        let config = ReserveConfig {
            asset: Address::generate(env),
            a_token: Address::generate(env),
            debt_token: Address::generate(env),
            ltv: 7500,                   // 75%
            liquidation_threshold: 8000, // 80%
            liquidation_bonus: 500,      // 5%
            reserve_factor: 1000,        // 10%
            decimals: 7,
            is_active: true,
            is_borrowing_enabled: true,
            reserve_index: 0,
        };

        let rate_config = InterestRateConfig {
            optimal_utilization: WAD * 80 / 100, // 80%
            base_rate: WAD * 2 / 100,            // 2%
            slope1: WAD * 4 / 100,               // 4%
            slope2: WAD * 300 / 100,             // 300%
        };

        (config, rate_config)
    }

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register(ReserveContract, ());
        let client = ReserveContractClient::new(&env, &contract_id);

        let (config, rate_config) = create_test_config(&env);
        client.initialize(&config, &rate_config);

        // Verify initial state
        assert_eq!(client.get_liquidity_index(), RAY);
        assert_eq!(client.get_borrow_index(), RAY);
        assert_eq!(client.get_total_deposits(), 0);
        assert_eq!(client.get_total_borrows(), 0);
    }

    #[test]
    fn test_update_totals() {
        let env = Env::default();
        let contract_id = env.register(ReserveContract, ());
        let client = ReserveContractClient::new(&env, &contract_id);

        let (config, rate_config) = create_test_config(&env);
        client.initialize(&config, &rate_config);

        // Add deposits
        client.update_total_deposits(&1000i128, &true);
        // Total deposits = 1000 * RAY / RAY = 1000
        // But since index = RAY, actual = scaled * index / RAY... we're using ray_mul

        // Add borrows
        client.update_total_borrows(&500i128, &true);
    }

    #[test]
    fn test_get_config() {
        let env = Env::default();
        let contract_id = env.register(ReserveContract, ());
        let client = ReserveContractClient::new(&env, &contract_id);

        let (config, rate_config) = create_test_config(&env);
        let expected_ltv = config.ltv;
        client.initialize(&config, &rate_config);

        let stored_config = client.get_config();
        assert_eq!(stored_config.ltv, expected_ltv);
        assert_eq!(stored_config.liquidation_threshold, 8000);
        assert_eq!(stored_config.reserve_factor, 1000);
    }
}
