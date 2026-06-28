//! Reserve lifecycle manager.

use crate::errors::LendingError;
use crate::events::{
    publish_reserve_activated, publish_reserve_deprecated, publish_reserve_frozen,
    publish_reserve_paused, publish_reserve_transition_rejected, publish_reserve_unfrozen,
    publish_reserve_unpaused, ReserveActivated, ReserveDeprecated, ReserveFrozen, ReservePaused,
    ReserveTransitionRejected, ReserveUnfrozen, ReserveUnpaused,
};
use crate::model::{Reserve, ReserveStatus};
use crate::permissions::{
    require_governance, require_governance_or_guardian, require_governance_timelock,
    LifecycleContext,
};
use crate::storage::{read_reserve, write_reserve};
use crate::validation::validate_state_transition;
use soroban_sdk::Env;
use udonfi_shared::{LedgerSequence, ReserveId, Timestamp};

pub fn activate_reserve(
    env: &Env,
    reserve_id: ReserveId,
    context: LifecycleContext,
) -> Result<Reserve, LendingError> {
    require_governance(&context)?;
    transition_reserve(env, reserve_id, ReserveStatus::Active, &context)
}

pub fn freeze_reserve(
    env: &Env,
    reserve_id: ReserveId,
    context: LifecycleContext,
) -> Result<Reserve, LendingError> {
    require_governance_or_guardian(&context)?;
    transition_reserve(env, reserve_id, ReserveStatus::Frozen, &context)
}

pub fn unfreeze_reserve(
    env: &Env,
    reserve_id: ReserveId,
    context: LifecycleContext,
) -> Result<Reserve, LendingError> {
    require_governance(&context)?;
    transition_reserve(env, reserve_id, ReserveStatus::Active, &context)
}

pub fn pause_reserve(
    env: &Env,
    reserve_id: ReserveId,
    context: LifecycleContext,
) -> Result<Reserve, LendingError> {
    require_governance_or_guardian(&context)?;
    transition_reserve(env, reserve_id, ReserveStatus::Paused, &context)
}

pub fn unpause_reserve(
    env: &Env,
    reserve_id: ReserveId,
    context: LifecycleContext,
) -> Result<Reserve, LendingError> {
    require_governance(&context)?;
    transition_reserve(env, reserve_id, ReserveStatus::Active, &context)
}

pub fn deprecate_reserve(
    env: &Env,
    reserve_id: ReserveId,
    context: LifecycleContext,
) -> Result<Reserve, LendingError> {
    require_governance_timelock(env, &context)?;
    transition_reserve(env, reserve_id, ReserveStatus::Deprecated, &context)
}

pub fn get_reserve_status(env: &Env, reserve_id: ReserveId) -> ReserveStatus {
    read_reserve(env, reserve_id)
        .map(|reserve| reserve.reserve_status)
        .unwrap_or(ReserveStatus::Uninitialized)
}

pub fn can_reserve_accept_supply(env: &Env, reserve_id: ReserveId) -> bool {
    matches!(get_reserve_status(env, reserve_id), ReserveStatus::Active)
}

pub fn can_reserve_allow_borrow(env: &Env, reserve_id: ReserveId) -> bool {
    matches!(get_reserve_status(env, reserve_id), ReserveStatus::Active)
}

pub fn can_reserve_allow_withdraw(env: &Env, reserve_id: ReserveId) -> bool {
    matches!(
        get_reserve_status(env, reserve_id),
        ReserveStatus::Active
            | ReserveStatus::Frozen
            | ReserveStatus::Paused
            | ReserveStatus::Deprecated
    )
}

pub fn can_reserve_allow_repay(env: &Env, reserve_id: ReserveId) -> bool {
    matches!(
        get_reserve_status(env, reserve_id),
        ReserveStatus::Active
            | ReserveStatus::Frozen
            | ReserveStatus::Paused
            | ReserveStatus::Deprecated
    )
}

fn transition_reserve(
    env: &Env,
    reserve_id: ReserveId,
    new_status: ReserveStatus,
    context: &LifecycleContext,
) -> Result<Reserve, LendingError> {
    let mut reserve = read_reserve(env, reserve_id).ok_or(LendingError::ReserveNotFound)?;
    let previous_status = reserve.reserve_status;

    if let Err(err) = validate_state_transition(previous_status, new_status) {
        publish_rejected(env, reserve_id, previous_status, new_status, context);
        return Err(err);
    }

    reserve.reserve_status = new_status;
    reserve.updated_at = Timestamp(env.ledger().timestamp());
    write_reserve(env, &reserve);

    publish_transition(env, reserve_id, previous_status, new_status, context);
    Ok(reserve)
}

fn current_ledger(env: &Env) -> LedgerSequence {
    LedgerSequence(env.ledger().sequence())
}

fn publish_transition(
    env: &Env,
    reserve_id: ReserveId,
    previous_status: ReserveStatus,
    new_status: ReserveStatus,
    context: &LifecycleContext,
) {
    match new_status {
        ReserveStatus::Active => {
            if previous_status == ReserveStatus::Uninitialized {
                publish_reserve_activated(
                    env,
                    ReserveActivated {
                        reserve_id,
                        previous_status,
                        new_status,
                        actor: context.actor.clone(),
                        ledger: current_ledger(env),
                        reason: context.reason.clone(),
                    },
                );
            } else if previous_status == ReserveStatus::Frozen {
                publish_reserve_unfrozen(
                    env,
                    ReserveUnfrozen {
                        reserve_id,
                        previous_status,
                        new_status,
                        actor: context.actor.clone(),
                        ledger: current_ledger(env),
                        reason: context.reason.clone(),
                    },
                );
            } else {
                publish_reserve_unpaused(
                    env,
                    ReserveUnpaused {
                        reserve_id,
                        previous_status,
                        new_status,
                        actor: context.actor.clone(),
                        ledger: current_ledger(env),
                        reason: context.reason.clone(),
                    },
                );
            }
        }
        ReserveStatus::Frozen => publish_reserve_frozen(
            env,
            ReserveFrozen {
                reserve_id,
                previous_status,
                new_status,
                actor: context.actor.clone(),
                ledger: current_ledger(env),
                reason: context.reason.clone(),
            },
        ),
        ReserveStatus::Paused => publish_reserve_paused(
            env,
            ReservePaused {
                reserve_id,
                previous_status,
                new_status,
                actor: context.actor.clone(),
                ledger: current_ledger(env),
                reason: context.reason.clone(),
            },
        ),
        ReserveStatus::Deprecated => publish_reserve_deprecated(
            env,
            ReserveDeprecated {
                reserve_id,
                previous_status,
                new_status,
                actor: context.actor.clone(),
                ledger: current_ledger(env),
                reason: context.reason.clone(),
            },
        ),
        ReserveStatus::Uninitialized => {}
    }
}

fn publish_rejected(
    env: &Env,
    reserve_id: ReserveId,
    previous_status: ReserveStatus,
    new_status: ReserveStatus,
    context: &LifecycleContext,
) {
    publish_reserve_transition_rejected(
        env,
        ReserveTransitionRejected {
            reserve_id,
            previous_status,
            new_status,
            actor: context.actor.clone(),
            ledger: current_ledger(env),
            reason: context.reason.clone(),
        },
    );
}
