//! Basic MVP risk calculations.

use soroban_sdk::{contracttype, Address, Env};
use udonfi_accounting::{
    read_reserve_accounting, read_user_accounting_snapshot, scaled_debt_to_actual,
    scaled_supply_to_actual,
};
use udonfi_config_engine::{default_risk_config, storage::read_latest_risk_config};
use udonfi_reserve_registry::{storage::read_reserve, Reserve};
use udonfi_shared::{
    BasisPoints, HealthFactor, Price, ReserveId, Wad, MIN_HEALTH_FACTOR, PERCENTAGE_FACTOR, WAD,
};

use crate::errors::{LendingError, RiskResult};
use crate::storage::read_price_or_default;

pub const MAX_HEALTH_FACTOR: i128 = i128::MAX;

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct RiskCheckResult {
    pub is_allowed: bool,
    pub collateral_value: Wad,
    pub borrow_value: Wad,
    pub ltv_bps: BasisPoints,
    pub health_factor: HealthFactor,
    pub min_health_factor: HealthFactor,
    pub max_ltv: BasisPoints,
}

fn validate_non_negative(amount: Wad) -> RiskResult<()> {
    if amount.0 < 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

fn validate_price(price: Price) -> RiskResult<()> {
    if price.0 <= 0 {
        return Err(LendingError::InvalidPriceValue);
    }
    Ok(())
}

fn mul_div_down(lhs: i128, rhs: i128, denominator: i128) -> RiskResult<i128> {
    if lhs < 0 || rhs < 0 || denominator < 0 {
        return Err(LendingError::InvalidAmount);
    }
    if denominator == 0 {
        return Err(LendingError::DivisionByZero);
    }
    let product = lhs.checked_mul(rhs).ok_or(LendingError::MathOverflow)?;
    Ok(product / denominator)
}

fn checked_add_wad(lhs: Wad, rhs: Wad) -> RiskResult<Wad> {
    validate_non_negative(lhs)?;
    validate_non_negative(rhs)?;
    lhs.0
        .checked_add(rhs.0)
        .map(Wad)
        .ok_or(LendingError::MathOverflow)
}

fn checked_sub_wad(lhs: Wad, rhs: Wad) -> RiskResult<Wad> {
    validate_non_negative(lhs)?;
    validate_non_negative(rhs)?;
    if rhs.0 > lhs.0 {
        return Err(LendingError::InsufficientCollateral);
    }
    lhs.0
        .checked_sub(rhs.0)
        .map(Wad)
        .ok_or(LendingError::MathUnderflow)
}

fn value_with_price(amount: Wad, price: Price) -> RiskResult<Wad> {
    validate_non_negative(amount)?;
    validate_price(price)?;
    Ok(Wad(mul_div_down(amount.0, price.0, WAD)?))
}

fn apply_bps(value: Wad, bps: BasisPoints) -> RiskResult<Wad> {
    validate_non_negative(value)?;
    if bps.0 > PERCENTAGE_FACTOR {
        return Err(LendingError::InvalidAmount);
    }
    Ok(Wad(mul_div_down(
        value.0,
        i128::from(bps.0),
        i128::from(PERCENTAGE_FACTOR),
    )?))
}

pub fn calculate_collateral_value(amount: Wad, price: Price) -> RiskResult<Wad> {
    value_with_price(amount, price)
}

pub fn calculate_borrow_value(amount: Wad, price: Price) -> RiskResult<Wad> {
    value_with_price(amount, price)
}

pub fn calculate_ltv(collateral_value: Wad, borrow_value: Wad) -> RiskResult<BasisPoints> {
    validate_non_negative(collateral_value)?;
    validate_non_negative(borrow_value)?;
    if borrow_value.0 == 0 {
        return Ok(BasisPoints(0));
    }
    if collateral_value.0 == 0 {
        return Ok(BasisPoints(u32::MAX));
    }
    let ltv = mul_div_down(
        borrow_value.0,
        i128::from(PERCENTAGE_FACTOR),
        collateral_value.0,
    )?;
    if ltv > i128::from(u32::MAX) {
        return Err(LendingError::MathOverflow);
    }
    Ok(BasisPoints(ltv as u32))
}

pub fn calculate_health_factor(
    collateral_value: Wad,
    borrow_value: Wad,
    liquidation_threshold: BasisPoints,
) -> RiskResult<HealthFactor> {
    validate_non_negative(collateral_value)?;
    validate_non_negative(borrow_value)?;
    if borrow_value.0 == 0 {
        return Ok(HealthFactor(MAX_HEALTH_FACTOR));
    }
    if collateral_value.0 == 0 {
        return Ok(HealthFactor(0));
    }

    let threshold_value = apply_bps(collateral_value, liquidation_threshold)?;
    Ok(HealthFactor(mul_div_down(
        threshold_value.0,
        WAD,
        borrow_value.0,
    )?))
}

pub fn can_borrow(
    env: &Env,
    user: &Address,
    reserve_id: ReserveId,
    additional_borrow: Wad,
) -> RiskResult<RiskCheckResult> {
    if additional_borrow.0 <= 0 {
        return Err(LendingError::InvalidAmount);
    }
    evaluate_user_position(env, user, reserve_id, Wad(0), additional_borrow)
}

pub fn can_withdraw(
    env: &Env,
    user: &Address,
    reserve_id: ReserveId,
    withdraw_amount: Wad,
) -> RiskResult<RiskCheckResult> {
    if withdraw_amount.0 <= 0 {
        return Err(LendingError::InvalidAmount);
    }
    evaluate_user_position(env, user, reserve_id, withdraw_amount, Wad(0))
}

pub fn evaluate_user_position(
    env: &Env,
    user: &Address,
    reserve_id: ReserveId,
    withdraw_amount: Wad,
    additional_borrow: Wad,
) -> RiskResult<RiskCheckResult> {
    let reserve = read_reserve(env, reserve_id).ok_or(LendingError::ReserveNotFound)?;
    let accounting =
        read_reserve_accounting(env, reserve_id).ok_or(LendingError::NotInitialized)?;
    let snapshot = read_user_accounting_snapshot(env, user, reserve_id);
    let risk_config = read_latest_risk_config(env).unwrap_or_else(default_risk_config);

    let current_supply = if let Some(ref snapshot) = snapshot {
        scaled_supply_to_actual(snapshot.scaled_supply, accounting.supply_index)?
    } else {
        Wad(0)
    };
    let current_debt = if let Some(ref snapshot) = snapshot {
        scaled_debt_to_actual(snapshot.scaled_debt, accounting.borrow_index)?
    } else {
        Wad(0)
    };

    let projected_supply = checked_sub_wad(current_supply, withdraw_amount)?;
    let projected_debt = checked_add_wad(current_debt, additional_borrow)?;

    evaluate_position(
        projected_supply,
        projected_debt,
        read_price_or_default(env, reserve_id),
        read_price_or_default(env, reserve_id),
        &reserve,
        risk_config.min_health_factor,
    )
}

pub fn evaluate_position(
    collateral_amount: Wad,
    borrow_amount: Wad,
    collateral_price: Price,
    borrow_price: Price,
    collateral_reserve: &Reserve,
    min_health_factor: HealthFactor,
) -> RiskResult<RiskCheckResult> {
    let collateral_value = calculate_collateral_value(collateral_amount, collateral_price)?;
    let borrow_value = calculate_borrow_value(borrow_amount, borrow_price)?;
    let ltv_bps = calculate_ltv(collateral_value, borrow_value)?;
    let health_factor = calculate_health_factor(
        collateral_value,
        borrow_value,
        collateral_reserve.liquidation_threshold,
    )?;
    let max_ltv = BasisPoints(collateral_reserve.max_ltv.0);
    let min_hf = if min_health_factor.0 <= 0 {
        HealthFactor(MIN_HEALTH_FACTOR)
    } else {
        min_health_factor
    };

    Ok(RiskCheckResult {
        is_allowed: ltv_bps.0 <= max_ltv.0 && health_factor.0 >= min_hf.0,
        collateral_value,
        borrow_value,
        ltv_bps,
        health_factor,
        min_health_factor: min_hf,
        max_ltv,
    })
}
