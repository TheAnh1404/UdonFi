# Deployment Diagram

This diagram displays the cloud hosting topology, databases, load balancing, and blockchain interface nodes.

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
