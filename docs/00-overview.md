# 00 - Overview: UdonFi V2 Protocol

UdonFi V2 is a decentralized, collateralized lending protocol engineered specifically for the Stellar Soroban smart contract framework. By leveraging capital efficiency and storage/execution optimizations, UdonFi V2 enables users to supply assets to earn yield, borrow against supplied collateral, and engage in protocol liquidation and governance workflows.

## 1. High-Level Vision & Objectives

DeFi lending protocols built on traditional EVM chains often face significant hurdles concerning network transaction latency and high transaction gas costs. The Stellar network, with its low fees and sub-second consensus model, presents an ideal environment for consumer-grade financial primitives. However, Soroban’s WebAssembly (WASM) virtual machine imposes unique resource-bound restrictions:
- Storage fees calculated per byte stored on the ledger.
- Strict limits on CPU execution instructions (100 million instructions per transaction).
- Ledger entry eviction via block-based Time-To-Live (TTL) decays.

UdonFi V2 acts as a blueprint for high-throughput lending on Stellar, utilizing optimized storage layouts (u128 state bitmaps) and decoupled operations (2-step liquidations) to maximize throughput while minimizing operational overhead.

---

## 2. Core Value Proposition

- **Optimized Capital Efficiency**: Users borrow liquid capital against their long-term digital asset positions without triggering taxable events or asset liquidations.
- **Minimal Ledger Footprint**: Minimizes user storage fees up to 95% compared to dynamic map-based storage engines by packing vault configuration flags into single bitfields.
- **VM Execution Safety**: Prevents transaction failures caused by instruction limit overflows via split execution processes.
- **Decentralized Risk Engine**: Real-time interest rate compounding and health evaluation engines protect depositors and keep the system solvent.

---

## 3. User Roles and Actors

Within the UdonFi V2 ecosystem, actors interact via specific user roles:

```text
  +------------+             +------------+             +------------+
  | Depositors |             | Borrowers  |             | Liquidators|
  +-----+------+             +-----+------+             +-----+------+
        |                          |                          |
        v                          v                          v
  Earn interest by           Borrow liquidity           Execute 2-step
  supplying assets           against collateral         repayments on bad
  to liquidity pools.        reserves.                  vault debt.
```

### A. Depositors (Suppliers)
- **Actions**: Supply supported Stellar assets (e.g., XLM, USDC) to lending pools.
- **Yield**: Receive interest-bearing tokens (aTokens) representing their share of the pool. Yield accumulates dynamically via the interest rate curve.

### B. Borrowers
- **Actions**: Select supplied assets to enable as collateral, check borrowing capacity, borrow assets, and repay active debt.
- **Constraints**: Borrow capacity is governed by Loan-To-Value (LTV) limits. Position health is tracked continuously via a Health Factor ($HF$).

### C. Liquidators
- **Actions**: Monitor on-chain events and indexer API endpoints for positions with $HF < 1.0$. Execute dual-phase transactions to repay the borrow balance and receive discounted collateral.
- **Incentive**: Earn a fixed liquidation bonus (e.g., 5% to 8%) on executed liquidations.

### D. Governance Guardians / Token Holders
- **Actions**: Stake governance tokens to submit or vote on Protocol Improvement Proposals (PIPs).
- **Control**: Modify pool risk factors, interest rate slope variables, supported collateral assets, and execute protocol contract upgrades.

---

## 4. Documentation Specification Index

All architectural designs and mathematical models for the UdonFi V2 protocol are indexed below:

