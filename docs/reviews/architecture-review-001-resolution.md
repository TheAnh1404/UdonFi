# Architecture Review 001 Resolution

This document details the resolutions for all findings identified in `docs/reviews/architecture-review-001.md`.

---

## CR-001: Lack of supply and borrow caps per reserve

*   **Status**: Resolved
*   **Resolution**: 
    *   Incorporated `supplyCap` and `borrowCap` constraints into all core specification modules.
    *   Enforced on-chain validation rules: deposits and borrows reject with `CapViolation` if the sum exceeds configured cap limits.
    *   Added administrative setters (`set_reserve_caps`) gated behind the standard 48-hour timelock delay.
    *   Added emergency guardian methods (`emergency_reduce_caps`) enabling immediate cap reductions without a timelock to contain active vulnerabilities.
    *   Added custom errors (`Error::CapViolation`) and emitted event schemas (`ReserveCapsUpdated`).
*   **Files changed**:
    *   [docs/01-product-requirements.md](file:///d:/TheAnhProject/UdonFi/docs/01-product-requirements.md)
    *   [docs/05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md)
    *   [docs/08-security-model.md](file:///d:/TheAnhProject/UdonFi/docs/08-security-model.md)
    *   [docs/11-governance.md](file:///d:/TheAnhProject/UdonFi/docs/11-governance.md)
    *   [docs/12-roadmap.md](file:///d:/TheAnhProject/UdonFi/docs/12-roadmap.md)

---

## CR-002: Incomplete mathematical specification for interest indexing

*   **Status**: Resolved
*   **Resolution**:
    *   Detailed the index-based accumulator math and variables (`borrowIndex`, `supplyIndex`, `lastAccrualLedger`) to support $O(1)$ constant-time calculations.
    *   Specified fixed-point math scales: Ray ($10^{27}$) for rates and indexes, Wad ($10^{18}$) for balances and shares.
    *   Established strict rounding direction invariants: borrow debt compounds round **up** and supply allocations round **down** to protect protocol solvency.
    *   Incorporated interest accrual checkpoints into all transaction sequence flows.
    *   Defined property-based testing invariants for indexing monotonicity and compounding equivalency.
*   **Files changed**:
    *   [docs/04-business-flows.md](file:///d:/TheAnhProject/UdonFi/docs/04-business-flows.md)
    *   [docs/05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md)
    *   [docs/09-testing-strategy.md](file:///d:/TheAnhProject/UdonFi/docs/09-testing-strategy.md)
    *   [docs/adr/ADR-0009-interest-index-accounting-model.md](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0009-interest-index-accounting-model.md) [NEW]

---

## CR-003: Missing sync lag strategy for API dashboards when the event indexer is delayed

*   **Status**: Resolved
*   **Resolution**:
    *   Defined the database single-writer rule: only the Event Indexer bot writes ledger state, while the API is read-only, preventing locks.
    *   Implemented REST response metadata (`meta` containing `latestProcessedLedger`, `networkLedger`, `syncLag`, and `isStale`).
    *   Established UI degraded-mode thresholds: lag $\le 3$ blocks is Green; lag $\le 10$ blocks displays a warning banner; lag $> 10$ blocks disables Borrow/Withdraw actions to prevent transactions based on stale pricing data.
    *   Detailed indexer catch-up batch query loops and idempotency validations (unique composite primary keys).
*   **Files changed**:
    *   [docs/02-system-architecture.md](file:///d:/TheAnhProject/UdonFi/docs/02-system-architecture.md)
    *   [docs/06-api-spec.md](file:///d:/TheAnhProject/UdonFi/docs/06-api-spec.md)
    *   [docs/08-security-model.md](file:///d:/TheAnhProject/UdonFi/docs/08-security-model.md)
    *   [backend/README.md](file:///d:/TheAnhProject/UdonFi/backend/README.md)
    *   [indexer/README.md](file:///d:/TheAnhProject/UdonFi/indexer/README.md)

---

## Created Architectural Decision Records (ADRs)

The following ADRs have been written to the `docs/adr/` directory to document critical architectural boundaries:
1.  **[ADR-0006](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0006-upgradeability-and-migration-strategy.md)**: Upgradeability and Migration Strategy (governance-timelocked WASM upgrades and schema migrations).
2.  **[ADR-0007](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0007-emergency-pause-and-guardian-model.md)**: Emergency Pause and Guardian Model (Guardian scope, pausable actions, 7-day expiration).
3.  **[ADR-0008](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0008-oracle-failure-handling.md)**: Oracle Failure Handling (primary/secondary deviations, staleness, TWAP fallbacks, circuit breakers).
4.  **[ADR-0009](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0009-interest-index-accounting-model.md)**: Interest Index Accounting Model (scaled balances, accrual triggers, fixed-point rounding).
5.  **[ADR-0010](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0010-governance-timelock-policy.md)**: Governance Timelock Policy (proposal lifecycle block limits, execution window delays).

---

## Remaining Concerns & Next Steps

1.  **Reentrancy Protection**: Ensure smart contract implementations incorporate reentrancy guards for all external entry-points during the next coding phase.
2.  **Gas Analysis**: Validate cross-contract call CPU instruction consumption on Testnet.
3.  **Oracle Deployment**: Confirm Pyth and Band contracts have matching instances on Stellar Testnet.
