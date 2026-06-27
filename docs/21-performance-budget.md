# 21 - Performance Budget Specification

This document defines the latency, throughput, and performance targets for the UdonFi V2 off-chain services, API gateways, database, and frontend client.

---

## 1. Frontend Performance Targets

The client dashboard must load and respond quickly to maintain a premium user experience:

| Metrics | Target (P95) | Target (P99) | Measurement Criteria |
|---|---|---|---|
| **Initial Bundle Load** | < 1.5 seconds | < 2.5 seconds | Fast-3G network throttling. |
| **Wallet Connection** | < 200 ms | < 500 ms | Address and network validation. |
| **Dashboard Refresh** | < 500 ms | < 1.0 second | Full data fetch from API backend. |
| **Transaction UI Confirm** | < 300 ms | < 800 ms | Confirmation animations and local state updates. |

*Note: All web assets are optimized using Vite code splitting and served via CDNs with gzip compression.*

---

## 2. API Backend Latency Budgets

The REST and WebSocket API services must maintain low response latency under heavy load:

- **Target Throughput**: 1,000 requests per second (RPS) per API server instance.
- **Error Rate Target**: < 0.05% of all incoming requests.
- **Latency Budgets**:

| Endpoint Pattern | P50 Latency | P95 Latency | P99 Latency | Caching Policy |
|---|---|---|---|---|
| `GET /api/v1/metrics/tvl` | < 15 ms | < 50 ms | < 150 ms | Redis cache (5-second TTL). |
| `GET /api/v1/markets` | < 20 ms | < 80 ms | < 200 ms | Redis cache (5-second TTL). |
| `GET /api/v1/accounts/:id`| < 30 ms | < 100 ms | < 300 ms | DB query (No cache). |
| `GET /api/v1/liq/candidates`| < 50 ms | < 150 ms | < 450 ms | Index query (No cache). |

---

## 3. Indexer Sync Performance Targets

The event indexer bot must parse blocks and decode XDR payloads in real-time:

- **Maximum Acceptable Sync Lag**: $\le 3$ ledger blocks under normal conditions.
- **Catch-up Throughput**: > 50 blocks per second during sync catch-up mode.
- **Retry Interval**: 3,000 ms on Stellar RPC connection loss.
- **Event Processing Latency**: < 1.0 second from block commit to PostgreSQL write.

---

## 4. Database Optimization Targets

The database layer must support fast query speeds for historical charts and analytics:

- **Read Query Latency (P95)**: < 50 ms for complex dashboard queries.
- **Write Query Latency (P95)**: < 10 ms for indexer transaction inserts.
- **Index Requirements**: All queries on positions, transaction histories, and pricing history must use index scans.
- **Data Retention**: Pricing history is archived to cold storage after 90 days.

---

## 5. Protocol User Experience (UX) Guidelines

- **Deposit Flow**: UI must display the updated balance within 500 ms of transaction confirmation.
- **Borrow Flow**: Dashboard must update the Health Factor gauge instantly after transaction signature.
- **Liquidation Warning**: High-risk positions ($1.0 \le Health Factor \le 1.15$) must trigger real-time UI warning banners.
- **Stale Data Warning**: The dashboard must display a "Sync delayed" warning if the backend reports `syncLag > 3` blocks.
- **Risky Actions Disabled**: Borrow and Withdraw actions are disabled if `syncLag > 10` blocks.
