# 06 - API Specification

The UdonFi V2 MVP does not require a backend REST API or WebSocket API. The frontend reads directly from Soroban RPC and writes through Freighter-signed Soroban transactions.

## 1. MVP Data Access

### Reads
- Use Soroban RPC contract reads and simulation responses.
- Read reserve state, user supply/debt, Health Factor inputs, liquidity, and transaction status directly from RPC.
- Do not use backend/indexer data as the MVP source of truth.

### Writes
- Build and simulate Soroban transactions in the frontend.
- Request Freighter signature.
- Submit signed XDR through Soroban RPC.
- Poll RPC for transaction status.
- Display a Stellar Expert transaction link.

### Local State
- The frontend may keep local transaction history for user convenience.
- Local history is not authoritative for balances, debt, Health Factor, or liquidation eligibility.

## 2. Contract Events

MVP contracts keep basic events for debugging and explorer visibility:

- `supply.deposit.completed`
- `withdraw.completed`
- `borrow.created`
- `repay.completed`
- `liquidation.executed`

These events do not require an indexer for MVP operation.

## 3. Explicitly Out of MVP Scope

- REST API service.
- WebSocket service.
- Backend analytics API.
- PostgreSQL event sync.
- Sync lag metadata in API responses.
- Real-time dashboard pipeline.
- Background workers.

## 4. Post-MVP / Future API Work

Future backend APIs may provide:

- Historical TVL and APY analytics.
- Cached market metadata.
- Indexed user activity history.
- Liquidation candidate discovery.
- WebSocket notifications.
- Sync lag and stale-data indicators.

These services must not become the source of truth for balances, debt, Health Factor, or liquidation state; on-chain state remains authoritative.
