# 07 - Coding Guidelines

These guidelines apply to the UdonFi V2 monorepo. The MVP scope is contract-first and must run without backend, event indexer, liquidation bot, PostgreSQL event sync, queues, or background workers.

---

## 1. Folder Structure

- `/contracts/`: Rust Soroban smart contracts and shared contract primitives.
- `/frontend/`: React + TypeScript MVP client.
- `/backend/`: Optional Post-MVP analytics/caching service plan.
- `/indexer/` and `/indexer_bot/`: Optional Post-MVP event indexing and bot experiments.
- `/docs/future-work/`: Preserved plans for indexer, bot, and analytics systems.
- `/scripts/`: Deployment, testnet setup, and utility scripts.

---

## 2. Rust Smart Contract Conventions

- Use `snake_case` for modules, files, functions, and variables.
- Use `PascalCase` for types and traits.
- Use `SCREAMING_SNAKE_CASE` for constants.
- Use checked arithmetic or approved fixed-point helpers for balances, debt, liquidity, indexes, prices, and percentages.
- Do not use floating-point math in contract code.
- Do not use `unsafe`.
- Keep events for debugging and Stellar Explorer visibility.
- Respect lifecycle permission helpers for deposit, withdraw, borrow, repay, and liquidation.

---

## 3. Frontend Conventions

- Use TypeScript React functional components.
- Frontend reads must come directly from Soroban RPC for MVP state.
- Frontend writes must be Freighter-signed Soroban transactions.
- Store only local transaction history if needed for UX.
- Show Stellar Expert links after transaction submission.
- Do not require backend/indexer data for balances, debt, Health Factor, liquidation eligibility, or dashboard correctness.

---

## 4. Post-MVP Service Conventions

Backend, indexer, analytics, and bot code is future work. If modified later:

- Backend must not be the source of truth for balances, debt, Health Factor, or liquidation state.
- Indexer/database records must be treated as derived state.
- Automated liquidation monitoring must submit normal user-callable liquidation transactions.
- PostgreSQL sync, single-writer policies, checkpoint/replay, queues, workers, and sync lag strategy must stay out of MVP acceptance criteria.

---

## 5. Git Workflow

- Use branch names such as `feature/BOR-001-core-borrow`, `fix/RSK-001-health-factor`, or `docs/mvp-scope-refactor`.
- Use Conventional Commits:
  - `feat(contracts): add borrow validation`
  - `fix(frontend): show testnet stellar expert link`
  - `docs(scope): move indexer to future work`

---

## 6. Forbidden Practices

- Do not add backend/indexer/bot dependencies to the MVP demo path.
- Do not fake passing tests or claim production readiness.
- Do not treat off-chain cached state as authoritative for financial state.
- Do not bypass Freighter signing for user transactions.
- Do not remove contract events completely.
