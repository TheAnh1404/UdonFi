# 12 - Development Roadmap & Future Vision

The roadmap is refocused around a contract-first MVP demo.

## 1. MVP Roadmap

### Sprint 1: Core Contract Foundation
- Pool state.
- Reserve registry.
- Config engine.
- Shared accounting primitives.
- Basic event bus.

### Sprint 2: Accounting + Interest + Supply
- Accounting ledger and reserve accounting.
- Interest index helpers.
- Supply validation and deposit execution.
- Contract tests.

### Sprint 3: Withdraw + Borrow + Repay
- Withdraw validation/execution.
- Borrow validation/execution.
- Repay validation/execution.
- State and event tests.

### Sprint 4: Risk + Manual Liquidation
- Basic Health Factor.
- Borrow/withdraw risk checks.
- Manual liquidation eligibility and execution.
- Close factor and liquidation bonus.

### Sprint 5: Contract Integration Tests + Testnet Deployment
- Full contract MVP flow tests.
- Testnet build/deploy scripts.
- Reserve initialization.
- Manual demo runbook.

### Sprint 6: Frontend MVP + Freighter + Stellar Expert Links
- Direct Soroban RPC reads.
- Freighter connection and signing.
- Deposit/withdraw/borrow/repay/manual liquidation screens.
- Transaction status polling.
- Stellar Expert transaction links.

## 2. MVP Completion Milestones

- Contract MVP passes tests.
- Frontend can connect Freighter on Testnet.
- Frontend can read contract state directly from Soroban RPC.
- Frontend can submit signed transactions.
- Deposit, withdraw, borrow, repay, Health Factor, and manual liquidation demo works.
- Stellar Expert links are shown after transaction submission.

## 3. Future Work

- Historical APY/TVL analytics.
- Off-chain service design, if needed after the contract-first demo.
- Production monitoring and alerting.
- Production oracle hardening.

## 4. Longer-Term Production Work

- Security audit and remediation.
- Oracle hardening and stale-price policy.
- Mainnet deployment governance.
- Operational monitoring.
- Disaster recovery and incident runbooks.
- Performance and load testing at production traffic levels.
