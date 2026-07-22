# 18 - Economic Attack Model

This document outlines potential economic attack vectors against the UdonFi V2 protocol, detailing preconditions, execution steps, protocol impacts, and mitigations.

---

## 1. Oracle Manipulation Attack
- **Description**: Attacker manipulates on-chain DEX price pools to distort the valuation of collateral or debt.
- **Preconditions**: Protocol uses a spot price source from an on-chain AMM pool.
- **Attack Steps**:
  1. Swap a large volume of tokens in a DEX pool to skew the price of token $i$.
  2. Borrow assets on UdonFi using the inflated valuation of token $i$.
  3. Let the loan default, leaving the protocol with overvalued, illiquid collateral.
- **Attacker Benefit**: Drains high-value assets from the protocol.
- **Protocol Impact**: Solvency loss and bad debt accumulation.
- **Existing Mitigations**: Do not use AMM spot pricing. Read prices through the Reflector/SEP-40 oracle adapter.
- **Missing Mitigations**: Implement maximum borrowing limits relative to pool liquidity.
- **Test Cases Required**: `test_oracle_manipulation_reversion`

---

## 2. Flash Loan Assisted Attack
- **Description**: Attacker uses a flash loan to manipulate interest rates or leverage positions within a single transaction block.
- **Preconditions**: Flash loan providers have sufficient liquidity, and protocol calculations can be manipulated instantly.
- **Attack Steps**:
  1. Borrow a large volume of token $i$ via a flash loan.
  2. Deposit the borrowed tokens into UdonFi to inflate the supply pool.
  3. Execute another action (e.g., triggering governance votes or rate changes) using the inflated balance.
  4. Withdraw the deposit and repay the flash loan in the same transaction block.
- **Attacker Benefit**: Manipulates protocol states or passes votes without holding long-term capital.
- **Protocol Impact**: Governance manipulation and rate volatility.
- **Existing Mitigations**: Enforce voting delays (6 hours) to prevent flash-loan voting attacks.
- **Missing Mitigations**: Block deposit-and-withdraw loops within the same transaction.
- **Test Cases Required**: `test_flash_loan_gating`

---

## 3. Interest Rate Manipulation
- **Description**: Attacker borrows and supplies large amounts of assets to artificially inflate or deflate interest rates.
- **Preconditions**: Attacker has significant capital, and the interest rate curve is highly sensitive to utilization changes.
- **Attack Steps**:
  1. Borrow assets to push the pool utilization rate to 100%, spiking the borrow APY to the maximum ($90\%$).
  2. Maintain this utilization rate, forcing other borrowers to pay high interest rates.
  3. Close positions once other borrowers are forced to default or repay under unfavorable conditions.
- **Attacker Benefit**: Manipulates borrow rates to penalize other users.
- **Protocol Impact**: High rate volatility and user defaults.
- **Existing Mitigations**: A steep interest rate curve penalizes high utilization, encouraging repayments.
- **Missing Mitigations**: Implement borrow rate limits to prevent sudden rate spikes.
- **Test Cases Required**: `test_rate_manipulation_bounds`

---

## 4. Borrow Cap Exhaustion
- **Description**: Attacker borrows the entire available capacity of an asset up to its borrow cap, preventing other users from borrowing.
- **Preconditions**: Attacker has sufficient collateral, and the borrow cap is set low relative to demand.
- **Attack Steps**:
  1. Deposit collateral into the protocol.
  2. Borrow token $j$ up to the configured `borrowCap`.
  3. Hold the borrowed assets, blocking other users from borrowing.
- **Attacker Benefit**: Restricts liquidity for competitor projects or users.
- **Protocol Impact**: Protocol utility is restricted for other users.
- **Existing Mitigations**: Borrows check `total_borrowed + amount <= borrowCap` on-chain.
- **Missing Mitigations**: Dynamic borrow caps that adjust based on utilization and demand.
- **Test Cases Required**: `test_borrow_cap_exhaustion_revert`

---

## 5. Supply Cap Griefing
- **Description**: Attacker deposits assets up to the supply cap, preventing other users from depositing.
- **Preconditions**: Attacker has significant capital.
- **Attack Steps**:
  1. Deposit token $i$ up to the configured `supplyCap`.
  2. Block other depositors from earning yield on the asset.
