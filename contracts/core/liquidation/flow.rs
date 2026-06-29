//! Basic liquidation MVP flow.

use crate::errors::{LendingError, LiquidationResult};
use crate::events::publish_liquidation_executed;
use crate::model::{LiquidationExecutionResult, LiquidationRequest, LiquidationValidationResult};
use soroban_sdk::{Env, String};
use udonfi_accounting::{
    apply_debt_decrease, apply_liquidity_decrease, apply_liquidity_increase, apply_supply_decrease,
    read_accounting_ledger, read_reserve_accounting, read_user_accounting_snapshot,
    scaled_debt_to_actual, scaled_supply_to_actual, validate_accounting_ledger,
    validate_reserve_accounting, write_accounting_ledger, write_reserve_accounting,
    write_user_accounting_snapshot, ReserveAccounting, UserAccountingSnapshot,
};
use udonfi_config_engine::{default_risk_config, storage::read_latest_risk_config};
use udonfi_pool_state::{storage::read_pool_state, ProtocolStatus};
use udonfi_reserve_registry::{
    can_reserve_allow_repay, can_reserve_allow_withdraw, storage::read_reserve, Reserve,
};
use udonfi_shared::{
    BasisPoints, HealthFactor, Price, ReserveId, ScaledBalance, ScaledDebt, Wad,
    LIQUIDATION_EXECUTED, MIN_HEALTH_FACTOR, PERCENTAGE_FACTOR, WAD,
};

