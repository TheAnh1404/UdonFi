# Contributing to UdonFi V2

Thank you for your interest in contributing to UdonFi V2, a decentralized lending protocol built on Stellar Soroban. We welcome contributions from developers, security researchers, and auditors.

Following these guidelines helps ensure a smooth review process and maintains the engineering quality of the protocol.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development Philosophy

- **Security First**: DeFi protocols handle user capital. All code changes must prioritize security, gas efficiency, and storage optimizations.
- **Documentation First**: Every architectural adjustment must start with an Architecture Decision Record (ADR) and specification updates before writing code.
- **Explicit and Deterministic**: Rust smart contracts on Soroban must use deterministic math, explicit types, and avoid unchecked overflows or divisions.

## Git Branching Strategy

We use a structured branch naming convention:

- `main`: Production-ready release branch. Must remain stable and audited.
- `develop`: Integration branch for new features. All pull requests target this branch.
- Feature branches: `feature/<feature-name>` (e.g., `feature/multi-oracle-feed`).
- Bugfix branches: `bugfix/<issue-description>` (e.g., `bugfix/ttl-eviction-range`).
- Hotfix branches: `hotfix/<patch-description>` (e.g., `hotfix/liquidation-bonus-adjustment`).

## Setup and Verification

To set up the workspace for testing:

1. Clone the repository and install global developer requirements.
2. Initialize Cargo workspace dependencies for smart contracts:
   ```bash
   cd contracts
   cargo build --target wasm32v1-none --release
   cargo test
   ```
3. Initialize the frontend client dependencies:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Verify the database configurations and setup the indexer:
   ```bash
   cd indexer_bot
   npm install
   ```

## Coding Standards

### Rust Smart Contracts
- **Format**: Run `cargo fmt` before committing.
- **Lint**: Run `cargo clippy --all-targets -- -D warnings` to enforce clean compilation.
- **Error Handling**: Use explicit, custom Rust enums decorated with `#[contracterror]` for all contract exceptions. Do not use generic panic statements.
- **Storage Layout**: Enforce bitmap-packed storage (`u128`) for account configurations to optimize storage fees.

### Frontend (TypeScript / React)
- **Formatting**: Run Prettier and ESLint.
- **Types**: Maintain strict TypeScript typing. Avoid `any` under all circumstances.
- **Design system**: Adhere to the glassmorphism and neon design tokens inside `frontend/src/index.css`.

### Indexer (Node.js)
- **Error resilience**: Every transaction decoder must run inside try-catch structures and report failure metrics.
- **Relational Integrity**: Maintain proper database transaction bindings to prevent partial writes.

## Pull Request Process

1. Fork the repository and create your branch from `develop`.
2. Implement your features or bug fixes.
3. Write matching unit and integration tests.
4. Update the relevant documentation inside `docs/` and references.
5. Submit a Pull Request targeting `develop`.
6. Ensure that all automated checks (Rust compile, Rust tests, ESLint, TypeScript compilation) pass.
7. Address reviewer feedback. At least two core maintainer approvals are required for merging.