- **Attacker Benefit**: Restricts protocol growth and limits competitor deposits.
- **Protocol Impact**: Deposit options are limited for other users.
- **Existing Mitigations**: Deposits check `total_supplied + amount <= supplyCap`.
- **Missing Mitigations**: Dynamic supply caps that adjust based on utilization and demand.
- **Test Cases Required**: `test_supply_cap_griefing`

---

## 6. Liquidation Spam (Gas Griefing)
- **Description**: Attacker submits multiple liquidation transactions for the same insolvent vault to block other liquidators.
- **Preconditions**: Network fees are low, allowing attackers to spam transactions.
- **Attack Steps**:
  1. Monitor mempools for pending `prepare_liquidation` transactions.
  2. Submit duplicate transactions with higher fees to front-run other liquidators.
- **Attacker Benefit**: Seizes liquidation bonuses by front-running other liquidators.
- **Protocol Impact**: Network congestion and higher transaction fees.
- **Existing Mitigations**: The 2-step liquidation process locks the collateral and generates a secure session ID, preventing other liquidators from executing the same liquidation during the session window.
- **Missing Mitigations**: Implement penalties for failed or duplicate liquidation attempts.
- **Test Cases Required**: `test_liquidation_lock_exclusivity`

---

## 7. Liquidation Sandwiching
- **Description**: Attackers manipulate price feeds to temporarily push a user's vault into insolvency, execute a liquidation, and restore the price.
- **Preconditions**: Price feeds are vulnerable to short-term manipulation.
- **Attack Steps**:
  1. Manipulate price feeds to drop the collateral valuation of the target vault.
  2. Execute the liquidation transaction once the Health Factor drops below 1.0.
  3. Restore the price feed to its normal value, pocketing the liquidation bonus.
- **Attacker Benefit**: Seizes user collateral at a discount.
- **Protocol Impact**: Users lose funds unjustly, undermining trust.
- **Existing Mitigations**: Use the Reflector/SEP-40 oracle adapter with stale, invalid, and deviation checks.
- **Missing Mitigations**: Require the price to remain below the liquidation threshold for a minimum duration before allowing liquidation.
- **Test Cases Required**: `test_liquidation_sandwich_prevention`

---

## 8. Governance Takeover
- **Description**: Attacker accumulates enough voting tokens to pass proposals that compromise the protocol.
- **Preconditions**: Token distribution is concentrated, or voting power can be borrowed using flash loans.
- **Attack Steps**:
  1. Accumulate UDON tokens (e.g. via market purchases or flash loans).
  2. Submit a proposal to upgrade contract WASM hashes to a malicious implementation.
  3. Vote "Yes" and execute the proposal once the timelock expires.
- **Attacker Benefit**: Steals pool assets and treasury funds.
- **Protocol Impact**: Complete protocol collapse.
- **Existing Mitigations**: Enforce a 48-hour timelock execution delay. This gives users time to withdraw assets if they disagree with the proposal.
- **Missing Mitigations**: Implement dynamic quorums and emergency veto capabilities for the Guardian role.
- **Test Cases Required**: `test_governance_takeover_prevention`

---

## 9. Bad Debt Creation
- **Description**: Attacker borrows assets against volatile collateral and defaults, leaving the protocol with bad debt.
- **Preconditions**: Risk parameters (LTV, liquidation threshold) are configured too high for a volatile asset.
- **Attack Steps**:
  1. Deposit a volatile asset as collateral.
  2. Borrow stablecoins up to the maximum LTV limit.
  3. Let the collateral price drop quickly without repaying the debt.
- **Attacker Benefit**: Attacker exits with borrowed stablecoins, leaving the protocol with unrecoverable bad debt.
- **Protocol Impact**: Solvency loss for depositors.
- **Existing Mitigations**: Set conservative LTV parameters and use a 2-step liquidation process.
- **Missing Mitigations**: Implement Isolation Mode for volatile assets.
- **Test Cases Required**: `test_bad_debt_writeoff`

---

## 10. Liquidity Drain
- **Description**: Attacker exploits interest compounding calculations to drain pool liquidity.
- **Preconditions**: Rounding errors or precision losses exist in the fixed-point math engine.
- **Attack Steps**:
  1. Deposit and withdraw assets repeatedly in small increments.
  2. Exploit rounding discrepancies to accumulate small amounts of free interest.
