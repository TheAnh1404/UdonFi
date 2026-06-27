# Architecture Decision Record: Upgradeability & Migration Strategy (ADR-0006)

*   **Status**: Approved
*   **Context**: Smart contracts handling decentralized lending must support upgradeability to fix security flaws and add features. However, arbitrary upgrade mechanisms introduce centralized risk and trust issues. We need a strategy defining which modules are upgradeable and how migrations are managed on Stellar Soroban.
*   **Decision**: We implement a **Versioned Upgradeability & Migration Strategy**:
    1. **Immutable Core Modules**: Math engines (`interest_rate_engine`, `risk_engine`) are deployed as immutable, stateless libraries. If curve parameters must change, the `lending_pool` is updated to point to a new contract address rather than upgrading the library bytecode.
    2. **Upgradeable State Managers**: Storage routers (`lending_pool`, `reserve_config`, `governance`) are upgradeable. We use Soroban's native `env.deployer().update_current_contract_wasm()` function.
    3. **Governance Timelock Gating**: Contract upgrades can **only** be executed via the standard 48-hour timelocked on-chain governance proposal. No single key or emergency role can upgrade code directly.
    4. **State Storage Migrations**: The upgraded contract WASM must support version tags. When a WASM instance is upgraded:
       - The contract checks the active stored schema version.
       - If a schema migration is required, the contract executes a one-time migration script (updating keys/formats) during the first initialization transaction.
       - Upgrades are strictly **non-rollbackable** beyond major schema breaks to prevent state corruption.
*   **Consequences**:
    *   *Pros*: Maintains security against administrative exploits via timelocks, enforces modular isolation, and supports necessary bug patching.
    *   *Cons*: Writing storage migration routines consumes extra CPU limits and gas fees during the initialization transaction.
*   **Alternatives**:
    *   *Fully Immutable Code*: Highly secure but makes resolving smart contract bugs impossible, requiring complex user-driven migrations to new contracts.
    *   *Proxy Contracts (EV-style)*: Soroban does not support delegate calls in the EVM sense; using the native WASM update function is the clean, recommended pattern.
