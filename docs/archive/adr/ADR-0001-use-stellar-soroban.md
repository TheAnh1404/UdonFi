# Architecture Decision Record: Use Stellar Soroban (ADR-0001)

*   **Status**: Approved
*   **Context**: The protocol requires a high-performance smart contract platform to execute supply, borrow, and liquidation logic. Traditional EVM networks exhibit high transaction fees and latency, limiting capital-efficiency.
*   **Decision**: We select **Stellar Soroban** (WASM-based smart contracts) as the execution environment for UdonFi V2.
*   **Consequences**:
    *   *Pros*: Fast ledger transactions, predictable fee structures, and Rust-native development.
    *   *Cons*: Resource constraints include a 100 million CPU instruction limit per transaction and ledger entry eviction models (TTL).
*   **Alternatives**:
    *   *EVM (Ethereum / Arbitrum)*: Higher gas fee volatility and slower execution cycles.
    *   *Solana*: High performance but requires building custom Rust SDK structures, lacking Stellar's payment rails.
