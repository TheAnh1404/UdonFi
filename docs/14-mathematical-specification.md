# 14 - Mathematical Specification

This document details the mathematical formulas, fixed-point math conventions, and worked numerical examples of the UdonFi V2 protocol.

## 1. Interest Model Formulas

### A. Pool Utilization Rate ($U$)
Utilization represents the ratio of borrowed assets to total supplied liquidity:
$$U = \begin{cases} 
      0 & \text{if } S_{total} = 0 \\
      \frac{B_{total}}{S_{total}} & \text{if } S_{total} > 0 
   \end{cases}$$
*Where $B_{total}$ is total borrowed underlying assets, and $S_{total}$ is total supplied underlying assets.*

### B. Borrow Rate ($R_{borrow}$)
Borrow APY increases dynamically relative to the optimal utilization kink ($U_{optimal} = 80\%$):
- **If $U \le U_{optimal}$**:
  $$R_{borrow} = R_{base} + \left( \frac{U}{U_{optimal}} \right) \times R_{slope1}$$
- **If $U > U_{optimal}$**:
  $$R_{borrow} = R_{base} + R_{slope1} + \left( \frac{U - U_{optimal}}{100\% - U_{optimal}} \right) \times R_{slope2}$$

*Parameters:*
- $R_{base} = 1\%$ ($10^{25}$ in Ray)
- $R_{slope1} = 4\%$ ($4 \times 10^{25}$ in Ray)
- $R_{slope2} = 85\%$ ($8.5 \times 10^{26}$ in Ray)

### C. Supply Rate ($R_{supply}$)
The interest paid by borrowers is distributed to suppliers, adjusted for the reserve factor ($RF$):
$$R_{supply} = R_{borrow} \times U \times (1 - RF)$$
*Where $RF$ is the Reserve Factor (set to $10\%$).*

### D. Per-Ledger Compounding & Indexes ($I$)
Interest is accrued over the block delta ($\Delta L$) and compounded dynamically:
$$\text{borrowIndex}_{t} = \text{borrowIndex}_{t-1} \times \left(1 + \frac{R_{borrow}}{L_{year}} \times \Delta L\right)$$
$$\text{supplyIndex}_{t} = \text{supplyIndex}_{t-1} \times \left(1 + \frac{R_{supply}}{L_{year}} \times \Delta L\right)$$
*Where $L_{year} = 6,307,200$ (representing average blocks per year on Stellar).*

---

## 2. Collateral, Borrowing & Health Factor

To evaluate a user's vault solvency:

### A. Total Collateral Value ($V_{collateral}$)
The total value of enabled collateral in USD:
$$V_{collateral} = \sum_{i} \left( \text{actualSupply}_{i} \times P_{i} \right)$$
*Where $P_i$ is the USD price of asset $i$ from the Oracle aggregator.*

### B. Total Borrow Value ($V_{borrow}$)
The total value of borrowed assets in USD:
$$V_{borrow} = \sum_{j} \left( \text{actualDebt}_{j} \times P_{j} \right)$$

### C. Weighted Liquidation Threshold ($LT_{weighted}$)
The weighted liquidation threshold of the user's collateral portfolio:
$$LT_{weighted} = \frac{\sum_{i} \left( \text{actualSupply}_{i} \times P_{i} \times LT_{i} \right)}{V_{collateral}}$$

### D. Health Factor ($HF$)
The solvency safety score of a user's vault:
$$HF = \frac{\sum_{i} \left( \text{actualSupply}_{i} \times P_{i} \times LT_{i} \right)}{V_{borrow}}$$
- If $HF < 1.0$, the vault is eligible for liquidation.

---

## 3. Liquidation Mathematics

During liquidation, a portion of the borrower's debt is repaid, and the corresponding amount of collateral is seized plus a bonus.

### A. Collateral Seized ($\text{Collateral}_{seized}$)
The amount of collateral asset $i$ seized to cover debt asset $j$ repayment:
$$\text{Collateral}_{seized} = \frac{\text{Repay Amount}_j \times P_j}{P_i} \times (1 + \text{Bonus}_i)$$
*Where $\text{Bonus}_i$ is the liquidation bonus (typically 5%).*

---

## 4. Share Accounting (Ray & Wad Precision)

UdonFi uses fixed-point math to store values without decimals:
- **Ray Scale**: $10^{27}$ (used for rates and accumulator indexes).
- **Wad Scale**: $10^{18}$ (used for asset balances and token shares).

### A. Conversion Math
- **Deposit**: Calculates scaled supply shares:
  $$\text{scaledSupply} = \text{div\_down}(\text{depositAmount} \times 10^{27}, \text{supplyIndex})$$
- **Borrow**: Calculates scaled debt shares:
  $$\text{scaledDebt} = \text{div\_up}(\text{borrowAmount} \times 10^{27}, \text{borrowIndex})$$
