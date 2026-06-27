# 09 - Testing Checklist & Invariant Map

This checklist maps all 40 protocol invariants (as defined in [15-protocol-invariants.md](file:///d:/TheAnhProject/UdonFi/docs/15-protocol-invariants.md)) to the testing tiers used to validate them. Developers must refer to this table during implementation and testing phases.

---

## Invariant Mapping Matrix

| Invariant ID | Description | Unit Test | Integration Test | Property Test | Fuzz Test | Implementation / Validation Strategy |
|:---|:---|:---:|:---:|:---:|:---:|:---|
| **INV-ACC-001** | Non-Negative Pool Liquidity | ✔ | ✔ | | | Assert pool balance $\ge 0$ after every withdraw/borrow. |
| **INV-ACC-002** | Supply Cap Limit | ✔ | ✔ | | | Revert deposit transaction if new total supply exceeds cap. |
| **INV-ACC-003** | Borrow Cap Limit | ✔ | ✔ | | | Revert borrow transaction if new total borrowed exceeds cap. |
| **INV-ACC-004** | Non-Negative Treasury Balance | ✔ | ✔ | | | Assert Treasury fee account can never be depleted below 0. |
| **INV-ACC-005** | Debt Rounding Up | | | ✔ | ✔ | Assert compounded debt is rounded up on index calculations. |
| **INV-ACC-006** | Supply Rounding Down | | | ✔ | ✔ | Assert yield share values round down during conversion. |
| **INV-ACC-007** | Zero Shares on Zero Balance | ✔ | ✔ | | | Confirm total user aTokens burn to 0 when withdrawal is 100%. |
| **INV-ACC-008** | Zero Debt on Zero Balance | ✔ | ✔ | | | Confirm total user debtTokens burn to 0 when repayment is 100%. |
| **INV-INT-001** | Monotonic Borrow Index | | | ✔ | ✔ | Check `borrowIndex` is non-decreasing on block increments. |
| **INV-INT-002** | Monotonic Supply Index | | | ✔ | ✔ | Check `supplyIndex` is non-decreasing on block increments. |
| **INV-INT-003** | Supply APY $\le$ Borrow APY | | | ✔ | ✔ | Check that supply rate is always lower than or equal to borrow rate. |
| **INV-INT-004** | Maximum APY Cap | ✔ | | ✔ | | Validate borrow rates never exceed the configured cap (e.g. 90%). |
| **INV-INT-005** | Idle Accrual Block Check | ✔ | | | | Assert index calculations do not change if block delta is 0. |
| **INV-INT-006** | Reserve Factor Limit | ✔ | ✔ | | | Governance settings revert if reserve factor is set >100%. |
| **INV-INT-007** | Non-Negative Utilization Rate | | | ✔ | ✔ | Ensure utilization rate remains between 0 and 1.0. |
| **INV-RSK-001** | Min Health Factor on Borrow | ✔ | ✔ | | | Revert borrows that drop user Health Factor below 1.0. |
| **INV-RSK-002** | Min Health Factor on Withdraw | ✔ | ✔ | | | Revert withdrawals that drop user Health Factor below 1.0. |
| **INV-RSK-003** | Liquidation Solvency Check | ✔ | ✔ | | | Limit liquidations strictly to users with Health Factor < 1.0. |
| **INV-RSK-004** | Seizure Limit Invariant | ✔ | ✔ | | | Revert if liquidator tries to seize more than borrower's balance. |
| **INV-RSK-005** | Liquidation Health Increase | | ✔ | ✔ | | Assert borrower Health Factor increases post partial liquidation. |
| **INV-RSK-006** | Max Close Factor Cap | ✔ | | | | Limit close factor parameters to $\le 100\%$ on initialization. |
| **INV-RSK-007** | Max LTV Bound | ✔ | | | | Enforce $LTV_{max} < LT$ during reserve initialization. |
| **INV-RSK-008** | Non-Negative Health Factor | | | ✔ | ✔ | Ensure calculated Health Factor is never negative. |
| **INV-ORC-001** | Price Freshness Invariant | ✔ | ✔ | | | Revert reads if oracle update timestamp is older than window (3600s). |
| **INV-ORC-002** | Deviation Limit Check | ✔ | ✔ | | | Revert oracle updates if price deviation between sources > 2%. |
| **INV-ORC-003** | Non-Zero Price Invariant | ✔ | | | | Oracle aggregator reverts if price feed reports $\le 0$. |
| **INV-ORC-004** | Timestamp Invariant | ✔ | | | | Revert if update report timestamp is in the future. |
| **INV-ORC-005** | Price Freeze Invariant | ✔ | ✔ | | | Freeze price updates during circuit breaker pause. |
| **INV-ORC-006** | Fallback Trigger Invariant | | ✔ | | | Revert to TWAP or secondary feed if primary feed fails. |
| **INV-GOV-001** | Timelocked Cap Increases | | ✔ | | | Enforce 48-hour timelock delay on supply/borrow cap increases. |
| **INV-GOV-002** | Immediate Cap Decreases | | ✔ | | | Guardian calls to reduce caps execute instantly without timelock. |
| **INV-GOV-003** | Proposer Token Threshold | ✔ | ✔ | | | Revert proposals if proposer UDON balance is < 1%. |
| **INV-GOV-004** | Proposal Quorum Threshold | ✔ | ✔ | | | Reject execution if total yes votes do not meet 4% quorum. |
| **INV-GOV-005** | Guardian Access Limits | ✔ | ✔ | | | Revert Guardian calls to upgrade code or transfer treasury funds. |
| **INV-GOV-006** | Timelock Gating Policy | ✔ | | | | Revert governance setup if delay parameter is configured < 24 hours. |
| **INV-IDX-001** | Idempotency of Event Writes | ✔ | ✔ | | | Enforce database composite primary keys to prevent duplicate event writes. |
| **INV-IDX-002** | Metadata Freshness Check | ✔ | ✔ | | | REST endpoints must append current synced block sequence height. |
| **INV-IDX-003** | No Stale Flag Bypass | ✔ | ✔ | | | Mark API `isStale: true` when DB lag exceeds 3 blocks. |
| **INV-IDX-004** | Sequential Database Sync | ✔ | ✔ | | | Throw exception and stop indexer if sequence height gaps are detected. |
| **INV-IDX-005** | Degraded Write Rejections | ✔ | ✔ | | | Reject frontend write simulations when DB block lag exceeds 10. |

---

## 2. Invariant Execution Instructions

### Unit Testing (Rust Contracts)
Execute unit tests using the Soroban simulation environment:
```bash
cd contracts
cargo test
```
*Goal*: Assert logic branches, check revert exceptions, and ensure edge inputs are handled.

### Integration Testing (Soroban Env)
Run sequential integration tests mapping contract interaction lifecycles:
```bash
cd contracts
cargo test --test integration_tests
```
*Goal*: Validate multi-contract interactions, event emissions, and balance transfers.

### Property-Based testing (`proptest` Crate)
Run property-based simulations for rounding and accrual indexes:
```bash
cd contracts/common
cargo test --test property_tests
```
*Goal*: Assert that `borrowIndex` and `supplyIndex` remain monotonic over 10,000 runs under randomized block differences.

### Fuzz Testing (Cargo Fuzz / libFuzzer)
Run fuzz tests to check pool calculations against overflow or manipulation:
```bash
cd contracts
cargo fuzz run fuzz_target_lending_pool
```
*Goal*: Check input bounds and verify that math libraries never panic under crazy input spaces.
