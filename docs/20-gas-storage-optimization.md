# 20 - Gas & Storage Optimization Spec

This document details the gas, storage, and CPU resource optimization strategies for the UdonFi V2 contracts on Stellar Soroban.

---

## 1. Storage Layout Optimization

Soroban storage fees are calculated based on ledger entry size and read/write frequency. UdonFi V2 optimizes storage using the following mechanisms:

### A. u128 Bitwise State-Packing
- **Mechanism**: Instead of storing collateral and borrow configuration flags in dynamic maps, UdonFi packs user configs into a single `u128` integer.
- **Bit Mapping**:
  - Bit $2i$ (Collateral Flag): Asset $i$ is enabled as collateral.
  - Bit $2i + 1$ (Borrow Flag): Asset $i$ is actively borrowed.
- **Optimization**: Reduces storage footprint and storage fees by up to 95%.

### B. Storage Tier Policy
- **Persistent Storage**: Used for core configuration settings (reserves, rates) and user balances. Requires active TTL management.
- **Temporary Storage**: Used for temporary locks (e.g. prepared liquidation locks). Expires automatically, saving gas.

---

## 2. TTL (Time-To-Live) Extension Strategy

To prevent ledger entries from expiring and getting evicted, the protocol configures the following TTL parameters:

| Data Type | Key Pattern | Base TTL (Blocks) | Extend Threshold | New TTL Max |
|---|---|---|---|---|
| **Contract Instance** | `Instance` | 50,000 | 10,000 | 100,000 |
| **Asset Reserve Configuration**| `Reserve(asset_address)`| 50,000 | 10,000 | 100,000 |
| **User Balance & Config Map** | `UserBalance(user, asset)`| 4,000 | 1,000 | 6,000 |

*Automation: Every write transaction triggers the `extend_ttl` host function for the associated user balance and configuration entries.*

---

## 3. CPU and Memory Budget Targets

Soroban enforces a strict transaction limit of **100 million CPU instructions** and **40 MB of memory**. The protocol sets the following resource targets for core operations:

| Operation | CPU Target (Instructions) | Memory Target (MB) | Optimization Strategy |
|---|---|---|---|
| **Deposit (Supply)** | 35,000,000 | 8.0 | Cache interest index; avoid redundant math. |
| **Withdraw** | 45,000,000 | 12.0 | Optimize Health Factor checks. |
| **Borrow** | 48,000,000 | 14.0 | Optimize price aggregator calls. |
| **Repay** | 30,000,000 | 8.0 | Batch balance updates. |
| **Prepare Liquidation**| 55,000,000 | 18.0 | Locked state is stored in temporary storage. |
| **Execute Liquidation**| 35,000,000 | 10.0 | Limit checks by reusing the session ID validation. |
| **Oracle Update** | 15,000,000 | 4.0 | Validate deviation bounds before writing. |
| **Gov Execution** | 60,000,000 | 20.0 | Batch proposal payload executions. |

---

## 4. Resource Optimization Rules

- **Minimize Cross-Contract Calls**: Combine stateless math functions into a single library rather than invoking external contracts.
- **Minimize Event Size**: Keep event parameters lightweight. Store strings (e.g., proposal descriptions) off-chain and reference them using IPFS hashes.
- **Batch Balance Updates**: When executing multiple deposits or borrows, update global indexes once at the end of the transaction.
