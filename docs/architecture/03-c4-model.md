# 03 - C4 Model Specification

This C4 model reflects the current UdonFi V2 MVP contract-first demo.

## 1. Level 1: System Context

```mermaid
graph TB
    User([Depositor / Borrower / Manual Liquidator]) -->|Uses| UI[UdonFi React Frontend]
    UI -->|Requests signature| Wallet[Freighter Wallet]
    Wallet -->|Signed XDR| UI
    UI -->|Read / simulate / submit| RPC[Soroban RPC]
    RPC -->|Executes and reads| SC[UdonFi Soroban Contracts]
    SC -->|State transitions and events| Testnet[Stellar Testnet]
    UI -->|Tx hash link| Expert[Stellar Expert]
```

## 2. Level 2: Container Diagram

```mermaid
graph TB
    Browser[User Browser] --> Web[Vite React Client]
    Web <--> Wallet[Freighter Extension]
    Web --> RPC[Soroban RPC Endpoint]
    RPC --> Contracts[Soroban WASM Contracts]
    Contracts --> Ledger[Stellar Testnet Ledger]
    Web --> Expert[Stellar Expert Transaction Page]
```

## 3. Level 3: Smart Contract Components

```mermaid
graph TD
    Frontend[Frontend via RPC] --> Pool[Pool / Flow Entrypoints]
    Pool --> Reserve[Reserve Registry]
    Pool --> Accounting[Accounting Engine]
    Pool --> Interest[Interest Engine]
    Pool --> Risk[Risk Engine]
    Risk --> Reserve
    Risk --> Accounting
    Pool --> Liquidation[Manual Liquidation]
    Liquidation --> Risk
    Liquidation --> Accounting
```

## 4. Deployment Model for MVP

```mermaid
graph TB
    subgraph Client
        Browser[Browser]
        Freighter[Freighter Wallet]
    end

    subgraph Stellar
        RPC[Soroban RPC]
        Contracts[UdonFi Contracts on Testnet]
        Expert[Stellar Expert]
    end

    Browser <--> Freighter
    Browser --> RPC
    RPC --> Contracts
    Browser --> Expert
```
