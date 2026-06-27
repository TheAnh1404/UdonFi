# 07 - Coding Guidelines

This document outlines the coding standards, repository organization, naming conventions, branching models, and architectural constraints for the UdonFi V2 codebase. All developers and AI coding agents must follow these guidelines strictly.

---

## 1. Folder Structure Rules

The repository is structured as a monorepo:

- `/contracts/`: Rust smart contracts utilizing the Soroban SDK.
  - `contracts/common/`: Shared structs, math library, bit-packing, and error definitions.
  - `contracts/lending_pool/`: Core Router containing supply, borrow, withdraw, and repay entrypoints.
  - `contracts/risk_engine/`: Portfolio Health Factor and solvency validation logic.
  - `contracts/price_oracle/`: Oracle pricing aggregator.
  - `contracts/interest_rate_engine/`: APY calculation curves.
  - `contracts/liquidation/`: 2-step liquidation coordinator.
- `/indexer_bot/`: Node.js/TypeScript event scanning daemon.
- `/backend/`: Express/Fastify TypeScript API server.
- `/frontend/`: React + TypeScript client dashboard.
- `/scripts/`: JS deployment, testing, and initialization scripts.

---

## 2. Naming Conventions

### Rust (Contracts)
- **Files & Modules**: `snake_case` (e.g., `user_config.rs`).
- **Structs, Enums, & Traits**: `PascalCase` (e.g., `ReserveConfiguration`).
- **Functions, Variables, & Fields**: `snake_case` (e.g., `accrue_interest`).
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `SECONDS_PER_YEAR`).

### TypeScript / JavaScript (API & Frontend)
- **Files**: `camelCase` or `kebab-case`. Component files must use `PascalCase` (e.g., `SorobanBitmap.tsx`).
- **Functions & Variables**: `camelCase` (e.g., `fetchUserPosition`).
- **Interfaces & Types**: `PascalCase` prefixed or suffixed logically (e.g., `UserPositionPayload`).
- **CSS Classes**: `kebab-case` (e.g., `neon-glow-card`).

---

## 3. Rust Smart Contract Conventions

- **Arithmetic**: Use checked arithmetic methods (`checked_add`, `checked_mul`, etc.) or safe wrapper math structures to prevent overflows and underflows. Never use raw `+`, `-`, or `*` operators on token balances.
- **Fixed-Point Math**: Maintain fixed-point precision utilizing the `Ray` ($10^{27}$) and `Wad` ($10^{18}$) scaling systems as specified in the mathematical specifications.
- **No Unsafe**: The use of `unsafe` blocks is strictly forbidden.
- **Wasm Budgeting**: Ensure contracts remain lightweight. Keep compilation sizes under 100 KB and CPU execution bounds under 40M instructions for standard interactions.
- **TTL Extension**: Storage writes must trigger Soroban ledger entry TTL extensions.

---

## 4. TypeScript & React Conventions

- **Strict Types**: Set `"strict": true` in `tsconfig.json`. Do not use `any`. Use explicit type signatures for all parameters.
- **React Components**: Use functional components with TypeScript interfaces. Hooks (`useState`, `useEffect`, custom hooks) must manage state lifecycle.
- **Aesthetics & Styling**: CSS variables in `frontend/src/index.css` define theme tokens (Cyberpunk dark, neon accents, glassmorphic blurs). Never use ad-hoc inline styles. Use scoped CSS or tailwind-style equivalents that follow the theme variables.

---

## 5. API & Database Conventions

- **REST JSON Payloads**: Responses must match the API Specification, returning a `meta` block:
  ```json
  {
    "data": { ... },
    "meta": {
      "processedLedger": 482012,
      "isStale": false
    }
  }
  ```
- **Sync Lag Gate**: The backend must mark `isStale: true` if the difference between the current ledger height and the database height exceeds 3 blocks.
- **Single-Writer Database Integrity**: Only the `indexer_bot` is allowed to execute write (INSERT/UPDATE/DELETE) queries to the PostgreSQL database. The API backend must connect using read-only database credentials.

---

## 6. Git Workflow & Conventions

### Branch Naming
Create branches off `main` using the following patterns:
- Features: `feature/task-id-short-description` (e.g., `feature/SUP-001-core-supply`)
- Bug Fixes: `fix/task-id-short-description` (e.g., `fix/INT-002-rounding-adjust`)
- Docs: `docs/short-description`

### Commit Message Convention
Follow the Conventional Commits specification:
- `feat(contracts): add supply cap validation to lending pool`
- `fix(indexer): resolve database duplicate write on duplicate events`
- `docs(project-management): add coding guidelines`
- `test(contracts): add fuzz tests for interest curves`

### Pull Request (PR) Template
Every Pull Request must fill out the following structure:
```markdown
## Description
Provide a summary of the changes and the problem solved.

## Linked Task ID
Fixes # (Task ID, e.g., BOR-001)

## Invariant Verification
List which protocol invariants were tested and verified (e.g., INV-ACC-002).

## Verification Steps
1. How to run tests.
2. Output of tests.

## Screenshots/Recordings (if applicable)
For UI changes.
```

---

## 7. Forbidden Practices (CRITICAL)

> [!CAUTION]
> - **DO NOT** use floating-point types (`f32`, `f64`) in smart contracts. All financial calculations must use fixed-point integers.
> - **DO NOT** allow the backend API to directly write to PostgreSQL tables.
> - **DO NOT** bypass the timelock mechanism for governance modifications (minimum 24-hour gating).
> - **DO NOT** deploy unoptimized smart contract WASM bundles. Run `cargo build --target wasm32v1-none --release` and utilize optimization passes before budgeting size.
