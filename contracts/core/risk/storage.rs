//! MVP mock price storage for risk calculations.

use soroban_sdk::{contracttype, Env};
use udonfi_shared::{LedgerSequence, Price, ReserveId, WAD};

use crate::errors::{LendingError, RiskResult};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RiskStorageKey {
    MockPrice(u32),
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct MockPrice {
    pub reserve_id: ReserveId,
    pub price: Price,
    pub last_updated_ledger: LedgerSequence,
}

pub fn write_mock_price(
    env: &Env,
    reserve_id: ReserveId,
    price: Price,
    current_ledger: LedgerSequence,
) -> RiskResult<()> {
    if price.0 <= 0 {
        return Err(LendingError::InvalidPriceValue);
    }
    let key = RiskStorageKey::MockPrice(reserve_id.0);
    let snapshot = MockPrice {
        reserve_id,
        price,
        last_updated_ledger: current_ledger,
    };
    env.storage().persistent().set(&key, &snapshot);
    udonfi_shared::utils::ttl::extend_persistent_ttl(env, &key);
    Ok(())
}

pub fn read_mock_price(env: &Env, reserve_id: ReserveId) -> Option<MockPrice> {
    env.storage()
        .persistent()
        .get(&RiskStorageKey::MockPrice(reserve_id.0))
}

pub fn read_price_or_default(env: &Env, reserve_id: ReserveId) -> Price {
    read_mock_price(env, reserve_id)
        .map(|snapshot| snapshot.price)
        .unwrap_or(Price(WAD))
}
