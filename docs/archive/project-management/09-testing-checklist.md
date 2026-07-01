# 09 - Testing Checklist & Invariant Map

The MVP test suite validates the smart contract protocol and frontend interaction path without requiring an indexer, backend, bot, PostgreSQL, queues, workers, checkpoint/replay, or sync lag middleware.

---

## MVP Invariant Mapping

| Invariant ID | Description | Unit | Integration | Strategy |
|:---|:---|:---:|:---:|:---|
| INV-ACC-001 | Non-negative pool liquidity | Yes | Yes | Assert liquidity never underflows after withdraw, borrow, repay, or liquidation. |
| INV-ACC-002 | Supply cap limit | Yes | Yes | Reject deposits above reserve supply cap. |
| INV-ACC-003 | Borrow cap limit | Yes | Yes | Reject borrows above reserve borrow cap. |
| INV-ACC-004 | Scaled supply cannot underflow | Yes | Yes | Reject over-withdraw and burn only existing scaled supply. |
| INV-ACC-005 | Scaled debt cannot underflow | Yes | Yes | Cap repay to actual debt and assert debt never becomes negative. |
| INV-INT-001 | Borrow index monotonic | Yes | Yes | Check borrow index does not decrease. |
| INV-INT-002 | Supply index monotonic | Yes | Yes | Check supply index does not decrease. |
| INV-RSK-001 | Min Health Factor on borrow | Yes | Yes | Reject borrows that drop user HF below minimum. |
| INV-RSK-002 | Min Health Factor on withdraw | Yes | Yes | Reject withdrawals that drop user HF below minimum. |
| INV-RSK-003 | Liquidation eligibility | Yes | Yes | Reject liquidation when HF >= 1 and allow when HF < 1. |
| INV-RSK-004 | Seizure limit | Yes | Yes | Collateral seized cannot exceed borrower collateral. |
| INV-RSK-005 | Close factor | Yes | Yes | Debt repayment during liquidation respects close factor. |
| INV-EVT-001 | Event emission | Yes | Yes | Deposit, withdraw, borrow, repay, and liquidation emit expected events. |

---

## Required Contract Test Flows

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

---

## Commands

Run contract tests:

```bash
cd contracts
cargo test
```

Run contract formatting and linting:

```bash
cd contracts
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
```

Run frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

Backend, indexer, and bot tests are Post-MVP checks and are not required for MVP acceptance unless those future-work systems are explicitly modified.
