//! TTL extension abstractions for Soroban storage.

use crate::constants::{TTL_EXTEND_TO, TTL_THRESHOLD};
use soroban_sdk::Env;

/// Extends the TTL of the current contract instance storage.
pub fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

/// Extends the TTL of a specific persistent storage key.
pub fn extend_persistent_ttl<K>(env: &Env, key: &K)
where
    K: soroban_sdk::IntoVal<Env, soroban_sdk::Val> + Clone,
{
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{contract, contractimpl, Env};

    #[contract]
    pub struct MockContract;

    #[contractimpl]
    impl MockContract {
        pub fn test(env: Env) {
            extend_instance_ttl(&env);
        }
    }

    #[test]
    #[allow(deprecated)]
    fn test_ttl_extension() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MockContract);
        let client = MockContractClient::new(&env, &contract_id);
        client.test();
    }
}
