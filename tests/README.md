# UdonFi V2 Testing Suite Spec

This directory contains the testing configurations, fuzzing harnesses, property tests, and load testing scripts for the UdonFi V2 protocol.

## 1. Multi-Tier Testing Framework

```text
  +-----------------------------------------------------------+
  |                   E2E System Tests                        |
  |   - Cypress/Playwright integration with local Docker node |
  +-----------------------------------------------------------+
                               |
  +----------------------------v------------------------------+
  |                   Integration Tests                       |
  |   - Cross-contract interactions (Lending Pool + Oracle)  |
  +-----------------------------------------------------------+
                               |
  +----------------------------v------------------------------+
  |                Property-Based & Fuzzing                   |
  |   - Invariant testing for interest curves & math engines  |
  +-----------------------------------------------------------+
                               |
  +----------------------------v------------------------------+
  |                     Unit Tests (Rust)                     |
  |   - Isolated tests for common math and bitmap packing     |
  +-----------------------------------------------------------+
```

---

## 2. Test Architectures

### A. Unit & Integration Testing (Rust / Cargo)
- **Files**: Located inside the `src/` or `tests/` directories of each Rust contract.
- **Scope**: Implements mock environments, compiles contract instances, and verifies contract state transitions.

### B. Property-Based Testing (`proptest`)
- **Location**: `contracts/interest_rate_engine/tests/property_tests.rs`.
- **Invariants**:
  - Compounding interest calculations must be monotonic.
  - Utilization rates must remain between 0% and 100%.

### C. Fuzz Testing (`cargo-fuzz`)
- **Location**: `contracts/fuzz/`.
- **Target**: Sends random inputs to transaction handlers to verify that the protocol fails gracefully without panic states.

### D. Security Testing (Scribble / Static Analysis)
- **Scope**: Runs automated static analysis tools to verify code safety and checks for reentrancy issues.

### E. Load & Instruction Limit Testing
- **Location**: `tests/load/`.
- **Scope**: Simulates high-frequency transactions to measure CPU instruction consumption and memory growth on the ledger.
- **Constraint**: Transaction execution must remain below 70 million instructions (well below the 100M limit).

### F. End-to-End (E2E) UI Testing (Playwright)
- **Location**: `tests/e2e/`.
- **Scope**: Spins up a local Stellar network using Docker, deploys the contract suite, launches the indexer bot, and verifies client flows using headless browser instances.
