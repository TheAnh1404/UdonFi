# Architecture Decision Record: Event-Driven Architecture (ADR-0002)

*   **Status**: Approved
*   **Context**: Client clients need to view real-time state changes, transactional history, and health factor variations. Querying the Stellar RPC node directly for all state histories is slow and expensive.
*   **Decision**: We implement an **Event-Driven Architecture** utilizing an off-chain event indexer to poll and sync ledger events.
*   **Consequences**:
    *   *Pros*: Offloads read queries from RPC nodes, supports real-time WebSocket push notifications, and enables analytics tracking.
    *   *Cons*: Introduces off-chain latency (typically 1-2 seconds) and a dependency on database synchronization.
*   **Alternatives**:
    *   *Direct RPC Queries*: Querying contract storage map values directly for every dashboard render. This causes severe UX lag and RPC rate-limiting.