### Specifications
*   [00-Overview](file:///d:/TheAnhProject/UdonFi/docs/00-overview.md): Executive overview and system objectives.
*   [01-Product Requirements](file:///d:/TheAnhProject/UdonFi/docs/01-product-requirements.md): System capabilities, mathematical definitions, and constraints.
*   [02-System Architecture](file:///d:/TheAnhProject/UdonFi/docs/02-system-architecture.md): Blueprint of the codebase, boundary layouts, and sub-systems.
*   [03-C4 Model](file:///d:/TheAnhProject/UdonFi/docs/03-c4-model.md): Context, Container, Component, and Deployment schemas.
*   [04-Business Flows](file:///d:/TheAnhProject/UdonFi/docs/04-business-flows.md): Step-by-step transaction flow sequence diagrams.
*   [05-Smart Contract Spec](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md): Methods, storage parameters, and state transition validation rules.
*   [06-API Spec](file:///d:/TheAnhProject/UdonFi/docs/06-api-spec.md): REST endpoints and real-time WebSockets specifications.
*   [07-Database Design](file:///d:/TheAnhProject/UdonFi/docs/07-database-design.md): PostgreSQL Schema design, indexes, and ERD.
*   [08-Security Model](file:///d:/TheAnhProject/UdonFi/docs/08-security-model.md): Threat modeling, risk matrix, and circuit-breaker details.
*   [09-Testing Strategy](file:///d:/TheAnhProject/UdonFi/docs/09-testing-strategy.md): Unit, integration, fuzzing, and load testing guidelines.
*   [10-Deployment Plan](file:///d:/TheAnhProject/UdonFi/docs/10-deployment-plan.md): Multi-sig administration, TTL variables, and mainnet checklist.
*   [11-Governance](file:///d:/TheAnhProject/UdonFi/docs/11-governance.md): Proposal lifecycles, voting formulas, and voting locks.
*   [12-Roadmap](file:///d:/TheAnhProject/UdonFi/docs/12-roadmap.md): Milestones, token distribution, and token integration phases.
*   [13-Financial Spec](file:///d:/TheAnhProject/UdonFi/docs/13-financial-specification.md): Double-entry accounting system and transaction balance shifts.
*   [14-Mathematical Spec](file:///d:/TheAnhProject/UdonFi/docs/14-mathematical-specification.md): Fixed-point math constraints, rounding, and numerical examples.
*   [15-Protocol Invariants](file:///d:/TheAnhProject/UdonFi/docs/15-protocol-invariants.md): Detailed 40+ system rules, parameters, and checks.
*   [16-State Machine Spec](file:///d:/TheAnhProject/UdonFi/docs/16-state-machine-specification.md): Mermaid transition flows for contracts, users, and proposals.
*   [17-Failure Mode Analysis](file:///d:/TheAnhProject/UdonFi/docs/17-failure-mode-analysis.md): Catalog of 35+ system failure modes and mitigation strategies.
*   [18-Economic Attack Model](file:///d:/TheAnhProject/UdonFi/docs/18-economic-attack-model.md): Threat modeling of 15 economic attack profiles and test rules.
*   [19-Threat Model](file:///d:/TheAnhProject/UdonFi/docs/19-threat-model.md): Trust boundaries, STRIDE parameters, and incident playbook.
*   [20-Gas & Storage Optimization](file:///d:/TheAnhProject/UdonFi/docs/20-gas-storage-optimization.md): Storage layout bit-packing and CPU limits budgets.
*   [21-Performance Budget](file:///d:/TheAnhProject/UdonFi/docs/21-performance-budget.md): Latency rules and throughput limits for APIs and db pools.

### Architecture Decision Records (ADRs)
*   [ADR-0001: Use Stellar Soroban](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0001-use-stellar-soroban.md): Rationale behind using Soroban WASM virtual machine.
*   [ADR-0002: Event-Driven Architecture](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0002-event-driven-architecture.md): Building on-chain event indexers.
*   [ADR-0003: PostgreSQL instead of Firebase](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0003-postgresql-instead-of-firebase.md): Selecting relational storage for database transactional security.
*   [ADR-0004: Modular Smart Contracts](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0004-modular-smart-contracts.md): Decoupling lending vaults from math engines.
*   [ADR-0005: Oracle Aggregator](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0005-oracle-aggregator.md): Mitigating pricing failures via multi-oracle aggregators.
*   [ADR-0006: Upgradeability & Migration Strategy](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0006-upgradeability-and-migration-strategy.md): Contract update policies and storage schema migrations.
*   [ADR-0007: Emergency Pause & Guardian Model](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0007-emergency-pause-and-guardian-model.md): Temporary pausing and Emergency Guardian roles.
*   [ADR-0008: Oracle Failure Handling](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0008-oracle-failure-handling.md): Fallback paths and deviation check algorithms.
*   [ADR-0009: Interest Index Accounting Model](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0009-interest-index-accounting-model.md): Index-based compounding equations.
*   [ADR-0010: Governance Timelock Policy](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0010-governance-timelock-policy.md): Standard durations and delay parameters.

### Project Management & Planning Backlog
*   [01-Product Backlog](file:///d:/TheAnhProject/UdonFi/docs/project-management/01-product-backlog.md): Overview of epics, requirements, and deliverables.
*   [02-Epic Breakdown](file:///d:/TheAnhProject/UdonFi/docs/project-management/02-epic-breakdown.md): Engineering task backlog with specific task descriptions.
*   [03-Sprint Plan](file:///d:/TheAnhProject/UdonFi/docs/project-management/03-sprint-plan.md): Objectives, deliverables, and validation for 11 sprints.
*   [04-Task Dependency](file:///d:/TheAnhProject/UdonFi/docs/project-management/04-task-dependency.md): Dependency mappings, critical path, and parallel tracks.
*   [05-Definition of Done](file:///d:/TheAnhProject/UdonFi/docs/project-management/05-definition-of-done.md): Standards for complete engineering tasks.
*   [06-Definition of Ready](file:///d:/TheAnhProject/UdonFi/docs/project-management/06-definition-of-ready.md): Standards for task readiness before development.
*   [07-Coding Guidelines](file:///d:/TheAnhProject/UdonFi/docs/project-management/07-coding-guidelines.md): Style rules, folder structures, and git templates.
*   [08-Code Review Checklist](file:///d:/TheAnhProject/UdonFi/docs/project-management/08-code-review-checklist.md): Standards for PR reviews.
*   [09-Testing Checklist](file:///d:/TheAnhProject/UdonFi/docs/project-management/09-testing-checklist.md): Invariants mapped directly to test suites.
*   [10-Release Checklist](file:///d:/TheAnhProject/UdonFi/docs/project-management/10-release-checklist.md): Staging and production release guidelines.
*   [11-Risk Register](file:///d:/TheAnhProject/UdonFi/docs/project-management/11-risk-register.md): Registry of project, financial, and technical risks.
*   [12-Developer Onboarding](file:///d:/TheAnhProject/UdonFi/docs/project-management/12-developer-onboarding.md): Setup procedures for new engineers.
