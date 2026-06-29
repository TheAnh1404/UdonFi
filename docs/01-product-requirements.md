# 01 - Product Requirements Document (PRD)

This document specifies the functional capabilities, mathematical constraints, and non-functional parameters governing the UdonFi V2 protocol.

## Current MVP Scope

The current MVP is a contract-first demo using:

```txt
Frontend -> Freighter -> Soroban RPC -> Smart Contracts -> Stellar Testnet -> Stellar Expert
```

The MVP includes deposit, withdraw, borrow, repay, basic Health Factor, manual liquidation, direct Soroban RPC reads, Freighter-signed writes, and Stellar Expert transaction links.

Event indexer, liquidation bot, backend analytics, PostgreSQL event sync, real-time dashboard pipeline, background workers, queues, checkpoint/replay, sync lag strategy, advanced governance, and production oracle aggregation are Post-MVP / Future Work.

## 1. Functional Specifications

### A. Supply & Withdraw (Depositors)
- **Supply Asset**: Users can supply supported Stellar assets into the protocol. Upon supply, they receive a proportional amount of interest-bearing tokens (aTokens) (e.g., supplying XLM yields aXLM).
  - *Validation*: If `totalSupply + depositAmount > supplyCap`, the transaction must reject with a `CapViolation` error.
- **Withdraw Asset**: Users can withdraw their supplied capital plus accrued interest. The transaction will revert if the withdrawal causes the user's Health Factor ($HF$) to drop below 1.0.

### B. Borrow & Repay (Borrowers)
- **Enable Collateral**: Users must mark supplied assets as eligible collateral.
- **Borrow Asset**: Users can borrow supported assets against their enabled collateral up to their maximum Loan-to-Value ($LTV$) limit.
  - *Validation*: If `totalBorrow + borrowAmount > borrowCap`, the transaction must reject with a `CapViolation` error.
- **Repay Asset**: Users can pay down their debt in part or in full. Repaying debt increases the position's Health Factor.

### C. 2-Step Liquidation (Liquidators)
- **Prepare Liquidation**: A liquidator locks an undercollateralized vault ($HF < 1.0$), specifying the debt to repay and collateral to seize. This creates a secure, time-bound session ID.
- **Execute Liquidation**: The liquidator repays the debt through the coordinator and seizes the collateral, plus a liquidation bonus, within the lock window.

### D. Governance
Post-MVP / Future Work for the demo. The MVP may use admin/testnet configuration only where required to initialize reserves.

- **Proposals**: Stakers of the governance token can submit structural proposals.
- **Voting**: Token holders can vote on proposals after a fixed delay.
- **Execution**: Approved proposals are queued in a timelock before execution.

---

## 2. Mathematical Definitions & Parameters

### A. Loan-To-Value ($LTV$) and Liquidation Threshold ($LT$)
Each asset reserve has specific risk parameters:
- **Maximum LTV ($LTV_{max}$)**: Maximum borrow capacity. For example, for XLM, $LTV_{max} = 70\%$.
- **Liquidation Threshold ($LT$)**: Point at which a position is considered undercollateralized. For example, for XLM, $LT = 82.5\%$.
- **Liquidation Penalty (Bonus)**: Bonus paid to liquidators, e.g., $5\%$.

### B. Health Factor ($HF$)
A vault’s safety is represented by its Health Factor, calculated as:
$$HF = \frac{\sum (\text{Collateral Value}_i \times LT_i)}{\sum \text{Borrow Value}_j}$$
- **$HF \ge 1.0$**: Solvency maintained. Vault is safe.
- **$HF < 1.0$**: Eligible for liquidation. Borrow functions are locked.

### C. Dynamic Kinked Interest Rate Curve
Interest rates compound dynamically based on pool Utilization ($U$):
$$U = \frac{\text{Total Borrows}}{\text{Total Supplies}}$$

Borrow APY ($R_t$) is governed by:
- **If $U \le U_{optimal}$**:
  $$R_t = R_{base} + \left( \frac{U}{U_{optimal}} \right) \times R_{slope1}$$
- **If $U > U_{optimal}$**:
  $$R_t = R_{base} + R_{slope1} + \left( \frac{U - U_{optimal}}{100\% - U_{optimal}} \right) \times R_{slope2}$$

*Parameters:*
- $U_{optimal} = 80\%$ (kink point)
- $R_{base} = 1\%$
- $R_{slope1} = 4\%$
- $R_{slope2} = 85\%$

Supply APY ($S_t$) is derived as:
$$S_t = R_t \times U \times (1 - \text{Reserve Factor})$$
*(Reserve Factor is set at 10% to fund the treasury).*

### D. Supply and Borrow Caps
To prevent over-exposure to specific assets and mitigate systemic threat runs (such as malicious infinite inflation or price manipulation cascades), each reserve config defines capacity limits:
- **`supplyCap`**: The maximum aggregate amount of an asset that can be deposited into the protocol.
- **`borrowCap`**: The maximum aggregate amount of an asset that can be actively borrowed.

#### Control Rules:
1. **Cap Increases**: Must always go through the Governance Contract, adhering to the 48-hour timelock delay to allow users to evaluate risk.
2. **Cap Decreases (Emergency Reductions)**: The Emergency Guardian is permitted to reduce caps instantly during market crises without a timelock delay, protecting pool reserves.

---

## 3. Non-Functional Requirements (NFRs)

### A. Performance & Gas Efficiency
- **State Compression**: Vault collateral and borrow statuses must fit into a single `u128` bitmap, keeping storage write costs low.
- **Gas Bound**: No transaction should consume more than 70 million CPU instructions (leaving a safety margin below the 100M limit).

### B. MVP Frontend Read Path
- **Direct reads**: The frontend reads current protocol state directly from Soroban RPC.
- **Direct writes**: The frontend submits Freighter-signed Soroban transactions.
- **Explorer visibility**: The frontend links submitted transactions to Stellar Expert.
- **Post-MVP event sync**: Sub-second indexer updates, PostgreSQL writes, WebSocket latency budgets, and real-time analytics are future work.

### C. Security & Solvency
- **Multi-Oracle Consensus**: Asset pricing requires multiple independent price feeds. Deviation between feeds must be less than 2% to execute updates.
- **Auditability**: All smart contract methods must trigger explicit events with arguments representing state changes.
