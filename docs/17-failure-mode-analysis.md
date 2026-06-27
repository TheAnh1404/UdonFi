# 17 - Failure Mode Analysis (FMA)

This document catalogs the potential failure modes of the UdonFi V2 protocol across technical, mathematical, economic, and administrative domains, detailing detection mechanisms and recovery procedures.

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
- **Detection Method**: Divergence between actual pool balances and stored shares in database audit logs.
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

## 3. Indexer Failures (FMA-IDX-01 to FMA-IDX-06)

### FMA-IDX-01: Sync Lag Behind Ledger Tip
- **Description**: The event indexer falls behind the actual network tip.
- **Impact**: Dashboard displays stale user balances and health factors, leading to incorrect transaction decisions.
- **Detection Method**: Backend compares `networkLedger` against `latestProcessedLedger`.
- **Mitigation**: Flag `isStale: true` when lag > 3 blocks.
- **Recovery Plan**: Enter Catch-up Mode, querying blocks in batches.
- **Severity**: High

### FMA-IDX-02: Duplicate Event Processing
- **Description**: The indexer processes the same event log multiple times.
- **Impact**: User balances are inflated in the database, distorting dashboard stats.
- **Detection Method**: Database constraints violate or duplicate entry exceptions occur.
- **Mitigation**: Apply composite primary keys to database tables and use `ON CONFLICT DO NOTHING` clauses.
- **Recovery Plan**: Truncate affected tables and re-sync from the last valid ledger height.
- **Severity**: High

### FMA-IDX-03: Missed Events during RPC Timeouts
- **Description**: The indexer skips ledgers during RPC disconnects.
- **Impact**: User positions are not updated, leading to data inconsistencies.
- **Detection Method**: Indexer detects gaps in block sequences.
- **Mitigation**: Implement strict sequential polling; indexer must halt and throw errors if block sequences are skipped.
- **Recovery Plan**: Restart indexer, forcing it to scan from the last recorded block height in PostgreSQL.
- **Severity**: High

### FMA-IDX-04: Database Write Congestion
- **Description**: High transaction volume on-chain overwhelms PostgreSQL write capacity.
- **Impact**: Indexer falls behind, and API queries time out.
- **Detection Method**: DB connection pool exhaustion errors and indexer queue lag.
- **Mitigation**: Implement a message broker queue and optimize database indexing.
- **Recovery Plan**: Scale up database resources or increase connection limits.
- **Severity**: Medium

### FMA-IDX-05: Event Reordering during Re-indexing
- **Description**: Running re-indexing scripts processes events out of chronological order.
- **Impact**: Corrupts user balances and vault states in the database.
- **Detection Method**: User balances do not match actual on-chain balances.
- **Mitigation**: Sort all event logs by ledger block sequence and event index before writing.
- **Recovery Plan**: Clear database state and rerun sequential re-indexing.
- **Severity**: High

### FMA-IDX-06: Database Corruption
- **Description**: Disk failures or database crashes corrupt state tables.
- **Impact**: API services fail, and dashboard stats are lost.
- **Detection Method**: Database returns read/write exceptions.
- **Mitigation**: Configure daily automated backups and RDS read-replicas.
- **Recovery Plan**: Restore from backup and replay events starting from the backup block height.
- **Severity**: High

---

## 4. Backend/API Failures (FMA-API-01 to FMA-API-05)

### FMA-API-01: API Serving Stale Data as Fresh
- **Description**: Backend serves stale cached data without metadata flags.
- **Impact**: Users interact with the protocol based on incorrect balance information.
- **Detection Method**: Health check monitors detect `isStale: false` when sync lag is > 3 blocks.
- **Mitigation**: Enforce cache invalidation policies and set `isStale: true` based on lag checks.
- **Recovery Plan**: Clear Redis cache and restart backend API servers.
- **Severity**: High

### FMA-API-02: API Rate-Limit Exhaustion
- **Description**: DDoS attacks or heavy user traffic exhaust API gateway capacity.
- **Impact**: Dashboard fails to load.
- **Detection Method**: API returns `429 Too Many Requests`.
- **Mitigation**: Apply rate-limiting middleware (e.g. rate limits per IP address).
- **Recovery Plan**: Route traffic through Cloudflare protections or scale up API server clusters.
- **Severity**: Medium

### FMA-API-03: Authentication Bypass
- **Description**: Vulnerabilities in middleware allow unauthorized access to write-like endpoints.
- **Impact**: Attacker alters user profiles or API configurations.
- **Detection Method**: Audit logs show configuration updates from unauthorized addresses.
- **Mitigation**: Enforce cryptographic signature verification for all administrative REST endpoints.
- **Recovery Plan**: Revoke sessions and patch auth middleware.
- **Severity**: High

### FMA-API-04: Redis Cache Inconsistency
- **Description**: Redis cache fails to update after database changes.
- **Impact**: Dashboard displays out-of-sync balance details.
- **Detection Method**: API returns different data depending on whether it reads from cache or database.
- **Mitigation**: Set low TTL values (e.g., 2 seconds) on all cache entries.
- **Recovery Plan**: Flush Redis cache.
- **Severity**: Medium

### FMA-API-05: Database Connection Exhaustion
- **Description**: High API traffic exhausts the backend PostgreSQL connection pool.
- **Impact**: API endpoints return `500 Internal Server Error`.
- **Detection Method**: Logs show database connection timeout errors.
- **Mitigation**: Use connection pooling libraries and set maximum connection limits.
- **Recovery Plan**: Increase PostgreSQL connection limits and scale up read-replicas.
- **Severity**: Medium

---

## 5. Governance Failures (FMA-GOV-01 to FMA-GOV-05)

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

## 6. Economic Failures (FMA-ECO-01 to FMA-ECO-06)

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
