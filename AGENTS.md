# Repository Guidelines

## Project Structure & Module Organization

UdonFi is a monorepo for a Stellar Soroban lending protocol. The current MVP is contract-first: React Frontend, Freighter Wallet, Soroban RPC, UdonFi Soroban Smart Contracts, Stellar Testnet, and Stellar Expert transaction links. Smart contracts live in `contracts/` as a Rust workspace: shared primitives are in `contracts/shared/` and `contracts/common/`; protocol crates include `lending_pool`, `reserve`, `price_oracle`, `liquidation`, `a_token`, and `debt_token`. The React client is in `frontend/`, with components in `frontend/src/components/` and assets in `frontend/src/assets/` plus `frontend/public/`. Backend/indexer/bot work is Post-MVP / Future Work and must not be required for the MVP demo. Specs, ADRs, and process docs are in `docs/`; diagrams are in `diagrams/`; tests docs are under `tests/`.

## Build, Test, and Development Commands

- `cd contracts && cargo build --target wasm32v1-none --release`: build optimized Soroban WASM.
- `cd contracts && cargo test`: run contract unit and integration tests.
- `cd contracts && cargo fmt && cargo clippy --all-targets -- -D warnings`: format and lint Rust.
- `cd frontend && npm install && npm run dev`: install dependencies and start Vite.
- `cd frontend && npm run build && npm run lint`: type-check/build and lint React code.
- Backend/indexer/bot commands are Post-MVP only and are not required for MVP setup or demo.

The root `package.json` has no scripts; run commands inside subprojects.

## Coding Style & Naming Conventions

Rust modules, files, functions, and variables use `snake_case`; types and traits use `PascalCase`; constants use `SCREAMING_SNAKE_CASE`. Contract arithmetic must use checked integer math or shared fixed-point helpers; avoid `unsafe`, floats, and generic panics.

Frontend code uses TypeScript React functional components. Component files use `PascalCase.tsx`; variables and functions use `camelCase`; CSS classes use `kebab-case`. Follow `frontend/eslint.config.js` and `frontend/src/index.css`.

## Testing Guidelines

Place Rust tests next to contract code or in crate-level `tests/` directories. Name tests by behavior, for example `test_supply_and_withdraw`. Keep snapshots under each crate's `test_snapshots/`. For UI changes, run lint/build and add Playwright or Cypress coverage for wallet, Soroban RPC, Stellar Expert links, or full-flow changes.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commits such as `feat:`, `fix:`, `docs:`, `chore:`, and `test:`; prefer scoped messages like `feat(contracts): add reserve cap validation`. Use `feature/`, `bugfix/`, or `hotfix/` branches, and target `develop` unless maintainers specify otherwise.

Pull requests should include a description, linked issue or task ID, verification steps, invariant/security notes for protocol changes, and screenshots for UI changes. Update `docs/` and ADRs with architectural changes.

## Security & Configuration Tips

Use `.env.example` for local configuration and never commit secrets, private keys, or production credentials. Treat contract, liquidation, oracle, wallet, and Post-MVP indexer/backend changes as security-sensitive: document assumptions and source-of-truth handling.
