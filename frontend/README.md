# UdonFi V2 Frontend MVP

The frontend MVP is a React + Vite client that interacts directly with UdonFi Soroban contracts through Soroban RPC and Freighter Wallet. It does not require a backend, event indexer, PostgreSQL sync, WebSocket service, or liquidation bot.

## MVP Responsibilities

- Connect Freighter Wallet.
- Validate the user is on Stellar Testnet for demo.
- Read reserve and user state directly from Soroban RPC.
- Simulate deposit, withdraw, borrow, repay, and manual liquidation transactions.
- Request Freighter signatures.
- Submit signed XDR through Soroban RPC.
- Poll transaction status from Soroban RPC.
- Show Stellar Expert transaction links after submission.
- Store only local transaction history if needed for convenience.

## Source of Truth

Soroban contract state is the source of truth for:

- Balances.
- Scaled supply.
- Scaled debt.
- Available liquidity.
- Health Factor inputs.
- Liquidation eligibility.

The frontend must not depend on an indexer or backend for MVP dashboard correctness.

## Out of MVP Scope

- Event Indexer.
- Liquidation Bot.
- Analytics Backend.
- PostgreSQL Event Sync.
- Real-time Dashboard Pipeline.
- Background Workers.
- Sync lag strategy.

## Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Notes

Existing simulator and visual components may remain for education/demo UX, but production actions for the MVP should use Freighter-signed Soroban RPC transactions.
