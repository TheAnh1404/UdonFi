//! Event categories and source module identifiers.

use soroban_sdk::{contracttype, Env, Symbol};

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum EventCategory {
    System = 0,
    Reserve = 1,
    Pool = 2,
    Configuration = 3,
    Accounting = 4,
    Risk = 5,
    Oracle = 6,
    Governance = 7,
    Security = 8,
    User = 9,
    Admin = 10,
    Indexer = 11,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum EventModule {
    Protocol = 0,
    Pool = 1,
    Reserve = 2,
    Config = 3,
    Interest = 4,
    Supply = 5,
    Withdraw = 6,
    Borrow = 7,
    Repay = 8,
    Liquidation = 9,
    Oracle = 10,
    Governance = 11,
    Risk = 12,
    Security = 13,
    Indexer = 14,
}

pub fn category_symbol(env: &Env, category: EventCategory) -> Symbol {
    match category {
        EventCategory::System => Symbol::new(env, "system"),
        EventCategory::Reserve => Symbol::new(env, "reserve"),
        EventCategory::Pool => Symbol::new(env, "pool"),
        EventCategory::Configuration => Symbol::new(env, "config"),
        EventCategory::Accounting => Symbol::new(env, "accounting"),
        EventCategory::Risk => Symbol::new(env, "risk"),
        EventCategory::Oracle => Symbol::new(env, "oracle"),
        EventCategory::Governance => Symbol::new(env, "governance"),
        EventCategory::Security => Symbol::new(env, "security"),
        EventCategory::User => Symbol::new(env, "user"),
        EventCategory::Admin => Symbol::new(env, "admin"),
        EventCategory::Indexer => Symbol::new(env, "indexer"),
    }
}

pub fn module_symbol(env: &Env, module: EventModule) -> Symbol {
    match module {
        EventModule::Protocol => Symbol::new(env, "protocol"),
        EventModule::Pool => Symbol::new(env, "pool"),
        EventModule::Reserve => Symbol::new(env, "reserve"),
        EventModule::Config => Symbol::new(env, "config"),
        EventModule::Interest => Symbol::new(env, "interest"),
        EventModule::Supply => Symbol::new(env, "supply"),
        EventModule::Withdraw => Symbol::new(env, "withdraw"),
        EventModule::Borrow => Symbol::new(env, "borrow"),
        EventModule::Repay => Symbol::new(env, "repay"),
        EventModule::Liquidation => Symbol::new(env, "liquidation"),
        EventModule::Oracle => Symbol::new(env, "oracle"),
        EventModule::Governance => Symbol::new(env, "governance"),
        EventModule::Risk => Symbol::new(env, "risk"),
        EventModule::Security => Symbol::new(env, "security"),
        EventModule::Indexer => Symbol::new(env, "indexer"),
    }
}
