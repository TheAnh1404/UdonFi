# Architecture Decision Record: Interest Index Accounting Model (ADR-0009)

*   **Status**: Approved
*   **Context**: Calculating interest rates dynamically for every user vault on every ledger block is computationally impossible and exceeds block transaction CPU instruction limits.
*   **Decision**: We implement an **Index-Based Accumulator Accounting Model**:
    1. **Global Index Accumulators**: The protocol tracks `borrowIndex` and `supplyIndex` globally per reserve asset. These represent the cumulative interest earned/paid since the pool was initialized.
    2. **Scaled Balance Storage**: User balances are stored on-chain as **Scaled Balances** (Wad scale, $10^{18}$):
       $$\text{scaledBalance} = \frac{\text{actualBalance}}{\text{globalIndex}}$$
    3. **Accrual Timing**: Interest is accrued globally for a reserve whenever any transaction (deposit, withdrawal, borrow, repayment, or liquidation) interacts with the reserve pool. The index is updated to the current ledger block before modifying user balances.
    4. **Solvency-Focused Rounding Rules**:
       - When borrowing or repaying debt, the division of amount by `borrowIndex` is rounded **up** (user owes slightly more).
       - When supplying or withdrawing capital, the division of amount by `supplyIndex` is rounded **down** (user receives slightly less).
       - Fixed-point math uses **Ray ($10^{27}$)** precision for interest indexes and rates, and **Wad ($10^{18}$)** for balances.
    5. **Compounding Equivalency Invariant**: The index-compounded user balance must equal the block-by-block compounding simulation within $\le 1$ Wad unit of precision.
    6. **Testing Implications**: Unit tests must use property-based fuzzing (`proptest`) to verify that the indexing model is monotonic and that rounding errors do not drain the pool over long periods.
*   **Consequences**:
    *   *Pros*: Eliminates the need to update every user position on every block, keeping CPU instructions low and constant $O(1)$.
    *   *Cons*: Introduces complex fixed-point division scaling logic and rounding constraints.
*   **Alternatives**:
    *   *Block-by-Block Cron Processing*: Exceeds transaction block limits and cannot scale to large numbers of users.
