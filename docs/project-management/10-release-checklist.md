# 10 - Release Checklist

This document details the step-by-step release checklist for staging/testnet environments and outlines the production mainnet launch sequence.

> [!WARNING]
> **MAINNET LAUNCH NOT APPROVED**: UdonFi V2 is currently in "APPROVED TO PREPARE IMPLEMENTATION PLAN" status. Code implementation and mainnet deployment are **not approved** until a formal financial design, threat model audit, and security sign-off are completed.

---

## 1. Staging / Testnet Deployment Validation

Staging releases serve to verify contract interactions, event processing, database updates, and dashboard rendering on the Stellar Testnet.

### A. Pre-Deployment Check
- [ ] Confirm all tasks in the active sprint are marked "Done" according to the Definition of Done.
- [ ] Verify that all 40 protocol invariants pass automated testing in CI.
- [ ] Compile smart contracts with optimization:
  ```bash
  cd contracts
  cargo build --target wasm32v1-none --release
  ```
- [ ] Ensure compiled WASM files are optimized and sizes are verified (<100 KB).

### B. On-Chain Deployment & Initialization
- [ ] Deploy WASM contracts to Stellar Testnet:
  - [ ] Deploy `udonfi_common` (libraries)
  - [ ] Deploy `lending_pool`
  - [ ] Deploy `price_oracle`
  - [ ] Deploy `risk_engine`
  - [ ] Deploy `interest_rate_engine`
  - [ ] Deploy `liquidation_coordinator`
- [ ] Initialize pool contracts with deployed Contract IDs:
  - [ ] Register supported asset reserves (XLM, USDC).
  - [ ] Set supply and borrow caps per reserve.
  - [ ] Configure risk parameters: Max LTV, Liquidation Threshold, Close Factor.
  - [ ] Link interest rate curves.
  - [ ] Initialize oracle pricing feeds.

### C. Off-Chain Infrastructure Setup
- [ ] Spin up Staging PostgreSQL and Redis instances.
- [ ] Deploy the Event Indexer, passing the contract deploy block height as start parameters:
  ```bash
  cd indexer_bot
  START_BLOCK=4920813 npm start
  ```
- [ ] Verify event indexer decodes events sequentially and writes user positions without lag.
- [ ] Deploy the REST API Backend connected to the read-only DB pool.
- [ ] Deploy the Frontend Client Dashboard connected to the Staging API.

### D. Manual Staging Verification
- [ ] Connect Freighter Wallet on testnet.
- [ ] Execute `supply` transaction and verify `aTokens` are received and supply balances display.
- [ ] Execute `borrow` transaction and verify `debtTokens` are received and borrow limits update.
- [ ] Trigger an artificial price drop in the testnet mock oracle feed to verify that a borrower's Health Factor drops below 1.0.
- [ ] Execute a manual `prepare` and `execute` liquidation run.

---

## 2. Production / Mainnet Launch Sequence (Gated)

> [!IMPORTANT]
> This phase requires formal governance sign-off, multi-sig key setup, and smart contract audit certification.

### Phase 1: Security Audit & Multi-Sig Setup
- [ ] Complete external third-party security audits.
- [ ] Resolve all audit findings.
- [ ] Establish Multi-Sig Admin keys (minimum 3-of-5 key scheme).
- [ ] Establish Guardian keys (minimum 2-of-3 scheme) for emergency pause triggers.

### Phase 2: Mainnet Smart Contract Deployment
- [ ] Build release WASM binaries and check checksums.
- [ ] Multi-sig executes deployment of core contracts to Stellar Mainnet.
- [ ] Set initialization variables:
  - [ ] Enforce conservative initial caps (e.g., $100k limit per reserve).
  - [ ] Configure LTV ratios ($LTV_{max} < LT$).
  - [ ] Set the timelock gating policy to at least 24 hours.

### Phase 3: Infrastructure & Oracle Bindings
- [ ] Link primary production oracle feeds (Pyth/Band) and test the TWAP fallback.
- [ ] Start production Indexer service (using single-writer PostgreSQL writes).
- [ ] Start production API Backend (using read-only DB connections).
- [ ] Launch Frontend client site.

### Phase 4: Control Transition (Decentralization)
- [ ] Multi-sig transfers contract ownership and upgrade authority to the Governance Timelock contract.
- [ ] Verify that admin credentials have been revoked.
- [ ] Confirm emergency pause guardian roles are bound.

---

## 3. Emergency Rollback & Recovery Procedure

If a critical bug or vulnerability is identified during release or live operations:
1. **Immediate Pause**: The Guardian multi-sig calls `pause()` on the lending pool. This freezes supply, withdraw, borrow, repay, and liquidation actions immediately (bypassing timelocks).
2. **Analysis**: Assess the bug using database event logs and transaction XDR traces.
3. **Upgrade Proposal**: Submit a contract upgrade proposal containing the bug fix WASM code.
4. **Execution**: Execute the upgrade proposal via governance timelock (after the mandatory 24-hour delay).
5. **Resume**: The admin calls `unpause()` to resume normal protocol operations.
