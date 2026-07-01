# UdonFi - Gemini Context

UdonFi is a Stellar Soroban lending protocol. The current MVP is simplified to a contract-first demo:

```txt
React Frontend -> Freighter Wallet -> Soroban RPC -> UdonFi Soroban Smart Contracts -> Stellar Testnet -> Stellar Expert
```

Off-chain services, analytics pipelines, and production monitoring are outside the current demo path.

## Architecture & Project Structure

- `contracts/`: Soroban smart contracts in Rust.
  - `lending_pool`: Supply, withdraw, borrow, and repay logic.
  - `liquidation`: Manual liquidation protocol.
  - `reserve`: Supported asset configuration.
  - `price_oracle`: MVP price inputs / oracle components.
  - `a_token` and `debt_token`: Interest-bearing and debt-tracking tokens where implemented.
  - `common`: Shared data structures, math, and bitmap logic.
- `frontend/`: React + TypeScript + Vite interface.
  - Reads directly from Soroban RPC.
  - Writes through Freighter-signed transactions.
  - Shows Stellar Expert links after transaction submission.
- `docs/archive/`: Preserved historical planning, review, and future-work material.

## Key Commands

### Smart Contracts

- Build: `cd contracts && cargo build --target wasm32v1-none --release`
- Test: `cd contracts && cargo test`
- Format/lint: `cd contracts && cargo fmt && cargo clippy --all-targets -- -D warnings`

### Frontend

- Install: `cd frontend && npm install`
- Development: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

Off-chain service commands are not required for MVP setup, tests, or demo.

## Development Guidelines

- Keep smart contract edits scoped and compatible with shared types.
- Use checked integer arithmetic and fixed-point helpers; no floating point math in contracts.
- Keep events for debugging and Stellar Explorer visibility.
- Frontend balances, debt, Health Factor, and liquidation state must come from Soroban RPC/on-chain state for MVP.
- Do not add off-chain service dependencies to the MVP demo path.

## References

- `README.md`: Current MVP scope and commands.
- `docs/02-system-architecture.md`: Current architecture.
- `docs/archive/`: Historical planning and review material.
