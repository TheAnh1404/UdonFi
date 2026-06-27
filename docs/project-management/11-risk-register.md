# 11 - Risk Register

This document lists the technical, financial, security, project, and dependency risks identified for the UdonFi V2 protocol, mapping their probability, impact, owners, mitigation strategies, and status.

---

## Risk Analysis Matrix

| ID | Risk Description | Category | Prob. | Impact | Owner | Mitigation Strategy | Status | Review Date |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **RSK-TEC-001** | Soroban CPU Instruction limit exceeded during liquidation transactions | Technical | High | High | Lead Architect | Use a **2-step liquidation** process (`prepare` and `execute`) to distribute computational weight across multiple blocks. | Monitoring | 2026-07-15 |
| **RSK-TEC-002** | Ledger entry eviction (TTL expiry) causes loss of user position records | Technical | Medium | High | Lead Architect | Enforce auto-renewal of TTL (Time To Live) parameters on every write and state interaction. | Mitigated | 2026-07-15 |
| **RSK-TEC-003** | Upgradability failure during WASM hash updates corrupts contract states | Technical | Low | High | Lead Architect | Define strict schema initializations and upgrade migrations as specified in [ADR-0006](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0006-upgradeability-and-migration-strategy.md). | Mitigated | 2026-07-15 |
| **RSK-FIN-001** | Bad debt accumulation due to delays in executing liquidations | Financial | Medium | High | Risk Engineer | Implement a buffer between the Liquidation Threshold and LTV; utilize an indexer-based liquidation bot to trigger actions instantly. | Open | 2026-07-15 |
| **RSK-FIN-002** | Liquidity crunch due to kinked interest rate curve parameters | Financial | Low | High | Risk Engineer | Utilize a dual-slope rate model that increases borrow costs exponentially past 80% utilization to incentivize repayments. | Mitigated | 2026-07-15 |
| **RSK-FIN-003** | Oracle price manipulation via flash loans or frontrunning | Financial | Medium | High | Lead Architect | Aggregate prices from Pyth and Band feeds, enforce deviation limit checks (<2%), and fall back to TWAP. | Mitigated | 2026-07-15 |
| **RSK-SEC-001** | Reentrancy exploit during token withdrawals | Security | Medium | High | Auditor | Follow the Checks-Effects-Interactions pattern strictly; update user balances before performing on-chain token transfers. | Open | 2026-07-15 |
| **RSK-SEC-002** | Administrative key compromise | Security | Low | High | PM | Deploy contracts utilizing a 3-of-5 Multi-Sig; transfer admin roles to the Governance Timelock contract. | Open | 2026-07-15 |
| **RSK-SEC-003** | Integer overflow or underflow in interest calculation math | Security | Low | High | Auditor | Enforce checked arithmetic operators (`checked_add`, `checked_mul`) in DoD and CI lints; forbid raw math operators. | Mitigated | 2026-07-15 |
| **RSK-PRJ-001** | Indexer sync lag displays stale position info on dashboard | Project | High | Medium | PM / Tech Lead | Implement lag middleware to mark dashboard data stale if block delay > 3, and block trades if lag > 10 blocks. | Mitigated | 2026-07-15 |
| **RSK-PRJ-002** | Developer parallel merge conflicts in contract code | Project | Medium | Low | PM | Structure the project as a Cargo Workspace with decoupled crates (common, pool, oracle, risk). | Mitigated | 2026-07-15 |
| **RSK-DEP-001** | Pyth/Band oracle feed outage or freeze | Dependency | Low | High | Lead Architect | Revert oracle queries and switch to secondary fallback feeds or historical TWAP prices as outlined in [ADR-0008](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0008-oracle-failure-handling.md). | Mitigated | 2026-07-15 |
| **RSK-DEP-002** | Stellar RPC node disconnection | Dependency | Medium | Medium | SRE Lead | Configure the Indexer and Backend API to utilize fallback RPC node clusters. | Open | 2026-07-15 |
| **RSK-FIN-004** | Large borrows deplete pool liquidity (Run on the bank) | Financial | Medium | High | Risk Engineer | Enforce strict per-reserve borrow caps and supply caps to limit overall exposure. | Mitigated | 2026-07-15 |
| **RSK-SEC-004** | Oracle data corruption/bad updates | Security | Low | High | Auditor | Aggregator rejects prices reporting $\le 0$ or values with a future timestamp. | Mitigated | 2026-07-15 |
| **RSK-TEC-004** | Concurrent writes to database by indexer tasks | Technical | Medium | Medium | Lead Architect | Apply single-writer write-locks for PostgreSQL; restrict API server to read-only DB connection pools. | Mitigated | 2026-07-15 |
