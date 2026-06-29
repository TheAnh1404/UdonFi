#![cfg(test)]
#![allow(deprecated)]

use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env, String, Symbol};
use udonfi_accounting::{
    read_reserve_accounting, read_user_accounting_snapshot, write_accounting_ledger,
    write_reserve_accounting, write_user_accounting_snapshot, AccountingLedger, ReserveAccounting,
    UserAccountingSnapshot,
};
use udonfi_borrow::{execute_borrow, BorrowRequest};
use udonfi_config_engine::{
    default_risk_config, default_validation_config, storage::write_latest_risk_config,
    storage::write_latest_validation_config, RiskConfig,
};
use udonfi_liquidation_core::{execute_liquidation, LiquidationRequest};
use udonfi_pool_state::{storage::write_pool_state, Pool, ProtocolStatus};
use udonfi_repay::{execute_repay, RepayRequest};
use udonfi_reserve_registry::{storage::write_reserve, Reserve, ReserveStatus};
use udonfi_shared::{
    BasisPoints, HealthFactor, LedgerSequence, Ltv, Ray, ReserveFactor, ReserveId, ScaledBalance,
    ScaledDebt, Timestamp, Wad, MIN_HEALTH_FACTOR, RAY,
};
use udonfi_supply::{execute_deposit, DepositRequest};
use udonfi_withdraw::{execute_withdraw, WithdrawRequest};

#[contract]
pub struct MockMvpContract;

#[contractimpl]
impl MockMvpContract {
    pub fn dummy(_env: Env) {}
}

fn ledger(value: u32) -> LedgerSequence {
    LedgerSequence(value)
}

fn reserve_id() -> ReserveId {
    ReserveId(0)
}

fn seed_protocol(env: &Env) {
    let now = Timestamp(env.ledger().timestamp());
    write_pool_state(
        env,
        &Pool {
            protocol_version: 2,
            protocol_name: String::from_str(env, "UdonFi V2"),
            protocol_status: ProtocolStatus::Active,
            total_reserves: 1,
            active_reserves: 1,
            paused: false,
            guardian: Address::generate(env),
            admin: Address::generate(env),
            treasury_address: Address::generate(env),
            insurance_fund_address: Address::generate(env),
            created_at: now,
            updated_at: now,
            initialized_at: now,
            current_config_version: 1,
        },
    );

    let mut validation = default_validation_config();
    validation.min_deposit_amount = Wad(1);
    validation.min_borrow_amount = Wad(1);
    validation.min_repay_amount = Wad(1);
    validation.dust_threshold = Wad(1);
    validation.max_transaction_amount = Wad(1_000_000);
    write_latest_validation_config(env, &validation);

    let mut risk: RiskConfig = default_risk_config();
    risk.min_health_factor = HealthFactor(MIN_HEALTH_FACTOR);
    risk.max_close_factor_bps = BasisPoints(5_000);
    write_latest_risk_config(env, &risk);
}

fn seed_reserve(env: &Env, threshold: u32) -> Address {
    let asset = Address::generate(env);
    let now = Timestamp(env.ledger().timestamp());
    write_reserve(
        env,
        &Reserve {
            reserve_id: reserve_id(),
            asset_address: asset.clone(),
            asset_symbol: Symbol::new(env, "USDC"),
            asset_decimals: 6,
            reserve_status: ReserveStatus::Active,
            supply_cap: Wad(1_000_000),
            borrow_cap: Wad(1_000_000),
            reserve_factor: ReserveFactor(1_000),
            max_ltv: Ltv(8_000),
            liquidation_threshold: BasisPoints(threshold),
            liquidation_bonus: BasisPoints(500),
            borrow_index: Ray(RAY),
            supply_index: Ray(RAY),
            last_accrual_ledger: ledger(100),
            created_at: now,
            updated_at: now,
        },
    );
    asset
}

fn seed_empty_accounting(env: &Env) {
    write_reserve_accounting(env, &ReserveAccounting::new(reserve_id(), ledger(100)));
    write_accounting_ledger(env, &AccountingLedger::new(ledger(100)));
}

fn record_deposit_snapshot(env: &Env, user: Address, scaled_supply: ScaledBalance) {
    write_user_accounting_snapshot(
        env,
        &UserAccountingSnapshot {
            user,
            reserve_id: reserve_id(),
            scaled_supply,
            scaled_debt: ScaledDebt(0),
            collateral_enabled: true,
            last_updated_ledger: ledger(100),
        },
    );
}

