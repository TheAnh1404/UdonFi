# Architecture Decision Record: PostgreSQL instead of Firebase (ADR-0003)

*   **Status**: Superseded for MVP; Post-MVP / Future Work
*   **MVP Scope Refactor**: The current MVP has no PostgreSQL dependency. Contract state read through Soroban RPC is authoritative. This ADR is preserved for future analytics/indexer work.
*   **Context**: The hackathon prototype utilized Firebase Firestore to sync vault data. A production lending protocol requires relational mapping, complex queries (e.g., finding all vaults with HF < 1.0), and ACID guarantees.
*   **Decision**: Post-MVP, if analytics/indexing returns to scope, PostgreSQL may replace Firebase Firestore for derived analytics storage.
*   **Consequences**:
    *   *Pros*: Strong type-safety, relational consistency, transaction control, and powerful indexing capabilities for sorting positions.
    *   *Cons*: Increased infrastructure management overhead compared to serverless Firebase services.
*   **Alternatives**:
    *   *NoSQL (MongoDB / Firebase)*: Easier scaling but lacks support for joining dynamic tables (e.g., joining accounts with reserve prices) and ACID transaction support.
