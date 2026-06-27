#![allow(deprecated, clippy::too_many_arguments)]

//! Core Registry management operations.

use crate::errors::LendingError;
use crate::events::{
    ReserveConfigurationUpdated, ReserveCreated, ReserveDeprecated, ReserveFrozen, ReservePaused,
    ReserveUnfrozen, ReserveUnpaused,
};
use crate::model::{Reserve, ReserveStatus};
use crate::storage::{
    read_reserve, read_reserve_count, read_reserve_index_by_asset, write_reserve,
    write_reserve_count, write_reserve_index_by_asset,
};
use crate::validation::{
    validate_caps, validate_decimals, validate_liquidation_bonus, validate_ltv_and_threshold,
    validate_state_transition,
};

use soroban_sdk::{Address, Env, Symbol, Vec};
use udonfi_shared::{
    BasisPoints, LedgerSequence, Ltv, Ray, ReserveFactor, ReserveId, Timestamp, Wad,
};

pub fn reserve_exists(env: &Env, asset: &Address) -> bool {
    read_reserve_index_by_asset(env, asset).is_some()
}

pub fn create_reserve(
    env: &Env,
    asset: Address,
    symbol: Symbol,
    decimals: u32,
    ltv: u32,
    threshold: u32,
    bonus: u32,
    reserve_factor: u32,
) -> Result<ReserveId, LendingError> {
    if reserve_exists(env, &asset) {
        return Err(LendingError::ReserveAlreadyExists);
    }

    validate_decimals(decimals)?;
    validate_ltv_and_threshold(ltv, threshold)?;
    validate_liquidation_bonus(bonus)?;
    udonfi_shared::math::validation::validate_reserve_factor(reserve_factor)?;

    let count = read_reserve_count(env);
    if count >= udonfi_shared::constants::MAX_RESERVES {
        return Err(LendingError::MaxReservesReached);
    }

    let reserve_id = ReserveId(count);

    let now = Timestamp(env.ledger().timestamp());
    let current_ledger = LedgerSequence(env.ledger().sequence());

    let reserve = Reserve {
        reserve_id,
        asset_address: asset.clone(),
        asset_symbol: symbol.clone(),
        asset_decimals: decimals,
        reserve_status: ReserveStatus::Active,
        supply_cap: Wad(0),
        borrow_cap: Wad(0),
        reserve_factor: ReserveFactor(reserve_factor),
        max_ltv: Ltv(ltv),
        liquidation_threshold: BasisPoints(threshold),
        liquidation_bonus: BasisPoints(bonus),
        borrow_index: Ray(udonfi_shared::constants::RAY),
        supply_index: Ray(udonfi_shared::constants::RAY),
        last_accrual_ledger: current_ledger,
        created_at: now,
        updated_at: now,
    };

    write_reserve(env, &reserve);
    write_reserve_index_by_asset(env, &asset, reserve_id);
    write_reserve_count(env, count + 1);

    // Emit event
    env.events().publish(
        (Symbol::clone(&symbol), Symbol::new(env, "reserve_created")),
        ReserveCreated {
            asset,
            reserve_index: count,
            ltv,
            liquidation_threshold: threshold,
        },
    );

    Ok(reserve_id)
}

pub fn get_reserve(env: &Env, reserve_id: ReserveId) -> Result<Reserve, LendingError> {
    read_reserve(env, reserve_id).ok_or(LendingError::ReserveNotFound)
}

pub fn update_configuration(
    env: &Env,
    reserve_id: ReserveId,
    supply_cap: i128,
    borrow_cap: i128,
    reserve_factor: u32,
    ltv: u32,
    threshold: u32,
    bonus: u32,
) -> Result<(), LendingError> {
    let mut reserve = get_reserve(env, reserve_id)?;

    validate_caps(supply_cap, borrow_cap)?;
    validate_ltv_and_threshold(ltv, threshold)?;
    validate_liquidation_bonus(bonus)?;
    udonfi_shared::math::validation::validate_reserve_factor(reserve_factor)?;

    reserve.supply_cap = Wad(supply_cap);
    reserve.borrow_cap = Wad(borrow_cap);
    reserve.reserve_factor = ReserveFactor(reserve_factor);
    reserve.max_ltv = Ltv(ltv);
    reserve.liquidation_threshold = BasisPoints(threshold);
    reserve.liquidation_bonus = BasisPoints(bonus);
    reserve.updated_at = Timestamp(env.ledger().timestamp());

    write_reserve(env, &reserve);

    env.events().publish(
        (
            reserve.asset_symbol.clone(),
            Symbol::new(env, "reserve_config_updated"),
        ),
        ReserveConfigurationUpdated {
            asset: reserve.asset_address.clone(),
            supply_cap: Wad(supply_cap),
            borrow_cap: Wad(borrow_cap),
            reserve_factor: ReserveFactor(reserve_factor),
            max_ltv: Ltv(ltv),
            liquidation_threshold: BasisPoints(threshold),
            liquidation_bonus: BasisPoints(bonus),
        },
    );

    Ok(())
}

