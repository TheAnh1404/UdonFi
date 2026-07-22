# 05 - Smart Contract Specifications

This document defines the smart contract interfaces, storage schemas, and event structures of UdonFi V2.

## 1. Shared Types & Libraries (`udonfi-common`)

### A. Storage Layout: Bitmap State Matrix
Each user position is stored in a compressed format inside the ledger using a single `u128` value:
- Bits are read/written in pairs: `2 * asset_index` is the collateral flag; `2 * asset_index + 1` is the borrow flag.

```rust
pub struct UserConfigMap {
    pub bitmap: u128,
}

impl UserConfigMap {
    pub fn is_collateral_enabled(&self, index: u32) -> bool {
        (self.bitmap >> (2 * index)) & 1 == 1
    }
    
    pub fn is_borrowing(&self, index: u32) -> bool {
        (self.bitmap >> (2 * index + 1)) & 1 == 1
    }
    
    pub fn enable_collateral(&mut self, index: u32) {
        self.bitmap |= 1 << (2 * index);
    }
    
    pub fn disable_collateral(&mut self, index: u32) {
        self.bitmap &= !(1 << (2 * index));
    }
}

// Configuration details stored on-chain per asset reserve.
pub struct ReserveConfiguration {
    pub asset_address: Address,
    pub index: u32,
    pub is_active: bool,
    pub ltv_max: u32,
    pub liquidation_threshold: u32,
    pub supply_cap: i128,
    pub borrow_cap: i128,
    pub total_supplied_raw: i128,
    pub total_borrowed_raw: i128,
    pub supply_index: u128,
    pub borrow_index: u128,
    pub last_accrual_ledger: u64,
}

#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[contracterror]
pub enum Error {
    GenericError = 1,
    CapViolation = 100,             // Thrown when a deposit or borrow exceeds reserve capacity caps
    StalePrice = 101,              // Thrown when oracle price timestamp exceeds stale window
    PriceDeviationExceeded = 102,  // Thrown when price movement exceeds configured deviation threshold
    AssetPaused = 103,             // Thrown when performing transactions on a paused reserve
    InsolventPosition = 104,       // Thrown when an action results in HF < 1.0
    IndexAccrualOverflow = 105,    // Math overflows during interest compounding
}
```

---

## 2. Smart Contract Interfaces

### A. Core Lending Pool (`lending_pool`)
Coordinates deposits, withdrawals, borrows, and repayments.

```rust
pub trait LendingPoolTrait {
    // Deposits capital into the reserve pool and mints yield-bearing aTokens.
    // Reverts with Error::CapViolation if total_supplied + amount > supply_cap.
    fn supply(env: Env, user: Address, asset: Address, amount: i128) -> Result<(), Error>;

    // Redeems aTokens for the underlying asset. Reverts if Health Factor falls below 1.0.
    fn withdraw(env: Env, user: Address, asset: Address, amount: i128) -> Result<(), Error>;

    // Borrows an asset from the pool, establishing a debt-tracking position.
    // Reverts with Error::CapViolation if total_borrowed + amount > borrow_cap.
    fn borrow(env: Env, user: Address, asset: Address, amount: i128) -> Result<(), Error>;

    // Repays borrow debt and burns the corresponding debt-tracking tokens.
    fn repay(env: Env, user: Address, asset: Address, amount: i128) -> Result<(), Error>;

    // Pause reserve pool operations during emergency conditions.
    fn toggle_pause(env: Env, reserve_id: u32) -> Result<(), Error>;

    // Governance-controlled. Sets supply and borrow limits for a reserve pool. Must respect the 48-hour timelock.
    fn set_reserve_caps(env: Env, asset: Address, supply_cap: i128, borrow_cap: i128) -> Result<(), Error>;

    // Guardian-controlled. Triggers immediate reduction of caps without a timelock.
    // Reverts if new caps exceed current configured caps.
    fn emergency_reduce_caps(env: Env, asset: Address, new_supply_cap: i128, new_borrow_cap: i128) -> Result<(), Error>;
}
```

### B. Risk Engine (`risk_engine`)
A stateless helper verifying constraints and computing safety scores.

