# Post-MVP: Liquidation Bot and Off-Chain Monitor

This document preserves automated liquidation monitoring as future work. It is not required for the MVP, not required for the demo, and must not block manual liquidation.

## Status

Post-MVP / Future Work.

## MVP Behavior

Liquidation is manual in the MVP:

- A user or liquidator selects a borrower position.
- The frontend reads state directly from Soroban RPC.
- The liquidation transaction is simulated.
- Freighter signs the transaction.
- Soroban RPC submits it.
- The UI shows a Stellar Expert transaction link.

## Future Bot Responsibilities

- Monitor borrower Health Factors.
- Detect liquidation candidates.
- Estimate profitability and close factor.
- Submit liquidation transactions through a controlled signer.
- Track failures, retries, and transaction inclusion.

## Not Required for MVP

- No liquidation bot.
- No simulated bot.
- No off-chain monitor.
- No background worker.
- No queue system.
- No automated liquidation candidate feed.

## Future Risks to Resolve

- Signer custody and key management.
- Front-running and failed liquidation races.
- RPC outage handling.
- Bad price or stale state handling.
- Transaction fee estimation.
- Bot profitability checks.

## Re-entry Criteria

Build the bot only after the contract and frontend MVP are stable and manual liquidation is proven on Testnet.
