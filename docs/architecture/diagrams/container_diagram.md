# Container Diagram

This diagram outlines the current MVP runtime containers. Post-MVP services are intentionally excluded from the required demo path.

```mermaid
graph TB
    User([User / Liquidator]) -->|HTTPS| Web[Vite React Client]
    User -->|Approves signatures| Wallet[Freighter Wallet]
    Web -->|Request signature| Wallet
    Web -->|JSON-RPC reads and transaction submission| RPC[Stellar Soroban RPC]
    RPC -->|Invokes / queries| Contracts[UdonFi Soroban WASM Contracts]
    Contracts -->|State changes and events| Ledger[Stellar Testnet Ledger]
    Web -->|Transaction hash URL| Expert[Stellar Expert]
```

Production containers may be defined later if off-chain services return to scope.
