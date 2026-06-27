//! Fixed-point Ray and Wad math helpers.

use crate::constants::{HALF_RAY, HALF_WAD, RAY, WAD};
use crate::errors::LendingError;

/// Multiply two WAD values with rounding: (a * b + HALF_WAD) / WAD
pub fn wad_mul(a: i128, b: i128) -> Result<i128, LendingError> {
    let product = a.checked_mul(b).ok_or(LendingError::MathOverflow)?;
    let result = product
        .checked_add(HALF_WAD)
        .ok_or(LendingError::MathOverflow)?;
    Ok(result / WAD)
}

/// Divide two WAD values with rounding: (a * WAD + b/2) / b
pub fn wad_div(a: i128, b: i128) -> Result<i128, LendingError> {
    if b == 0 {
        return Err(LendingError::DivisionByZero);
    }
    let numerator = a.checked_mul(WAD).ok_or(LendingError::MathOverflow)?;
    let half_b = b.checked_div(2).ok_or(LendingError::DivisionByZero)?;
    let result = numerator
        .checked_add(half_b)
        .ok_or(LendingError::MathOverflow)?;
    Ok(result / b)
}

/// Multiply two RAY values with rounding: (a * b + HALF_RAY) / RAY
pub fn ray_mul(a: i128, b: i128) -> Result<i128, LendingError> {
    let product = a.checked_mul(b).ok_or(LendingError::MathOverflow)?;
    let result = product
        .checked_add(HALF_RAY)
        .ok_or(LendingError::MathOverflow)?;
    Ok(result / RAY)
}

/// Divide two RAY values with rounding: (a * RAY + b/2) / b
pub fn ray_div(a: i128, b: i128) -> Result<i128, LendingError> {
    if b == 0 {
        return Err(LendingError::DivisionByZero);
    }
    let numerator = a.checked_mul(RAY).ok_or(LendingError::MathOverflow)?;
    let half_b = b.checked_div(2).ok_or(LendingError::DivisionByZero)?;
    let result = numerator
        .checked_add(half_b)
        .ok_or(LendingError::MathOverflow)?;
    Ok(result / b)
}

/// Convert WAD value to RAY value
pub fn wad_to_ray(wad: i128) -> Result<i128, LendingError> {
    wad.checked_mul(1_000_000_000)
        .ok_or(LendingError::MathOverflow)
}

/// Convert RAY value to WAD value (with rounding)
pub fn ray_to_wad(ray: i128) -> Result<i128, LendingError> {
    let rounded = ray
        .checked_add(500_000_000)
        .ok_or(LendingError::MathOverflow)?;
    Ok(rounded / 1_000_000_000)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::{RAY, WAD};

    #[test]
    fn test_wad_mul() {
        let res = wad_mul(2 * WAD, 3 * WAD).unwrap();
        assert_eq!(res, 6 * WAD);

        let res = wad_mul(WAD / 2, WAD / 2).unwrap();
        assert_eq!(res, WAD / 4);
    }

    #[test]
    fn test_wad_div() {
        let res = wad_div(6 * WAD, 3 * WAD).unwrap();
        assert_eq!(res, 2 * WAD);

        assert_eq!(wad_div(WAD, 0), Err(LendingError::DivisionByZero));
    }

    #[test]
    fn test_ray_mul() {
        // Use values that do not overflow i128::MAX (10^27 * 10^10 fits in i128)
        let a = 2 * RAY;
        let b = 500_000_000; // 0.5 * 10^9
        let res = ray_mul(a, b).unwrap();
        assert_eq!(res, 1_000_000_000); // 10^9
    }

    #[test]
    fn test_ray_div() {
        // Use values that do not overflow i128::MAX (10^9 * 10^27 fits in i128)
        let a = 2_000_000_000; // 2 * 10^9
        let b = 2_000_000_000;
        let res = ray_div(a, b).unwrap();
        assert_eq!(res, RAY);
    }

    #[test]
    fn test_conversion() {
        assert_eq!(wad_to_ray(WAD).unwrap(), RAY);
        assert_eq!(ray_to_wad(RAY).unwrap(), WAD);
    }
}
