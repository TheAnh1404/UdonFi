//! Rounding helpers for UdonFi V2 lending math.

use crate::errors::LendingError;

/// Division rounding down (standard integer division for non-negative integers).
pub fn div_round_down(a: i128, b: i128) -> Result<i128, LendingError> {
    if b == 0 {
        return Err(LendingError::DivisionByZero);
    }
    if a < 0 || b < 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(a / b)
}

/// Division rounding up.
pub fn div_round_up(a: i128, b: i128) -> Result<i128, LendingError> {
    if b == 0 {
        return Err(LendingError::DivisionByZero);
    }
    if a < 0 || b < 0 {
        return Err(LendingError::InvalidAmount);
    }
    if a == 0 {
        return Ok(0);
    }
    let remainder = a % b;
    if remainder == 0 {
        Ok(a / b)
    } else {
        let quotient = a.checked_div(b).ok_or(LendingError::MathOverflow)?;
        quotient.checked_add(1).ok_or(LendingError::MathOverflow)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_div_round_down() {
        assert_eq!(div_round_down(5, 2).unwrap(), 2);
        assert_eq!(div_round_down(4, 2).unwrap(), 2);
        assert_eq!(div_round_down(0, 2).unwrap(), 0);
        assert_eq!(div_round_down(-1, 2), Err(LendingError::InvalidAmount));
    }

    #[test]
    fn test_div_round_up() {
        assert_eq!(div_round_up(5, 2).unwrap(), 3);
        assert_eq!(div_round_up(4, 2).unwrap(), 2);
        assert_eq!(div_round_up(0, 2).unwrap(), 0);
        assert_eq!(div_round_up(-1, 2), Err(LendingError::InvalidAmount));
    }
}
