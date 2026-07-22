# UdonFi V2 Testnet Demo Script

## Pre-Demo Setup

1. Build and test contracts:

   ```bash
   cd contracts
   cargo build --target wasm32v1-none --release
   cargo test
   ```

2. Create `contracts/.env` from `contracts/.env.example`, set `DEPLOYER_SECRET_KEY`, set `ORACLE_MODE=reflector`, and set `REFLECTOR_CONTRACT_ID` to the Testnet Reflector/SEP-40-compatible oracle contract.

3. Deploy and initialize Testnet contracts:

   ```bash
   cd contracts
   bash scripts/deploy-testnet.sh
   bash scripts/init-testnet.sh
   bash scripts/verify-testnet.sh
   ```

4. Confirm `frontend/.env.local` was generated with Testnet contract IDs and oracle values:
   - `VITE_ORACLE_MODE=reflector`
   - `VITE_REFLECTOR_CONTRACT_ID`
   - `VITE_MAX_PRICE_STALENESS_LEDGERS`

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

8. Refresh and show the oracle status strip and Health Factor card. Explain that XLM/USD is read from the price oracle contract and Health Factor is read from `lending_pool.get_health_factor`.

9. Repay XLM debt.

10. Withdraw XLM collateral.

11. Optional manual liquidation:
    - Use an unhealthy borrower account.
    - Prepare liquidation with borrower, debt asset, collateral asset, and debt amount.
    - Execute liquidation with the returned session ID.
    - Open both submitted transactions on Stellar Expert.

12. Explain scope:
    - No off-chain automation service.
    - No off-chain analytics service.
    - Reflector is the intended Testnet/demo price source.
    - Manual oracle mode is local-test only.
    - Testnet/demo only, not mainnet-ready.

## Expected Demo Signals

- Wallet public key is visible after connecting.
- Contract IDs are loaded from `frontend/.env.local`.
- Each action shows transaction phases from idle through success or error.
- Successful actions display a transaction hash.
- Transaction hashes link to Stellar Expert Testnet.
- XLM/USD oracle status, user deposit, debt, reserve count, and Health Factor refresh after transactions.
