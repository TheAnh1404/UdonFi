# 05 - Definition of Done

This Definition of Done applies to UdonFi V2 MVP work. The MVP target is a contract-first demo that uses React Frontend, Freighter Wallet, Soroban RPC, UdonFi Soroban Smart Contracts, Stellar Testnet, and Stellar Expert transaction links.

---

## 1. Core Code Completion

- The requested function, module, or UI flow is implemented end to end.
- No temporary debug output, unused code, or placeholder success paths remain.
- Smart contract errors are explicit and mapped to stable protocol errors.
- Contract arithmetic uses checked integer math or approved fixed-point helpers.

---

## 2. Testing Coverage

- **Rust Smart Contracts**:
  - Unit tests cover behavior changed by the task.
  - Integration tests cover deposit, withdraw, borrow, repay, Health Factor, and manual liquidation where applicable.
- **Frontend MVP**:
  - UI changes can run without backend/indexer services.
  - Freighter and Soroban RPC interactions are mocked or tested against configured Testnet contracts as appropriate.
- **Post-MVP Services**:
  - Backend, indexer, analytics, and bot tests are required only for future-work tasks that modify those systems.

---

## 3. Lints & Formatting

- Rust contracts:
  ```bash
  cd contracts
  cargo fmt --all -- --check
  cargo clippy --all-targets --all-features -- -D warnings
  ```
- Frontend:
  ```bash
  cd frontend
  npm run lint
  npm run build
  ```
- Backend/indexer commands are not required for MVP acceptance unless the task explicitly touches Post-MVP services.

---

## 4. Documentation Updates

- MVP architecture docs stay aligned to:
  ```txt
  Frontend -> Freighter -> Soroban RPC -> Smart Contracts -> Stellar Testnet -> Stellar Expert
  ```
- New contract interfaces, risk assumptions, or frontend transaction flows are documented.
- Indexer, bot, backend analytics, PostgreSQL sync, real-time dashboard sync, queues, workers, checkpoint/replay, and sync lag strategy are documented only as Post-MVP / Future Work.

---

## 5. Security & Invariant Review

- No `unsafe` Rust blocks are introduced.
- Balance, debt, liquidity, and index updates cannot overflow or underflow.
- State updates are ordered before token transfers where applicable.
- Lifecycle permissions are enforced for deposit, withdraw, borrow, repay, and liquidation.
- Manual liquidation must reject HF >= 1 and must respect close factor and collateral seizure limits.

---

## 6. Performance & Gas Budget

- Contract Wasm and CPU costs should remain within the budgets in [21-performance-budget.md](../21-performance-budget.md).
- Frontend RPC reads should be batched or cached locally only for UX. Soroban RPC/on-chain state remains the source of truth.

---

## 7. Review Gate

- Rust contract changes require senior contract/security review.
- Frontend MVP changes require review for wallet safety, transaction clarity, and Stellar Expert link correctness.
- Post-MVP backend/indexer/bot changes require separate future-work review and must not become demo dependencies.
