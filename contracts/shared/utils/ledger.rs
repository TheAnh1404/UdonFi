//! Soroban ledger and block environment helper utilities.

use crate::errors::LendingError;
use soroban_sdk::Env;

/// Retrieves the current ledger sequence height.
pub fn current_ledger(env: &Env) -> u32 {
    env.ledger().sequence()
}

/// Computes the delta in ledger sequences between the current ledger and a previous ledger.
pub fn ledger_delta(env: &Env, last_sequence: u32) -> Result<u32, LendingError> {
    let current = current_ledger(env);
    if current < last_sequence {
        return Err(LendingError::MathUnderflow);
    }
    current
        .checked_sub(last_sequence)
        .ok_or(LendingError::MathUnderflow)
}

/// Retrieves the current ledger timestamp (unix timestamp in seconds).
pub fn timestamp(env: &Env) -> u64 {
    env.ledger().timestamp()
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_ledger_helpers() {
        let env = Env::default();

        let seq = current_ledger(&env);
        assert_eq!(seq, 0);

        let delta = ledger_delta(&env, 0).unwrap();
        assert_eq!(delta, 0);

        let err = ledger_delta(&env, 100);
        assert_eq!(err, Err(LendingError::MathUnderflow));

        let time = timestamp(&env);
        assert_eq!(time, 0);
    }
}
