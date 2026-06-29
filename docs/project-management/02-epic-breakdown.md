# 02 - Epic Breakdown: Engineering Tasks Backlog

This task backlog is scoped to the UdonFi V2 MVP. The MVP must work through:

```txt
Frontend -> Freighter -> Soroban RPC -> Smart Contracts -> Stellar Testnet -> Stellar Expert
```

Backend/indexer systems are not required for the MVP demo.

---

## EPIC-00: Core Contract Foundation

### FND-001: Initialize Contract Workspace
- **Description**: Maintain the Rust/Soroban workspace and shared crate boundaries.
- **Expected Files**: `contracts/**`.
- **Expected Tests**: `cargo build`, `cargo test`.
- **Acceptance Criteria**: Contract crates compile without requiring frontend, backend, indexer, or bot services.

### FND-002: Shared Primitives, Errors, and Events
- **Description**: Maintain shared fixed-point helpers, reserve/user types, errors, and event helpers.
- **Expected Files**: `contracts/common/**`, `contracts/shared/**`, or current core equivalents.
- **Expected Tests**: Unit tests for math, packing, serialization, and event payload helpers.
- **Acceptance Criteria**: All contract modules use checked arithmetic and shared errors/events.

---

## EPIC-01: Reserve + Lifecycle

### RSV-001: Reserve Registry
- **Description**: Create and track reserves and reserve configuration.
- **Acceptance Criteria**: Reserves can be initialized and queried in tests.

### RSV-002: Lifecycle Permissions
- **Description**: Enforce active, paused, frozen, and disabled reserve permissions.
- **Acceptance Criteria**: Deposit, withdraw, borrow, repay, and liquidation checks follow lifecycle docs.

---

## EPIC-02: Accounting + Interest + Supply

### ACC-001: Accounting Engine
- **Description**: Track liquidity, scaled supply, scaled debt, and reserve totals.
- **Acceptance Criteria**: Accounting cannot underflow or overflow and remains valid after each user action.

### INT-001: Interest Index Helpers
- **Description**: Update and read supply/borrow indexes using integer fixed-point math.
- **Acceptance Criteria**: Indexes are monotonic and accrual hooks are called where required.

### SUP-001: Deposit Validation
- **Description**: Validate protocol status, reserve status, amount, supply cap, and liquidity state.
- **Acceptance Criteria**: Invalid deposits are rejected with stable errors.

### SUP-002: Deposit Execution
- **Description**: Increase liquidity, mint or record scaled supply, update accounting, and emit deposit events.
- **Acceptance Criteria**: Successful deposit works in unit and integration tests.

---

## EPIC-03: Withdraw + Borrow + Repay

### WTH-001: Withdraw Validation
- **Description**: Validate amount, user balance, reserve lifecycle, liquidity, and risk constraints.
- **Acceptance Criteria**: Over-withdraw and unsafe withdraw requests are rejected.

### WTH-002: Withdraw Execution
- **Description**: Burn scaled supply, decrease liquidity, update accounting, and emit `withdraw.completed`.
- **Acceptance Criteria**: Withdraw succeeds for valid positions and rejects insufficient balance or liquidity.

### BOR-001: Borrow Validation
- **Description**: Validate protocol status, reserve status, amount, borrow cap, liquidity, and risk.
- **Acceptance Criteria**: Valid borrow passes and unhealthy/capped/illiquid borrow requests fail.

### BOR-002: Borrow Execution
- **Description**: Increase scaled debt, decrease liquidity, update accounting, and emit `borrow.created`.
- **Acceptance Criteria**: Debt increases and liquidity decreases correctly.

### RPY-001: Repay Validation
- **Description**: Validate amount, user debt, lifecycle permission, and cap repay amount to actual debt.
- **Acceptance Criteria**: No-debt repay is rejected and over-repay is handled safely.

### RPY-002: Repay Execution
- **Description**: Decrease scaled debt, increase liquidity, update accounting, and emit `repay.completed`.
- **Acceptance Criteria**: Partial/full repay work and debt never becomes negative.

---

## EPIC-04: Risk + Manual Liquidation

### RSK-001: Basic Risk Engine
- **Description**: Implement collateral value, borrow value, LTV, Health Factor, `can_borrow`, and `can_withdraw`.
- **Acceptance Criteria**: HF above 1 is safe, HF below 1 is unsafe, and borrow/withdraw can be rejected by risk state.

### LIQ-001: Basic Manual Liquidation
- **Description**: Implement liquidation eligibility, close factor, liquidation bonus, collateral seized calculation, and user-callable execution.
- **Acceptance Criteria**: Liquidation is rejected when HF >= 1, succeeds when HF < 1, repays debt, seizes collateral, and emits events.
- **Not Included**: Liquidation bot or off-chain monitoring.

---

## EPIC-05: Contract Integration Tests + Testnet Deployment

### TST-001: Full Lifecycle Integration Test
- **Description**: Test initialize protocol, create reserve, deposit, borrow, repay, and withdraw.
- **Acceptance Criteria**: Flow passes without indexer, backend, or bot simulation.

### TST-002: Liquidation Integration Test
- **Description**: Test deposit collateral, borrow, price shock/mock HF drop, and manual liquidation.
- **Acceptance Criteria**: Debt is reduced, collateral is seized, and event assertions pass.

### DEP-001: Testnet Deployment
- **Description**: Build and deploy contracts to Stellar Testnet.
- **Acceptance Criteria**: Contract IDs, reserve initialization steps, and Soroban RPC URL are documented for frontend use.

---

## EPIC-06: Frontend MVP

### FE-001: Freighter Wallet Integration
- **Description**: Connect wallet, read address/network, and request transaction signatures.
- **Acceptance Criteria**: User can sign Soroban transactions through Freighter.

### FE-002: Direct Soroban RPC Reads
- **Description**: Read contract state directly through Soroban RPC.
- **Acceptance Criteria**: Balances, debt, Health Factor, and liquidation state do not depend on backend or indexer data.

### FE-003: MVP User Actions
- **Description**: Implement deposit, withdraw, borrow, repay, and manual liquidation UI actions.
- **Acceptance Criteria**: UI submits Freighter-signed transactions to Soroban RPC.

### FE-004: Stellar Expert Transaction Links
- **Description**: Show Stellar Expert links after successful transaction submission.
- **Acceptance Criteria**: Submitted transaction hashes link to the correct Testnet transaction page.

---

## Post-MVP / Future Work

The following task groups are preserved for later implementation and must not block MVP work:

### IDX-F01: Event Indexer
- Poll Soroban/Stellar ledgers, decode events, maintain checkpoints, replay events, and sync PostgreSQL records.
- Reference: [Future Work: Indexer Architecture](../future-work/indexer-architecture.md).

### API-F01: Backend Analytics
- Serve metadata, historical analytics, caching, and optional dashboard APIs.
- Reference: [Future Work: Backend Analytics](../future-work/backend-analytics.md).

### BOT-F01: Liquidation Bot
- Monitor accounts off-chain and submit automated liquidation transactions.
- Reference: [Future Work: Liquidation Bot](../future-work/liquidation-bot.md).
