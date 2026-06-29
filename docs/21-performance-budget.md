# 21 - Performance Budget Specification

The MVP performance budget targets a direct frontend -> Soroban RPC -> contract demo. API, indexer, database, queue, and real-time analytics budgets are Post-MVP.

## 1. Frontend MVP Performance Targets

| Metric | Target | Notes |
|---|---:|---|
| Initial app load | < 2.5s on broadband | Vite bundle, no backend bootstrap required. |
| Freighter connection | < 1.0s | Includes wallet permission prompt latency where measurable. |
| Direct RPC read refresh | < 3.0s typical | Depends on public RPC latency. |
| Transaction simulation | < 5.0s typical | User-facing loading state required. |
| Transaction submission feedback | < 3.0s to hash/status | Show pending state and Stellar Expert link when hash is available. |

## 2. Contract MVP Budgets

- Contract tests must run without indexer or bot services.
- Deposit, withdraw, borrow, repay, and liquidation paths must use checked integer math.
- Manual liquidation must remain within Soroban transaction execution limits for MVP-sized positions.
- Events should be compact and useful for debugging/explorer visibility.

## 3. User Experience Guidelines

- The UI should never depend on indexed backend data for balances, debt, Health Factor, or liquidation state.
- If RPC reads are slow, show loading or retry states instead of stale backend values.
- Show Stellar Expert links for submitted transactions.
- Store local transaction history only as a convenience cache.

## 4. Explicitly Out of MVP Scope

- API backend latency budgets.
- WebSocket throughput budgets.
- Indexer sync lag budgets.
- PostgreSQL read/write latency budgets.
- Queue/backpressure budgets.
- Real-time analytics dashboard freshness budgets.

## 5. Post-MVP / Future Performance Budgets

Future backend/indexer work should define separate budgets for:

- Event processing latency.
- Sync lag and catch-up throughput.
- API response latency.
- WebSocket broadcast latency.
- Database query/index performance.
- Queue depth and retry behavior.