pub fn freeze_reserve(env: &Env, reserve_id: ReserveId) -> Result<(), LendingError> {
    let mut reserve = get_reserve(env, reserve_id)?;
    validate_state_transition(reserve.reserve_status, ReserveStatus::Frozen)?;

    reserve.reserve_status = ReserveStatus::Frozen;
    reserve.updated_at = Timestamp(env.ledger().timestamp());
    write_reserve(env, &reserve);

    env.events().publish(
        (
            reserve.asset_symbol.clone(),
            Symbol::new(env, "reserve_frozen"),
        ),
        ReserveFrozen {
            asset: reserve.asset_address,
            is_frozen: true,
        },
    );

    Ok(())
}

pub fn unfreeze_reserve(env: &Env, reserve_id: ReserveId) -> Result<(), LendingError> {
    let mut reserve = get_reserve(env, reserve_id)?;
    validate_state_transition(reserve.reserve_status, ReserveStatus::Active)?;

    reserve.reserve_status = ReserveStatus::Active;
    reserve.updated_at = Timestamp(env.ledger().timestamp());
    write_reserve(env, &reserve);

    env.events().publish(
        (
            reserve.asset_symbol.clone(),
            Symbol::new(env, "reserve_unfrozen"),
        ),
        ReserveUnfrozen {
            asset: reserve.asset_address,
        },
    );

    Ok(())
}

pub fn pause_reserve(env: &Env, reserve_id: ReserveId) -> Result<(), LendingError> {
    let mut reserve = get_reserve(env, reserve_id)?;
    validate_state_transition(reserve.reserve_status, ReserveStatus::Paused)?;

    reserve.reserve_status = ReserveStatus::Paused;
    reserve.updated_at = Timestamp(env.ledger().timestamp());
    write_reserve(env, &reserve);

    env.events().publish(
        (
            reserve.asset_symbol.clone(),
            Symbol::new(env, "reserve_paused"),
        ),
        ReservePaused {
            asset: reserve.asset_address,
            is_paused: true,
        },
    );

    Ok(())
}

pub fn unpause_reserve(env: &Env, reserve_id: ReserveId) -> Result<(), LendingError> {
    let mut reserve = get_reserve(env, reserve_id)?;
    validate_state_transition(reserve.reserve_status, ReserveStatus::Active)?;

    reserve.reserve_status = ReserveStatus::Active;
    reserve.updated_at = Timestamp(env.ledger().timestamp());
    write_reserve(env, &reserve);

    env.events().publish(
        (
            reserve.asset_symbol.clone(),
            Symbol::new(env, "reserve_unpaused"),
        ),
        ReserveUnpaused {
            asset: reserve.asset_address,
        },
    );

    Ok(())
}

pub fn deprecate_reserve(env: &Env, reserve_id: ReserveId) -> Result<(), LendingError> {
    let mut reserve = get_reserve(env, reserve_id)?;
    validate_state_transition(reserve.reserve_status, ReserveStatus::Deprecated)?;

    reserve.reserve_status = ReserveStatus::Deprecated;
    reserve.updated_at = Timestamp(env.ledger().timestamp());
    write_reserve(env, &reserve);

    env.events().publish(
        (
            reserve.asset_symbol.clone(),
            Symbol::new(env, "reserve_deprecated"),
        ),
        ReserveDeprecated {
            asset: reserve.asset_address,
        },
    );

    Ok(())
}

pub fn list_reserves(env: &Env) -> Vec<Reserve> {
    let count = read_reserve_count(env);
    let mut list = Vec::new(env);
    for i in 0..count {
        if let Some(r) = read_reserve(env, ReserveId(i)) {
            list.push_back(r);
        }
    }
    list
}
