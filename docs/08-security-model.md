# 08 - Security Model & Threat Assessment

DeFi lending protocols are prime targets for exploits. This document outlines UdonFi V2's security model, threat landscape modeling, access control designs, and mitigation strategies.

## 1. Threat Modeling (STRIDE Framework)

| Category | Threat Description | Protocol Mitigation Strategy |
|---|---|---|
| **Spoofing** | Unauthorized entity signing transactions as a borrower or depositor. | Enforce cryptographic signature verification inside Soroban SDK via native Freighter wallet bindings. |
| **Tampering** | Manipulation of price feed data during transaction execution. | Decentralized Oracle Aggregator combining Pyth, Band, and median calculations with sanity deviation checks (<2%). |
| **Repudiation** | Denying participation in debt liquidations or voting proposals. | Immutable event logging for all key state transitions. On-chain receipt generation. |
| **Information Disclosure** | Front-running pending liquidations or borrows in Stellar transaction pools. | Flash-loan checks and 2-step liquidation flows. Secure preparation signatures. |
| **Denial of Service** | Eviction of ledger configurations by letting TTL expire. | Automatic `extend_ttl` executions on all user write operations. |
| **Elevation of Privilege** | Exploiting upgrade functions to extract treasury funds. | Gating administrative operations behind multi-sig controls and a 48-hour timelock. |

---

## 2. Risk Matrix & Vulnerability Analysis

```text
  Severity / Probability Matrix:
  
  High     | [Oracle Manipulation]    [Reentrancy Attacks]    [Insolvency Cascades]
  Medium   | [TTL State Eviction]     [Front-Running Logs]    [Multisig Key Loss]
  Low      | [Client UI Disruption]   [RPC Downtime]          [Small Dust Balances]
           +-----------------------------------------------------------------------
                         Low                     Medium                  High
```

### Critical Exploits Handled:
1. **Oracle Price Manipulation**: Assailed by flash loan attacks pushing down price pools.
   * *Mitigation*: We do not use AMM pools for on-chain pricing. All assets resolve to the `oracle_aggregator` combining oracle network feeds.
2. **Reentrancy**: Reentering functions during transfer callbacks.
   * *Mitigation*: Soroban does not support arbitrary execution callbacks during native token transfers, but we enforce strict check-effects-interactions patterns.
3. **Insolvency cascades**: Undercollateralized loans cannot be liquidated fast enough.
   * *Mitigation*: The 2-step liquidation process guarantees CPU execution. We establish a **Treasury Insurance Fund** to absorb bad debt.
4. **Infinite Deposit/Borrow Vulnerability**: Listing a new or volatile asset with unlimited pool borrowing availability.
   * *Mitigation*: Implementation of strict `supplyCap` and `borrowCap` values on all reserves. All deposits and borrows check caps on-chain during simulation and transaction execution.
5. **Stale Oracle Pricing**: Exploiting outdated feed values during high market volatility.
   * *Mitigation*: Oracle aggregator requires active updates; price updates must be newer than the stale window threshold (e.g., 3600 seconds), otherwise transaction reverts.
6. **Indexer Lag & Front-running**: Executing trades or liquidations based on stale UI parameters.
   * *Mitigation*: Emitting indexer status flags (`isStale`) in API payloads and disabling risky user actions (like borrowing and withdrawing) on the dashboard when lag exceeds 10 ledger blocks.

---

## 3. Access Control Systems

- **`Admin` Role**: Can configure reserve assets, toggle pausing status, adjust risk factors, and increase caps. Assigned exclusively to the **Governance Timelock** contract.
- **`Guardian` Role**: Emergency multisig. Can trigger circuit breakers (pause operations) and perform immediate **cap reductions**, but cannot increase caps, upgrade contracts, or extract funds.
- **`User` Role**: Anyone with a valid Stellar address. Can interact with standard supply, borrow, repay, and withdraw functions.

---

## 4. Circuit Breakers & Emergency Actions

### A. Emergency Pausing
Each asset reserve has an `is_active` flag. In the event of extreme market volatility, oracle failures, or suspected smart contract anomalies:
- A Guardian can invoke `toggle_pause(reserve_id)` to instantly disable new deposits and borrows.
- Repayments and liquidations remain active to ensure the protocol can restore solvency.

### B. Emergency Cap Reductions
- The Guardian role can invoke `emergency_reduce_caps(asset, new_supply_cap, new_borrow_cap)` to immediately decrease limits on troubled assets.
- If the new cap is below the current total active supplied/borrowed amounts, no new deposits or borrows are accepted, but existing positions are not liquidated or forced to close.
- Cap increases must go through the 48-hour Governance timelock queue.

---

## 5. Security Audit Plan

Before deploying to the Stellar mainnet, UdonFi V2 must complete a structured security audit:
1. **Formal Verification**: Mathematically prove that the `risk_engine` calculations for Health Factor can never overflow or return negative values.
2. **Static Analysis**: Compile with cargo lints and audit using automated security analyzers.
3. **External Auditing**: Engage independent auditing firms to perform manual code reviews of the modular contract layouts.
4. **Bug Bounty Program**: Run public incentivized testing programs on the Stellar Testnet.
