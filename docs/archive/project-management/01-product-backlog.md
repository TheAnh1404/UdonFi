# 01 - Product Backlog

This backlog reflects the simplified UdonFi V2 MVP scope. The MVP is a contract-first demo that runs through React Frontend, Freighter Wallet, Soroban RPC, UdonFi Soroban Smart Contracts, Stellar Testnet, and Stellar Expert transaction links.

Indexer, bot, backend analytics, PostgreSQL event sync, real-time dashboard sync, background workers, queues, checkpoint/replay, and sync lag strategy are Post-MVP / Future Work.

---

## MVP Must Include

- Contract MVP for deposit, withdraw, borrow, repay, basic Health Factor, and manual liquidation.
- Frontend MVP that reads directly from Soroban RPC.
- Freighter wallet connection and Freighter-signed transactions.
- Stellar Expert transaction links after transaction submission.
- Manual liquidation callable by a user or liquidator.
- Contract integration tests and testnet deployment instructions.

---

## Moved to Post-MVP

- Event Indexer.
- Liquidation Bot.
- Backend analytics.
- PostgreSQL event sync.
- Real-time dashboard sync.
- Sync lag strategy.
- Background workers and queues.
- Checkpoint and replay system.

Detailed plans are preserved in:

- [Future Work: Indexer Architecture](../future-work/indexer-architecture.md)
- [Future Work: Liquidation Bot](../future-work/liquidation-bot.md)
- [Future Work: Backend Analytics](../future-work/backend-analytics.md)

---

## EPIC-00: Foundation

- **Purpose**: Initialize repository layout, Cargo workspace, lint configuration, and MVP build commands.
- **Dependencies**: None.
- **MVP Deliverables**: Contract workspace, frontend workspace, docs, format/lint/test commands.
- **Out of MVP**: PostgreSQL, Redis, queue, worker, and indexer setup.
- **Acceptance Criteria**: Contract workspace builds, frontend can start without backend/indexer, and documented commands are current.

---

## EPIC-01: Core Ledger

- **Purpose**: Implement shared structures, fixed-point helpers, reserve configuration, protocol errors, and events.
- **Dependencies**: EPIC-00.
- **MVP Deliverables**: Shared contract primitives required by reserve lifecycle, accounting, risk, and user flows.
- **Acceptance Criteria**: Common modules compile and unit tests cover serialization, math, and configuration boundaries.

---

## EPIC-02: Supply / Deposit Engine

- **Purpose**: Implement deposit validation and execution.
- **Dependencies**: EPIC-01.
- **MVP Deliverables**: Deposit flow that transfers assets, mints or records scaled supply, updates liquidity, and emits events.
- **Acceptance Criteria**: Deposit works in unit and integration tests and respects reserve caps/lifecycle rules.

---

## EPIC-03: Withdraw Engine

- **Purpose**: Implement withdraw validation and execution.
- **Dependencies**: EPIC-02, EPIC-07.
- **MVP Deliverables**: Withdraw flow that burns scaled supply, decreases liquidity, checks Health Factor, and emits events.
- **Acceptance Criteria**: Withdraw succeeds for valid positions and rejects over-withdraw, insufficient liquidity, and unsafe Health Factor.

---

## EPIC-04: Accounting + Interest

- **Purpose**: Implement reserve accounting, scaled balances, and simple interest index updates.
- **Dependencies**: EPIC-01.
- **MVP Deliverables**: Checked arithmetic operations for liquidity, debt, supply, and accrual indexes.
- **Acceptance Criteria**: Accounting state remains valid after deposit, withdraw, borrow, repay, and liquidation tests.

---

## EPIC-05: Borrow Engine

- **Purpose**: Implement borrow validation and execution.
- **Dependencies**: EPIC-02, EPIC-04, EPIC-07.
- **MVP Deliverables**: Borrow flow that checks liquidity, borrow cap, reserve lifecycle, and post-borrow risk.
- **Acceptance Criteria**: Borrow succeeds for healthy positions and rejects cap, liquidity, inactive reserve, and unsafe Health Factor cases.

---

## EPIC-06: Repay Engine

- **Purpose**: Implement repay validation and execution.
- **Dependencies**: EPIC-05.
- **MVP Deliverables**: Repay flow that caps over-repay to actual debt, reduces scaled debt, increases liquidity, and emits events.
- **Acceptance Criteria**: Partial and full repay work, debt never becomes negative, and paused reserve behavior follows lifecycle rules.

---

## EPIC-07: Risk Engine

- **Purpose**: Implement basic collateral value, borrow value, LTV, Health Factor, `can_borrow`, and `can_withdraw`.
- **Dependencies**: EPIC-01.
- **MVP Deliverables**: Integer-only risk checks using reserve risk configuration and mock/simple price inputs where oracle aggregation is not ready.
- **Acceptance Criteria**: Healthy positions are accepted, unsafe positions are rejected, and tests cover HF above and below 1.

---

## EPIC-08: Manual Liquidation

- **Purpose**: Implement user-callable liquidation for undercollateralized positions.
- **Dependencies**: EPIC-05, EPIC-07.
- **MVP Deliverables**: Liquidation eligibility, close factor, liquidation bonus, collateral seized calculation, and manual execution.
- **Acceptance Criteria**: Liquidation is rejected when HF >= 1, allowed when HF < 1, reduces debt, seizes collateral, and emits events.

---

## EPIC-09: Frontend MVP

- **Purpose**: Build the React client for the contract-first MVP.
- **Dependencies**: EPIC-02 through EPIC-08, testnet deployment.
- **MVP Deliverables**: Freighter connection, Soroban RPC reads/writes, deposit/withdraw/borrow/repay/manual liquidation screens, and Stellar Expert links.
- **Acceptance Criteria**: Frontend can run without backend/indexer and derives balances, debt, Health Factor, and liquidation state from Soroban RPC.

---

## EPIC-10: Testing

- **Purpose**: Verify the MVP contract and frontend flows.
- **Dependencies**: EPIC-02 through EPIC-09.
- **MVP Deliverables**: Contract unit tests, contract integration tests, and frontend checks that mock Freighter/RPC as needed.
- **Acceptance Criteria**: Deposit, withdraw, borrow, repay, Health Factor, and manual liquidation tests pass without indexer or bot simulation.

---

## EPIC-11: Testnet Deployment

- **Purpose**: Deploy and initialize contracts on Stellar Testnet for demo.
- **Dependencies**: EPIC-10.
- **MVP Deliverables**: Build/deploy commands, contract IDs, reserve setup, frontend env configuration, and Stellar Expert link format.
- **Acceptance Criteria**: Demo flow works against Testnet through Freighter and Soroban RPC.

---

## Post-MVP Epics

### EPIC-F01: Event Indexer

- **Purpose**: Decode on-chain events and sync derived records to PostgreSQL after the MVP is stable.
- **Status**: Post-MVP / Future Work.
- **Reference**: [Future Work: Indexer Architecture](../future-work/indexer-architecture.md).

### EPIC-F02: Backend Analytics API

- **Purpose**: Serve metadata, analytics, caching, and historical chart queries after the MVP is stable.
- **Status**: Post-MVP / Future Work.
- **Reference**: [Future Work: Backend Analytics](../future-work/backend-analytics.md).

### EPIC-F03: Automated Liquidation Monitoring

- **Purpose**: Monitor unhealthy accounts and submit liquidation transactions automatically after manual liquidation is proven.
- **Status**: Post-MVP / Future Work.
- **Reference**: [Future Work: Liquidation Bot](../future-work/liquidation-bot.md).
