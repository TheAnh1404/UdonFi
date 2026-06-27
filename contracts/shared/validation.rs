//! Reusable general contract validation helpers.

use crate::errors::LendingError;
use soroban_sdk::Address;

/// Asserts that a transaction amount is strictly positive.
pub fn validate_positive_amount(amount: i128) -> Result<(), LendingError> {
    if amount <= 0 {
        return Err(LendingError::InvalidAmount);
    }
    Ok(())
}

/// Asserts that the caller matches the registered Admin.
pub fn validate_admin(caller: &Address, admin: &Address) -> Result<(), LendingError> {
    if caller != admin {
        return Err(LendingError::Unauthorized);
    }
    Ok(())
}

/// Asserts that the caller matches the registered Guardian.
pub fn validate_guardian(caller: &Address, guardian: &Address) -> Result<(), LendingError> {
    if caller != guardian {
        return Err(LendingError::Unauthorized);
    }
    Ok(())
}

/// Asserts that the contract is not paused.
pub fn validate_not_paused(is_paused: bool) -> Result<(), LendingError> {
    if is_paused {
        return Err(LendingError::Paused);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_general_validators() {
        let env = Env::default();
        let addr1 = Address::generate(&env);
        let addr2 = Address::generate(&env);

        assert!(validate_positive_amount(100).is_ok());
        assert!(validate_positive_amount(0).is_err());

        assert!(validate_admin(&addr1, &addr1).is_ok());
        assert!(validate_admin(&addr1, &addr2).is_err());

        assert!(validate_guardian(&addr1, &addr1).is_ok());
        assert!(validate_guardian(&addr1, &addr2).is_err());

        assert!(validate_not_paused(false).is_ok());
        assert!(validate_not_paused(true).is_err());
    }
}
