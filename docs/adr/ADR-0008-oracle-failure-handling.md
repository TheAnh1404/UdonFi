# Architecture Decision Record: Oracle Failure Handling (ADR-0008)

*   **Status**: Approved
*   **Context**: DeFi lending protocols rely on price feeds to value assets. Oracle pricing errors, network latency, or single-feed crashes can result in incorrect liquidations or bad debt.
*   **Decision**: We implement an **Oracle Failure Handling Strategy** in the `price_oracle_aggregator` contract:
    1. **Primary and Secondary Price Feeds**: We integrate Pyth Network as the primary feed and Band Protocol as the secondary feed.
    2. **Price Deviation Validation**: The aggregator checks price deviation between primary and secondary feeds. If the difference is **> 2%**, the update is rejected, and the system switches to the fallback pricing path to prevent manipulation.
    3. **Stale Price Protection**: Every price record must contain a timestamp. If `current_time - price_timestamp > 3600 seconds` (1 hour), the price is marked as stale.
    4. **Fallback Mechanism (TWAP)**: If the primary oracle fails or returns stale data:
       - The aggregator falls back to the secondary oracle.
       - If both fail, it uses a 12-hour Time-Weighted Average Price (TWAP) compiled off-chain by the indexer.
    5. **Oracle Circuit Breaker**: If all pricing pathways return stale or failing data, the contract freezes the price at the last valid value and triggers an emergency pausing of borrows and withdrawals for that asset.
    6. **Governance Recovery**: Recovering from a frozen price state requires a governance transaction to update oracle configurations or manually push a recovery price feed.
*   **Consequences**:
    *   *Pros*: Protects the protocol against oracle manipulation and single-feed outages.
    *   *Cons*: Increases gas consumption and CPU execution instructions during transaction simulation.
*   **Alternatives**:
    *   *Single Feed Integration*: Low gas cost but highly vulnerable to pricing glitches or exploits.
    *   *On-chain AMM Pricing (DEX)*: Vulnerable to flash-loan manipulation.
