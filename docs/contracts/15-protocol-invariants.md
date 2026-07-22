# 15 - Protocol Invariants Specification

This document defines the core safety invariants of the UdonFi V2 protocol. These invariants must hold true across all smart contract states and transaction updates.

---

## 1. Accounting Invariants (INV-ACC-001 to INV-ACC-008)

### INV-ACC-001: Non-Negative Pool Liquidity
- **Description**: The idle underlying token balance in the pool contract must never drop below 0.
- **Applies to**: `lending_pool` contract.
- **How to test**: Unit test check: assert `pool_balance >= 0` after every withdrawal and borrow.
- **Severity**: Critical

### INV-ACC-002: Supply Cap Limit
- **Description**: Total supplied underlying tokens for reserve $i$ must never exceed the configured supply cap.
- **Applies to**: `lending_pool` contract.
- **How to test**: Check during simulation: assert `total_supplied <= supply_cap` after deposit.
- **Severity**: High

### INV-ACC-003: Borrow Cap Limit
- **Description**: Total borrowed underlying tokens for reserve $j$ must never exceed the configured borrow cap.
- **Applies to**: `lending_pool` contract.
- **How to test**: Check during simulation: assert `total_borrowed <= borrow_cap` after borrow.
- **Severity**: High

### INV-ACC-004: Non-Negative Treasury Balance
- **Description**: The stored balance of the Treasury reserve fee account must never be less than 0.
- **Applies to**: `treasury` contract.
- **How to test**: Check that withdrawals from the treasury revert if requested amount > treasury balance.
- **Severity**: High

### INV-ACC-005: Debt Rounding Direction Invariant
- **Description**: Compounded borrow debt must round up during division to prevent debt loss.
- **Applies to**: `udonfi-common` math.
- **How to test**: Property test: assert `actual_debt >= scaled_debt * borrow_index`.
- **Severity**: Medium

### INV-ACC-006: Supply Rounding Direction Invariant
- **Description**: Compounded supply shares must round down during division to prevent share overclaims.
- **Applies to**: `udonfi-common` math.
- **How to test**: Property test: assert `actual_supply <= scaled_supply * supply_index`.
- **Severity**: Medium

### INV-ACC-007: Share Invariant (Zero Shares on Zero Balance)
- **Description**: If a user's underlying supply balance is 0, their scaled supply shares must be exactly 0.
- **Applies to**: `a_token` balances.
- **How to test**: Assert user shares = 0 after complete withdrawal.
- **Severity**: High

### INV-ACC-008: Debt Invariant (Zero Debt on Zero Balance)
- **Description**: If a user's outstanding debt balance is 0, their scaled debt shares must be exactly 0.
- **Applies to**: `debt_token` balances.
- **How to test**: Assert user debt shares = 0 after complete repayment.
- **Severity**: High

---

## 2. Interest Invariants (INV-INT-001 to INV-INT-007)

### INV-INT-001: Monotonic Borrow Index
- **Description**: The global `borrowIndex` must be a monotonically non-decreasing value.
- **Applies to**: `lending_pool` contract state.
- **How to test**: Property test: assert `borrow_index_new >= borrow_index_old` after interest accrual.
- **Severity**: Critical

### INV-INT-002: Monotonic Supply Index
- **Description**: The global `supplyIndex` must be a monotonically non-decreasing value.
- **Applies to**: `lending_pool` contract state.
- **How to test**: Property test: assert `supply_index_new >= supply_index_old` after interest accrual.
- **Severity**: Critical

### INV-INT-003: Rate Invariant (Supply APY <= Borrow APY)
- **Description**: Supply APY must never exceed Borrow APY, even with reserve fees set to 0.
- **Applies to**: `interest_rate_engine`.
- **How to test**: Property test: assert `R_supply <= R_borrow` for all utilization levels.
- **Severity**: High

### INV-INT-004: Maximum APY Cap
- **Description**: The borrow rate calculated by the interest rate curve must never exceed the maximum configured cap (e.g. 90% APY).
- **Applies to**: `interest_rate_engine`.
- **How to test**: Property test: assert `R_borrow <= 90%` when utilization U = 100%.
- **Severity**: Medium

### INV-INT-005: Idle Accrual Block Check
- **Description**: If block delta ($\Delta L$) is 0, the indexes must not modify.
- **Applies to**: `lending_pool` accrual logic.
- **How to test**: Assert index does not change when calling `accrue_interest` twice in the same ledger transaction.
- **Severity**: Medium

### INV-INT-006: Reserve Factor Limit
- **Description**: The Reserve Factor parameter must remain between 0% and 100%.
- **Applies to**: `reserve_config` storage.
- **How to test**: Reject governance parameter settings if value > 100%.
- **Severity**: High

### INV-INT-007: Non-Negative Utilization Rate
- **Description**: Pool utilization rate must remain within $[0, 1.0]$.
- **Applies to**: `interest_rate_engine`.
- **How to test**: Assert utilization rate is between 0 and 1.0 under randomized borrows and supplies.
- **Severity**: High

---

## 3. Risk Invariants (INV-RSK-001 to INV-RSK-008)

### INV-RSK-001: Minimum Health Factor on Borrow
- **Description**: A borrower cannot execute a borrow transaction that reduces their Health Factor below 1.0.
- **Applies to**: `lending_pool` borrow validation.
- **How to test**: Attempt to borrow past the 1.0 health threshold; check that the transaction reverts.
- **Severity**: Critical

### INV-RSK-002: Minimum Health Factor on Withdrawal
- **Description**: A depositor cannot execute a withdrawal that reduces their Health Factor below 1.0.
- **Applies to**: `lending_pool` withdraw validation.
- **How to test**: Attempt to withdraw collateral while borrowing; check that the transaction reverts.
- **Severity**: Critical