- **Actual Balance**: Retrieves index-accrued balance:
  $$\text{actualBalance} = \frac{\text{scaledBalance} \times \text{globalIndex}}{10^{27}}$$

### Rounding Directions:
- **Debt operations (Borrow / Repay)**: Always round **up** (`div_up`) during share division to prevent users from underpaying debt.
- **Supply operations (Deposit / Withdraw)**: Always round **down** (`div_down`) during share division to prevent users from overclaiming shares.

---

## 5. Worked Numerical Examples

### Example 1: Deposit and Supply Share Calculation
- **Context**: User deposits $1,000$ USDC. The current global `supplyIndex` is $1.050000000000000000000000000$ ($1.05 \times 10^{27}$ in Ray).
- **Calculations**:
  $$\text{scaledSupply} = \frac{1000 \times 10^{18} \times 10^{27}}{1.05 \times 10^{27}} = \frac{10^{48}}{1.05 \times 10^{27}} = 952.380952380952380952 \times 10^{18} \text{ shares}$$
  - Since it is a supply operation, we round **down** to $952.380952380952380952$ shares.

### Example 2: Borrow and Health Factor Evaluation
- **Context**: A user supplies $10,000$ XLM as collateral ($P_{XLM} = \$0.15$, $LT_{XLM} = 80\%$) and borrows $1,000$ USDC ($P_{USDC} = \$1.00$).
- **Calculations**:
  - Collateral value: $10,000 \times 0.15 = \$1,500$ USD.
  - Borrow value: $1,000 \times 1.00 = \$1,000$ USD.
  - Health Factor ($HF$):
    $$HF = \frac{1500 \times 0.80}{1000} = \frac{1200}{1000} = 1.20$$
  - Since $1.0 \le 1.20 \le 1.50$, the vault is marked as **Healthy (Warning)** but safe from liquidation.

### Example 3: Interest Accrual Over Ledgers
- **Context**: Lending pool total borrowed is $5,000$ USDC, total supplied is $10,000$ USDC. The last accrual block was $100$ blocks ago. Current `borrowIndex` is $1.02 \times 10^{27}$.
- **Calculations**:
  - Utilization Rate ($U$): $\frac{5000}{10000} = 50\%$.
  - Borrow APY ($R_{borrow}$): Since $50\% \le 80\%$, $R_{borrow} = 1\% + (50/80) \times 4\% = 3.5\%$.
  - Per-ledger rate: $\frac{3.5\%}{6,307,200 \text{ blocks}} = 5.5492 \times 10^{-9}$ per ledger block.
  - New `borrowIndex`:
    $$\text{borrowIndex}_{new} = 1.02 \times 10^{27} \times \left(1 + 5.5492 \times 10^{-9} \times 100\right) = 1.020000566 \times 10^{27}$$

### Example 4: Partial Liquidation Scenario
- **Context**: Borrower has $\$1,000$ USDC debt and $\$1,100$ USD worth of XLM collateral ($P_{XLM} = \$0.11$, $LT_{XLM} = 80\%$). The Health Factor is:
  $$HF = \frac{1100 \times 0.80}{1000} = 0.88 \quad (\text{Insolvent})$$
  - Close factor is $50\%$, meaning the liquidator repays $\$500$ USDC of debt. The liquidation bonus is $5\%$.
- **Calculations**:
  - Debt to repay: $\$500$ USDC.
  - Seized collateral value in USD: $500 \times (1 + 0.05) = \$525$ USD.
  - Seized XLM amount: $\frac{\$525}{\$0.11} = 4,772.7272$ XLM.
  - Remaining borrower debt: $\$500$ USDC.
  - Remaining borrower collateral value: $1,100 - 525 = \$575$ USD ($5,227.2728$ XLM).
  - New Health Factor ($HF$):
    $$HF = \frac{575 \times 0.80}{500} = 0.92$$

### Example 5: Bad Debt Realization
- **Context**: A vault has $\$1,000$ USDC debt and $\$900$ USD worth of XLM collateral. Health Factor is:
  $$HF = \frac{900 \times 0.80}{1000} = 0.72$$
  - The liquidator executes the liquidation, seizing 100% of the collateral ($\$900$ USD worth of XLM).
- **Calculations**:
  - Seized collateral: $\$900$ USD worth of XLM (transferred to the liquidator).
  - Borrower debt repaid by liquidator: $\frac{900}{1 + 0.05} = \$857.14$ USDC.
  - Unpaid borrower debt (Bad Debt): $1000 - 857.14 = \$142.86$ USDC.
  - The Insurance Fund contract transfers $\$142.86$ USDC into the pool to cover the bad debt, and the borrower's debt position is closed.
