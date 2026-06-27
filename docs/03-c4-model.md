# 03 - C4 Model Specification

This document provides a detailed layout of the UdonFi V2 system using the C4 model for software architecture.

## 1. Level 1: System Context Diagram

The System Context Diagram shows how users, liquidators, and external systems interact with the UdonFi V2 protocol.

```mermaid
graph TB
    User([Borrower / Depositor]) -->|Interacts with UI| UI[UdonFi V2 Web Client]
    Liquidator([Liquidator]) -->|Monitors health & executes liquidations| UI
    Liquidator -->|Queries API / DB| API[UdonFi V2 API Engine]
    
    UI -->|Queries & Updates| SC[UdonFi Soroban Contracts]
    UI -->|Reads stats| API
    
    SC -->|Fetches Asset Prices| Oracle[Stellar Price Oracles]
    
    subgraph UdonFi V2 System Boundary
        UI
        API
        SC
    end
```

---

## 2. Level 2: Container Diagram

The Container Diagram details the tech stack, data stores, and communication pathways.

```mermaid
graph TB
    User([User / Liquidator]) -->|HTTPS / WSS| Web[Vite React Client]
    Wallet[Freighter Wallet] <-->|Sign Transactions| Web
    
    Web -->|JSON-RPC| RPC[Stellar Soroban RPC Node]
    RPC <-->|Executes| Contracts[Soroban WASM Contracts]
    
    Web -->|JSON REST| Backend[API Service Node.js]
    
    Indexer[Event Indexer Node.js] -->|Polls ledger events| RPC
    Indexer -->|Decodes XDR & Writes| DB[(PostgreSQL Database)]
    
    Backend -->|SQL Read / Write| DB
    Backend -->|WebSockets Socket.io| Web
    
    Contracts <-->|Cross-Contract pricing| Pyth[Pyth / Band Oracle]
```

---

## 3. Level 3: Component Diagram (Smart Contracts)

This diagram outlines how the modular smart contracts interact on-chain.

```mermaid
graph TD
    Pool[Lending Pool Router] -->|Risk evaluations| Risk[Risk Engine]
    Pool -->|Interest rate configurations| Interest[Interest Rate Engine]
    Pool -->|Update status| Reserve[Reserve Config]
    
    Liq[Liquidation Coordinator] -->|Health queries| Risk
    Liq -->|Write updates| Pool
    
    Risk -->|Fetch prices| Oracle[Oracle Aggregator]
    Risk -->|Read configurations| Reserve
    
    Oracle -->|Verify inputs| Feed[Stellar Oracle Feeds]
```

---

## 4. Level 4: Deployment Diagram

This diagram displays the physical deployment infrastructure of the production protocol.

```mermaid
graph TB
    subgraph Client Environment
        Browser[User Browser]
        Freighter[Freighter Wallet Extension]
    end
    
    subgraph Cloud Infrastructure (AWS / GCP)
        LB[Load Balancer]
        
        subgraph ECS / Kubernetes Cluster
            BE_Instance[API Backend Containers]
            Idx_Instance[Indexer Bot Daemon]
        end
        
        subgraph Database Tier
            Postgres[(RDS PostgreSQL Master)]
            Replica[(RDS PostgreSQL Read Replica)]
            Redis[(Redis Cache Cluster)]
        end
    end
    
    subgraph Stellar Network
        RPC_Node[Soroban RPC Endpoint]
        Ledger[(Stellar Ledger State)]
    end
    
    Browser -->|HTTPS| LB
    Browser -->|JSON-RPC| RPC_Node
    LB --> BE_Instance
    BE_Instance --> Postgres
    BE_Instance --> Redis
    Idx_Instance --> RPC_Node
    Idx_Instance --> Postgres
    Postgres -->|Replication| Replica
    RPC_Node <--> Ledger
```
