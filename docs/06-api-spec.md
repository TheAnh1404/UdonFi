# 06 - API Specification

This document describes the REST and WebSocket API specifications exposed by the UdonFi V2 backend services to clients and third-party developers.

## 1. REST Endpoints

### A. General Metrics
Retrieve high-level protocol statistics.

#### `GET /api/v1/metrics/tvl`
- **Description**: Returns the Total Value Locked (TVL) across all reserves in USD.
- **Request Headers**: None
- **Response `200 OK`**:
```json
{
  "status": "success",
  "data": {
    "total_tvl_usd": "15420394.50",
    "reserves": [
      { "symbol": "XLM", "tvl_usd": "5420394.50", "supplied": "36135963.33" },
      { "symbol": "USDC", "tvl_usd": "10000000.00", "supplied": "10000000.00" }
    ]
  },
  "meta": {
    "latestProcessedLedger": 123456,
    "networkLedger": 123460,
    "syncLag": 4,
    "isStale": true
  }
}
```

---

### B. Markets
Retrieve APY rates and reserve data.

#### `GET /api/v1/markets`
- **Description**: Returns configurations and current APY rates for all supported reserves.
- **Response `200 OK`**:
```json
{
  "status": "success",
  "data": [
    {
      "asset_address": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
      "symbol": "XLM",
      "base_apy": "1.00",
      "borrow_apy": "3.50",
      "supply_apy": "1.80",
      "utilization": "54.20",
      "ltv_max": "0.70",
      "liquidation_threshold": "0.825"
    }
  ],
  "meta": {
    "latestProcessedLedger": 123456,
    "networkLedger": 123458,
    "syncLag": 2,
    "isStale": false
  }
}
```

---

### C. Accounts
Retrieve information about user positions and health status.

#### `GET /api/v1/accounts/:address`
- **Description**: Retrieves details for a specific user vault, including balances, Health Factor, and configuration bitmap.
- **Response `200 OK`**:
```json
{
  "status": "success",
  "data": {
    "account_address": "GDC32...",
    "health_factor": "1.84",
    "total_collateral_usd": "1500.00",
    "total_debt_usd": "600.00",
    "config_bitmap": "9",
    "positions": [
      { "symbol": "XLM", "type": "collateral", "amount": "10000.00", "value_usd": "1500.00" },
      { "symbol": "USDC", "type": "borrow", "amount": "600.00", "value_usd": "600.00" }
    ]
  },
  "meta": {
    "latestProcessedLedger": 123456,
    "networkLedger": 123456,
    "syncLag": 0,
    "isStale": false
  }
}
```

---

### D. Liquidations
Identify undercollateralized accounts.

#### `GET /api/v1/liquidations/candidates`
- **Description**: Returns all user accounts with a Health Factor less than 1.0.
- **Query Parameters**:
  - `limit` (default: 50)
  - `offset` (default: 0)
- **Response `200 OK`**:
```json
{
  "status": "success",
  "data": {
    "count": 2,
    "candidates": [
      {
        "account_address": "GDJU23...",
        "health_factor": "0.94",
        "collateral_usd": "100.00",
        "debt_usd": "94.00"
      }
    ]
  },
  "meta": {
    "latestProcessedLedger": 123456,
    "networkLedger": 123468,
    "syncLag": 12,
    "isStale": true
  }
}
```

---

## 2. WebSocket Messaging (WebSockets / Socket.io)

### A. Subscribing to Feeds
Clients open a persistent connection to the backend service.

```javascript
const socket = io("https://api.udonfi.xyz");
socket.emit("subscribe", { channel: "global_events" });
socket.emit("subscribe", { channel: "account_events", address: "GDC32..." });
```

### B. Emitted Events (Server to Client)

#### `global_stats`
Broadcasts TVL and rate adjustments to all clients.
- **Payload**:
```json
{
  "event": "global_stats",
  "timestamp": 1782384920,
  "data": {
    "total_tvl_usd": "15420394.50",
    "xlm_borrow_apy": "0.035",
    "xlm_supply_apy": "0.018"
  }
}
```

#### `position_update`
Sent to clients listening to specific user accounts when a deposit, withdrawal, borrow, repayment, or liquidation occurs.
- **Payload**:
```json
{
  "event": "position_update",
  "account_address": "GDC32...",
  "health_factor": "1.84",
  "tx_hash": "a4d3f5bc...",
  "summary": "SUPPLY 500 USDC"
}
```