```rust
pub trait RiskEngineTrait {
    // Calculates the Health Factor of a target address based on collateral and debt valuations.
    fn calculate_health_factor(env: Env, user: Address) -> i128;

    // Checks whether a hypothetical borrow or withdrawal would cause insolvency.
    fn validate_position_safety(env: Env, user: Address, asset: Address, delta_amount: i128, is_withdraw: bool) -> bool;
}
```

### C. Interest Rate Engine (`interest_rate_engine`)
Calculates lending and borrowing APY percentages dynamically.

```rust
pub trait InterestRateEngineTrait {
    // Computes the current borrow and supply APYs based on pool utilization.
    fn get_rates(env: Env, total_supplied: i128, total_borrowed: i128) -> (u32, u32);
}
```

### D. Liquidation Coordinator (`liquidation`)
Coordinates the 2-step liquidation workflow to stay within CPU instruction limits.

```rust
pub trait LiquidationTrait {
    // Step 1: Evaluates borrower status, locks collateral, and generates a session ID.
    fn prepare_liquidation(env: Env, liquidator: Address, borrower: Address, debt_asset: Address, collateral_asset: Address) -> BytesN<32>;

    // Step 2: Settles debt repayment and transfers collateral with bonuses to the liquidator.
    fn execute_liquidation(env: Env, session_id: BytesN<32>) -> Result<(), Error>;
}
```

### E. Price Oracle Adapter (`price_oracle`)
Reads and filters Reflector/SEP-40-compatible price data. Manual mode is for local tests only.

```rust
pub trait PriceOracleAdapterTrait {
    // Returns the adapter price in WAD precision.
    fn get_price(env: Env, asset: Address) -> i128;

    // Returns the adapter price normalized to WAD precision.
    fn get_price_wad(env: Env, asset: Address) -> i128;

    // Maps a reserve asset to the external SEP-40 oracle asset.
    fn set_reflector_stellar_asset(env: Env, asset: Address, stellar_asset: Address);

    // Test/local only. Requires oracle mode `manual`.
    fn set_price(env: Env, asset: Address, price_wad: i128);
}
```

### F. Governance (`governance` & `timelock`)
Handles voting and system upgrades.

```rust
pub trait GovernanceTrait {
    // Submits a Protocol Improvement Proposal (PIP).
    fn propose(env: Env, proposer: Address, targets: Vec<Address>, values: Vec<i128>, calldatas: Vec<Bytes>, description: String) -> u32;

    // Casts a vote on a proposal.
    fn cast_vote(env: Env, voter: Address, proposal_id: u32, support: bool) -> Result<(), Error>;

    // Queues a passed proposal into the timelock contract.
    fn queue(env: Env, proposal_id: u32) -> Result<(), Error>;

    // Executes a queued proposal.
    fn execute(env: Env, proposal_id: u32) -> Result<(), Error>;
}
```

### G. Treasury (`treasury`)
Manages protocol reserves.

```rust
pub trait TreasuryTrait {
    // Releases accumulated reserve fee assets to fund system stability operations.
    fn release_reserves(env: Env, asset: Address, recipient: Address, amount: i128) -> Result<(), Error>;
}
```

---

## 3. Emitted Event Schemas

Contracts must emit explicit events for off-chain indexing:

| Event Name | Contract | Topics | Data Payload |
|---|---|---|---|
| `Supply` | `lending_pool` | `[Symbol("supply"), user, asset]` | `{ amount: i128 }` |
| `Withdraw` | `lending_pool` | `[Symbol("withdraw"), user, asset]` | `{ amount: i128 }` |
| `Borrow` | `lending_pool` | `[Symbol("borrow"), user, asset]` | `{ amount: i128 }` |
| `Repay` | `lending_pool` | `[Symbol("repay"), user, asset]` | `{ amount: i128 }` |
| `ReserveCapsUpdated`| `lending_pool`| `[Symbol("reserve_caps"), asset]` | `{ supply_cap: i128, borrow_cap: i128 }` |
| `LiquidationLock`| `liquidation` | `[Symbol("liq_lock"), borrower, session_id]`| `{ debt_asset: Address, collateral_asset: Address }`|
| `LiquidationSeize`| `liquidation` | `[Symbol("liq_seize"), liquidator, session_id]`| `{ amount_repaid: i128, amount_seized: i128 }` |
| `ProposalCreated`| `governance` | `[Symbol("proposal"), proposal_id, proposer]` | `{ description: String }` |