fn validate_amount(amount: Wad) -> LiquidationResult<()> {
    if amount.0 <= 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

fn mul_div_down(lhs: i128, rhs: i128, denominator: i128) -> LiquidationResult<i128> {
    if lhs < 0 || rhs < 0 || denominator < 0 {
        return Err(LendingError::InvalidAmount);
    }
    if denominator == 0 {
        return Err(LendingError::DivisionByZero);
    }
    let product = lhs.checked_mul(rhs).ok_or(LendingError::MathOverflow)?;
    Ok(product / denominator)
}

fn apply_bps(amount: Wad, bps: BasisPoints) -> LiquidationResult<Wad> {
    Ok(Wad(mul_div_down(
        amount.0,
        i128::from(bps.0),
        i128::from(PERCENTAGE_FACTOR),
    )?))
}

fn add_bonus_bps(base: BasisPoints, bonus: BasisPoints) -> LiquidationResult<BasisPoints> {
    let bps = base
        .0
        .checked_add(bonus.0)
        .ok_or(LendingError::MathOverflow)?;
    Ok(BasisPoints(bps))
}

fn reserve_price(env: &Env, reserve_id: ReserveId) -> Price {
    udonfi_risk::read_price_or_default(env, reserve_id)
}

fn value_to_amount(value: Wad, price: Price) -> LiquidationResult<Wad> {
    if price.0 <= 0 {
        return Err(LendingError::InvalidPriceValue);
    }
    Ok(Wad(mul_div_down(value.0, WAD, price.0)?))
}

pub fn calculate_close_factor_amount(
    borrower_debt: Wad,
    close_factor_bps: BasisPoints,
) -> LiquidationResult<Wad> {
    if close_factor_bps.0 > PERCENTAGE_FACTOR {
        return Err(LendingError::InvalidAmount);
    }
    apply_bps(borrower_debt, close_factor_bps)
}

pub fn calculate_collateral_to_seize(
    debt_to_cover: Wad,
    debt_price: Price,
    collateral_price: Price,
    liquidation_bonus: BasisPoints,
) -> LiquidationResult<Wad> {
    let debt_value = udonfi_risk::calculate_borrow_value(debt_to_cover, debt_price)?;
    let bonus_value = apply_bps(
        debt_value,
        add_bonus_bps(BasisPoints(PERCENTAGE_FACTOR), liquidation_bonus)?,
    )?;
    value_to_amount(bonus_value, collateral_price)
}

fn read_required_position(
    env: &Env,
    user: &soroban_sdk::Address,
    reserve_id: ReserveId,
) -> LiquidationResult<(UserAccountingSnapshot, ReserveAccounting, Reserve)> {
    let snapshot =
        read_user_accounting_snapshot(env, user, reserve_id).ok_or(LendingError::NoDebtToRepay)?;
    let accounting =
        read_reserve_accounting(env, reserve_id).ok_or(LendingError::NotInitialized)?;
    let reserve = read_reserve(env, reserve_id).ok_or(LendingError::ReserveNotFound)?;
    Ok((snapshot, accounting, reserve))
}

pub fn prepare_liquidation(
    env: &Env,
    request: &LiquidationRequest,
) -> LiquidationResult<LiquidationValidationResult> {
    validate_amount(request.repay_amount)?;
    let pool = read_pool_state(env).ok_or(LendingError::NotInitialized)?;
    if pool.protocol_status == ProtocolStatus::Uninitialized {
        return Err(LendingError::NotInitialized);
    }

    let (debt_snapshot, debt_accounting, debt_reserve) =
        read_required_position(env, &request.borrower, request.debt_reserve_id)?;
    let (collateral_snapshot, collateral_accounting, collateral_reserve) =
        read_required_position(env, &request.borrower, request.collateral_reserve_id)?;

    if request.debt_asset_address != debt_reserve.asset_address
        || request.collateral_asset_address != collateral_reserve.asset_address
    {
        return Err(LendingError::InvalidIndex);
    }
    if !can_reserve_allow_repay(env, request.debt_reserve_id)
        || !can_reserve_allow_withdraw(env, request.collateral_reserve_id)
    {
        return Err(LendingError::ReserveNotActive);
    }

    let borrower_debt =
        scaled_debt_to_actual(debt_snapshot.scaled_debt, debt_accounting.borrow_index)?;
    if borrower_debt.0 <= 0 {
        return Err(LendingError::NoDebtToRepay);
    }
    let borrower_collateral = scaled_supply_to_actual(
        collateral_snapshot.scaled_supply,
        collateral_accounting.supply_index,
    )?;
    if borrower_collateral.0 <= 0 {
        return Err(LendingError::InsufficientCollateral);
    }

    let risk_config = read_latest_risk_config(env).unwrap_or_else(default_risk_config);
    let collateral_value = udonfi_risk::calculate_collateral_value(
        borrower_collateral,
        reserve_price(env, request.collateral_reserve_id),
    )?;
    let borrow_value = udonfi_risk::calculate_borrow_value(
        borrower_debt,
        reserve_price(env, request.debt_reserve_id),
    )?;
    let health_factor = udonfi_risk::calculate_health_factor(
        collateral_value,
        borrow_value,
        collateral_reserve.liquidation_threshold,
    )?;
    let min_hf = if risk_config.min_health_factor.0 <= 0 {
        HealthFactor(MIN_HEALTH_FACTOR)
    } else {
        risk_config.min_health_factor
    };
    if health_factor.0 >= min_hf.0 {
        return Err(LendingError::LiquidationNotAllowed);
    }

    let close_factor_amount =
        calculate_close_factor_amount(borrower_debt, risk_config.max_close_factor_bps)?;
    let max_debt_to_cover = if close_factor_amount.0 > borrower_debt.0 {
        borrower_debt
    } else {
        close_factor_amount
    };
    let debt_to_cover = if request.repay_amount.0 > max_debt_to_cover.0 {
        max_debt_to_cover
    } else {
        request.repay_amount
    };
    validate_amount(debt_to_cover)?;

    let mut collateral_to_seize = calculate_collateral_to_seize(
        debt_to_cover,
        reserve_price(env, request.debt_reserve_id),
        reserve_price(env, request.collateral_reserve_id),
        collateral_reserve.liquidation_bonus,
    )?;
    if collateral_to_seize.0 > borrower_collateral.0 {
        collateral_to_seize = borrower_collateral;
    }

    Ok(LiquidationValidationResult {
        is_valid: true,
        debt_reserve_id: request.debt_reserve_id,
        collateral_reserve_id: request.collateral_reserve_id,
        requested_repay_amount: request.repay_amount,
        debt_to_cover,
        collateral_to_seize,
        borrower_debt,
        borrower_collateral,
        health_factor,
        close_factor_bps: risk_config.max_close_factor_bps,
        liquidation_bonus_bps: collateral_reserve.liquidation_bonus,
    })
}

fn subtract_debt(
    snapshot: &mut UserAccountingSnapshot,
    delta: ScaledDebt,
) -> LiquidationResult<()> {
    snapshot.scaled_debt = ScaledDebt(
        snapshot
            .scaled_debt
            .0
            .checked_sub(delta.0)
            .ok_or(LendingError::MathUnderflow)?,
    );
    Ok(())
}

fn subtract_supply(
    snapshot: &mut UserAccountingSnapshot,
    delta: ScaledBalance,
) -> LiquidationResult<()> {
    snapshot.scaled_supply = ScaledBalance(
        snapshot
            .scaled_supply
            .0
            .checked_sub(delta.0)
            .ok_or(LendingError::MathUnderflow)?,
    );
    Ok(())
}

pub fn execute_liquidation(
    env: &Env,
    request: &LiquidationRequest,
) -> LiquidationResult<LiquidationExecutionResult> {
    let prepared = prepare_liquidation(env, request)?;
    if !prepared.is_valid {
        return Err(LendingError::InvalidAmount);
    }

    let mut ledger = read_accounting_ledger(env).ok_or(LendingError::NotInitialized)?;
    let same_reserve = prepared.debt_reserve_id == prepared.collateral_reserve_id;

    let result = if same_reserve {
        let mut accounting = read_reserve_accounting(env, prepared.debt_reserve_id)
            .ok_or(LendingError::NotInitialized)?;
        let mut snapshot =
            read_user_accounting_snapshot(env, &request.borrower, prepared.debt_reserve_id)
                .ok_or(LendingError::NoDebtToRepay)?;
        let previous_debt = snapshot.scaled_debt;
        let previous_collateral = snapshot.scaled_supply;

        let debt = apply_debt_decrease(
            &mut ledger,
            &mut accounting,
            prepared.debt_to_cover,
            request.current_ledger,
        )?;
        apply_liquidity_increase(
            &mut ledger,
            &mut accounting,
            prepared.debt_to_cover,
            request.current_ledger,
        )?;
        let supply = apply_supply_decrease(
            &mut ledger,
            &mut accounting,
            prepared.collateral_to_seize,
            request.current_ledger,
        )?;
        apply_liquidity_decrease(
            &mut ledger,
            &mut accounting,
            prepared.collateral_to_seize,
            request.current_ledger,
        )?;

        subtract_debt(&mut snapshot, debt.scaled_delta)?;
        subtract_supply(&mut snapshot, supply.scaled_delta)?;
        snapshot.last_updated_ledger = request.current_ledger;

        validate_accounting_ledger(&ledger)?;
        validate_reserve_accounting(&accounting)?;

        write_accounting_ledger(env, &ledger);
        write_reserve_accounting(env, &accounting);
        write_user_accounting_snapshot(env, &snapshot);

        LiquidationExecutionResult {
            liquidator: request.liquidator.clone(),
            borrower: request.borrower.clone(),
            debt_reserve_id: prepared.debt_reserve_id,
            collateral_reserve_id: prepared.collateral_reserve_id,
            debt_repaid: prepared.debt_to_cover,
            collateral_seized: prepared.collateral_to_seize,
            scaled_debt_burned: debt.scaled_delta,
            scaled_collateral_burned: supply.scaled_delta,
            previous_borrower_scaled_debt: previous_debt,
            updated_borrower_scaled_debt: snapshot.scaled_debt,
            previous_borrower_collateral: previous_collateral,
            updated_borrower_collateral: snapshot.scaled_supply,
            health_factor_before: prepared.health_factor,
            ledger: request.current_ledger,
            accounting_version: debt.accounting_version,
            event_name: String::from_str(env, LIQUIDATION_EXECUTED),
        }
    } else {
        let mut debt_accounting = read_reserve_accounting(env, prepared.debt_reserve_id)
            .ok_or(LendingError::NotInitialized)?;
        let mut collateral_accounting =
            read_reserve_accounting(env, prepared.collateral_reserve_id)
                .ok_or(LendingError::NotInitialized)?;
        let mut debt_snapshot =
            read_user_accounting_snapshot(env, &request.borrower, prepared.debt_reserve_id)
                .ok_or(LendingError::NoDebtToRepay)?;
        let mut collateral_snapshot =
            read_user_accounting_snapshot(env, &request.borrower, prepared.collateral_reserve_id)
                .ok_or(LendingError::InsufficientCollateral)?;
        let previous_debt = debt_snapshot.scaled_debt;
        let previous_collateral = collateral_snapshot.scaled_supply;

        let debt = apply_debt_decrease(
            &mut ledger,
            &mut debt_accounting,
            prepared.debt_to_cover,
            request.current_ledger,
        )?;
        apply_liquidity_increase(
            &mut ledger,
            &mut debt_accounting,
            prepared.debt_to_cover,
            request.current_ledger,
        )?;
        let supply = apply_supply_decrease(
            &mut ledger,
            &mut collateral_accounting,
            prepared.collateral_to_seize,
            request.current_ledger,
        )?;
        apply_liquidity_decrease(
            &mut ledger,
            &mut collateral_accounting,
            prepared.collateral_to_seize,
            request.current_ledger,
        )?;

        subtract_debt(&mut debt_snapshot, debt.scaled_delta)?;
        subtract_supply(&mut collateral_snapshot, supply.scaled_delta)?;
        debt_snapshot.last_updated_ledger = request.current_ledger;
        collateral_snapshot.last_updated_ledger = request.current_ledger;

        validate_accounting_ledger(&ledger)?;
        validate_reserve_accounting(&debt_accounting)?;
        validate_reserve_accounting(&collateral_accounting)?;

        write_accounting_ledger(env, &ledger);
        write_reserve_accounting(env, &debt_accounting);
        write_reserve_accounting(env, &collateral_accounting);
        write_user_accounting_snapshot(env, &debt_snapshot);
        write_user_accounting_snapshot(env, &collateral_snapshot);

        LiquidationExecutionResult {
            liquidator: request.liquidator.clone(),
            borrower: request.borrower.clone(),
            debt_reserve_id: prepared.debt_reserve_id,
            collateral_reserve_id: prepared.collateral_reserve_id,
            debt_repaid: prepared.debt_to_cover,
            collateral_seized: prepared.collateral_to_seize,
            scaled_debt_burned: debt.scaled_delta,
            scaled_collateral_burned: supply.scaled_delta,
            previous_borrower_scaled_debt: previous_debt,
            updated_borrower_scaled_debt: debt_snapshot.scaled_debt,
            previous_borrower_collateral: previous_collateral,
            updated_borrower_collateral: collateral_snapshot.scaled_supply,
            health_factor_before: prepared.health_factor,
            ledger: request.current_ledger,
            accounting_version: debt.accounting_version,
            event_name: String::from_str(env, LIQUIDATION_EXECUTED),
        }
    };

    publish_liquidation_executed(env, &result);
    Ok(result)
}
