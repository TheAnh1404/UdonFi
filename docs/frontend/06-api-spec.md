# 06 - API Specification

The UdonFi V2 MVP does not require a separate REST or WebSocket service. The frontend reads directly from Soroban RPC and writes through Freighter-signed Soroban transactions.

## 1. MVP Data Access

### Reads
- Use Soroban RPC contract reads and simulation responses.
- Read reserve state, user supply/debt, Health Factor inputs, liquidity, and transaction status directly from RPC.
- Do not use off-chain derived data as the MVP source of truth.

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

These events do not require a separate data pipeline for MVP operation.

## 3. Explicitly Out of MVP Scope

- REST API service.
- WebSocket service.
- Off-chain analytics API.
- External data store synchronization.
- Production monitoring pipeline.

## 4. Future API Work

Future off-chain APIs may provide:

- Historical TVL and APY analytics.
- Cached market metadata.
- User activity history.
- Liquidation candidate discovery.
- WebSocket notifications.
- Freshness and stale-data indicators.

These services must not become the source of truth for balances, debt, Health Factor, or liquidation state; on-chain state remains authoritative.
