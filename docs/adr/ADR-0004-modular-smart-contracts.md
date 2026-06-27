# Architecture Decision Record: Modular Smart Contracts (ADR-0004)

*   **Status**: Approved
*   **Context**: Building all lending logic (Supply, Withdraw, Borrow, Repay, Interest Rate curves, Risk Engine, and Liquidations) into a single monolithic router contract leads to WASM files that exceed Soroban's deployment size limits, and single-transaction execution runs out of CPU instructions.
*   **Decision**: We decouple the lending system into **Modular Smart Contracts** (Lending Pool, Reserve Config, Risk Engine, Interest Rate Engine, Liquidation Coordinator, and Governance).
*   **Consequences**:
    *   *Pros*: Each contract is smaller and easier to audit. Execution is divided across separate entry points, keeping CPU instruction counts low.
    *   *Cons*: Increases contract-to-contract call overhead (cross-contract invocation costs gas).
*   **Alternatives**:
    *   *Monolithic Contract*: Easier to write and test but limits features and fails to deploy due to WASM size restrictions.
