# 00 - Overview: UdonFi V2 MVP

UdonFi V2 is a decentralized collateralized lending protocol built on Stellar Soroban. The current MVP is scoped as a contract-first demo: users interact from a React frontend, sign with Freighter, read/write directly through Soroban RPC, and inspect submitted transactions through Stellar Expert.

## 1. Current MVP Objective

The MVP must prove the complete lending loop without an off-chain backend dependency:

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

The frontend reads contract state directly through Soroban RPC. User writes are Freighter-signed Soroban transactions. On-chain events remain useful for debugging and explorer visibility, but no event indexer is required for the MVP.

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

- Event Indexer.
- Liquidation Bot.
- Analytics Backend.
- PostgreSQL Event Sync.
- Real-time Dashboard Pipeline.
- Background Workers.
- Queue system.
- Sync lag strategy.
- Checkpoint/replay system.

## 5. Post-MVP / Future Work

Indexer, bot, backend analytics, automated liquidation monitoring, PostgreSQL sync, and real-time dashboard pipelines are preserved as future work under `docs/future-work/`. They are not required for demo, contract tests, or frontend MVP startup.

## 6. Documentation Map

- [02 - System Architecture](02-system-architecture.md)
- [03 - C4 Model](03-c4-model.md)
- [04 - Business Flows](04-business-flows.md)
- [06 - API Spec](06-api-spec.md)
- [08 - Security Model](08-security-model.md)
- [12 - Roadmap](12-roadmap.md)
- [21 - Performance Budget](21-performance-budget.md)
- [MVP Scope Refactor Report](reviews/mvp-scope-refactor-report.md)
