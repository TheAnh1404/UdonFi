//! Fixed-point arithmetic for DeFi calculations.
//!
//! Uses WAD (10^18) precision for most financial math and
//! RAY (10^27) precision for interest index accumulation.
//! All operations use checked arithmetic to prevent overflow.

/// WAD = 10^18 — standard DeFi fixed-point precision
pub const WAD: i128 = 1_000_000_000_000_000_000;

/// Half WAD for rounding
pub const HALF_WAD: i128 = WAD / 2;

/// RAY = 10^27 — higher precision for index accumulation
pub const RAY: i128 = 1_000_000_000_000_000_000_000_000_000;

/// Half RAY for rounding
pub const HALF_RAY: i128 = RAY / 2;

/// Percentage factor (100.00% = 10_000 basis points)
pub const PERCENTAGE_FACTOR: u32 = 10_000;

/// Seconds per year (365.25 days)
pub const SECONDS_PER_YEAR: u64 = 31_557_600;

// ─────────────────────────────────────────────
// WAD Math (10^18 precision)
// ─────────────────────────────────────────────

/// Multiply two WAD values: (a * b + HALF_WAD) / WAD
/// Returns None on overflow.
pub fn wad_mul(a: i128, b: i128) -> Option<i128> {
    let product = a.checked_mul(b)?;
    let result = product.checked_add(HALF_WAD)?;
    Some(result / WAD)
}

/// Divide a by b in WAD precision: (a * WAD + b/2) / b
/// Returns None on overflow or division by zero.
pub fn wad_div(a: i128, b: i128) -> Option<i128> {
    if b == 0 {
        return None;
    }
    let numerator = a.checked_mul(WAD)?;
    let half_b = b / 2;
    let result = numerator.checked_add(half_b)?;
    Some(result / b)
}

// ─────────────────────────────────────────────
// RAY Math (10^27 precision)
// ─────────────────────────────────────────────

/// Multiply two RAY values: (a * b + HALF_RAY) / RAY
pub fn ray_mul(a: i128, b: i128) -> Option<i128> {
    let product = a.checked_mul(b)?;
    let result = product.checked_add(HALF_RAY)?;
    Some(result / RAY)
}

/// Divide a by b in RAY precision: (a * RAY + b/2) / b
pub fn ray_div(a: i128, b: i128) -> Option<i128> {
    if b == 0 {
        return None;
    }
    let numerator = a.checked_mul(RAY)?;
    let half_b = b / 2;
    let result = numerator.checked_add(half_b)?;
    Some(result / b)
}

/// Convert a percentage (basis points, 10000 = 100%) to WAD
pub fn percent_to_wad(percent_bps: u32) -> i128 {
    (percent_bps as i128) * WAD / (PERCENTAGE_FACTOR as i128)
}

// ─────────────────────────────────────────────
// Interest Calculations
// ─────────────────────────────────────────────

/// Calculate linear interest accumulated over `time_delta` seconds.
///
/// result = 1 + rate * time_delta / SECONDS_PER_YEAR
///
/// Returns the multiplier in RAY precision.
pub fn calculate_linear_interest(rate: i128, time_delta: u64) -> Option<i128> {
    if time_delta == 0 {
        return Some(RAY);
    }
    let accumulated = rate
        .checked_mul(time_delta as i128)?
        / (SECONDS_PER_YEAR as i128);
    RAY.checked_add(accumulated)
}

/// Calculate compounded interest over `time_delta` seconds.
///
/// Uses a Taylor expansion approximation for efficiency on-chain:
/// result ≈ 1 + rate*t + (rate*t)^2/2 + (rate*t)^3/6
///
/// Where t = time_delta / SECONDS_PER_YEAR
///
/// Returns the multiplier in RAY precision.
pub fn calculate_compounded_interest(rate: i128, time_delta: u64) -> Option<i128> {
    if time_delta == 0 {
        return Some(RAY);
    }
    if rate == 0 {
        return Some(RAY);
    }

    // rate_per_second = rate / SECONDS_PER_YEAR
    // exp = rate_per_second * time_delta (the exponent base)
    let exp = rate
        .checked_mul(time_delta as i128)?
        / (SECONDS_PER_YEAR as i128);

    // Taylor expansion terms
    // term1 = exp (first order)
    let exp_squared = ray_mul(exp, exp)?;
    // term2 = exp^2 / 2
    let term2 = exp_squared / 2;
    // term3 = exp^3 / 6
    let term3 = ray_mul(exp_squared, exp)? / 6;

    // result = RAY + exp + term2 + term3
    RAY.checked_add(exp)?
        .checked_add(term2)?
        .checked_add(term3)
}

/// Calculate the utilization rate of a reserve pool.
///
/// U = total_borrows / (total_deposits)
///
/// Returns utilization in WAD precision (0 to WAD).
pub fn calculate_utilization_rate(total_deposits: i128, total_borrows: i128) -> Option<i128> {
    if total_deposits == 0 {
        return Some(0);
    }
    let mut borrows = total_borrows;
    let mut deposits = total_deposits;
    // Scale down to prevent overflow in wad_div's a * WAD
    while borrows > i128::MAX / WAD {
        borrows /= 10;
        deposits /= 10;
    }
    if deposits == 0 {
        return Some(0);
    }
    wad_div(borrows, deposits)
}

