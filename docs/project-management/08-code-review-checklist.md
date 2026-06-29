# 08 - Code Review Checklist

Reviewers should evaluate pull requests against the current MVP architecture:

```txt
Frontend -> Freighter -> Soroban RPC -> Smart Contracts -> Stellar Testnet -> Stellar Expert
```

---

## 1. Architecture

- [ ] Smart contract module boundaries remain intact.
- [ ] Frontend MVP does not require backend, indexer, bot, database, queue, or worker services.
- [ ] Contract tests do not depend on indexer events or bot simulations.
- [ ] Events remain available for debugging and Stellar Explorer visibility.
- [ ] Manual liquidation remains callable directly by a user/liquidator.

---

## 2. Financial Correctness

- [ ] Balance, supply, debt, liquidity, and interest index updates use checked arithmetic.
- [ ] Deposits respect supply caps and lifecycle permissions.
- [ ] Withdrawals reject insufficient balance, insufficient liquidity, and unsafe Health Factor.
- [ ] Borrows reject insufficient liquidity, borrow-cap violations, inactive reserve state, and unsafe Health Factor.
- [ ] Repay caps over-repay to actual debt and cannot make debt negative.
- [ ] Liquidation rejects HF >= 1 and respects close factor, bonus, and seizure limits.

---

## 3. Security

- [ ] No `unsafe` Rust is introduced.
- [ ] No floating-point math is used in contract financial logic.
- [ ] State updates are ordered safely around token transfers.
- [ ] User authorization and Freighter signing assumptions are explicit.
- [ ] Admin/guardian/lifecycle permissions are tested where changed.

---

## 4. Frontend MVP

- [ ] Reads come from Soroban RPC.
- [ ] Writes are Freighter-signed Soroban transactions.
- [ ] Stellar Expert links are generated from submitted transaction hashes.
- [ ] Any local transaction history is labeled as local UI history, not source-of-truth state.

---

## 5. Testing And Docs

- [ ] Relevant unit and integration tests are added or updated.
- [ ] Contract MVP tests pass without indexer/backend/bot services.
- [ ] Docs keep indexer, bot, backend analytics, PostgreSQL event sync, real-time pipeline, workers, queues, and sync lag strategy in Post-MVP / Future Work unless the PR is explicitly future-work scoped.
