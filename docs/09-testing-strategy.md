# 09 - Testing Strategy

UdonFi V2 implements a multi-tiered validation framework to ensure mathematical correctness, system solvency, and CPU instruction budget compliance.

```text
+-------------------------------------------------------------+
|                     E2E System Tests                        |
|   - Cypress/Playwright Client Simulators                    |
+-------------------------------------------------------------+
                              |
+-----------------------------v-------------------------------+
|                     Integration Tests                       |
|   - Cross-contract flows (lending_pool + price_oracle)     |
+-------------------------------------------------------------+
                              |
+-----------------------------v-------------------------------+
|                Property-Based & Fuzzing                     |
|   - Proptest engine validates math invariant curves         |
+-------------------------------------------------------------+
                              |
+-----------------------------v-------------------------------+
|                     Unit Tests (Rust)                       |
|   - Test isolated modules (reserve, interest rate curves)   |
+-------------------------------------------------------------+
```

---

## 1. Test Categorization

### A. Unit Tests (Isolated Logic)
- **Target**: Mathematical algorithms, bitmap calculations, interest rate curves, and storage serialization.
- **Tools**: Rust standard test runner (`#[cfg(test)]`).
- **Invariant Examples**:
  - Compounding interest calculations must be monotonic (never decrease over time).
  - Bitwise packing must correctly write and parse configurations without modifying neighboring bits.

### B. Integration Tests (Cross-Contract Logic)
- **Target**: Contract interactions under simulated ledger environments.
- **Tools**: Soroban SDK testing framework (`soroban-sdk::Env`).
- **Scenarios**:
  - Supplying assets, borrowing USDC, accumulating interest, and executing repayment sequences.
  - Verifying that price oracle changes immediately adjust the borrower's health factor calculations.

### C. Property-Based Testing
- **Target**: Solvency and mathematical invariant validation under randomized sequences.
- **Tools**: `proptest` crate in Rust.
- **Core Invariants**:
  - For any sequence of deposits and borrows, the protocol's total debt must never exceed the maximum allowed LTV limit.
  - **Index Monotonicity**: Global `borrowIndex` and `supplyIndex` values must never decrease: `index(t) >= index(t-1)` for all `t > 0`.
  - **Rounding Invariant**: Rounding directions must always favor protocol solvency:
    - Division of new borrows by `borrowIndex` must round up.
    - Division of new deposits by `supplyIndex` must round down.
  - **Compounding Equivalence**: Actual borrower debt compounded via index scaling must match or exceed step-by-step block-by-block compounding interest calculations, with a tolerance bound of $\le 1$ Wad unit.
  - **Bitmap Isolation**: Writing to a user configuration bitmap must not modify state configurations of neighboring bits.

### D. Fuzz Testing
- **Target**: Edge-case detection and input validation.
- **Tools**: `cargo-fuzz` (libFuzzer).
- **Core Focus**:
  - Sending malformed transaction arguments, negative numbers, and overflow values to the smart contract methods.

### E. Load & Instruction Limit Testing
- **Target**: CPU instruction usage and storage growth overhead.
- **Tools**: Soroban transaction simulator.
- **Rules**:
  - The `prepare_liquidation` transaction must not exceed 70 million CPU instructions.
  - The `execute_liquidation` transaction must not exceed 40 million CPU instructions.

### F. End-to-End (E2E) Testing
- **Target**: Client interaction, wallet signing, indexer database writes, and API responses.
- **Tools**: Playwright and local Docker networks.
- **Setup**: Sets up a local Stellar network, builds and deploys contracts, starts the indexer, and simulates user transactions.

---

## 2. Test Execution Commands

Developers must run the following test commands:

```bash
# Run all contract unit and integration tests
cd contracts
cargo test

# Run property tests for the interest rate engine
cargo test --package udonfi-interest-engine --test property_tests

# Run cargo fuzzing harness
cargo +nightly fuzz run fuzz_target_lending_pool

# Run indexer service tests
cd indexer_bot
npm test
```
