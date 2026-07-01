# 02 - System Architecture

This document defines the current UdonFi V2 MVP architecture. The MVP is intentionally simplified to run without off-chain service dependencies.

## 1. MVP Subsystems

1. **React Frontend**: Renders markets, user positions, transaction forms, Health Factor, and Stellar Expert links.
2. **Freighter Wallet**: Provides account connection and user transaction signing.
3. **Soroban RPC**: Provides direct contract reads, simulation, transaction submission, and transaction status polling.
4. **UdonFi Soroban Smart Contracts**: Enforce deposit, withdraw, borrow, repay, risk, accounting, interest, and manual liquidation logic.
5. **Stellar Testnet**: Hosts deployed MVP contracts and transaction execution.
6. **Stellar Expert**: Provides transaction links for manual inspection and demo confirmation.

## 2. MVP Block Diagram

```text
+-------------------+        +------------------+
| React Frontend    | <----> | Freighter Wallet |
+---------+---------+        +------------------+
          |
          | Soroban RPC reads, simulation, submits signed XDR
          v
+---------+---------+
| Soroban RPC       |
+---------+---------+
          |
          v
+---------+---------+
| UdonFi Contracts  |
| Deposit/Withdraw  |
| Borrow/Repay      |
| Risk/Liquidation  |
+---------+---------+
          |
          v
+---------+---------+        +------------------------+
| Stellar Testnet   | -----> | Stellar Expert Tx Link |
+-------------------+        +------------------------+
```

## 3. Smart Contract Responsibilities

- **Pool/Reserve lifecycle**: Protocol initialization and reserve configuration.
- **Accounting**: Reserve liquidity, scaled supply, scaled debt, treasury/insurance fields where applicable.
- **Interest**: MVP index helpers and accrual flags.
- **Supply/Withdraw**: Deposit and redemption validation/execution.
- **Borrow/Repay**: Debt validation/execution.
- **Risk**: Basic collateral value, borrow value, LTV, and Health Factor calculations.
- **Manual Liquidation**: User/liquidator-called liquidation eligibility and execution.
- **Events**: Basic on-chain events for debugging and explorer visibility.

## 4. Frontend Responsibilities

- Read reserve and user state directly from Soroban RPC.
- Simulate transactions before requesting Freighter signatures.
- Submit Freighter-signed transactions through Soroban RPC.
- Poll transaction status from Soroban RPC.
- Display Stellar Expert transaction links.
- Keep only local transaction history if needed for the demo.

## 5. Explicit Non-Dependencies for MVP

The MVP must run without:

- Off-chain automation services.
- Off-chain analytics services.
- Production monitoring pipelines.
- External data stores for authoritative balances, debt, or liquidation state.
