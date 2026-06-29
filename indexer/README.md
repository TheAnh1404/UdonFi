# UdonFi V2 Event Indexer

> Post-MVP / Future Work: this indexer is not required for the MVP, not required for the demo, and not required for contract or frontend startup. The MVP frontend reads directly from Soroban RPC and writes through Freighter-signed transactions. See `docs/future-work/indexer-architecture.md`.

This directory contains the event indexing engine responsible for scanning on-chain events from the Stellar network, decoding their XDR payloads, and synchronizing state to PostgreSQL.

## 1. Subsystem Responsibilities

- **Event Poll Pipeline**: Polls the Stellar ledger via JSON-RPC. It tracks completed block sequences and scans for contract events emitted by UdonFi contracts.
- **XDR Decoder**: Decodes base64-encoded transaction data from the Stellar network using the Stellar SDK library.
- **Relational Sync Engine**: Automatically updates user positions, database transactions, vault status flags, and TVL metrics.
- **WebSocket Streaming Gateway**: Emits real-time state changes to connected clients via Socket.io.
- **Redis Cache Layer**: Caches high-frequency API endpoints to limit database load.

---

## 2. Synchronization & Reliability

- **Sequenced Polling**: The indexer polls ledgers sequentially. The current sync block height is stored in PostgreSQL. On startup, the indexer resumes scanning from the last successfully synced ledger block.
- **Retry & Backoff Mechanism**: If a query to the Stellar RPC node fails, the indexer retries the request using exponential backoff:
  ```text
  Retry Delay = Base Interval * (2 ^ attempt_count)
  ```
  If an RPC connection is lost for more than 5 minutes, an emergency alert is triggered, and the service enters a safe retry loop.
- **Database Transaction Protection**: Event processing and database updates are wrapped in SQL database transactions. If an event fails to process, the entire transaction is rolled back, preventing partial data updates.
- **Idempotency Guarantee**: 
  - To prevent duplicate entries if the indexer crashes and restarts mid-block, every transaction insertion uses a composite key: `tx_hash` + `operation_type` + `ledger_sequence`.
  - Event database inserts utilize a strict `ON CONFLICT DO NOTHING` SQL clause.
- **Catch-up Batch Pipeline**:
  - When the indexer detects a lag backlog ($\text{syncLag} > 100$ blocks), it enters **Catch-up Mode**.
  - Instead of polling single blocks, it batches requests using the `getEvents` RPC filter with ranges of up to 100 blocks per request.
  - To prevent memory exhaustion during catch-up, the indexer implements backpressure: it buffers at most 1,000 uncommitted event decodes before requesting more blocks from the Stellar RPC node.

---

## 3. Analytics & Real-Time Caching

### A. Analytics Calculations
- **TVL and Borrow Statistics**: Recalculated dynamically at the close of every block. Sums the total USD value of supplied assets and subtracts the total USD value of active loans.
- **APY Historic Curves**: The indexer samples APY rates every 100 blocks and logs them to support historical chart queries on the frontend.

### B. Redis Caching Policies
- WebSocket payloads for active user balances and reserve metrics are cached in Redis with a 2-second Expiration (TTL).
- Caching prevents database congestion during periods of high transaction volume or heavy user traffic.
