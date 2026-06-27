# Architecture Decision Record: PostgreSQL instead of Firebase (ADR-0003)

*   **Status**: Approved
*   **Context**: The hackathon prototype utilized Firebase Firestore to sync vault data. A production lending protocol requires relational mapping, complex queries (e.g., finding all vaults with HF < 1.0), and ACID guarantees.
*   **Decision**: We replace Firebase Firestore with **PostgreSQL** for the primary database store.
*   **Consequences**:
    *   *Pros*: Strong type-safety, relational consistency, transaction control, and powerful indexing capabilities for sorting positions.
    *   *Cons*: Increased infrastructure management overhead compared to serverless Firebase services.
*   **Alternatives**:
    *   *NoSQL (MongoDB / Firebase)*: Easier scaling but lacks support for joining dynamic tables (e.g., joining accounts with reserve prices) and ACID transaction support.
