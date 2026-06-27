# 05 - Definition of Done (DoD)

This document establishes the official Definition of Done (DoD) for all engineering tasks in the UdonFi V2 project. No task or Pull Request may be closed or merged into main branches unless it fulfills all applicable criteria listed below.

---

## 1. Core Code Completion
- All functions, variables, and modules defined in the corresponding task are fully implemented.
- Unused code, debug print statements, console logs, and temporary comments are removed.
- Error handling is complete; no unhandled raw panic triggers or unmapped general errors are used.

## 2. Testing Coverage & Validation
- **Unit Tests**:
  - Rust Smart Contracts: Code coverage must be $\ge 90\%$.
  - Node.js Indexer / Backend API: Unit tests exist for all utility libraries.
  - Frontend: React components undergo snapshot and state-transition tests.
- **Integration Tests**:
  - Smart contracts must pass a full deposit-borrow-repay-withdraw lifecycle integration test.
- **Invariant Tests**:
  - Any task modifying the core accounting, rate calculation, or risk validation code must execute property-based test suites ([09-testing-checklist.md](file:///d:/TheAnhProject/UdonFi/docs/project-management/09-testing-checklist.md)) to assert that all 40 protocol invariants remain unbroken.
  
## 3. Lints & Formatting
- **Rust Contracts**:
  - `cargo fmt --all -- --check` must pass.
  - `cargo clippy --all-targets --all-features -- -D warnings` must compile with zero warnings or errors.
- **TypeScript / JavaScript (Backend & Frontend)**:
  - `npm run lint` (ESLint) must pass with zero errors.
  - `npm run format:check` (Prettier) must pass.

## 4. Documentation Updates
- Inline comments describe complex mathematical operations, fixed-point math conversions, and bit-packing operations.
- External documentation (including API specifications, smart contract specs, and overview documents) is updated if parameters or routes change.
- New public APIs are fully documented using Rustdoc (`///`) or OpenAPI specs.

## 5. Security & Invariant Review
- **Smart Contracts Security Checks**:
  - Verify that no `unsafe` Rust block is used.
  - Confirm integer overflow/underflow protections are active (using Soroban's native types or checked arithmetic).
  - Verify that access control parameters (such as `admin` checks, `pause` flags, and `guardian` roles) are properly placed and tested.
  - Confirm there are no reentrancy vulnerabilities.
- **Database & Backend API Security Checks**:
  - Ensure SQL injection is prevented by using parameterized queries or ORM models.
  - Verify that database connection pools enforce read-only credentials for the API backend and single-writer write-locks for the Event Indexer.

## 6. Performance & Gas Budget Compliance
- Smart contract Wasm files must compile within the size limits specified in [20-gas-storage-optimization.md](file:///d:/TheAnhProject/UdonFi/docs/20-gas-storage-optimization.md) (max 100 KB).
- Transaction execution resource costs (CPU instructions and RAM) must remain within the performance budget defined in [21-performance-budget.md](file:///d:/TheAnhProject/UdonFi/docs/21-performance-budget.md) (max 40,000,000 CPU instructions for core actions, 100,000,000 CPU instructions max for 2-step liquidations).

## 7. Architecture Integrity
- The implementation must adhere strictly to the modular architectural design outlined in [02-system-architecture.md](file:///d:/TheAnhProject/UdonFi/docs/02-system-architecture.md) and C4 models.
- Any deviation from established architectural patterns requires a formal Architecture Decision Record (ADR) review and sign-off from the Lead Software Architect.

## 8. Code Review & Approval Gate
- The Pull Request must receive approval from at least two senior engineers, including:
  - At least one Smart Contract Auditor/Security Engineer for Rust changes.
  - At least one Backend/Frontend Lead for dashboard and indexer changes.
- All code review comments must be addressed, resolved, and verified.