fn deposit_request(actor: Address, asset: Address, amount: i128) -> DepositRequest {
    DepositRequest {
        actor,
        reserve_id: reserve_id(),
        asset_address: asset,
        amount: Wad(amount),
        current_ledger: ledger(100),
        referral_code: None,
    }
}

fn borrow_request(actor: Address, asset: Address, amount: i128) -> BorrowRequest {
    BorrowRequest {
        actor,
        reserve_id: reserve_id(),
        asset_address: asset,
        amount: Wad(amount),
        current_ledger: ledger(100),
    }
}

fn repay_request(actor: Address, asset: Address, amount: i128) -> RepayRequest {
    RepayRequest {
        actor,
        reserve_id: reserve_id(),
        asset_address: asset,
        amount: Wad(amount),
        current_ledger: ledger(100),
    }
}

fn withdraw_request(actor: Address, asset: Address, amount: i128) -> WithdrawRequest {
    WithdrawRequest {
        actor,
        reserve_id: reserve_id(),
        asset_address: asset,
        amount: Wad(amount),
        current_ledger: ledger(100),
    }
}

fn liquidation_request(
    env: &Env,
    borrower: Address,
    asset: Address,
    amount: i128,
) -> LiquidationRequest {
    LiquidationRequest {
        liquidator: Address::generate(env),
        borrower,
        debt_reserve_id: reserve_id(),
        collateral_reserve_id: reserve_id(),
        debt_asset_address: asset.clone(),
        collateral_asset_address: asset,
        repay_amount: Wad(amount),
        current_ledger: ledger(100),
    }
}

#[test]
fn test_initialize_create_reserve_deposit_borrow_repay_withdraw_flow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockMvpContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_protocol(&env);
        let asset = seed_reserve(&env, 8_500);
        seed_empty_accounting(&env);

        let deposit =
            execute_deposit(&env, &deposit_request(user.clone(), asset.clone(), 1_000)).unwrap();
        record_deposit_snapshot(&env, user.clone(), deposit.scaled_supply_minted);

        execute_borrow(&env, &borrow_request(user.clone(), asset.clone(), 400)).unwrap();
        execute_repay(&env, &repay_request(user.clone(), asset.clone(), 150)).unwrap();
        execute_withdraw(&env, &withdraw_request(user.clone(), asset.clone(), 200)).unwrap();

        let reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        assert_eq!(reserve.total_actual_supply, Wad(800));
        assert_eq!(reserve.total_actual_debt, Wad(250));
        assert_eq!(reserve.total_liquidity, Wad(550));

        let snapshot = read_user_accounting_snapshot(&env, &user, reserve_id()).unwrap();
        assert_eq!(snapshot.scaled_supply, ScaledBalance(800));
        assert_eq!(snapshot.scaled_debt, ScaledDebt(250));
    });
}

#[test]
fn test_initialize_deposit_borrow_mock_hf_drop_liquidate_flow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MockMvpContract);

    env.as_contract(&contract_id, || {
        let user = Address::generate(&env);
        seed_protocol(&env);
        let asset = seed_reserve(&env, 8_500);
        seed_empty_accounting(&env);

        let deposit =
            execute_deposit(&env, &deposit_request(user.clone(), asset.clone(), 1_000)).unwrap();
        record_deposit_snapshot(&env, user.clone(), deposit.scaled_supply_minted);
        execute_borrow(&env, &borrow_request(user.clone(), asset.clone(), 800)).unwrap();

        let mut reserve =
            udonfi_reserve_registry::storage::read_reserve(&env, reserve_id()).unwrap();
        reserve.liquidation_threshold = BasisPoints(7_000);
        write_reserve(&env, &reserve);

        let liquidation =
            execute_liquidation(&env, &liquidation_request(&env, user.clone(), asset, 400))
                .unwrap();
        assert_eq!(liquidation.debt_repaid, Wad(400));
        assert_eq!(liquidation.collateral_seized, Wad(420));

        let reserve = read_reserve_accounting(&env, reserve_id()).unwrap();
        assert_eq!(reserve.total_actual_supply, Wad(580));
        assert_eq!(reserve.total_actual_debt, Wad(400));
        assert_eq!(reserve.total_liquidity, Wad(180));
    });
}
