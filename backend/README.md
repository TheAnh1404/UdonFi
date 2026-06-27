# UdonFi V2 Backend Service

This directory will contain the off-chain API engine for the UdonFi V2 protocol, written in TypeScript using Express or Fastify.

## 1. Directory Structure

```text
backend/
├── src/
│   ├── config/             # Database connection & env loaders
│   ├── controllers/        # REST route handler logic
│   ├── gateway/            # Socket.io WebSocket connections
│   ├── middleware/         # Auth, cors, and error handlers
│   ├── models/             # Sequelize / Prisma ORM schemas
│   ├── routes/             # REST route mapping
│   ├── services/           # DB queries, caching & pricing logic
│   └── index.ts            # Service entry point
│
├── tests/                  # API integration tests
├── package.json
└── tsconfig.json
```

---

## 2. Subsystem Responsibilities

- **REST Endpoint Coordinator**: Exposes endpoints for active reserves, total protocol TVL, user account health scores, active borrows, and historical APY curves.
- **WebSocket Emitter**: Manages Socket.io namespaces to stream database modifications (such as price shifts, new supplies, or liquidation events) directly to active user browsers.
- **Redis Cache Manager**: Caches high-frequency read operations (e.g., aggregate metric states, current APY rates) to limit database transaction latency.

---

## 3. Future APIs & Webhook Subscriptions

Developers can integrate with UdonFi V2 using the following upcoming services:

### REST API
- `GET /api/v1/reserves`: Config parameters for all collateral assets.
- `GET /api/v1/accounts/:address`: Collateral values, active borrow values, and Health Factor scores.
- `GET /api/v1/liquidations/candidates`: List of vaults eligible for liquidation ($HF < 1.0$).

### WebSockets Channel Registry
- `subscribe("global_metrics")`: Live updates on total TVL.
- `subscribe("account:<address>")`: Direct updates to active balance records.
- `subscribe("liquidation_alerts")`: Instant broadcast of prepared liquidations.

---

## 4. Off-Chain Reliability & API Middleware

### A. Sync Lag Evaluator Middleware
Every REST request executes the `SyncLagEvaluator` middleware:
1. Queries the latest database synchronized sequence block: `SELECT max(ledger_sequence) FROM transactions`.
2. Queries the Stellar RPC node tip: `GET /latestLedger`.
3. Populates the response `meta` object with:
   - `latestProcessedLedger`
   - `networkLedger`
   - `syncLag = networkLedger - latestProcessedLedger`
   - `isStale = syncLag > 3`

### B. Degraded State Gating
When `syncLag > 10` (Red alert state), the API Gateway actively rejects write-like operations or simulations that rely on the database for checking solvency constraints (e.g., simulating a borrow limit check based on stale oracle price logs in the DB). It advises the client dashboard to switch to direct Stellar JSON-RPC queries.

### C. Database Connection Pool Isolation
To enforce the **Single-Writer Database Pattern**:
- The API backend connects to PostgreSQL using a read-only user role (`udonfi_reader`).
- Any attempt by the backend routing controllers to execute `INSERT`, `UPDATE`, or `DELETE` on on-chain tables will trigger an immediate SQL permission exception, preserving the Indexer as the sole writer of ledger records.

