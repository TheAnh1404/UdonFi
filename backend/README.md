# UdonFi V2 Backend Plan

The backend is optional Post-MVP work. It is not required for the current MVP demo.

## MVP Rule

The backend must not be the source of truth for:

- Balances.
- Debt.
- Health Factor.
- Liquidation state.
- Reserve liquidity.
- User collateral state.

The MVP frontend reads directly from Soroban RPC and writes through Freighter-signed transactions.

## Not Required for MVP

- REST API.
- WebSocket API.
- PostgreSQL event sync.
- Real-time dashboard sync.
- Sync lag middleware.
- Background workers.
- Queue system.
- Analytics pipeline.

## Future Backend Uses

After the contract and frontend MVP are stable, a backend may be used for:

- Metadata.
- Analytics.
- Historical charts.
- Cached market summaries.
- Activity history.
- Optional notification services.

## Future Reliability Topics

If backend analytics are implemented later, they should live under the Post-MVP architecture in `docs/future-work/backend-analytics.md` and should preserve this rule: on-chain state read through Soroban RPC remains authoritative.
