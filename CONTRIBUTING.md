# Contributing to UdonFi V2

UdonFi V2 is currently focused on a contract-first MVP:

```txt
React Frontend -> Freighter Wallet -> Soroban RPC -> UdonFi Soroban Smart Contracts -> Stellar Testnet -> Stellar Expert
```

Backend, event indexer, liquidation bot, PostgreSQL event sync, real-time dashboard pipeline, queue, worker, checkpoint/replay, and sync lag strategy are Post-MVP / Future Work.

## Development Philosophy

- **Security First**: DeFi protocols handle user capital. Prioritize checked arithmetic, clear authorization, lifecycle permissions, and explicit errors.
- **Contract Source Of Truth**: MVP balances, debt, Health Factor, and liquidation state come from Soroban contracts through Soroban RPC.
- **Documentation First**: Architectural scope changes must update `docs/` and, when needed, ADRs.

## Setup And Verification

Build and test contracts:

```bash
cd contracts
cargo build --target wasm32v1-none --release
cargo test
```

Format and lint contracts:

```bash
cd contracts
cargo fmt
cargo clippy --all-targets -- -D warnings
```

Install and run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Build and lint the frontend:

```bash
cd frontend
npm run build
npm run lint
```

Backend/indexer/bot setup is not required for MVP contribution or demo verification unless the task is explicitly Post-MVP.

## Coding Standards

### Rust Smart Contracts

- Use explicit custom errors.
- Use checked arithmetic or shared fixed-point helpers.
- Do not use `unsafe`.
- Keep contract events for debugging and Stellar Expert visibility.
- Add behavior-focused tests for deposit, withdraw, borrow, repay, Health Factor, and manual liquidation changes.

### Frontend

- Use TypeScript React functional components.
- Read state directly from Soroban RPC for MVP.
- Submit writes through Freighter-signed Soroban transactions.
- Show Stellar Expert links after transaction submission.
- Do not require backend/indexer data for MVP dashboard correctness.

## Pull Request Process

1. Create a scoped branch from the active development branch.
2. Implement the change with matching tests.
3. Update relevant docs.
4. Run contract and/or frontend verification commands.
5. Include verification steps and security/invariant notes in the pull request.
