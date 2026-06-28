//! Permission helpers for reserve lifecycle operations.

use crate::errors::LendingError;
use soroban_sdk::{contracttype, Address, Env, String};
use udonfi_shared::LedgerSequence;

pub const RESERVE_LIFECYCLE_TIMELOCK_LEDGERS: u32 = 34_560;

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum LifecycleAuthority {
    Governance = 0,
    Guardian = 1,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LifecycleContext {
    pub actor: Address,
    pub governance: Address,
    pub guardian: Address,
    pub reason: String,
    pub timelock_delay_ledgers: LedgerSequence,
    pub timelock_expires_at_ledger: LedgerSequence,
}

impl LifecycleContext {
    pub fn governance(actor: Address, guardian: Address, reason: String) -> Self {
        Self {
            actor: actor.clone(),
            governance: actor,
            guardian,
            reason,
            timelock_delay_ledgers: LedgerSequence(0),
            timelock_expires_at_ledger: LedgerSequence(0),
        }
    }

    pub fn timelocked_governance(
        actor: Address,
        guardian: Address,
        reason: String,
        timelock_expires_at_ledger: LedgerSequence,
    ) -> Self {
        Self {
            actor: actor.clone(),
            governance: actor,
            guardian,
            reason,
            timelock_delay_ledgers: LedgerSequence(RESERVE_LIFECYCLE_TIMELOCK_LEDGERS),
            timelock_expires_at_ledger,
        }
    }

    pub fn guardian(actor: Address, governance: Address, reason: String) -> Self {
        Self {
            actor: actor.clone(),
            governance,
            guardian: actor,
            reason,
            timelock_delay_ledgers: LedgerSequence(0),
            timelock_expires_at_ledger: LedgerSequence(0),
        }
    }
}

pub fn require_governance(context: &LifecycleContext) -> Result<(), LendingError> {
    context.actor.require_auth();
    udonfi_shared::validation::validate_admin(&context.actor, &context.governance)
}

pub fn require_governance_or_guardian(
    context: &LifecycleContext,
) -> Result<LifecycleAuthority, LendingError> {
    context.actor.require_auth();
    if udonfi_shared::validation::validate_admin(&context.actor, &context.governance).is_ok() {
        return Ok(LifecycleAuthority::Governance);
    }
    udonfi_shared::validation::validate_guardian(&context.actor, &context.guardian)?;
    Ok(LifecycleAuthority::Guardian)
}

pub fn require_governance_timelock(
    env: &Env,
    context: &LifecycleContext,
) -> Result<(), LendingError> {
    require_governance(context)?;
    if context.timelock_delay_ledgers.0 < RESERVE_LIFECYCLE_TIMELOCK_LEDGERS {
        return Err(LendingError::TimelockActive);
    }
    if context.timelock_expires_at_ledger.0 > env.ledger().sequence() {
        return Err(LendingError::TimelockActive);
    }
    Ok(())
}
