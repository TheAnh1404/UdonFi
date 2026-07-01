# MVP Scope Refactor Report

## Summary

UdonFi V2 MVP was simplified to reduce delivery risk and focus the demo on the protocol path that must work first: smart contracts plus a frontend that signs and submits transactions through Freighter. Off-chain services are useful, but they add operational complexity that is not required to prove deposit, withdraw, borrow, repay, Health Factor, and manual liquidation on Stellar Testnet.

## New MVP Architecture

```txt
React Frontend
  -> Freighter Wallet
  -> Soroban RPC
  -> UdonFi Soroban Smart Contracts
  -> Stellar Testnet
  -> Stellar Expert transaction links
```

The frontend reads contract state directly from Soroban RPC and writes through Freighter-signed Soroban transactions. Contract events remain for debugging and Stellar Explorer visibility.

## Removed from MVP

- Event Indexer.
- Liquidation Bot.
- Simulated Bot.
- Analytics Backend.
- PostgreSQL Event Sync.
- Real-time Dashboard Pipeline.
- Background Workers.
- Queue system.
- Sync lag strategy.
- Checkpoint and replay system.
- Off-chain monitor.

## Moved to Future Work

- `docs/future-work/indexer-architecture.md`
- `docs/future-work/liquidation-bot.md`
- `docs/future-work/backend-analytics.md`
- Backend/indexer/bot references in roadmap, architecture, testing, risk, release, onboarding, and contributor docs are marked Post-MVP / Future Work.

## Remaining MVP Work

- Contract MVP.
- Frontend MVP.
- Freighter integration.
- Testnet deploy.
- Stellar Expert links.

## Risks

- No real-time indexed analytics.
- Frontend RPC reads may be slower than indexed reads.
- Manual liquidation only.
- No automated monitoring.
- Not production-ready.

## Final Status

MVP SCOPE SIMPLIFIED  READY TO COMPLETE CONTRACT + FRONTEND DEMO
