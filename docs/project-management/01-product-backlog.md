# 01 - Product Backlog: Epic Breakdown

This document breaks down the UdonFi V2 protocol into 17 implementation Epics.

---

## EPIC-00: Foundation
- **Purpose**: Initialize repository layout, Cargo workspaces, PostgreSQL docker structures, lint configs, and CI/CD pipelines.
- **Dependencies**: None.
- **Deliverables**: Cargo.toml workspace root, Docker-compose file (Postgres, Redis), GitHub Action workflows.
- **Complexity**: 8 Story Points (SP)
- **Referenced Documents**: [README.md](file:///d:/TheAnhProject/UdonFi/README.md), [02-system-architecture.md](file:///d:/TheAnhProject/UdonFi/docs/02-system-architecture.md).
- **Acceptance Criteria**: Cargo workspace builds cleanly, docker-compose starts db/cache containers, and CI pipeline checks lint/format.
- **Definition of Done**: Enforced in [05-definition-of-done.md](file:///d:/TheAnhProject/UdonFi/docs/project-management/05-definition-of-done.md).

---

## EPIC-01: Core Ledger
- **Purpose**: Code the shared libraries and structures (`udonfi-common`) including bitmap packing layout and standard error/event definitions.
- **Dependencies**: EPIC-00.
- **Deliverables**: `udonfi-common` crate containing `UserConfigMap`, `ReserveConfiguration`, and `Error` enums.
- **Complexity**: 13 SP
- **Referenced Documents**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
- **Acceptance Criteria**: Unit tests verify bit-packing operations and config extraction.

---

## EPIC-02: Supply Engine
- **Purpose**: Implement the deposit entry point (`supply`) in the `lending_pool` contract, transferring assets and minting yield shares (aTokens).
- **Dependencies**: EPIC-01.
- **Deliverables**: `lending_pool` supply function, custom `a_token` contract.
- **Complexity**: 13 SP
- **Referenced Documents**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md), [13-financial-specification.md](file:///d:/TheAnhProject/UdonFi/docs/13-financial-specification.md).
- **Acceptance Criteria**: Deposits increase user supply balance, check and respect `supplyCap` parameters, and emit `Supply` events.

---

## EPIC-03: Withdraw Engine
- **Purpose**: Implement the redemption entry point (`withdraw`) in the `lending_pool` contract, burning yield shares and transferring underlying assets back to the user.
- **Dependencies**: EPIC-02, EPIC-07.
- **Deliverables**: `lending_pool` withdraw function.
- **Complexity**: 13 SP
- **Referenced Documents**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md), [13-financial-specification.md](file:///d:/TheAnhProject/UdonFi/docs/13-financial-specification.md).
- **Acceptance Criteria**: Redeems underlying asset, reverts if withdrawal drops user $HF < 1.0$, and burns `aTokens`.

---

## EPIC-04: Interest Engine
- **Purpose**: Implement the global compounding interest index math in the `interest_rate_engine` contract, updating rates based on pool utilization.
- **Dependencies**: EPIC-01.
- **Deliverables**: `interest_rate_engine` contract.
- **Complexity**: 21 SP
- **Referenced Documents**: [14-mathematical-specification.md](file:///d:/TheAnhProject/UdonFi/docs/14-mathematical-specification.md), [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
- **Acceptance Criteria**: Computes APY using Ray/Wad fixed-point math, updates `borrowIndex` and `supplyIndex` on every block, and rounds debt up / supply down.

---

## EPIC-05: Borrow Engine
- **Purpose**: Implement the borrow entry point (`borrow`) in the `lending_pool` contract, minting debt tokens (`debtTokens`) and transferring underlying tokens to the borrower.
- **Dependencies**: EPIC-02, EPIC-04, EPIC-07.
- **Deliverables**: `lending_pool` borrow function, custom `debt_token` contract.
- **Complexity**: 21 SP
- **Referenced Documents**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md), [13-financial-specification.md](file:///d:/TheAnhProject/UdonFi/docs/13-financial-specification.md).
- **Acceptance Criteria**: Verifies borrow capacity, checks and respects `borrowCap` parameters, updates scaled debt balances, and reverts if borrow drops $HF < 1.0$.

---

## EPIC-06: Repay Engine
- **Purpose**: Implement the repayment entry point (`repay`) in the `lending_pool` contract, burning debt tokens and transferring underlying tokens from the borrower.
- **Dependencies**: EPIC-05.
- **Deliverables**: `lending_pool` repay function.
- **Complexity**: 13 SP
- **Referenced Documents**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md), [13-financial-specification.md](file:///d:/TheAnhProject/UdonFi/docs/13-financial-specification.md).
- **Acceptance Criteria**: Burns `debtTokens` and reduces user debt, transferring underlying tokens back to the pool.

---

## EPIC-07: Risk Engine
- **Purpose**: Implement the vault safety checker contract (`risk_engine`) that evaluates user position solvency and Health Factors.
- **Dependencies**: EPIC-01, EPIC-09.
- **Deliverables**: `risk_engine` contract.
- **Complexity**: 21 SP
- **Referenced Documents**: [14-mathematical-specification.md](file:///d:/TheAnhProject/UdonFi/docs/14-mathematical-specification.md), [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
- **Acceptance Criteria**: Computes total collateral and borrow valuations, calculates portfolio Health Factor ($HF$), and determines borrow capacity.

---

## EPIC-08: Liquidation Engine
- **Purpose**: Implement the 2-step liquidation manager (`liquidation_coordinator`) to execute prep/exec flows within CPU instruction limits.
- **Dependencies**: EPIC-05, EPIC-07.
- **Deliverables**: `liquidation_coordinator` contract.
- **Complexity**: 34 SP
- **Referenced Documents**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md), [14-mathematical-specification.md](file:///d:/TheAnhProject/UdonFi/docs/14-mathematical-specification.md).
- **Acceptance Criteria**: `prepare_liquidation` verifies $HF < 1.0$ and locks target collateral; `execute_liquidation` repays debt, transfers collateral + bonus to liquidator, and runs within CPU limits.

---

## EPIC-09: Oracle Engine
- **Purpose**: Implement the decentralized pricing aggregator contract (`price_oracle`) combining Pyth, Band, and fallback sources.
- **Dependencies**: EPIC-01.
- **Deliverables**: `price_oracle` contract.
- **Complexity**: 21 SP
- **Referenced Documents**: [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md), [08-security-model.md](file:///d:/TheAnhProject/UdonFi/docs/08-security-model.md).
- **Acceptance Criteria**: Aggregates prices from multiple sources, validates price deviation (<2%), checks staleness thresholds, and falls back to TWAP.

---

## EPIC-10: Governance
- **Purpose**: Implement proposal submission, voting power locks, timelock coordinates, and contract upgrades.
- **Dependencies**: EPIC-01.
- **Deliverables**: `governance` and `timelock` contracts.
- **Complexity**: 21 SP
- **Referenced Documents**: [11-governance.md](file:///d:/TheAnhProject/UdonFi/docs/11-governance.md).
- **Acceptance Criteria**: Proposal increases caps or upgrades contracts with a 48-hour timelock delay. Veto and voting delay parameters are enforced.

---

## EPIC-11: Treasury
- **Purpose**: Implement fee collection mechanisms and stability backstops.
- **Dependencies**: EPIC-01.
- **Deliverables**: `treasury` contract.
- **Complexity**: 8 SP
- **Referenced Documents**: [13-financial-specification.md](file:///d:/TheAnhProject/UdonFi/docs/13-financial-specification.md).
- **Acceptance Criteria**: Accumulates reserve factor fees, supports governance withdrawals, and provides insurance coverage for bad debt.

---

## EPIC-12: Event Indexer
- **Purpose**: Implement the sequential polling daemon that decodes XDR events and syncs ledger records to PostgreSQL.
- **Dependencies**: EPIC-00, EPIC-01.
- **Deliverables**: Node.js Indexer service.
- **Complexity**: 21 SP
- **Referenced Documents**: [indexer/README.md](file:///d:/TheAnhProject/UdonFi/indexer/README.md), [07-database-design.md](file:///d:/TheAnhProject/UdonFi/docs/07-database-design.md).
- **Acceptance Criteria**: Decodes events sequentially, enforces write-only DB locks, tracks sync block sequence, and prevents duplicate entries.

---

## EPIC-13: Backend API
- **Purpose**: Implement REST endpoints and real-time Socket.io channels.
- **Dependencies**: EPIC-12.
- **Deliverables**: Node.js/TypeScript Express/Fastify server.
- **Complexity**: 13 SP
- **Referenced Documents**: [06-api-spec.md](file:///d:/TheAnhProject/UdonFi/docs/06-api-spec.md), [backend/README.md](file:///d:/TheAnhProject/UdonFi/backend/README.md).
- **Acceptance Criteria**: Returns metrics, markets, user positions, and sync lag metadata in responses. Enforces read-only DB connection pools.

---

## EPIC-14: Frontend
- **Purpose**: Build the client dashboard with Freighter wallet integration, dynamic SVG charts, and LED config matrices.
- **Dependencies**: EPIC-13.
- **Deliverables**: Vite React Client App.
- **Complexity**: 21 SP
- **Referenced Documents**: [frontend/README.md](file:///d:/TheAnhProject/UdonFi/frontend/README.md).
- **Acceptance Criteria**: Renders UI with Cyberpunk/Glassmorphism theme, integrates wallet, displays real-time WS updates, and blocks risky actions on lag > 10.

---

## EPIC-15: Testing
- **Purpose**: Implement unit, integration, property (`proptest`), fuzzing, and Playwright E2E tests.
- **Dependencies**: EPIC-02 to EPIC-14.
- **Deliverables**: Rust test suites, fuzz targets, Playwright scripts, CI testing actions.
- **Complexity**: 34 SP
- **Referenced Documents**: [09-testing-strategy.md](file:///d:/TheAnhProject/UdonFi/docs/09-testing-strategy.md).
- **Acceptance Criteria**: Validates all 40 invariants in tests, verifies gas limits, and runs property checks over 100,000 runs.

---

## EPIC-16: Deployment
- **Purpose**: Set up deployment automation scripts and mainnet launch procedures.
- **Dependencies**: EPIC-15.
- **Deliverables**: Deployment and initialization scripts, monitoring dashboard, release checklist.
- **Complexity**: 13 SP
- **Referenced Documents**: [10-deployment-plan.md](file:///d:/TheAnhProject/UdonFi/docs/10-deployment-plan.md), [scripts/README.md](file:///d:/TheAnhProject/UdonFi/scripts/README.md).
- **Acceptance Criteria**: Builds and deploys contracts, initializes parameters, and configures oracle addresses.
