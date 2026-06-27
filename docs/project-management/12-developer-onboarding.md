# 12 - Developer Onboarding Guide

Welcome to the UdonFi V2 engineering team! This guide will help you set up your local development environment, run the testing suites, and understand the workflow guidelines in your first day.

---

## 1. Repository Layout & Architecture Overview

The project is structured as a monorepo containing:
- `/contracts/`: Core smart contracts (Rust & Soroban SDK).
- `/indexer_bot/`: Node.js daemon that indexes events into PostgreSQL.
- `/backend/`: Fastify/Express Node.js REST and WebSocket API server.
- `/frontend/`: React + Vite client dashboard.
- `/docs/`: Specifications, architecture schemas, and project management guidelines.

Before writing code, please review:
1. [02-system-architecture.md](file:///d:/TheAnhProject/UdonFi/docs/02-system-architecture.md) (C4 models).
2. [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md) (contract storage and entrypoints).
3. [15-protocol-invariants.md](file:///d:/TheAnhProject/UdonFi/docs/15-protocol-invariants.md) (core safety rules).

---

## 2. Local Environment Setup

Ensure you have the following installed on your machine:
- **Rust**: Version 1.78+ (via rustup).
- **Node.js**: Version 18+ (LTS).
- **Docker & Docker-Compose**: For spinning up databases locally.
- **Soroban CLI**: Version 20+ (for contract compilation and sandbox testing).

### Step A: Spin Up Local Databases
Start PostgreSQL and Redis containers using docker-compose:
```bash
docker-compose up -d
```
*Verify*: Run `docker ps` to ensure ports `5432` and `6379` are bound.

### Step B: Compile Smart Contracts
Compile Rust contracts to optimized WASM binaries:
```bash
cd contracts
cargo build --target wasm32v1-none --release
```
*Verify*: Check that `.wasm` files exist in `target/wasm32v1-none/release/`.

### Step C: Install Off-chain Dependencies
Install package dependencies for the indexer, backend API, and frontend client:
```bash
# Install Indexer dependencies
cd ../indexer_bot && npm install

# Install Backend API dependencies
cd ../backend && npm install

# Install Frontend Client dependencies
cd ../frontend && npm install
```

---

## 3. Running Tests & Linters

### Rust Contracts
Run unit and integration tests:
```bash
cd contracts
cargo test
```
Run Clippy linter to verify code safety:
```bash
cargo clippy --all-targets --all-features -- -D warnings
```

### Backend API
Run backend checks:
```bash
cd backend
npm run lint
npm run test
```

### Frontend Client
Run frontend checks:
```bash
cd frontend
npm run lint
npm run test
```

---

## 4. Local Execution Workflow

To run UdonFi V2 in your local sandbox:

1. **Deploy Contracts**: Run the deploy script to initialize the Soroban local node, deploy WASM files, and update local contract configurations:
   ```bash
   cd scripts
   node deploy_contracts.js
   ```
2. **Start the Indexer**: The indexer starts polling blocks from the local node and syncs events to PostgreSQL:
   ```bash
   cd indexer_bot
   npm start
   ```
3. **Start the Backend API**: Launches the REST and WebSocket dashboard server:
   ```bash
   cd backend
   npm run dev
   ```
4. **Start the Frontend Client**: Launches the React client dashboard on `http://localhost:5173`:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 5. Development Workflow Guidelines

- **Branch Naming**: Match branches to Task IDs: `feature/SUP-001-core-supply` or `fix/INT-002-rounding`.
- **Commit Messages**: Follow Conventional Commits: `feat(contracts): add supply cap validation`.
- **Definition of Done (DoD)**: Review [05-definition-of-done.md](file:///d:/TheAnhProject/UdonFi/docs/project-management/05-definition-of-done.md) before opening a PR.
- **Definition of Ready (DoR)**: Review [06-definition-of-ready.md](file:///d:/TheAnhProject/UdonFi/docs/project-management/06-definition-of-ready.md) before picking a task from the backlog.