- **Attacker Benefit**: Slowly drains pool liquidity.
- **Protocol Impact**: Pool assets are diluted.
- **Existing Mitigations**: Enforce rounding directions: supply operations round down, borrow operations round up.
- **Missing Mitigations**: Apply dynamic transaction fees to prevent high-frequency transaction loops.
- **Test Cases Required**: `test_precision_drain_prevention`

---

## 11. Whale Manipulation
- **Description**: A large depositor withdraws their capital suddenly to manipulate interest rates and trigger liquidations.
- **Preconditions**: Capital concentration is high in the pool.
- **Attack Steps**:
  1. Supply a large volume of tokens to lower borrow interest rates.
  2. Encourage other users to borrow against their collateral.
  3. Withdraw the supplied capital suddenly, spiking interest rates and pushing borrowers into insolvency.
- **Attacker Benefit**: Spikes interest rates to penalize other users.
- **Protocol Impact**: Vault insolvencies and user defaults.
- **Existing Mitigations**: A steep interest rate curve penalizes high utilization, encouraging repayments.
- **Missing Mitigations**: Implement withdrawal caps per transaction and dynamic withdrawal fees.
- **Test Cases Required**: `test_whale_withdrawal_rate_spikes`

---

## 12. Reserve Factor Abuse
- **Description**: Attacker manipulates interest rate calculations to divert excess revenue to the treasury reserve.
- **Preconditions**: Reserve factor parameters are configurable without governance oversight.
- **Attack Steps**:
  1. Compromise admin keys or governance proposals.
  2. Increase the Reserve Factor to 100%, diverting all interest paid by borrowers to the treasury.
- **Attacker Benefit**: Diverts interest revenue away from depositors to the treasury.
- **Protocol Impact**: Depositors earn 0% yield, leading to withdrawals and capital flight.
- **Existing Mitigations**: Reserve factor parameters must go through the standard 48-hour timelock delay.
- **Missing Mitigations**: Hardcode a maximum cap on the Reserve Factor (e.g. maximum 30%).
- **Test Cases Required**: `test_reserve_factor_cap`

---

## 13. Price Deviation Exploitation
- **Description**: Attacker exploits price differences between primary and secondary feeds to borrow assets at a discount.
- **Preconditions**: Price deviation thresholds are configured too high.
- **Attack Steps**:
  1. Monitor price feeds for deviation.
  2. Borrow assets using the inflated price feed before the aggregator syncs or reverts.
- **Attacker Benefit**: Borrows assets at an undervalued rate.
- **Protocol Impact**: Solvency loss and incorrect liquidations.
- **Existing Mitigations**: Oracle adapter rejects updates when price deviation exceeds the configured threshold.
- **Missing Mitigations**: Implement dynamic price deviation thresholds that scale with asset volatility.
- **Test Cases Required**: `test_deviation_limit_gating`

---

## 14. Stale Price Borrowing
- **Description**: Attacker borrows assets using stale oracle prices during a market crash.
- **Preconditions**: Price freshness checks are missing or configured with long staleness windows.
- **Attack Steps**:
  1. Monitor price feeds for delays during market drops.
  2. Borrow assets using the overvalued stale price before the oracle updates.
- **Attacker Benefit**: Exits with borrowed assets at an overvalued rate.
- **Protocol Impact**: Bad debt accumulation.
- **Existing Mitigations**: Price feeds are marked as stale and updates revert if they are older than 3600 seconds.
- **Missing Mitigations**: Reduce the price staleness window to 300 seconds for highly volatile assets.
- **Test Cases Required**: `test_stale_price_borrowing_revert`

---

## 15. Index Rounding Exploitation
- **Description**: Attacker exploits rounding discrepancies during interest index updates to inflate their balance.
- **Preconditions**: Precision losses exist in index-compounding division logic.
- **Attack Steps**:
  1. Execute high-frequency deposit and borrow transactions.
  2. Exploit rounding discrepancies during index updates to inflate balances.
- **Attacker Benefit**: Slowly drains pool liquidity.
- **Protocol Impact**: Dilutes pool assets.
- **Existing Mitigations**: Enforce rounding directions: supply operations round down, borrow operations round up.
- **Missing Mitigations**: Apply dynamic transaction fees to prevent high-frequency transaction loops.
- **Test Cases Required**: `test_index_rounding_exploitation`
