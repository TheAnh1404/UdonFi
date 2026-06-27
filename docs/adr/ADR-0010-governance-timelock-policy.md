# Architecture Decision Record: Governance Timelock Policy (ADR-0010)

*   **Status**: Approved
*   **Context**: Administrative configurations (interest curves, LTV limits, asset listing, and cap changes) present risk if they can be modified instantly. Users need time to exit their positions if governance parameters change unfavorably.
*   **Decision**: We implement a **Governance Timelock Policy**:
    1. **Execution Delay**: A mandatory **48-hour timelock** is enforced on all non-emergency administrative transactions.
    2. **Governance Actions Subject to Timelock**:
       - Increasing supply or borrow caps.
       - Upgrading smart contract WASM bytecode.
       - Modifying reserve parameters (LTV, liquidation threshold, APY slopes).
       - Transferring treasury reserve funds.
    3. **Emergency Actions Exempt from Timelock**:
       - Decreasing supply or borrow caps (`emergency_reduce_caps`).
       - Activating a reserve pause (`toggle_pause`).
       - Resolving a prepared liquidation lock session.
       - *Note: These actions are immediate to protect the pool during crises.*
    4. **Proposal Lifecycle Delay**:
       - *Voting Delay*: 6 hours (prevents flash-loan voting attacks).
       - *Voting Period*: 3 days.
       - *Queue Time*: Passed proposals must sit in the Timelock queue for at least 48 hours before execution is permitted.
    5. **Expiration**: A queued proposal must be executed within **7 days** of passing, otherwise it expires and is canceled.
*   **Consequences**:
    *   *Pros*: Protects users against malicious updates and administrative key exploits.
    *   *Cons*: Delays the implementation of standard feature updates or listings.
*   **Alternatives**:
    *   *Direct Multisig Execution*: Fast but introduces centralization risk.
