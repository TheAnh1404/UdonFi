# Architecture Decision Record: Oracle Aggregator (ADR-0005)

*   **Status**: Approved
*   **Context**: Lending protocols rely on real-time price feeds to evaluate vault Health Factors. Relying on a single oracle provider exposes the protocol to pricing manipulation, latency outages, and incorrect updates.
*   **Decision**: We implement an **Oracle Aggregator** contract that pulls prices from multiple sources (Pyth, Band, and fallback interfaces).
*   **Consequences**:
    *   *Pros*: Mitigates single-point-of-failure risks. Validates prices by checking deviation limits.
    *   *Cons*: Increased cross-contract execution fees and higher configuration management complexity.
*   **Alternatives**:
    *   *Single Oracle Provider*: Lower gas cost but high risk of insolvency if the oracle feed is compromised or fails to update.
    *   *DEX Pools (AMM)*: Vulnerable to flash-loan price manipulation attacks.
