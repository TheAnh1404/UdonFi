# 12 - Development Roadmap & Future Vision

This document details the development milestones, security auditing phases, risk factors, and the feature expansion roadmap for the UdonFi V2 protocol.

## 1. Development Phases

```text
  Phase 1: Architecture & Specs  [CURRENT]
  - Repository restructuring and specification design.
  - Initial configuration template setup.
  
  Phase 2: Contract Engineering (Q3 2026)
  - Coding of modular smart contracts (Rust / Soroban) including on-chain supplyCap and borrowCap checks.
  - Implementation of u128 bitmap logic, Ray/Wad fixed-point math and 2-step liquidations.
  - Setup of local Rust property tests.
  
  Phase 3: Database & Indexer Integration (Q4 2026)
  - Setting up the PostgreSQL database schema.
  - Building the event indexing daemon with real-time listeners and sync lag metric tracking.
  - Integrating REST and WebSocket APIs.
  
  Phase 4: Testnet & Audit (Q1 2027)
  - Deploying the protocol to Stellar Testnet.
  - Running security audits and fuzzing campaigns.
  - Launching the public Testnet UI with mock markets.
  
  Phase 5: Mainnet Launch & Governance (Q2 2027)
  - Deploying smart contracts to Stellar Mainnet with initial safe, conservative supply and borrow caps on all reserve assets.
  - Launching the UDON governance token and DAO.
  - Deploying the Treasury Insurance Fund.
```

---

## 2. Key Milestones

- **Milestone 1**: Successful verification of modular contract unit tests.
- **Milestone 2**: Indexer matches 100% of contract events without losing state over 1,000,000 test blocks.
- **Milestone 3**: Third-party security audit completed with all findings resolved, validating cap bounds and reentrancy protections.
- **Milestone 4**: Mainnet TVL reaches $1,000,000.
- **Milestone 5**: Successful execution of the first community parameter update via the Governance contract, demonstrating standard timelocked cap adjustments.

---

## 3. Future Feature Expansion

### A. Multi-Asset collateral Expansion
- Support for tokenized real-world assets (RWA) and yield-bearing collateral tokens.
- Integration of custom collateral risk coefficients to limit exposure to volatile tokens.

### B. Flash Loans
- Allow developers to borrow pool liquidity within a single transaction block, charging a 0.05% fee to depositors.

### C. Advanced Risk Parameters
- Dynamic collateral caps and borrow caps per reserve to prevent the pool from accumulating too much exposure to a single asset.
