# Architecture Decision Record: Emergency Pause & Guardian Model (ADR-0007)

*   **Status**: Approved
*   **Context**: Security vulnerabilities or extreme market volatility can threaten protocol solvency. The protocol needs a mechanism to halt actions immediately. However, administrator pausing capabilities can lock user funds, introducing censorship risk.
*   **Decision**: We implement an **Emergency Pause & Guardian Model**:
    1. **Emergency Guardian Role**: A dedicated 3-of-5 multisig wallet. It has the authority to pause operations and reduce capacity caps instantly, but cannot upgrade contract WASM hashes or withdraw pool assets.
    2. **What Can Be Paused (Pausable Actions)**: `supply()` and `borrow()` entry points.
    3. **What Cannot Be Paused (Non-pausable Actions)**: `repay()` and `liquidate()` entry points. This ensures users can clear their debts and liquidators can protect pool solvency during extreme market conditions.
    4. **Pause Levels**:
       - *Global Pause*: Halts all new deposits and borrows across the entire protocol.
       - *Reserve Pause*: Halts deposits and borrows only for a specific asset reserve.
    5. **Guardian Limitations**: Pauses triggered by the Guardian expire automatically after **7 days** (approx. 47,000 ledgers) if not renewed or finalized by Governance. This prevents permanent locking of assets by a compromised Guardian role.
    6. **Mandatory Governance Post-Mortem**: Every emergency pause event triggers a mandatory proposal review. Governance must vote to either resume operations or permanently deprecate the reserve within the 7-day pause window.
*   **Consequences**:
    *   *Pros*: Fast response to active exploits (0-block latency) and protects solvency during crashes.
    *   *Cons*: Trust dependency on the Guardian multisig key holders for temporary pauses.
*   **Alternatives**:
    *   *No Pausing (Purely Decentralized)*: Highly trustless but exposes the protocol to catastrophic loss during active exploits.
    *   *Governance-Only Pausing*: Too slow; standard proposal cycles require at least 3 days, rendering it useless during active exploits.
