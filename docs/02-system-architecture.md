# 02 - System Architecture

This document describes the high-level system architecture, boundaries, components, and communication protocols of UdonFi V2.

## 1. High-Level Subsystems

UdonFi V2 is divided into four primary layers:
1. **On-Chain Layer (Soroban Smart Contracts)**: Enforces state transitions, stores vault variables, compounds interest, compiles multi-oracle prices, and issues ledger events.
2. **Indexing Layer (Node.js Event Indexer)**: Polls the Stellar RPC node, processes contract event logs, decodes XDR payloads, and writes structured records to the PostgreSQL database.
3. **Off-Chain API Layer (TypeScript Backend)**: Queries the database, handles authorization, hosts REST endpoints, and manages WebSocket connections to stream updates to client clients.
4. **Client Presentation Layer (React Web Dashboard)**: Connects to Freighter Wallet, queries the off-chain API, and interacts with Stellar RPC nodes for contract execution.

---

## 2. Structural Layer Block Diagram

```text
+-----------------------------------------------------------------------+
|                       Presentation Layer (React UI)                   |
|  - Wallet Manager (Freighter)    - State Monitor (Zustand)            |
|  - SVG Kinked APY Chart          - LED Bitmap Packing Matrix          |
+-------------------+----------------------------+----------------------+
                    |                            |
          JSON-RPC Read/Write             REST & WebSockets
                    |                            |
                    v                            v
+-------------------+------------+  +--------+---+----------------------+
|            On-Chain Layer          |  |           Off-Chain API           |
|  - Modular Smart Contracts (Rust)  |  |  - Express / Fastify Server       |
|  - Oracle Aggregator               |  |  - Redis Cache / Socket.io        |
+-------------------+----------------+  +--------+---+----------------------+
                    |                                ^
             Emits Event Logs                        |
                    |                         Database Queries
                    v                                |
+-------------------+----------------+               |
|            Indexing Layer          |               |
|  - Node.js Stellar Poller          |               |
|  - XDR Decoders                    |               |
+-------------------+----------------+               |
                    |                                |
            Write Transactions                       |
                    v                                |
+-------------------+--------------------------------+------------------+
|                            PostgreSQL Database                        |
+-----------------------------------------------------------------------+
```

---

## 3. Subsystem Boundaries and Responsibilities

### A. Smart Contracts Workspace
Contracts must remain decoupled to maintain code isolation and avoid instruction limit bottlenecks. The contracts communicate with each other using cross-contract calls:
- **`lending_pool`**: Entry point for user actions. Stores total liquidity balances and manages user position mappings.
- **`reserve_config`**: Registry of supported tokens, LTV values, liquidation thresholds, and active statuses.
- **`risk_engine`**: Statelessly evaluates user positions (Health Factor calculations) by calling the price oracle and the reserve config.
- **`interest_rate_engine`**: Calculates Borrow APY and Supply APY statelessly based on pool parameters.
- **`liquidation_coordinator`**: Statefully coordinates the prepare/execute liquidation lifecycle.
- **`oracle_aggregator`**: Exposes a unified pricing interface, validating pricing inputs from multiple external feeds.

### B. Indexer Bot
A reliable daemon responsible for converting raw on-chain state changes into queryable relational data:
- Polls the Stellar ledger via JSON-RPC.
- Filters events emitted by the UdonFi V2 contract addresses.
- Decodes base64 XDR events using the Stellar SDK library.
- Performs atomic database updates for balances, positions, and history.

### C. Backend API
Provides rapid access to historical data and real-time state synchronization:
- Exposes endpoints for user vault states, historical APYs, TVL, and leaderboards.
- Manages Socket.io namespaces to broadcast state changes.
- Caches high-frequency queries in Redis to avoid database bottlenecks.

### D. Frontend Client
Provides a premium Web3 dashboard:
- Collects user inputs, simulates transactions, and requests signatures from the Freighter Wallet.
- Subscribes to backend WebSockets to display instant UI changes.
- Renders the packed `u128` bitmap configuration using an interactive LED matrix.
- Visualizes pool utilization and APY margins using dynamic SVG charts.

---

## 4. Off-Chain Reliability & Integration Policies

### A. Single-Writer Database Restriction
To prevent lock conflicts and guarantee database consistency:
- **Event Indexer**: The **only** writer allowed to execute write commands (INSERT, UPDATE, DELETE) on ledger state tables (such as `accounts`, `positions`, `transactions`, and `liquidations`).
- **Backend API Service**: Restricted to read-only queries (SELECT) on these ledger tables. It may execute writes only for session logs, API key registry, and user profiles.

### B. Sync Lag Tracking and Degraded UI Modes
The backend tracking daemon compares the latest synced block height (`latestProcessedLedger` in PostgreSQL) against the latest network block height (`networkLedger` fetched from the Stellar RPC tip). The delta defines `syncLag`:

$$\text{syncLag} = \text{networkLedger} - \text{latestProcessedLedger}$$

The frontend client fetches this metadata on every REST/WS request and updates its operating mode dynamically:

```text
+-------------------+--------------------+-----------------------------------+
| Lag Delta (Blocks)| Dashboard Status   | UI Behavior Restrictions          |
+-------------------+--------------------+-----------------------------------+
| 0 to 3 Blocks     | Green (Healthy)    | Normal operations.                |
+-------------------+--------------------+-----------------------------------+
| 4 to 10 Blocks    | Yellow (Warning)   | Banner warning: "Sync delayed".  |
+-------------------+--------------------+-----------------------------------+
| > 10 Blocks       | Red (Degraded)     | Disable Borrow and Withdraw.      |
|                   |                    | Prompt direct contract status.    |
+-------------------+--------------------+-----------------------------------+
```

- When the UI is in **Red (Degraded)** mode, risky actions are disabled because calculations like Health Factor or Max LTV might be computed using stale database records.
- Direct contract interactions (such as repayments and liquidations) can still bypass the backend API by reading state directly from the Stellar RPC node.

