# 17 - Failure Mode Analysis (FMA)

This document catalogs the potential failure modes of the UdonFi V2 protocol across technical, mathematical, economic, and administrative domains, detailing detection mechanisms and recovery procedures.

For the current MVP, this active document covers contract, oracle, governance, and economic failure modes.

---

## 1. Smart Contract Failures (FMA-CON-01 to FMA-CON-07)

### FMA-CON-01: Interest Index Math Overflow
- **Description**: Calculations for the interest index exceed the maximum size of a `u128` integer.
- **Impact**: Accrual functions fail, halting supply, withdrawal, borrow, and repayment operations.
- **Detection Method**: Transactions revert with an `IndexAccrualOverflow` error.
- **Mitigation**: Use safe math libraries with overflow checks. Calculate rates using fixed-point divisions with appropriate scaling.
- **Recovery Plan**: Governance upgrade to redeploy stateless rate libraries or reset index accumulators.
- **Severity**: Critical

### FMA-CON-02: Rounding Exploitation in Share Math
- **Description**: Borrowers exploit division rounding to borrow dust amounts of assets without accumulating debt shares.
- **Impact**: Drains pool liquidity over time.
- **Detection Method**: Divergence between actual pool balances and stored shares during state reconciliation.
- **Mitigation**: Enforce strict rounding up (`div_up`) for all borrow debt calculations.
- **Recovery Plan**: Guardian pauses the reserve pool, and governance upgrades the math engine.
- **Severity**: High

### FMA-CON-03: Storage TTL Expiration (State Eviction)
- **Description**: Core user balance or reserve config ledger entries expire due to low block TTL.
- **Impact**: Users lose access to their vaults, and reserve settings revert to uninitialized states.
- **Detection Method**: Queries to the contract return `None` or throw deserialization errors.
- **Mitigation**: Trigger `extend_ttl` during all write transactions.
- **Recovery Plan**: Restore evicted ledger entries using Stellar's native state restoration transactions.
- **Severity**: Critical

### FMA-CON-04: Reentrancy Exploitation
- **Description**: Attackers reenter contract methods during token transfers.
- **Impact**: Drains pool collateral.
- **Detection Method**: Multiple balance updates in a single transaction trace.
- **Mitigation**: Follow check-effects-interactions patterns and apply reentrancy guards to all external functions.
- **Recovery Plan**: Paused by Guardian, followed by governance contract patch.
- **Severity**: Critical

### FMA-CON-05: unauthorized administrative Action
- **Description**: Attackers bypass access controls and call restricted configuration methods.
- **Impact**: Arbitrary parameters (LTV, rates) are set, or contract is upgraded maliciously.
- **Detection Method**: Configuration change events emitted without matching governance transactions.
- **Mitigation**: Enforce strict `Admin` and `Guardian` role assertions using a standardized access control library.
- **Recovery Plan**: Guardian triggers global pause; governance rotates admin keys.
- **Severity**: Critical

### FMA-CON-06: Cross-Contract Call Out of Gas
- **Description**: Cross-contract invocations (Lending Pool calling Risk Engine, Oracle, etc.) exceed the 100M CPU instruction limit.
- **Impact**: Transactions revert, halting user actions.
- **Detection Method**: Simulation reports gas limits exceeded.
- **Mitigation**: Keep contracts lightweight and optimize loops.
- **Recovery Plan**: Governance upgrades contracts to consolidate stateless helpers into libraries.
- **Severity**: High

### FMA-CON-07: Pausable Method Bypass
- **Description**: Flaws in the pausing logic allow users to execute deposits or borrows during paused states.
- **Impact**: Enables attackers to withdraw assets during active exploits.
- **Detection Method**: Transaction logs show paused methods being executed.
- **Mitigation**: Apply `when_not_paused` checks to `supply` and `borrow` entry points.
- **Recovery Plan**: Deploy fixed contract version via governance upgrade.
- **Severity**: Critical

---

## 2. Oracle Failures (FMA-ORC-01 to FMA-ORC-06)

