# 00 - Overview: UdonFi V2 MVP

UdonFi V2 is a decentralized collateralized lending protocol built on Stellar Soroban. The current MVP is scoped as a contract-first demo: users interact from a React frontend, sign with Freighter, read/write directly through Soroban RPC, and inspect submitted transactions through Stellar Expert.

## 1. Current MVP Objective

The MVP must prove the complete lending loop without an off-chain service dependency:

- Initialize protocol.
- Create reserves.
- Deposit.
- Withdraw.
- Borrow.
- Repay.
- Calculate basic Health Factor.
- Execute manual liquidation.
- Emit basic contract events.
- Show Stellar Expert transaction links.

## 2. MVP Architecture

```text
Frontend -> Freighter -> Soroban RPC -> Smart Contracts -> Stellar Testnet -> Stellar Expert
```

The frontend reads contract state directly through Soroban RPC. User writes are Freighter-signed Soroban transactions. On-chain events remain useful for debugging and explorer visibility, but they are not required as a separate data source for the MVP.

## 3. Current Actors

### Depositors
- Supply supported assets to reserves.
- Withdraw supplied assets when liquidity and Health Factor allow.

### Borrowers
- Borrow against supplied collateral.
- Repay debt manually through the frontend.
- Track basic Health Factor from direct RPC reads.

### Manual Liquidators
- Find or select unhealthy positions.
- Call liquidation functions manually.
- Review results through transaction hashes and Stellar Expert links.

### Protocol Operators
- Deploy contracts to Stellar Testnet.
- Configure reserve parameters for the demo.
- Verify contract events and transaction receipts.

## 4. Explicitly Out of MVP Scope

- Off-chain automation services.
- Off-chain analytics services.
- Production monitoring pipelines.
- Production oracle aggregation.
- Mainnet launch readiness.

## 5. Documentation Map

- [02 - System Architecture](02-system-architecture.md)
- [03 - C4 Model](03-c4-model.md)
- [04 - Business Flows](04-business-flows.md)
- [06 - API Spec](../frontend/06-api-spec.md)
- [08 - Security Model](../security/08-security-model.md)
- [12 - Roadmap](../roadmap/12-roadmap.md)
- [21 - Performance Budget](21-performance-budget.md)
