# UdonFi V2 Testing Suite Spec

The MVP test suite validates smart contract behavior and the frontend transaction path without requiring an indexer, backend, liquidation bot, PostgreSQL event sync, queue, worker, checkpoint/replay, or sync lag system.

---

## 1. Test Architecture

```text
  +-----------------------------------------------------------+
  |                   Frontend MVP Checks                     |
  |   - Freighter mocks, Soroban RPC mocks, Expert link UX    |
  +-----------------------------------------------------------+
                               |
  +----------------------------v------------------------------+
  |                   Contract Integration Tests              |
  |   - Initialize, reserve, deposit, borrow, repay, withdraw |
  |   - Price shock / mock HF drop / manual liquidation       |
  +-----------------------------------------------------------+
                               |
  +----------------------------v------------------------------+
  |                Property-Based & Math Tests                |
  |   - Accounting, interest, Health Factor, liquidation math |
  +-----------------------------------------------------------+
                               |
  +----------------------------v------------------------------+
  |                     Unit Tests (Rust)                     |
  |   - Validation, accounting, lifecycle, events             |
  +-----------------------------------------------------------+
```

---

## 2. Required MVP Tests

### Contract Unit Tests

- Deposit validation and execution.
- Withdraw validation and execution.
- Borrow validation and execution.
- Repay validation and execution.
- Basic Risk Engine and Health Factor.
- Manual liquidation eligibility and execution.
- Event emission for core actions.

### Contract Integration Tests

```txt
initialize protocol
create reserve
deposit
borrow
repay
withdraw
```

```txt
initialize protocol
create reserve
deposit collateral
borrow
price shock / mock HF drop
manual liquidate
```

### Frontend MVP Checks

- Frontend reads directly from Soroban RPC.
- Frontend writes through Freighter-signed transactions.
- Frontend does not require backend/indexer startup.
- Frontend shows Stellar Expert links for submitted transaction hashes.

---

## 3. Commands

```bash
cd contracts
cargo test
```

```bash
cd frontend
npm run lint
npm run build
```

Post-MVP backend/indexer/bot tests should be added when those systems return to scope.
