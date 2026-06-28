//! Utilization, borrow-rate, and supply-rate calculations.

use crate::errors::{InterestResult, LendingError};
use crate::model::{bps_to_ray, InterestRateModel};
use crate::validation::validate_rate_model;
use udonfi_accounting::shares::{mul_div_down, mul_div_up};
use udonfi_shared::{BasisPoints, Ray, Wad, RAY};

pub fn calculate_utilization_rate(total_supply: Wad, total_borrow: Wad) -> InterestResult<Ray> {
    if total_supply.0 < 0 || total_borrow.0 < 0 {
        return Err(LendingError::InvalidAmount);
    }
    if total_supply.0 == 0 || total_borrow.0 == 0 {
        return Ok(Ray(0));
    }
    if total_borrow.0 > total_supply.0 {
        return Err(LendingError::InvalidAmount);
    }

    Ok(Ray(mul_div_up(total_borrow.0, RAY, total_supply.0)?))
}

pub fn calculate_borrow_rate(
    utilization_rate: Ray,
    model: &InterestRateModel,
) -> InterestResult<Ray> {
    validate_rate_model(model)?;
    if utilization_rate.0 < 0 || utilization_rate.0 > RAY {
        return Err(LendingError::InvalidAmount);
    }

    let raw_rate = if utilization_rate.0 <= model.optimal_utilization.0 {
        let utilization_slope = mul_div_up(
            utilization_rate.0,
            model.slope1.0,
            model.optimal_utilization.0,
        )?;
        model
            .base_rate
            .0
            .checked_add(utilization_slope)
            .ok_or(LendingError::MathOverflow)?
    } else {
        let excess_utilization = utilization_rate
            .0
            .checked_sub(model.optimal_utilization.0)
            .ok_or(LendingError::MathUnderflow)?;
        let excess_denominator = RAY
            .checked_sub(model.optimal_utilization.0)
            .ok_or(LendingError::MathUnderflow)?;
        if excess_denominator == 0 {
            return Err(LendingError::InvalidOptimalUtilization);
        }

        let excess_slope = mul_div_up(excess_utilization, model.slope2.0, excess_denominator)?;
        model
            .base_rate
            .0
            .checked_add(model.slope1.0)
            .and_then(|value| value.checked_add(excess_slope))
            .ok_or(LendingError::MathOverflow)?
    };

    Ok(Ray(core::cmp::min(raw_rate, model.max_borrow_rate.0)))
}

pub fn calculate_supply_rate(
    borrow_rate: Ray,
    utilization_rate: Ray,
    reserve_factor: Ray,
) -> InterestResult<Ray> {
    if borrow_rate.0 < 0 || utilization_rate.0 < 0 || reserve_factor.0 < 0 {
        return Err(LendingError::InvalidAmount);
    }
    if utilization_rate.0 > RAY {
        return Err(LendingError::InvalidAmount);
    }
    if reserve_factor.0 > RAY {
        return Err(LendingError::InvalidReserveFactor);
    }

    let one_minus_reserve_factor = RAY
        .checked_sub(reserve_factor.0)
        .ok_or(LendingError::MathUnderflow)?;
    let utilization_adjusted = mul_div_down(borrow_rate.0, utilization_rate.0, RAY)?;
    let supply_rate = mul_div_down(utilization_adjusted, one_minus_reserve_factor, RAY)?;
    if supply_rate > borrow_rate.0 {
        return Err(LendingError::InvalidInterestRateConfig);
    }

    Ok(Ray(supply_rate))
}

pub fn calculate_rates(
    total_supply: Wad,
    total_borrow: Wad,
    model: &InterestRateModel,
) -> InterestResult<(Ray, Ray, Ray)> {
    let utilization_rate = calculate_utilization_rate(total_supply, total_borrow)?;
    let borrow_rate = calculate_borrow_rate(utilization_rate, model)?;
    let supply_rate = calculate_supply_rate(borrow_rate, utilization_rate, model.reserve_factor)?;
    Ok((utilization_rate, borrow_rate, supply_rate))
}

pub fn reserve_factor_bps_to_ray(reserve_factor_bps: BasisPoints) -> InterestResult<Ray> {
    bps_to_ray(reserve_factor_bps).map_err(|_| LendingError::InvalidReserveFactor)
}