### FMA-ORC-01: Stale Oracle Prices
- **Description**: The oracle price feed stops updating, reporting outdated asset prices.
- **Impact**: Users borrow against overvalued collateral, or liquidators seize undervalued assets.
- **Detection Method**: Aggregator checks price timestamps and flags prices older than 3600 seconds.
- **Mitigation**: Aggregator reverts if price timestamp is stale.
- **Recovery Plan**: Switch to secondary feed or activate circuit breaker to freeze prices.
- **Severity**: High

### FMA-ORC-02: Price Feed Deviation
- **Description**: Primary and secondary price feeds return significantly different prices.
- **Impact**: Risk engine calculations are distorted.
- **Detection Method**: Price difference checks exceed the 2% deviation threshold.
- **Mitigation**: Aggregator rejects updates when deviation is exceeded.
- **Recovery Plan**: Fallback to TWAP pricing or freeze prices and pause operations.
- **Severity**: High

### FMA-ORC-03: Oracle Feed Outage (Unavailable)
- **Description**: Both primary and secondary oracle feeds are unavailable.
- **Impact**: Health Factor calculations fail, halting withdrawals, borrows, and liquidations.
- **Detection Method**: Contract calls to oracle feeds return RPC errors or time out.
- **Mitigation**: Switch to off-chain TWAP pricing.
- **Recovery Plan**: Governance updates pricing configurations or registers a new provider.
- **Severity**: Critical

### FMA-ORC-04: Flash-Loan Price Manipulation
- **Description**: Attackers manipulate on-chain price feeds using flash loans.
- **Impact**: Vaults are liquidated incorrectly, or the pool is drained.
- **Detection Method**: Sharp price fluctuations within a single block.
- **Mitigation**: Do not use DEX pool spot prices. Use decentralized oracle aggregates (Pyth, Band).
- **Recovery Plan**: Upgrade feeds and pause reserves during active attacks.
- **Severity**: Critical

### FMA-ORC-05: Oracle Provider Decimals Mismatch
- **Description**: Oracle provider changes price decimal precision without updating contract decoders.
- **Impact**: Asset values are calculated incorrectly, leading to instant insolvencies or borrowing limit increases.
- **Detection Method**: Asset prices drop or increase by orders of magnitude.
- **Mitigation**: Aggregator must validate decimals dynamically using the provider's metadata queries.
- **Recovery Plan**: Pause operations and deploy a patch via governance upgrade.
- **Severity**: Critical

### FMA-ORC-06: Future Timestamp Pricing
- **Description**: Oracle reports pricing data with timestamps in the future.
- **Impact**: Valid price updates are rejected, or stale checks are bypassed.
- **Detection Method**: Aggregator checks `timestamp > current_block_timestamp`.
- **Mitigation**: Revert transaction if oracle timestamp is in the future.
- **Recovery Plan**: Contact oracle provider; resolve clock sync issues.
- **Severity**: Medium

---

## 3. Governance Failures (FMA-GOV-01 to FMA-GOV-05)

### FMA-GOV-01: Malicious Proposal Execution
- **Description**: Attacker acquires enough tokens to pass a proposal that drains the treasury or upgrades contracts.
- **Impact**: Complete loss of protocol assets.
- **Detection Method**: Proposal is queued with malicious target details.
- **Mitigation**: Enforce a 48-hour timelock execution delay. This gives users time to withdraw assets if they disagree with the proposal.
- **Recovery Plan**: Guardian triggers pause; governance gathers veto votes.
- **Severity**: Critical

### FMA-GOV-02: Governance Quorum Attack
- **Description**: Attacker passes a proposal during low voter turnout, meeting the quorum limit with minimal tokens.
- **Impact**: Unauthorized parameter modifications.
- **Detection Method**: Proposal passes with low voter participation.
- **Mitigation**: Implement dynamic quorum requirements that scale with total token supply.
- **Recovery Plan**: Veto proposal or trigger Guardian pause.
- **Severity**: High

### FMA-GOV-03: Guardian Multisig Compromise
- **Description**: Attackers compromise a majority of Guardian multisig keys.
- **Impact**: Attacker triggers permanent pauses or reduces caps to 0, disrupting operations.
- **Detection Method**: Pauses triggered without matching emergency events.
- **Mitigation**: Guardian pauses expire automatically after 7 days if not finalized by governance.
- **Recovery Plan**: Governance proposal to replace Guardian addresses.
- **Severity**: High

