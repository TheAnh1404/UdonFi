# 08 - Code Review Checklist

This checklist must be used by code reviewers when evaluating Pull Requests. Reviewers must confirm compliance in all sections before approving changes to be merged into `main`.

---

## 1. Architectural Compliance
- [ ] Decoupling: Verify that the modular smart contract boundaries (router, oracle, risk, interest, and liquidation) remain intact.
- [ ] Common Crate Integration: Confirm that contracts utilize shared data structures and error codes from `udonfi-common`.
- [ ] Storage Layers: Verify that no direct raw storage reads/writes bypass defined schemas in the Common crate.
- [ ] Database Access: Ensure the backend API does not perform database write operations; verify it only has access to read-only queries.

## 2. Financial Correctness & Fixed-Point Math
- [ ] Ray/Wad Precision: Confirm that all interest rates are scaled in `Ray` ($10^{27}$) and token balances in `Wad` ($10^{18}$).
- [ ] Compounding Calculations: Check that interest is accumulated on every transaction and calculated using the correct block intervals.
- [ ] Rounding Rules:
  - [ ] Debt increases must round **UP** (to protect pool solvency).
  - [ ] Supply increases must round **DOWN** (to prevent overclaims of yield).
- [ ] Caps Enforcement: Verify that deposits respect the `supplyCap` and borrows respect the `borrowCap`.

## 3. Invariant Preservation
- [ ] Check if the changes affect any of the 40 protocol invariants listed in [09-testing-checklist.md](file:///d:/TheAnhProject/UdonFi/docs/project-management/09-testing-checklist.md).
- [ ] Confirm that corresponding unit, integration, or property tests exist to validate that these invariants are maintained across all states.

## 4. Security & Safety Gates
- [ ] Checked Math: Verify that no raw operators (`+`, `-`, `*`, `/`) are applied to balances. Only checked methods or safe math helpers should be present.
- [ ] Reentrancy Protection: Check that state updates occur BEFORE token transfers (following the Checks-Effects-Interactions pattern).
- [ ] Access Control: Ensure admin, pause, and guardian parameters are restricted to correct addresses using explicit contract authorization checks.
- [ ] Input Sanitization: Validate that user parameters (deposit amounts, borrow amounts, user address shapes) are verified.
- [ ] Web Security (Backend/Frontend): Confirm that API parameters are sanitized to prevent injection attacks and CORS configurations are strictly restricted.

## 5. Performance & Resource Budgets
- [ ] CPU limits: Ensure CPU instructions are optimized (budget: < 40M instructions for deposits/borrows, < 100M for liquidation execute blocks).
- [ ] Contract Size: Confirm the optimized Wasm binary size remains under 100 KB.
- [ ] DB Query Optimization: Review indexer queries; verify that PostgreSQL uses indices for quick lookups on user position scans.

## 6. Testing & Documentation Quality
- [ ] Test Coverage: Ensure smart contract code modifications maintain $\ge 90\%$ unit test coverage.
- [ ] Fuzz & Property Testing: Verify that new parameters or math updates are verified through `proptest` suites.
- [ ] Code Documentation: Check that complex math curves or bit-packing operations have detailed inline documentation.
- [ ] PR Description: Verify that the PR description matches the standard template and lists the tasks solved.
