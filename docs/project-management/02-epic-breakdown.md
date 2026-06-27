# 02 - Epic Breakdown: Engineering Tasks Backlog

This document details the engineering tasks decomposed from the UdonFi V2 Epics.

---

## EPIC-00: Foundation Tasks (FND-001 to FND-010)

### FND-001: Initialize Cargo Workspace Structure
- **Description**: Configure the main Cargo.toml in the contracts root to manage modular smart contract workspaces.
- **Dependencies**: None.
- **Referenced Documentation**: [contracts/README.md](file:///d:/TheAnhProject/UdonFi/contracts/README.md).
- **Expected Files**: `contracts/Cargo.toml`.
- **Expected Tests**: Compile all workspaces with `cargo build`.
- **Acceptance Criteria**: Cargo builds all sub-crates without errors.
- **Definition of Done**: Clean compilation, linter/format check pass.
- **Estimated Effort**: 2 story points (SP).
- **Priority**: High.

### FND-002: Setup PostgreSQL and Redis Docker Containers
- **Description**: Create docker-compose profiles for local PostgreSQL and Redis servers.
- **Dependencies**: FND-001.
- **Referenced Documentation**: [07-database-design.md](file:///d:/TheAnhProject/UdonFi/docs/07-database-design.md).
- **Expected Files**: `docker-compose.yml`.
- **Expected Tests**: Container start up checks.
- **Acceptance Criteria**: Containers start and are accessible via ports 5432 and 6379.
- **Definition of Done**: Containers run locally and store data persistently.
- **Estimated Effort**: 3 SP.
- **Priority**: High.

### FND-003: Configure GitHub Actions CI Pipeline
- **Description**: Setup workflows to run Rust lints, cargo formats, and Node.js code checks on pull requests.
- **Expected Files**: `.github/workflows/ci.yml`.
- **Expected Tests**: Pipeline triggers on pull request commit.
- **Acceptance Criteria**: Rejects pull requests with lint or format errors.
- **Definition of Done**: Automated checks pass on pull requests.
- **Estimated Effort**: 3 SP.
- **Priority**: Medium.

---

## EPIC-01: Core Ledger Tasks (CORE-001 to CORE-015)

### CORE-001: Implement Config Map Bit-Packing Structures
- **Description**: Write `UserConfigMap` struct in `udonfi-common` using `u128` packing.
- **Dependencies**: FND-001.
- **Referenced Documentation**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
- **Expected Files**: `contracts/common/src/user_config.rs`.
- **Expected Tests**: Unit tests checking bit-packing operations.
- **Acceptance Criteria**: Correctly sets and gets collateral/borrow flags.
- **Definition of Done**: Test coverage >90%, no unsafe code.
- **Estimated Effort**: 5 SP.
- **Priority**: High.

### CORE-002: Implement ReserveConfiguration Storage Schema
- **Description**: Write the `ReserveConfiguration` struct to store LTV, thresholds, caps, and index parameters.
- **Dependencies**: CORE-001.
- **Referenced Documentation**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
- **Expected Files**: `contracts/common/src/reserve_config.rs`.
- **Expected Tests**: Struct serialization tests.
- **Acceptance Criteria**: Struct holds all specified variables and compiles.
- **Definition of Done**: Passes linter checks, fully documented.
- **Estimated Effort**: 5 SP.
- **Priority**: High.

### CORE-003: Define Custom Contract Error Enums
- **Description**: Write the custom Soroban errors enum (e.g. `CapViolation`, `StalePrice`).
- **Dependencies**: CORE-001.
- **Referenced Documentation**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
- **Expected Files**: `contracts/common/src/errors.rs`.
- **Expected Tests**: Compilation checks.
- **Acceptance Criteria**: Includes all errors defined in the smart contract spec.
- **Definition of Done**: Enum is decorated with `#[contracterror]`.
- **Estimated Effort**: 2 SP.
- **Priority**: High.

---

## EPIC-02: Supply Engine Tasks (SUP-001 to SUP-015)

### SUP-001: Implement Core Supply Method
- **Description**: Write the `supply()` method in the `lending_pool` contract.
- **Dependencies**: CORE-002.
- **Referenced Documentation**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
- **Expected Files**: `contracts/lending_pool/src/supply.rs`.
- **Expected Tests**: Supply validation tests.
- **Acceptance Criteria**: Checks pause status, verifies `supplyCap`, updates indexes, and transfers tokens.
- **Definition of Done**: Transaction is fully tested and respects caps.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

### SUP-002: Deploy Custom aToken Crate
- **Description**: Implement the yield-bearing `a_token` contract that mints shares on deposit.
- **Dependencies**: SUP-001.
- **Referenced Documentation**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
- **Expected Files**: `contracts/a_token/src/lib.rs`.
- **Expected Tests**: Token mint and burn unit tests.
- **Acceptance Criteria**: Minting scales shares based on the supply index.
- **Definition of Done**: Compiles to WASM, passes unit tests.
- **Estimated Effort**: 5 SP.
- **Priority**: High.

---

## EPIC-03: Withdraw Engine Tasks (WTH-001 to WTH-015)

### WTH-001: Implement Withdraw Method
- **Description**: Write the `withdraw()` method in the `lending_pool` contract.
- **Dependencies**: SUP-001, RSK-001.
- **Referenced Documentation**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
- **Expected Files**: `contracts/lending_pool/src/withdraw.rs`.
- **Expected Tests**: Withdrawal validation and Health Factor check tests.
- **Acceptance Criteria**: Burns aTokens, transfers underlying tokens, and reverts if $HF < 1.0$.
- **Definition of Done**: Health factor checks prevent withdrawals that cause insolvency.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

---

## EPIC-04: Interest Engine Tasks (INT-001 to INT-020)

### INT-001: Implement APY Kink Curve Math
- **Description**: Code the dynamic borrow rate calculation based on utilization rates andoptimal kink parameters.
- **Dependencies**: CORE-001.
- **Referenced Documentation**: [14-mathematical-specification.md](file:///d:/TheAnhProject/UdonFi/docs/14-mathematical-specification.md).
- **Expected Files**: `contracts/interest_rate_engine/src/rate_curve.rs`.
- **Expected Tests**: APY math values validation tests.
- **Acceptance Criteria**: Correctly calculates APY rates based on utilization.
- **Definition of Done**: Rates match mathematical specification parameters.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

### INT-002: Implement Global Compounding Accruals
- **Description**: Implement interest index updates (`borrowIndex` and `supplyIndex`) using Ray fixed-point scaling.
- **Dependencies**: INT-001.
- **Referenced Documentation**: [14-mathematical-specification.md](file:///d:/TheAnhProject/UdonFi/docs/14-mathematical-specification.md).
- **Expected Files**: `contracts/interest_rate_engine/src/accrual.rs`.
- **Expected Tests**: Index monotonicity tests.
- **Acceptance Criteria**: Accumulates interest on every transaction, updating indexes based on block delta.
- **Definition of Done**: Enforces rounding rules (debt up, supply down).
- **Estimated Effort**: 13 SP.
- **Priority**: High.

---

## EPIC-05: Borrow Engine Tasks (BOR-001 to BOR-015)

### BOR-001: Implement Core Borrow Method
- **Description**: Write the `borrow()` method in the `lending_pool` contract.
- **Dependencies**: SUP-001, INT-002, RSK-001.
- **Referenced Documentation**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
- **Expected Files**: `contracts/lending_pool/src/borrow.rs`.
- **Expected Tests**: Borrow capacity and cap verification tests.
- **Acceptance Criteria**: Checks `borrowCap`, validates post-borrow $HF \ge 1.0$, and transfers tokens.
- **Definition of Done**: Transaction is fully tested and respects caps.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

### BOR-002: Deploy Custom debtToken Crate
- **Description**: Implement the debt-tracking `debt_token` contract.
- **Dependencies**: BOR-001.
- **Expected Files**: `contracts/debt_token/src/lib.rs`.
- **Expected Tests**: Debt mint and burn unit tests.
- **Acceptance Criteria**: Minting scales shares based on the borrow index.
- **Definition of Done**: Compiles to WASM, passes unit tests.
- **Estimated Effort**: 5 SP.
- **Priority**: High.

---

## EPIC-06: Repay Engine Tasks (RPY-001 to RPY-015)

### RPY-001: Implement Repay Method
- **Description**: Write the `repay()` method in the `lending_pool` contract.
- **Dependencies**: BOR-001.
- **Referenced Documentation**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
- **Expected Files**: `contracts/lending_pool/src/repay.rs`.
- **Expected Tests**: Debt repayment validation tests.
- **Acceptance Criteria**: Burns debt shares and transfers underlying tokens back to the pool.
- **Definition of Done**: User debt is reduced, and the borrow configuration flag is cleared if debt = 0.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

---

## EPIC-07: Risk Engine Tasks (RSK-001 to RSK-020)

### RSK-001: Implement Portfolio Health Factor Calculator
- **Description**: Code the Health Factor ($HF$) calculation function based on collateral and debt values.
- **Dependencies**: CORE-002, ORC-001.
- **Referenced Documentation**: [14-mathematical-specification.md](file:///d:/TheAnhProject/UdonFi/docs/14-mathematical-specification.md).
- **Expected Files**: `contracts/risk_engine/src/health_factor.rs`.
- **Expected Tests**: Health factor calculations under randomized prices and balances.
- **Acceptance Criteria**: Correctly calculates health factor according to mathematical specifications.
- **Definition of Done**: Calculations handle divisions by 0 safely, return Ray values.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

### RSK-002: Implement Position Safety Validator
- **Description**: Code the stateless validation check to verify if a withdrawal or borrow would cause insolvency.
- **Dependencies**: RSK-001.
- **Referenced Documentation**: [14-mathematical-specification.md](file:///d:/TheAnhProject/UdonFi/docs/14-mathematical-specification.md).
- **Expected Files**: `contracts/risk_engine/src/validation.rs`.
- **Expected Tests**: Safety check validation tests.
- **Acceptance Criteria**: Returns `false` if transaction would cause Health Factor to drop below 1.0.
- **Definition of Done**: Validation function is stateless and optimized.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

---

## EPIC-08: Liquidation Engine Tasks (LIQ-001 to LIQ-020)

### LIQ-001: Implement Prepare Liquidation Step
- **Description**: Write `prepare_liquidation` in the coordinator contract to lock collateral and generate session IDs.
- **Dependencies**: RSK-002.
- **Referenced Documentation**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
- **Expected Files**: `contracts/liquidation/src/prepare.rs`.
- **Expected Tests**: Session lock timing tests.
- **Acceptance Criteria**: Verifies $HF < 1.0$, locks borrower collateral, and creates session ID.
- **Definition of Done**: Locks are stored in temporary storage with 60-second expiration.
- **Estimated Effort**: 13 SP.
- **Priority**: High.

### LIQ-002: Implement Execute Liquidation Step
- **Description**: Write `execute_liquidation` in the coordinator contract to transfer tokens and apply liquidator bonuses.
- **Dependencies**: LIQ-001.
- **Referenced Documentation**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
- **Expected Files**: `contracts/liquidation/src/execute.rs`.
- **Expected Tests**: Collateral seizure and bonus math validation tests.
- **Acceptance Criteria**: Repays borrower debt, transfers collateral + bonus to liquidator, and releases the session lock.
- **Definition of Done**: Enforces close factor checks and updates user balance maps.
- **Estimated Effort**: 13 SP.
- **Priority**: High.

---

## EPIC-09: Oracle Engine Tasks (ORC-001 to ORC-015)

### ORC-001: Implement Oracle Aggregator
- **Description**: Code the aggregator interface that queries Pyth and Band feeds.
- **Dependencies**: CORE-001.
- **Referenced Documentation**: [08-security-model.md](file:///d:/TheAnhProject/UdonFi/docs/08-security-model.md).
- **Expected Files**: `contracts/price_oracle/src/aggregator.rs`.
- **Expected Tests**: Outage and deviation simulation tests.
- **Acceptance Criteria**: Verifies deviation < 2%, checks staleness thresholds, and falls back to TWAP.
- **Definition of Done**: Reverts on stale prices and deviation violations.
- **Estimated Effort**: 13 SP.
- **Priority**: High.

---

## EPIC-10: Governance Tasks (GOV-001 to GOV-015)

### GOV-001: Implement Proposal Lifecycle Manager
- **Description**: Code proposal creation, voting delays, quorum checks, and execution.
- **Dependencies**: CORE-001.
- **Referenced Documentation**: [11-governance.md](file:///d:/TheAnhProject/UdonFi/docs/11-governance.md).
- **Expected Files**: `contracts/governance/src/proposal.rs`.
- **Expected Tests**: Voting and quorum logic verification tests.
- **Acceptance Criteria**: Enforces proposal thresholds and voting delay rules.
- **Definition of Done**: Proposal execution is gated behind standard timelocks.
- **Estimated Effort**: 13 SP.
- **Priority**: High.

### GOV-002: Setup Contract Upgrade Coordinator
- **Description**: Code the upgrade functions for WASM codes updates.
- **Dependencies**: GOV-001.
- **Referenced Documentation**: [ADR-0006-upgradeability-and-migration-strategy.md](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0006-upgradeability-and-migration-strategy.md).
- **Expected Files**: `contracts/governance/src/upgrade.rs`.
- **Expected Tests**: Upgrade validation checks.
- **Acceptance Criteria**: Gated behind standard timelocks; no admin bypass.
- **Definition of Done**: Enforces schema validation during initialization.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

---

## EPIC-11: Treasury Tasks (TR-001 to TR-010)

### TR-001: Set Up Treasury Fund Manager
- **Description**: Code fee allocation and stability fund distributions.
- **Dependencies**: CORE-001.
- **Referenced Documentation**: [13-financial-specification.md](file:///d:/TheAnhProject/UdonFi/docs/13-financial-specification.md).
- **Expected Files**: `contracts/treasury/src/lib.rs`.
- **Expected Tests**: Allocation math validation tests.
- **Acceptance Criteria**: Handles fee distribution and bad debt coverage transfers.
- **Definition of Done**: Treasury allocations require governance execution.
- **Estimated Effort**: 8 SP.
- **Priority**: Medium.

---

## EPIC-12: Event Indexer Tasks (IDX-001 to IDX-020)

### IDX-001: Setup Node.js Event Scraper
- **Description**: Build the polling daemon that queries Stellar RPC nodes.
- **Dependencies**: FND-002.
- **Referenced Documentation**: [indexer/README.md](file:///d:/TheAnhProject/UdonFi/indexer/README.md).
- **Expected Files**: `indexer/src/scraper.js`.
- **Expected Tests**: Scraper connection and sync height checks.
- **Acceptance Criteria**: Polls blocks sequentially, checks sync sequences, and handles connection disconnects.
- **Definition of Done**: Restarts sequentially from the last block height.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

### IDX-002: Implement XDR Event Decoder
- **Description**: Code base64 XDR log parsing logic.
- **Dependencies**: IDX-001.
- **Referenced Documentation**: [indexer/README.md](file:///d:/TheAnhProject/UdonFi/indexer/README.md).
- **Expected Files**: `indexer/src/decoder.js`.
- **Expected Tests**: Decodes mock XDR payloads.
- **Acceptance Criteria**: Extracts event arguments and returns clean JSON mapping variables.
- **Definition of Done**: Handles malformed events without crashing.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

### IDX-003: Setup Relational Sync Pipeline
- **Description**: Code database operations to sync accounts, positions, and history.
- **Dependencies**: IDX-002.
- **Referenced Documentation**: [07-database-design.md](file:///d:/TheAnhProject/UdonFi/docs/07-database-design.md).
- **Expected Files**: `indexer/src/db_sync.js`.
- **Expected Tests**: SQL database transactions integrity checks.
- **Acceptance Criteria**: Employs unique composite primary keys and `ON CONFLICT DO NOTHING` statements to guarantee idempotency.
- **Definition of Done**: Enforces single-writer PostgreSQL policies.
- **Estimated Effort**: 13 SP.
- **Priority**: High.

---

## EPIC-13: Backend API Tasks (API-001 to API-015)

### API-001: Setup REST API Controllers
- **Description**: Create REST routes for metrics, markets, and account positions.
- **Dependencies**: FND-002.
- **Referenced Documentation**: [06-api-spec.md](file:///d:/TheAnhProject/UdonFi/docs/06-api-spec.md).
- **Expected Files**: `backend/src/controllers/`.
- **Expected Tests**: Endpoint validation tests.
- **Acceptance Criteria**: Responses include sync lag metadata.
- **Definition of Done**: Connects to db using read-only connection pools.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

### API-002: Implement Sync Lag Middleware
- **Description**: Write the middleware to check sync lag and apply degraded-mode restrictions.
- **Dependencies**: API-001.
- **Referenced Documentation**: [backend/README.md](file:///d:/TheAnhProject/UdonFi/backend/README.md).
- **Expected Files**: `backend/src/middleware/sync_check.js`.
- **Expected Tests**: Lag delta validation checks.
- **Acceptance Criteria**: Sets `isStale: true` when lag > 3 blocks.
- **Definition of Done**: Rejects write simulations when lag > 10 blocks.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

---

## EPIC-14: Frontend Tasks (FE-001 to FE-020)

### FE-001: Integrate Freighter Wallet Actions
- **Description**: Implement connecting wallet, address querying, and transaction signing.
- **Dependencies**: FND-001.
- **Referenced Documentation**: [frontend/README.md](file:///d:/TheAnhProject/UdonFi/frontend/README.md).
- **Expected Files**: `frontend/src/hooks/useWallet.ts`.
- **Expected Tests**: Mock signature validation checks.
- **Acceptance Criteria**: Signs transactions and handles network configuration checks.
- **Definition of Done**: Integrates with freighter-api.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

### FE-002: Code APY Curve SVG Graph
- **Description**: Build the interactive SVG chart plotting rates against pool utilization.
- **Dependencies**: FND-001.
- **Referenced Documentation**: [frontend/README.md](file:///d:/TheAnhProject/UdonFi/frontend/README.md).
- **Expected Files**: `frontend/src/components/SorobanKinked.tsx`.
- **Expected Tests**: Renders curve coordinates correctly.
- **Acceptance Criteria**: Visualizes utilization dot in real-time.
- **Definition of Done**: Uses Cyberpunk theme variables.
- **Estimated Effort**: 8 SP.
- **Priority**: Medium.

### FE-003: Code LED Config Matrix Grid
- **Description**: Build the 128-bit grid representing user account config flags.
- **Dependencies**: FND-001.
- **Referenced Documentation**: [frontend/README.md](file:///d:/TheAnhProject/UdonFi/frontend/README.md).
- **Expected Files**: `frontend/src/components/SorobanBitmap.tsx`.
- **Expected Tests**: Renders 128-bit array grid.
- **Acceptance Criteria**: Hover displays state configuration changes.
- **Definition of Done**: Operates under standard CSS variable scopes.
- **Estimated Effort**: 8 SP.
- **Priority**: Medium.

---

## EPIC-15: Testing Tasks (TST-001 to TST-025)

### TST-001: Implement Contract Integration Tests
- **Description**: Build cross-contract testing scripts covering supply, borrow, interest accrual, and repayment.
- **Dependencies**: SUP-001, BOR-001, INT-002.
- **Referenced Documentation**: [09-testing-strategy.md](file:///d:/TheAnhProject/UdonFi/docs/09-testing-strategy.md).
- **Expected Files**: `contracts/tests/integration/`.
- **Expected Tests**: Full integration validation test runs.
- **Acceptance Criteria**: Asserts invariants after each state update.
- **Definition of Done**: Integrates with Soroban SDK Env.
- **Estimated Effort**: 13 SP.
- **Priority**: High.

### TST-002: Setup property-Based Invariant Tests
- **Description**: Code property checks using the `proptest` crate.
- **Dependencies**: INT-002, TST-001.
- **Referenced Documentation**: [09-testing-strategy.md](file:///d:/TheAnhProject/UdonFi/docs/09-testing-strategy.md).
- **Expected Files**: `contracts/tests/property/`.
- **Expected Tests**: Invariant property verification runs.
- **Acceptance Criteria**: Runs 10,000 checks validating index monotonicity and rounding.
- **Definition of Done**: Integrates with GitHub CI pipelines.
- **Estimated Effort**: 13 SP.
- **Priority**: High.

---

## EPIC-16: Deployment Tasks (DEP-001 to DEP-015)

### DEP-001: Build Contract Deployer Automation
- **Description**: Code JavaScript scripts to build Wasm and deploy instances.
- **Dependencies**: FND-001.
- **Referenced Documentation**: [10-deployment-plan.md](file:///d:/TheAnhProject/UdonFi/docs/10-deployment-plan.md).
- **Expected Files**: `scripts/deploy_contracts.js`.
- **Expected Tests**: Deploy checks on local node.
- **Acceptance Criteria**: Returns Contract IDs for pool, risk, and price aggregator contracts.
- **Definition of Done**: Pulls config keys securely from `.env` setups.
- **Estimated Effort**: 8 SP.
- **Priority**: High.

### DEP-002: Build Reserve Config Initializer
- **Description**: Code scripts to configure reserve LTVs, thresholds, and caps.
- **Dependencies**: DEP-001.
- **Referenced Documentation**: [10-deployment-plan.md](file:///d:/TheAnhProject/UdonFi/docs/10-deployment-plan.md).
- **Expected Files**: `scripts/initialize_reserves.js`.
- **Expected Tests**: Configuration settings check.
- **Acceptance Criteria**: Correctly updates reserve status mappings on-chain.
- **Definition of Done**: Configuration updates match deployment checklist.
- **Estimated Effort**: 5 SP.
- **Priority**: High.
