# 03 - Sprint Plan

This document outlines the 11 two-week sprints designed to implement the UdonFi V2 protocol from foundation to final production-ready deployment. 

Each sprint includes a clear objective, the tasks allocated (referencing [02-epic-breakdown.md](file:///d:/TheAnhProject/UdonFi/docs/project-management/02-epic-breakdown.md)), key deliverables, exit criteria, testing required, and architectural validation gates.

---

## Sprint 1: Foundation & Core Ledger
- **Duration**: 2 Weeks
- **Objectives**: Initialize project repository, Cargo workspace, and setup local environments alongside the core packed configuration data structures.
- **Tasks**:
  - `FND-001`: Initialize Cargo Workspace Structure
  - `FND-002`: Setup PostgreSQL and Redis Docker Containers
  - `FND-003`: Configure GitHub Actions CI Pipeline
  - `CORE-001`: Implement Config Map Bit-Packing Structures
  - `CORE-002`: Implement ReserveConfiguration Storage Schema
  - `CORE-003`: Define Custom Contract Error Enums
- **Expected Deliverables**:
  - Compiling workspace root in [Cargo.toml](file:///d:/TheAnhProject/UdonFi/contracts/Cargo.toml).
  - Configured [docker-compose.yml](file:///d:/TheAnhProject/UdonFi/docker-compose.yml).
  - CI pipeline configuration [ci.yml](file:///d:/TheAnhProject/UdonFi/.github/workflows/ci.yml).
  - Compiled and tested `udonfi-common` Rust structures.
- **Exit Criteria**:
  - CI pipeline runs successfully on workspace push.
  - Unit tests for bit-packing structures show 100% test coverage.
- **Testing Required**:
  - Bit-mask correctness checks (asserting flags turn on and off correctly).
  - Database container availability verification.
- **Architecture Validation**:
  - Verify that the packed `u128` data structure matches the design bounds specified in [20-gas-storage-optimization.md](file:///d:/TheAnhProject/UdonFi/docs/20-gas-storage-optimization.md).

---

## Sprint 2: Pricing Oracle & Risk Framework
- **Duration**: 2 Weeks
- **Objectives**: Implement the oracle aggregator layer and establish basic portfolio risk and health factor metrics.
- **Tasks**:
  - `ORC-001`: Implement Oracle Aggregator
  - `RSK-001`: Implement Portfolio Health Factor Calculator
  - `RSK-002`: Implement Position Safety Validator
- **Expected Deliverables**:
  - Price oracle aggregator contract in `contracts/price_oracle`.
  - Portfolio risk check functions in `contracts/risk_engine`.
- **Exit Criteria**:
  - Aggregator parses oracle feeds and handles deviation/staleness.
  - Health factor computations handle edge cases (e.g., division by zero, zero collateral, zero debt).
- **Testing Required**:
  - Unit tests simulating stale feed timestamps (>3600s) and large deviation jumps (>2%).
  - Health Factor assertions under randomized price variables.
- **Architecture Validation**:
  - Validate against oracle safety requirements in [ADR-0008-oracle-failure-handling.md](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0008-oracle-failure-handling.md).

---

## Sprint 3: Supply & Withdraw Engines
- **Duration**: 2 Weeks
- **Objectives**: Implement the supply (deposit) and withdrawal flows, deploying the interest-bearing `aToken` shares contract.
- **Tasks**:
  - `SUP-001`: Implement Core Supply Method
  - `SUP-002`: Deploy Custom aToken Crate
  - `WTH-001`: Implement Withdraw Method
- **Expected Deliverables**:
  - Supply and withdraw endpoints in `contracts/lending_pool`.
  - Yield-bearing share token contract in `contracts/a_token`.
- **Exit Criteria**:
  - Users can supply underlying assets, receiving corresponding `aTokens`.
  - Withdrawals burn `aTokens` and return underlying tokens only if post-transaction Health Factor $\ge 1.0$.
- **Testing Required**:
  - Check `supplyCap` parameter checks on deposit.
  - Rejection checks for withdrawals that would cause a user position to drop below $HF = 1.0$.
- **Architecture Validation**:
  - Ensure compatibility with custom token standards defined in [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).

---

## Sprint 4: Interest Rate Engine
- **Duration**: 2 Weeks
- **Objectives**: Develop the fixed-point Ray math for compounding rates based on utilization curves.
- **Tasks**:
  - `INT-001`: Implement APY Kink Curve Math
  - `INT-002`: Implement Global Compounding Accruals
- **Expected Deliverables**:
  - Dynamic rate engine contract in `contracts/interest_rate_engine`.
- **Exit Criteria**:
  - Compounding updates work sequentially.
  - Rounding rules are enforced: debt rounds up, supply rounds down.
- **Testing Required**:
  - Numerical simulation matching values from [14-mathematical-specification.md](file:///d:/TheAnhProject/UdonFi/docs/14-mathematical-specification.md).
  - Property-based testing of indexes monotonicity over simulated block increments.
- **Architecture Validation**:
  - Verify that index updates align with design constraints in [ADR-0009-interest-index-accounting-model.md](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0009-interest-index-accounting-model.md).

---

## Sprint 5: Borrow & Repay Engines
- **Duration**: 2 Weeks
- **Objectives**: Build borrow entry points, deploy the debt-tracking token contract, and implement loan repayment flows.
- **Tasks**:
  - `BOR-001`: Implement Core Borrow Method
  - `BOR-002`: Deploy Custom debtToken Crate
  - `RPY-001`: Implement Repay Method
- **Expected Deliverables**:
  - Borrow and repay endpoints in `contracts/lending_pool`.
  - Debt share token contract in `contracts/debt_token`.
- **Exit Criteria**:
  - Borrowing mints `debtTokens` and transfers underlying tokens, rejecting requests exceeding borrow capacity.
  - Repaying burns `debtTokens` and reduces user debt, resetting borrow flags when outstanding debt drops to zero.
- **Testing Required**:
  - Assert `borrowCap` limits on-chain.
  - Validate debt share balance scaling using the `borrowIndex`.
- **Architecture Validation**:
  - Verify state synchronization requirements specified in [16-state-machine-specification.md](file:///d:/TheAnhProject/UdonFi/docs/16-state-machine-specification.md).

---

## Sprint 6: Liquidation Step 1 & Treasury Management
- **Duration**: 2 Weeks
- **Objectives**: Create the session locking prepare phase for liquidations and build the treasury collection.
- **Tasks**:
  - `LIQ-001`: Implement Prepare Liquidation Step
  - `TR-001`: Set Up Treasury Fund Manager
- **Expected Deliverables**:
  - Prepare liquidation interface in `contracts/liquidation`.
  - Treasury collection functions in `contracts/treasury`.
- **Exit Criteria**:
  - `prepare_liquidation` verifies insolvency ($HF < 1.0$) and locks user collateral.
  - Treasury correctly receives reserve factor fee allocations.
- **Testing Required**:
  - Lock duration verification (asserting lock expires after 60 seconds).
  - Treasury allocation math check under simulated pool fees.
- **Architecture Validation**:
  - Verify the 2-step liquidation bypass fits CPU budget constraints in [21-performance-budget.md](file:///d:/TheAnhProject/UdonFi/docs/21-performance-budget.md).

---

## Sprint 7: Liquidation Step 2 & Governance Coordinator
- **Duration**: 2 Weeks
- **Objectives**: Complete the liquidation execution phase and write proposals and upgrade workflows.
- **Tasks**:
  - `LIQ-002`: Implement Execute Liquidation Step
  - `GOV-001`: Implement Proposal Lifecycle Manager
  - `GOV-002`: Setup Contract Upgrade Coordinator
- **Expected Deliverables**:
  - Execute liquidation logic in `contracts/liquidation`.
  - Proposal creation, voting, and contract upgrade interfaces in `contracts/governance`.
- **Exit Criteria**:
  - `execute_liquidation` transfers assets and releases locks.
  - Upgrades require 48-hour timelock execution without admin bypass.
- **Testing Required**:
  - Integration testing of the prepare-to-execute transition.
  - Timelock enforcement testing (asserting proposal execution fails before delay).
- **Architecture Validation**:
  - Review governance actions against [ADR-0010-governance-timelock-policy.md](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0010-governance-timelock-policy.md).

---

## Sprint 8: Event Indexer
- **Duration**: 2 Weeks
- **Objectives**: Build the Node.js event polling and database sync service.
- **Tasks**:
  - `IDX-001`: Setup Node.js Event Scraper
  - `IDX-002`: Implement XDR Event Decoder
  - `IDX-003`: Setup Relational Sync Pipeline
- **Expected Deliverables**:
  - Run loop scraper daemon in `indexer/src`.
  - Database pipeline scripts in `indexer/src/db_sync.js`.
- **Exit Criteria**:
  - Scraper runs continuously, decodes events, and writes them to PostgreSQL without duplicates.
- **Testing Required**:
  - Idempotency tests (processing the same raw XDR log twice).
  - Database transactional rollbacks on scraper interrupt.
- **Architecture Validation**:
  - Verify indexer uses single-writer lock principles to prevent relational race conditions.

---

## Sprint 9: Backend API
- **Duration**: 2 Weeks
- **Objectives**: Create REST endpoints and live WebSocket layers, integrating sync lag middleware.
- **Tasks**:
  - `API-001`: Setup REST API Controllers
  - `API-002`: Implement Sync Lag Middleware
- **Expected Deliverables**:
  - REST controllers in `backend/src/controllers`.
  - Lag checking middleware in `backend/src/middleware/sync_check.js`.
- **Exit Criteria**:
  - REST endpoints serve user positions and include metadata.
  - API restricts write simulations when block lag > 10 blocks.
- **Testing Required**:
  - Load testing of REST endpoints.
  - Middleware logic checking under artificial DB height lag.
- **Architecture Validation**:
  - Verify API restricts connection pools to read-only databases.

---

## Sprint 10: Frontend Client Dashboard
- **Duration**: 2 Weeks
- **Objectives**: Build the premium UI dashboard integrating freighter wallet controls and SVG dashboards.
- **Tasks**:
  - `FE-001`: Integrate Freighter Wallet Actions
  - `FE-002`: Code APY Curve SVG Graph
  - `FE-003`: Code LED Config Matrix Grid
- **Expected Deliverables**:
  - React application setup in `frontend/src`.
  - Charting components and Freighter wallet integration hooks.
- **Exit Criteria**:
  - UI connects, signs transactions, and updates graphs based on backend websocket updates.
- **Testing Required**:
  - Mock wallet transaction signing checks.
  - Component rendering verification under different viewport sizes.
- **Architecture Validation**:
  - Verify visual assets follow the Glassmorphism CSS architecture in `frontend/src/index.css`.

---

## Sprint 11: Testing & Release Integration
- **Duration**: 2 Weeks
- **Objectives**: Run complete invariant test suites, property validation loops, and finalize deployment code.
- **Tasks**:
  - `TST-001`: Implement Contract Integration Tests
  - `TST-002`: Setup property-Based Invariant Tests
  - `DEP-001`: Build Contract Deployer Automation
  - `DEP-002`: Build Reserve Config Initializer
- **Expected Deliverables**:
  - Integration and property test folders in `contracts/tests`.
  - Deployer scripts in `scripts/`.
- **Exit Criteria**:
  - All 40 invariants successfully assert inside tests.
  - Deployment script deploys and configures contracts on local sandbox nodes.
- **Testing Required**:
  - Running 10,000 fuzz rounds for state transition checks.
  - E2E script runs.
- **Architecture Validation**:
  - Validate deployed code sizes and execution gas costs against performance budget.