### INV-RSK-003: Liquidation Solvency Check
- **Description**: Liquidation transactions can only be initiated when borrower's Health Factor is strictly less than 1.0.
- **Applies to**: `liquidation_coordinator` contract.
- **How to test**: Assert that liquidation attempts fail if borrower Health Factor is $\ge 1.0$.
- **Severity**: Critical

### INV-RSK-004: Seizure Limit Invariant
- **Description**: A liquidation cannot seize more borrower collateral than exists in their vault.
- **Applies to**: `liquidation_coordinator`.
- **How to test**: Attempt to execute a liquidation specifying a repay amount that exceeds borrower's collateral value; assert transaction reverts.
- **Severity**: Critical

### INV-RSK-005: Liquidation Health Invariant
- **Description**: Successful liquidations must increase the borrower's Health Factor.
- **Applies to**: `liquidation_coordinator`.
- **How to test**: Assert $HF_{post} > HF_{pre}$ after partial liquidation.
- **Severity**: High

### INV-RSK-006: Maximum Close Factor Cap
- **Description**: The close factor parameter during liquidation must never exceed 100%.
- **Applies to**: `liquidation_coordinator`.
- **How to test**: Assert that close factor is bounded to $\le 100\%$ during setup.
- **Severity**: High

### INV-RSK-007: Maximum LTV Bound
- **Description**: Maximum LTV limits configuration must remain strictly less than the Liquidation Threshold: $LTV_{max} < LT$.
- **Applies to**: `reserve_config`.
- **How to test**: Reject reserve config setups if $LTV_{max} \ge LT$.
- **Severity**: High

### INV-RSK-008: Non-Negative Health Factor
- **Description**: User Health Factor must never be negative.
- **Applies to**: `risk_engine`.
- **How to test**: Assert $HF \ge 0$ for all accounts.
- **Severity**: Critical

---

## 4. Oracle Invariants (INV-ORC-001 to INV-ORC-006)

### INV-ORC-001: Price Freshness Invariant
- **Description**: Prices used for calculations must not exceed `MAX_PRICE_STALENESS_LEDGERS`.
- **Applies to**: `price_oracle`.
- **How to test**: Revert when attempting to read price from feed with outdated timestamp.
- **Severity**: High

### INV-ORC-002: Deviation Limit check
- **Description**: Price movement from the last accepted price must be within the configured deviation threshold.
- **Applies to**: `price_oracle`.
- **How to test**: Change oracle price beyond the deviation threshold and assert `get_price_wad` reverts.
- **Severity**: High

### INV-ORC-003: Non-Zero Price Invariant
- **Description**: Price returned by the oracle adapter must be strictly greater than 0.
- **Applies to**: `price_oracle`.
- **How to test**: If oracle returns 0 or negative price, verify adapter reverts.
- **Severity**: Critical

### INV-ORC-004: Timestamp Invariant
- **Description**: Oracle timestamp must not be in the future: `timestamp <= current_block_timestamp`.
- **Applies to**: `price_oracle`.
- **How to test**: Revert if oracle feed reports a timestamp in the future.
- **Severity**: Medium

### INV-ORC-005: Manual Mode Isolation
- **Description**: Admin `set_price` is only allowed when oracle mode is `manual`.
- **Applies to**: `price_oracle`.
- **How to test**: Assert `set_price` reverts in `reflector` mode.
- **Severity**: High

### INV-ORC-006: No Silent Fallback Invariant
- **Description**: If Reflector price is unavailable, stale, or invalid, risk-sensitive reads must revert rather than falling back to a fake price.
- **Applies to**: `price_oracle`, `lending_pool`, `liquidation`.
- **How to test**: Simulate oracle outage and verify Health Factor / liquidation preparation fails closed.
- **Severity**: High

---

## 5. Governance Invariants (INV-GOV-001 to INV-GOV-006)

### INV-GOV-001: Timelocked Cap Increases
- **Description**: Any increase to supply or borrow caps must be timelocked for at least 48 hours.
- **Applies to**: `governance` and `lending_pool` contracts.
- **How to test**: Attempt to execute cap increase prior to the 48-hour delay; assert transaction reverts.
- **Severity**: Critical

### INV-GOV-002: Emergency Guardian Cap Decreases
- **Description**: Cap decreases executed by the Guardian must be immediate and bypass the timelock.
- **Applies to**: `lending_pool` contract.
- **How to test**: Guardian calls `emergency_reduce_caps`; verify that the limit decreases instantly in the same block.
- **Severity**: High

### INV-GOV-003: Proposer Token Threshold
- **Description**: Proposers must hold at least 1% of governance token supply to submit proposals.
- **Applies to**: `governance` contract.
- **How to test**: Attempt to submit proposal from account with 0.5% UDON; assert transaction reverts.
- **Severity**: High

### INV-GOV-004: Proposal Quorum Threshold
- **Description**: Proposals can only pass if total votes cast meet or exceed the 4% quorum requirement.
- **Applies to**: `governance` contract.
- **How to test**: Count votes; if total yes votes < 4% of supply, verify proposal fails to execute.
- **Severity**: High

### INV-GOV-005: Guardian Access Limits
- **Description**: The Guardian cannot upgrade contract WASM hashes or transfer treasury funds.
- **Applies to**: `lending_pool` and `governance` contracts.
- **How to test**: Attempt to call upgrade methods using Guardian address; assert transaction reverts.
- **Severity**: Critical

### INV-GOV-006: Timelock Gating Policy
- **Description**: The governance timelock delay must never be configured to less than 24 hours.
- **Applies to**: `governance` configurations.
- **How to test**: Attempt to set timelock delay parameter to 12 hours; assert transaction reverts.
- **Severity**: Critical
