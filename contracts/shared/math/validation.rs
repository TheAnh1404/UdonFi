//! Financial configuration validator helpers.

use crate::constants::{MAX_LTV_BPS, PERCENTAGE_FACTOR, WAD};
use crate::errors::LendingError;

/// Validates that LTV is within allowed bounds (<= 99%).
pub fn validate_ltv(ltv: u32) -> Result<(), LendingError> {
    if ltv > MAX_LTV_BPS {
        return Err(LendingError::InvalidLTV);
    }
    Ok(())
}

/// Validates that the reserve factor is within allowed bounds (<= 100%).
pub fn validate_reserve_factor(bps: u32) -> Result<(), LendingError> {
    if bps > PERCENTAGE_FACTOR {
        return Err(LendingError::InvalidReserveFactor);
    }
    Ok(())
}

/// Validates that the optimal utilization rate is within WAD bounds (>0 and <= 100%).
pub fn validate_optimal_utilization(opt: i128) -> Result<(), LendingError> {
    if opt <= 0 || opt > WAD {
        return Err(LendingError::InvalidOptimalUtilization);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::WAD;

    #[test]
    fn test_validations() {
        assert!(validate_ltv(9000).is_ok());
        assert!(validate_ltv(9950).is_err());

        assert!(validate_reserve_factor(5000).is_ok());
        assert!(validate_reserve_factor(12000).is_err());

        assert!(validate_optimal_utilization(WAD / 2).is_ok());
        assert!(validate_optimal_utilization(0).is_err());
    }
}
