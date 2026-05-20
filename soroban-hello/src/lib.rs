#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, vec, Env, Symbol, Vec};

#[contract]
pub struct HelloContract;

#[contractimpl]
impl HelloContract {
    /// Hàm hello nhận một Symbol (chuỗi ký tự tối đa 32 ký tự) và trả về một Vec chứa ["Hello", to]
    pub fn hello(env: Env, to: Symbol) -> Vec<Symbol> {
        vec![&env, symbol_short!("Hello"), to]
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_hello() {
        let env = Env::default();
        let contract_id = env.register_contract(None, HelloContract);
        let client = HelloContractClient::new(&env, &contract_id);

        // Gọi hàm hello với đối số "Dev"
        let words = client.hello(&symbol_short!("Dev"));
        
        // Xác minh kết quả trả về đúng là ["Hello", "Dev"]
        assert_eq!(
            words,
            vec![&env, symbol_short!("Hello"), symbol_short!("Dev")]
        );
    }
}
