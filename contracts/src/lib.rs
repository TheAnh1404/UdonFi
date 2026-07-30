//! # UdonFi - Stellar Soroban Lending Protocol
//!
//! Root smart contract workspace entrypoint re-exporting the primary `LendingPoolContract`
//! and core lending protocol components.
//!
//! ## Core Architecture
//! - `lending_pool`: Central router for supply, borrow, withdraw, repay, and health factor
//! - `reserve`: Asset configuration, LTV, liquidation thresholds, supply/borrow caps
//! - `price_oracle`: Staleness-checked price feed adapter (SEP-40 / Reflector)
//! - `liquidation`: Position liquidation engine with collateral bonus settlement
//! - `a_token` / `debt_token`: Interest-bearing and debt-tracking Soroban tokens

#![no_std]

pub use udonfi_lending_pool::*;

pub mod lending_pool {
    pub use udonfi_lending_pool::*;
}
