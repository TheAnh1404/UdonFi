# 21 - Performance Budget Specification

The MVP performance budget targets a direct frontend -> Soroban RPC -> contract demo.

## 1. Frontend MVP Performance Targets

| Metric | Target | Notes |
|---|---:|---|
| Initial app load | < 2.5s on broadband | Vite bundle with no off-chain service bootstrap required. |
| Freighter connection | < 1.0s | Includes wallet permission prompt latency where measurable. |
| Direct RPC read refresh | < 3.0s typical | Depends on public RPC latency. |
| Transaction simulation | < 5.0s typical | User-facing loading state required. |
| Transaction submission feedback | < 3.0s to hash/status | Show pending state and Stellar Expert link when hash is available. |

## 2. Contract MVP Budgets

- Contract tests must run without off-chain services.
- Deposit, withdraw, borrow, repay, and liquidation paths must use checked integer math.
- Manual liquidation must remain within Soroban transaction execution limits for MVP-sized positions.
- Events should be compact and useful for debugging/explorer visibility.

## 3. User Experience Guidelines

- The UI should never depend on off-chain derived data for balances, debt, Health Factor, or liquidation state.
- If RPC reads are slow, show loading or retry states instead of stale derived values.
- Show Stellar Expert links for submitted transactions.
- Store local transaction history only as a convenience cache.