/// Calculate borrow rate using the kinked interest rate model.
///
/// If U <= U_optimal:
///   rate = base_rate + (U / U_optimal) * slope1
///
/// If U > U_optimal:
///   rate = base_rate + slope1 + ((U - U_optimal) / (1 - U_optimal)) * slope2
///
/// All values in WAD precision.
pub fn calculate_borrow_rate(
    utilization: i128,
    optimal_utilization: i128,
    base_rate: i128,
    slope1: i128,
    slope2: i128,
) -> Option<i128> {
    if utilization <= optimal_utilization {
        // Below kink: gentle slope
        let ratio = wad_div(utilization, optimal_utilization)?;
        let variable_rate = wad_mul(ratio, slope1)?;
        base_rate.checked_add(variable_rate)
    } else {
        // Above kink: steep slope
        let excess = utilization.checked_sub(optimal_utilization)?;
        let remaining = WAD.checked_sub(optimal_utilization)?;
        let ratio = wad_div(excess, remaining)?;
        let steep_rate = wad_mul(ratio, slope2)?;
        base_rate
            .checked_add(slope1)?
            .checked_add(steep_rate)
    }
}

/// Calculate supply rate (APY for depositors).
///
/// supply_rate = borrow_rate * utilization * (1 - reserve_factor)
///
/// reserve_factor in basis points (e.g., 1000 = 10%)
pub fn calculate_supply_rate(
    borrow_rate: i128,
    utilization: i128,
    reserve_factor_bps: u32,
) -> Option<i128> {
    let factor = WAD - percent_to_wad(reserve_factor_bps);
    let rate_util = wad_mul(borrow_rate, utilization)?;
    wad_mul(rate_util, factor)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wad_mul() {
        // 2.0 * 3.0 = 6.0
        let result = wad_mul(2 * WAD, 3 * WAD).unwrap();
        assert_eq!(result, 6 * WAD);

        // 0.5 * 0.5 = 0.25
        let result = wad_mul(WAD / 2, WAD / 2).unwrap();
        assert_eq!(result, WAD / 4);
    }

    #[test]
    fn test_wad_div() {
        // 6.0 / 3.0 = 2.0
        let result = wad_div(6 * WAD, 3 * WAD).unwrap();
        assert_eq!(result, 2 * WAD);

        // Division by zero returns None
        assert!(wad_div(WAD, 0).is_none());
    }

    #[test]
    fn test_utilization_rate() {
        // 500 borrowed / 1000 deposited = 50%
        let u = calculate_utilization_rate(1000 * WAD, 500 * WAD).unwrap();
        assert_eq!(u, WAD / 2);

        // Empty pool = 0%
        let u = calculate_utilization_rate(0, 0).unwrap();
        assert_eq!(u, 0);
    }

    #[test]
    fn test_borrow_rate_below_kink() {
        let optimal = WAD * 80 / 100; // 80%
        let base = WAD * 2 / 100; // 2%
        let slope1 = WAD * 4 / 100; // 4%
        let slope2 = WAD * 300 / 100; // 300%

        // At 40% utilization (below 80% optimal)
        let u = WAD * 40 / 100;
        let rate = calculate_borrow_rate(u, optimal, base, slope1, slope2).unwrap();
        // Expected: 2% + (40/80) * 4% = 2% + 2% = 4%
        let expected = WAD * 4 / 100;
        assert_eq!(rate, expected);
    }

    #[test]
    fn test_borrow_rate_above_kink() {
        let optimal = WAD * 80 / 100;
        let base = WAD * 2 / 100;
        let slope1 = WAD * 4 / 100;
        let slope2 = WAD * 300 / 100;

        // At 90% utilization (above 80% optimal)
        let u = WAD * 90 / 100;
        let rate = calculate_borrow_rate(u, optimal, base, slope1, slope2).unwrap();
        // Expected: 2% + 4% + ((90-80)/(100-80)) * 300% = 6% + 0.5 * 300% = 6% + 150% = 156%
        let expected = WAD * 156 / 100;
        assert_eq!(rate, expected);
    }

    #[test]
    fn test_linear_interest() {
        // At 10% rate over 1 year
        let rate = WAD * 10 / 100;
        // Convert to RAY for the function (WAD to RAY is multiplying by 10^9)
        let rate_ray = rate * 1_000_000_000;
        let result = calculate_linear_interest(rate_ray, SECONDS_PER_YEAR).unwrap();
        // Expected: 1.10 in RAY
        let expected = RAY + RAY * 10 / 100;
        // Allow small rounding difference
        let diff = (result - expected).abs();
        assert!(diff < RAY / 1_000_000);
    }

    #[test]
    fn test_percent_to_wad() {
        // 7500 bps = 75%
        assert_eq!(percent_to_wad(7500), WAD * 75 / 100);
        // 10000 bps = 100%
        assert_eq!(percent_to_wad(10000), WAD);
    }
}
