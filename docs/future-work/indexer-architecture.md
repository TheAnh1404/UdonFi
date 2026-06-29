# Post-MVP: Event Indexer Architecture

This document preserves the indexer architecture as future work. It is not required for the MVP, not required for the demo, and not required for contract or frontend startup.

## Status

Post-MVP / Future Work.

## Purpose

An event indexer may later scan Stellar ledger events, decode UdonFi contract events, and store queryable history for analytics, dashboards, and activity feeds.

## Future Responsibilities

- Poll Soroban RPC for UdonFi contract events.
- Decode event XDR payloads.
- Maintain checkpointed ledger progress.
- Handle retry, replay, and idempotency.
- Write indexed records to PostgreSQL or another analytics store.
- Provide historical transaction and APY/TVL analytics.

## Not Required for MVP

- The MVP frontend reads contract state directly from Soroban RPC.
- The MVP frontend writes through Freighter-signed transactions.
- Contract tests do not require an indexer.
- The demo does not require event replay, checkpointing, or sync lag handling.

## Future Risks to Resolve

- Duplicate event handling.
- Sync lag during RPC outages.
- Checkpoint corruption.
- Database write contention.
- Backpressure during catch-up.
- Incorrect interpretation of contract events.

## Re-entry Criteria

Implement this only after the contract MVP and frontend MVP are stable on Testnet.
