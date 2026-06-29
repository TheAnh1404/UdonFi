# Post-MVP: Backend Analytics and Real-Time Pipeline

This document preserves backend analytics ideas as future work. It is not required for the MVP, not required for the demo, and must not be the source of truth for balances, debt, Health Factor, or liquidation state.

## Status

Post-MVP / Future Work.

## MVP Behavior

The frontend reads directly from Soroban RPC and writes through Freighter-signed transactions. The backend is optional and not required for local MVP startup or demo.

## Future Backend Responsibilities

- Historical TVL and APY analytics.
- Cached market metadata.
- User activity history.
- Liquidation candidate indexing.
- WebSocket notifications.
- Optional dashboard acceleration.

## Future Data Pipeline Components

- Event Indexer.
- PostgreSQL event sync.
- Single-writer ingestion policy.
- Read-only analytics API.
- WebSocket broadcast service.
- Sync lag and stale-data metadata.
- Queue/backpressure/checkpoint systems.

## Not Required for MVP

- Analytics backend.
- PostgreSQL event sync.
- Real-time dashboard pipeline.
- Background workers.
- Queue system.
- Sync lag strategy.

## Source of Truth Rule

On-chain contract state read through Soroban RPC remains the source of truth. Backend data may only cache or summarize state after the MVP is stable.
