# 12 - Developer Onboarding Guide

This guide gets developers running the UdonFi V2 MVP path. The MVP does not require backend, indexer, PostgreSQL, Redis, queues, workers, or liquidation bot services.

---

## 1. Repository Layout

- `/contracts/`: Soroban smart contracts and contract tests.
- `/frontend/`: React + Vite MVP client using Freighter and Soroban RPC.
- `/backend/`: Optional Post-MVP backend analytics/caching plan.
- `/indexer/` and `/indexer_bot/`: Optional Post-MVP event indexer and bot work.
- `/docs/`: Specifications, architecture docs, and project-management docs.
- `/docs/future-work/`: Preserved plans for indexer, bot, and backend analytics.

Before writing code, review:

1. [System Architecture](../02-system-architecture.md)
2. [Smart Contract Spec](../05-smart-contract-spec.md)
3. [Protocol Invariants](../15-protocol-invariants.md)
4. [MVP Scope Refactor Report](../reviews/mvp-scope-refactor-report.md)

---

## 2. Required Local Tools

- Rust via rustup.
- Soroban CLI / Stellar CLI compatible with the contract toolchain.
- Node.js for the React frontend.
- Freighter Wallet extension for browser demo testing.

Docker/PostgreSQL/Redis are not required for the MVP demo path.

---

## 3. Contract Workflow

Build contracts:

```bash
cd contracts
cargo build --target wasm32v1-none --release
```

Run tests:

```bash
cd contracts
cargo test
```

Run format and lint checks:

```bash
cd contracts
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
```

---

## 4. Frontend Workflow

Install and start the frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend MVP must:

- Read contract state directly from Soroban RPC.
- Write through Freighter-signed transactions.
- Show Stellar Expert links after transaction submission.
- Run without backend/indexer services.

---

## 5. MVP Demo Workflow

1. Deploy and initialize contracts on Stellar Testnet.
2. Configure frontend contract IDs and Soroban RPC URL.
3. Connect Freighter on Testnet.
4. Deposit.
5. Borrow.
6. Repay.
7. Withdraw.
8. Trigger a mock/testnet price shock or use an unhealthy test account.
9. Execute manual liquidation.
10. Open Stellar Expert transaction links.

---

## 6. Post-MVP Services

Backend, indexer, analytics, PostgreSQL event sync, real-time dashboard sync, sync lag strategy, background workers, queues, checkpoint/replay, and automated liquidation monitoring are future work. They are not required for MVP setup, tests, or demo.