---

## 4. Interest Indexing & Fixed-Point Rounding Engine

To prevent compounding interest calculations on every individual ledger block for every active user vault, UdonFi V2 utilizes an index-based accumulator model.

### A. Core Compounding Interest Invariants

For each asset reserve, the protocol tracks the global accumulators:
- **`borrowIndex`**: Accrues borrow interest paid by borrowers. Starts at $1.0$ (scaled to $10^{27}$).
- **`supplyIndex`**: Accrues yield earned by depositors. Starts at $1.0$ (scaled to $10^{27}$).
- **`lastAccrualLedger`**: The block/ledger height at which rates were last updated.

### B. Accrual Math Equations

Whenever a user executes a contract interaction (Supply, Withdraw, Borrow, Repay, or Liquidation), the protocol accrues interest for that asset reserve prior to executing the state change:

1. **Calculate Pool Utilization Rate ($U$):**
   $$U = \frac{\text{totalBorrow}}{\text{totalSupply}}$$
   *(If total supply is 0, $U = 0$).*

2. **Compute Borrow APY ($R_{borrow}$):**
   - If $U \le U_{optimal}$:
     $$R_{borrow} = R_{base} + \left( \frac{U}{U_{optimal}} \right) \times R_{slope1}$$
   - If $U > U_{optimal}$:
     $$R_{borrow} = R_{base} + R_{slope1} + \left( \frac{U - U_{optimal}}{100\% - U_{optimal}} \right) \times R_{slope2}$$

3. **Compute Supply APY ($R_{supply}$):**
   $$R_{supply} = R_{borrow} \times U \times (1 - \text{reserveFactor})$$

4. **Calculate Ledger Delta ($\Delta L$):**
   $$\Delta L = \text{currentLedger} - \text{lastAccrualLedger}$$

5. **Accumulate New Interest Indexes:**
   $$\text{borrowIndex}_{new} = \text{borrowIndex}_{old} \times \left(1 + \frac{R_{borrow}}{L_{year}} \times \Delta L\right)$$
   $$\text{supplyIndex}_{new} = \text{supplyIndex}_{old} \times \left(1 + \frac{R_{supply}}{L_{year}} \times \Delta L\right)$$
   *(Where $L_{year} = 6,307,200$ representing the average number of ledger blocks committed per year on Stellar).*

### C. Scaled Balances vs. Actual Balances

A user's position balance is stored on-chain as a **Scaled Balance** (independent of time). The actual balance changes block-by-block and is derived using the index values:

1. **Borrow Debt Balance:**
   - **`scaledDebt`** is stored in user position entries.
   - **`actualDebt`** is computed as:
     $$\text{actualDebt} = \text{scaledDebt} \times \text{borrowIndex}$$
   - When borrowing or repaying, the vault adjusts `scaledDebt`:
     $$\text{scaledDebt}_{new} = \text{scaledDebt}_{old} \pm \frac{\Delta \text{amount}}{\text{borrowIndex}}$$

2. **Supply Capital Balance:**
   - **`scaledSupply`** is stored in user position entries.
   - **`actualSupply`** is computed as:
     $$\text{actualSupply} = \text{scaledSupply} \times \text{supplyIndex}$$
   - When depositing or withdrawing, the vault adjusts `scaledSupply`:
     $$\text{scaledSupply}_{new} = \text{scaledSupply}_{old} \pm \frac{\Delta \text{amount}}{\text{supplyIndex}}$$

### D. Fixed-Point Precision & Rounding Direction

All dynamic calculations are conducted in fixed-point integer math:
- **Base Scale**: Rates and Indexes are scaled to **Ray ($10^{27}$)**.
- **Balance Scale**: Asset amounts and shares are scaled to **Wad ($10^{18}$)**.

To protect the protocol from exploit runs due to integer division truncation:
- **Debt Rounding (Borrow / Repay)**: Scaled borrow and interest calculations must **round up** (in favor of protocol solvency, ensuring users pay slightly more rather than less).
- **Supply Rounding (Deposit / Withdraw)**: Scaled supply allocations and interest distributions must **round down** (protecting pool assets).
- **Rounding Direction Rules**:
  - `div_up(a, b) = (a + b - 1) / b`
  - `div_down(a, b) = a / b`
