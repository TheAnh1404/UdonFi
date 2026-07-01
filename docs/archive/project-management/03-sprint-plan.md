# 03 - Sprint Plan

This sprint plan reflects the UdonFi V2 MVP scope refactor. The MVP is a contract-first demo using:

```txt
Frontend -> Freighter -> Soroban RPC -> Smart Contracts -> Stellar Testnet -> Stellar Expert
```

Event indexer, liquidation bot, analytics backend, PostgreSQL event sync, real-time dashboard sync, background workers, queues, checkpoint/replay, and sync lag strategy are Post-MVP / Future Work.

---

## Sprint 1: Core Contract Foundation

- **Objective**: Establish the Soroban contract workspace and core protocol primitives.
- **Includes**: Reserve registry, lifecycle state, common errors, event bus, fixed-point helpers, and checked arithmetic conventions.
- **Exit Criteria**: Contract workspace builds and core primitives have unit coverage.
- **Not Included**: PostgreSQL, Redis, indexer, backend API, queue, or worker setup.

---

## Sprint 2: Accounting + Interest + Supply

- **Objective**: Complete reserve accounting, interest index helpers, supply validation, and deposit execution.
- **Includes**: Scaled supply accounting, liquidity accounting, interest accrual hooks, deposit events, and reserve lifecycle checks.
- **Exit Criteria**: Deposits work in tests and accounting state remains valid after supply operations.

---

## Sprint 3: Withdraw + Borrow + Repay

- **Objective**: Complete the core user lending lifecycle after deposit.
- **Includes**: Withdraw execution, borrow validation/execution, repay validation/execution, scaled debt accounting, liquidity updates, and events.
- **Exit Criteria**: Users can deposit, withdraw, borrow, and repay in contract tests without indexer or bot dependencies.

---

## Sprint 4: Risk + Manual Liquidation

- **Objective**: Add solvency checks and user-callable liquidation.
- **Includes**: Collateral value, borrow value, LTV, Health Factor, `can_borrow`, `can_withdraw`, liquidation eligibility, close factor, liquidation bonus, collateral seized calculation, and manual liquidation execution.
- **Exit Criteria**: Unsafe borrows/withdrawals are rejected, liquidation is rejected when HF >= 1, liquidation succeeds when HF < 1, and liquidation events are emitted.
- **Not Included**: Automated liquidation bot or off-chain account monitoring.

---

## Sprint 5: Contract Integration Tests + Testnet Deployment

- **Objective**: Validate the full protocol flow and prepare Testnet deployment.
- **Includes**: Integration tests for initialize, create reserve, deposit, borrow, repay, withdraw, price shock, and manual liquidation.
- **Exit Criteria**: Contract tests pass, formatting passes, clippy passes, contracts deploy to Stellar Testnet, and contract IDs are documented for frontend configuration.

---

## Sprint 6: Frontend MVP + Freighter + Stellar Expert Links

- **Objective**: Build the demo frontend that interacts directly with contracts.
- **Includes**: Freighter wallet connection, Soroban RPC reads, Freighter-signed Soroban transactions, local transaction history if needed, and Stellar Expert links after submission.
- **Exit Criteria**: Frontend can run without backend/indexer and supports deposit, withdraw, borrow, repay, Health Factor display, and manual liquidation through Testnet contracts.

---

## Post-MVP / Future Work

These items are intentionally excluded from the MVP sprint path:

- Event Indexer.
- Liquidation Bot.
- Backend analytics.
- PostgreSQL event sync.
- Real-time dashboard sync.
- Sync lag strategy.
- Background workers and queues.
- Checkpoint and replay system.

Future-work planning lives in:

- [Future Work: Indexer Architecture](../future-work/indexer-architecture.md)
- [Future Work: Liquidation Bot](../future-work/liquidation-bot.md)
- [Future Work: Backend Analytics](../future-work/backend-analytics.md)
