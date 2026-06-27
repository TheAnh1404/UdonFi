# UdonFi V2 Smart Contracts (Soroban Cargo Workspace)

This directory contains the source code for the modular smart contracts of the UdonFi V2 protocol, built using the Stellar Soroban smart contract framework.

## 1. Directory Structure

The contracts are structured as a Rust Cargo Workspace:

```text
contracts/
├── Cargo.toml
├── shared/                     # Reusable primitives, errors, configs, & math helpers
├── common/                     # Shared structures & bit-packing helpers (prototype)
├── lending_pool/               # Core routing, supply/withdraw logic
├── risk_engine/                # Vault solvency calculations
├── interest_rate_engine/       # Dynamic APY algorithms
├── liquidation/                # 2-step liquidation manager
├── price_oracle/               # Oracle Aggregator contract
├── reserve/                    # Asset registry configurations
├── governance/                 # Proposal voting & contract upgrades
│
└── target/                     # Compiled WASM build output
```

---

## 2. Module Responsibilities

- **`shared`**: The foundational package. Defines constants, contract error codes, event topics, newtype primitive wrappers, storage layouts, math/rounding libraries, and ledger validators. **All other contracts must depend on this package.**
- **`lending_pool`**: The core router contract. Handles user deposit and borrow interactions, tracks reserve pools, and mints/burns yield tokens.
- **`risk_engine`**: Evaluates position solvency stateless by retrieving price data and comparing it against reserve collateral limits.
- **`interest_rate_engine`**: Calculates the variable Borrow APY and Supply APY percentages based on utilization limits.
- **`liquidation`**: Coordinates the 2-step liquidation flow, preventing CPU instruction limit overflows by splitting transaction execution.
- **`price_oracle`**: A decentralized oracle aggregator that validates feed values from Pyth, Band, and fallback interfaces.
- **`reserve`**: A configuration registry storing maximum LTV limits, liquidation thresholds, and asset decimals.
- **`governance`**: Implements proposals, voting locks, voting tallies, and timelocked code upgrades.
- **`common`**: Legacy shared types and helpers.

---

## 3. Dependency & Architecture Rules for `shared`

To prevent circular dependencies and maintain clean contract boundaries, the `shared` module operates under strict constraints:

### A. Architectural Principles
- **Lending-Logic Free**: No actual business operations (such as depositing, borrowing, or liquidations) may be implemented inside `shared`. It must only contain the supporting mathematical, validation, and storage primitives.
- **Single Source of Truth**: All protocol-wide constants, errors, and storage structures are defined in `shared` to prevent duplicate structures.

### B. Allowed Imports
- Soroban SDK (`soroban-sdk`).
- Standard Rust core library features compatible with `#![no_std]`.

### C. Forbidden Imports
- **DO NOT** import any other workspace package (e.g., `lending_pool`, `reserve`, `price_oracle`) into the `shared` crate. This enforces a strict one-way dependency chain:
  `Contracts` $\rightarrow$ `shared`.

---

## 4. Local Development & Compilation

### Prerequisites
- Install [Rust](https://www.rust-lang.org/tools/install) and add the WebAssembly compilation target:
  ```bash
  rustup target add wasm32v1-none
  ```
- Install [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli).

### Build Contracts
Compile all smart contracts to optimized WebAssembly (WASM) binaries:
```bash
cargo build --target wasm32v1-none --release
```

### Run Tests
Execute the unit and integration tests:
```bash
cargo test
```
