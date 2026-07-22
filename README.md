# UdonFi V2 - Soroban Lending MVP

UdonFi V2 is a Stellar Soroban lending protocol MVP for a contract-first Testnet demo. The demo path is React frontend, Freighter wallet, Soroban RPC, UdonFi Soroban contracts, Stellar Testnet, and Stellar Expert transaction links.

The project is demo/testnet only. It is not mainnet-ready.

## MVP Status

- Smart contract MVP: initialize, reserve creation, deposit, withdraw, borrow, repay, interest, oracle-based health factor, and manual liquidation.
- Deployment preparation: Testnet deploy, initialize, and verify scripts under `contracts/scripts/`.
- Frontend MVP: Freighter connection, contract ID environment loading, Soroban RPC transaction submission, transaction hash display, and Stellar Expert links.

Out of scope for this MVP:

- Off-chain automation services.
- Off-chain analytics services.
- Mainnet oracle operations and governance.
- Governance.
- Mainnet deployment.

## Repository Layout

```text
contracts/      Soroban smart contracts, deployment scripts, contract env template
frontend/       React app for direct Freighter + Soroban RPC flows
deployments/    Testnet deployment output template
docs/           Protocol and demo documentation
scripts/        Repository helper notes
```

## Environment Setup

Create contract deployment env:

```bash
cp contracts/.env.example contracts/.env
```

Set `DEPLOYER_SECRET_KEY` in `contracts/.env`. Do not commit real secret keys.

Create frontend env manually or let `contracts/scripts/deploy-testnet.sh` generate `frontend/.env.local` after deployment:

```bash
cp frontend/.env.example frontend/.env.local
```

Required contract/frontend values:

```text
SOROBAN_RPC_URL
SOROBAN_NETWORK_PASSPHRASE
DEPLOYER_SECRET_KEY
LENDING_POOL_CONTRACT_ID
A_TOKEN_CONTRACT_ID
DEBT_TOKEN_CONTRACT_ID
RESERVE_CONTRACT_ID
PRICE_ORACLE_CONTRACT_ID
LIQUIDATION_CONTRACT_ID
ORACLE_MODE
REFLECTOR_CONTRACT_ID
MAX_PRICE_STALENESS_LEDGERS
XLM_ASSET_CONTRACT_ID
STELLAR_EXPERT_BASE_URL
```

Frontend variables use the same names with the `VITE_` prefix.

## Contract Commands

```bash
cd contracts
cargo build --target wasm32v1-none --release
cargo test
cargo fmt -- --check
cargo clippy --all-targets -- -D warnings
```

## Testnet Deployment

The scripts require the Stellar CLI, Rust toolchain, `wasm32v1-none` target, and a funded Testnet deployer secret key.

```bash
cd contracts
bash scripts/deploy-testnet.sh
bash scripts/init-testnet.sh
bash scripts/verify-testnet.sh
```

`deploy-testnet.sh` builds and deploys:

- `lending_pool`
- `a_token`
- `debt_token`
- `reserve`
- `price_oracle`
- `liquidation`

It writes:

- `deployments/testnet.json`
- `contracts/.env.local`
- `frontend/.env.local`

`init-testnet.sh` initializes the oracle, pool, liquidation engine, XLM aToken, XLM debtToken, and XLM reserve. For Testnet/demo, `ORACLE_MODE=reflector` is the intended mode and `REFLECTOR_CONTRACT_ID` must point to the deployed Reflector/SEP-40-compatible oracle. Manual oracle mode is only for local contract tests.

`verify-testnet.sh` reads contract state to confirm the pool, oracle, reserve, and liquidation engine are callable.

## Frontend Commands

```bash
cd frontend
npm install
npm run dev
npm run build
npm run lint
```

The frontend reads contract IDs and oracle configuration from `frontend/.env.local`, connects to Freighter, reads XLM/USD from the price oracle contract, reads Health Factor from the lending pool, builds Soroban transactions through RPC, signs through Freighter, submits to Testnet, polls confirmation, and renders Stellar Expert transaction links.

## Stellar Expert Verification

The frontend uses:

```text
https://stellar.expert/explorer/testnet
```

Transaction links are generated as:

```text
https://stellar.expert/explorer/testnet/tx/<transaction_hash>
```

Contract links are generated as:

```text
https://stellar.expert/explorer/testnet/contract/<contract_id>
```

## Demo Flow

See [docs/demo/demo-script.md](docs/demo/demo-script.md).

Short flow:

1. Open the frontend.
2. Connect Freighter on Testnet.
3. Confirm contract IDs are loaded.
4. Deposit XLM.
5. Open the transaction on Stellar Expert.
6. Borrow XLM.
7. Show XLM/USD oracle status and contract Health Factor.
8. Repay.
9. Withdraw.
10. Optionally prepare and execute manual liquidation.

## Known Limitations

- No off-chain automation service.
- No off-chain analytics service.
- Reflector/SEP-40 oracle contract ID must be configured for Testnet demos.
- Not mainnet-ready.
- Demo/testnet only.
- The default deployment initialization configures a single XLM reserve for the MVP path.

## License

This repository is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