### FMA-GOV-04: Timelock Bypass Exploitation
- **Description**: Vulnerabilities in the governance contract allow proposals to bypass the timelock.
- **Impact**: Malicious configurations are executed instantly, preventing user exits.
- **Detection Method**: Execution transaction completed without the 48-hour queue block delta.
- **Mitigation**: Enforce timelock assertions in contract bytecode.
- **Recovery Plan**: Pause contracts and deploy a patch via governance upgrade.
- **Severity**: Critical

### FMA-GOV-05: Proposal Expiration Failure
- **Description**: Governance fails to clear expired proposals from the queue.
- **Impact**: Stale proposals can be executed long after conditions have changed.
- **Detection Method**: Active queue contains proposals older than 7 days.
- **Mitigation**: Reject execution if current time exceeds proposal deadline + expiration window.
- **Recovery Plan**: Clear expired proposals using contract maintenance functions.
- **Severity**: Medium

---

## 4. Economic Failures (FMA-ECO-01 to FMA-ECO-06)

### FMA-ECO-01: Liquidity Shortage (Run on the Bank)
- **Description**: Utilization reaches 100%, leaving no idle underlying tokens for withdrawals.
- **Impact**: Depositors are unable to withdraw their capital until borrowers repay.
- **Detection Method**: Utilization U remains at 1.0.
- **Mitigation**: Kinked interest curve increases borrow APY exponentially, encouraging repayments and deposits.
- **Recovery Plan**: Inject capital from the Treasury Insurance Fund or pause new borrows.
- **Severity**: High

### FMA-ECO-02: Liquidation Cascade (Death Spiral)
- **Description**: Rapid asset price drops trigger cascading liquidations, overwhelming liquidator capacity.
- **Impact**: Collateral prices crash further due to sell pressure, causing systemic insolvency.
- **Detection Method**: Total bad debt increases, and Health Factors drop across the protocol.
- **Mitigation**: Use conservative LTV parameters and list diversified assets.
- **Recovery Plan**: Guardian pauses borrows and deposits; governance updates parameters.
- **Severity**: Critical

### FMA-ECO-03: Bad Debt Accumulation
- **Description**: Vault health factor falls below 1.0, but collateral value is less than outstanding debt.
- **Impact**: Protocol becomes insolvent, leaving depositors undercollateralized.
- **Detection Method**: Risk engine reports negative net equity in user positions.
- **Mitigation**: Enforce early liquidation thresholds and list low-volatility assets.
- **Recovery Plan**: Pay off bad debt using the Treasury Insurance Fund.
- **Severity**: Critical

### FMA-ECO-04: Insurance Fund Depletion
- **Description**: Bad debt events exhaust the Insurance Fund reserves.
- **Impact**: Protocol is unable to cover new insolvencies, exposing depositors to loss.
- **Detection Method**: Insurance Fund balance drops to 0.
- **Mitigation**: Allocate 10% of borrow interest to the Insurance Fund.
- **Recovery Plan**: Mint UDON governance tokens or allocate treasury reserves to recapitalize the fund.
- **Severity**: Critical

### FMA-ECO-05: Whale Withdrawal Shock
- **Description**: A large depositor withdraws a significant portion of pool liquidity.
- **Impact**: Utilization rate jumps, spikes borrow APY, and triggers borrow rejections.
- **Detection Method**: Sudden, large utilization changes.
- **Mitigation**: Implement withdrawal caps per transaction and dynamic withdrawal fees.
- **Recovery Plan**: Governance adjusts interest curve parameters to stabilize rates.
- **Severity**: High

### FMA-ECO-06: Interest Rate Curve Shock
- **Description**: Rapid utilization changes trigger extreme APY fluctuations.
- **Impact**: Borrowers face unexpected rate spikes, increasing insolvency risk.
- **Detection Method**: High rate volatility in dashboard charts.
- **Mitigation**: Implement smoothing parameters on the interest curve.
- **Recovery Plan**: Update curve parameters via governance.
- **Severity**: Medium
