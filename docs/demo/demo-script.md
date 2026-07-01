# UdonFi V2 Testnet Demo Script

## Pre-Demo Setup

1. Build and test contracts:

   ```bash
   cd contracts
   cargo build --target wasm32v1-none --release
   cargo test
   ```

2. Create `contracts/.env` from `contracts/.env.example` and set `DEPLOYER_SECRET_KEY`.

3. Deploy and initialize Testnet contracts:

   ```bash
   cd contracts
   bash scripts/deploy-testnet.sh
   bash scripts/init-testnet.sh
   bash scripts/verify-testnet.sh
   ```

4. Confirm `frontend/.env.local` was generated with Testnet contract IDs.

5. Start the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Live Demo Flow

1. Open the Vite app in the browser.

2. Connect Freighter wallet.

3. Confirm Freighter is on Stellar Testnet.

4. Show deployed contract IDs in the dashboard and open one contract on Stellar Expert.

5. Deposit XLM collateral.

6. After success, open the submitted transaction on Stellar Expert.

7. Borrow XLM against the collateral.

8. Refresh and show the Health Factor card.

9. Repay XLM debt.

10. Withdraw XLM collateral.

11. Optional manual liquidation:
    - Use an unhealthy borrower account.
    - Prepare liquidation with borrower, debt asset, collateral asset, and debt amount.
    - Execute liquidation with the returned session ID.
    - Open both submitted transactions on Stellar Expert.

12. Explain post-MVP features:
    - No off-chain automation service.
    - No off-chain analytics service.
    - No production oracle aggregation.
    - Testnet/demo only, not mainnet-ready.

## Expected Demo Signals

- Wallet public key is visible after connecting.
- Contract IDs are loaded from `frontend/.env.local`.
- Each action shows transaction phases from idle through success or error.
- Successful actions display a transaction hash.
- Transaction hashes link to Stellar Expert Testnet.
- User deposit, debt, reserve count, and health factor refresh after transactions.
