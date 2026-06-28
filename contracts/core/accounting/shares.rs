//! Scaled balance conversion helpers.

use crate::balance::{
    validate_scaled_balance_amount, validate_scaled_debt_amount, validate_wad_amount,
};
use crate::errors::{AccountingResult, LendingError};
use udonfi_shared::{div_round_down, div_round_up, Ray, ScaledBalance, ScaledDebt, Wad, RAY};

fn validate_index(index: Ray) -> AccountingResult<()> {
    if index.0 <= 0 {
        return Err(LendingError::DivisionByZero);
    }
    Ok(())
}

fn gcd(mut a: i128, mut b: i128) -> i128 {
    while b != 0 {
        let rem = a % b;
        a = b;
        b = rem;
    }
    a
}

fn reduce_mul_div(a: i128, b: i128, denominator: i128) -> AccountingResult<(i128, i128)> {
    if a < 0 || b < 0 {
        return Err(LendingError::InvalidAmount);
    }
    if denominator == 0 {
        return Err(LendingError::DivisionByZero);
    }
    if denominator < 0 {
        return Err(LendingError::InvalidAmount);
    }
    if a == 0 || b == 0 {
        return Ok((0, 1));
    }

    let mut left = a;
    let mut right = b;
    let mut divisor = denominator;

    let right_gcd = gcd(right, divisor);
    right /= right_gcd;
    divisor /= right_gcd;

    let left_gcd = gcd(left, divisor);
    left /= left_gcd;
    divisor /= left_gcd;

    let product = left.checked_mul(right).ok_or(LendingError::MathOverflow)?;
    Ok((product, divisor))
}

pub fn mul_div_down(a: i128, b: i128, denominator: i128) -> AccountingResult<i128> {
    let (product, divisor) = reduce_mul_div(a, b, denominator)?;
    div_round_down(product, divisor)
}

pub fn mul_div_up(a: i128, b: i128, denominator: i128) -> AccountingResult<i128> {
    let (product, divisor) = reduce_mul_div(a, b, denominator)?;
    div_round_up(product, divisor)
}

pub fn actual_supply_to_scaled(
    actual_amount: Wad,
    supply_index: Ray,
) -> AccountingResult<ScaledBalance> {
    validate_wad_amount(actual_amount)?;
    validate_index(supply_index)?;
    Ok(ScaledBalance(mul_div_down(
        actual_amount.0,
        RAY,
        supply_index.0,
    )?))
}

pub fn scaled_supply_to_actual(
    scaled_amount: ScaledBalance,
    supply_index: Ray,
) -> AccountingResult<Wad> {
    validate_scaled_balance_amount(scaled_amount)?;
    validate_index(supply_index)?;
    Ok(Wad(mul_div_down(scaled_amount.0, supply_index.0, RAY)?))
}

pub fn actual_debt_to_scaled(
    actual_amount: Wad,
    borrow_index: Ray,
) -> AccountingResult<ScaledDebt> {
    validate_wad_amount(actual_amount)?;
    validate_index(borrow_index)?;
    Ok(ScaledDebt(mul_div_up(
        actual_amount.0,
        RAY,
        borrow_index.0,
    )?))
}

pub fn scaled_debt_to_actual(
    scaled_amount: ScaledDebt,
    borrow_index: Ray,
) -> AccountingResult<Wad> {
    validate_scaled_debt_amount(scaled_amount)?;
    validate_index(borrow_index)?;
    Ok(Wad(mul_div_up(scaled_amount.0, borrow_index.0, RAY)?))
}
