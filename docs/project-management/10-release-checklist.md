# 10 - Release Checklist

This checklist is for the UdonFi V2 MVP demo on Stellar Testnet. It is not a production or mainnet launch checklist.

> Mainnet launch is not approved. UdonFi V2 requires completed implementation, audits, threat modeling, governance decisions, and operational readiness before any production claim.

---

## 1. MVP Pre-Release Checks

- [ ] Contract MVP supports deposit, withdraw, borrow, repay, basic Health Factor, and manual liquidation.
- [ ] Contract unit tests pass.
- [ ] Contract integration tests pass for lifecycle and liquidation flows.
- [ ] Rust formatting passes.
- [ ] Rust clippy passes.
- [ ] Frontend builds and runs without backend/indexer services.
- [ ] Frontend reads state directly from Soroban RPC.
- [ ] Frontend writes transactions through Freighter.
- [ ] Frontend shows Stellar Expert links after transaction submission.

---

## 2. Contract Build

```bash
cd contracts
cargo build --target wasm32v1-none --release
```

- [ ] Release Wasm files are generated.
- [ ] Contract size and CPU expectations are checked against MVP budgets.
- [ ] Deployment artifacts are recorded.

---

## 3. Testnet Deployment

- [ ] Deploy UdonFi Soroban contracts to Stellar Testnet.
- [ ] Initialize protocol configuration.
- [ ] Create reserves for demo assets.
- [ ] Configure supply caps, borrow caps, LTV, liquidation threshold, close factor, and liquidation bonus.
- [ ] Configure mock/simple price inputs or oracle addresses used by the MVP.
- [ ] Record contract IDs.
- [ ] Record Soroban RPC URL.
- [ ] Record Stellar Expert Testnet URL pattern.

---

## 4. Frontend Demo Setup

- [ ] Configure frontend with Testnet contract IDs.
- [ ] Configure frontend with Soroban RPC URL.
- [ ] Confirm Freighter is set to Stellar Testnet.
- [ ] Start frontend:
  ```bash
  cd frontend
  npm run dev
  ```
- [ ] Confirm no backend/indexer service is required for startup.

---

## 5. Manual Demo Flow

- [ ] Connect Freighter Wallet on Testnet.
- [ ] Initialize or select demo reserve.
- [ ] Deposit.
- [ ] Borrow.
- [ ] Repay partial amount.
- [ ] Withdraw allowed amount.
- [ ] Create or simulate Health Factor drop with approved testnet/mock price flow.
- [ ] Execute manual liquidation from a liquidator account.
- [ ] Open Stellar Expert links for submitted transactions.
- [ ] Confirm contract events are visible for debugging.

---

## 6. Explicitly Out Of MVP Release

- Event Indexer deployment.
- Liquidation Bot deployment.
- Analytics Backend deployment.
- PostgreSQL event sync.
- Real-time dashboard pipeline.
- Background workers.
- Queue system.
- Sync lag middleware.
- Checkpoint/replay pipeline.

These are tracked under [Future Work](../future-work/).

---

## 7. Post-MVP Production Readiness Work

Before production/mainnet, the project still needs:

- External security audit.
- Operational monitoring and incident response.
- Oracle failure-mode hardening.
- Governance and admin key policy.
- Backend/indexer/bot architecture review if those systems are revived.
- Full production launch checklist.
