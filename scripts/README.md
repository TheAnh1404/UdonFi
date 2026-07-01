# UdonFi V2 Automation Scripts

This directory contains the deployment automation, reserve initialization, price configuration, and protocol maintenance scripts for UdonFi V2.

## 1. Automation Scripts Directory

```text
scripts/
├── deploy_contracts.js     # Deploys modular contracts to Testnet/Mainnet
├── initialize_reserves.js  # Configures asset reserves (LTV, Liquidation limits)
├── update_oracle_prices.js # Configures pricing feeds
├── extend_contract_ttl.js  # Runs automated TTL maintenance queries
├── redeploy_protocol.ps1   # PowerShell script for redeploying the sandbox
└── package.json
```

---

## 2. Script Responsibilities & Execution Parameters

### A. Modular Contract Deployer (`deploy_contracts.js`)
Deploys Wasm binaries to the network, deploys contract instances, and outputs the deployed Contract IDs.
- **Parameters**:
  - `--network` (default: `testnet` | options: `testnet`, `public`, `standalone`)
  - `--rpc-url` (default: value in `.env` file)
- **Execution**:
  ```bash
  node scripts/deploy_contracts.js --network testnet
  ```

### B. Reserve Configurator (`initialize_reserves.js`)
Initializes reserve parameters (LTV, liquidation thresholds, borrow caps) for newly supported assets.
- **Parameters**:
  - `--pool-id`: Contract ID of the deployed Lending Pool.
  - `--asset-address`: Stellar Asset Contract address.
  - `--ltv`: Max Loan-to-Value (e.g., `0.70`).
  - `--threshold`: Liquidation threshold (e.g., `0.825`).
- **Execution**:
  ```bash
  node scripts/initialize_reserves.js --pool-id GDC... --asset-address CAO... --ltv 0.70 --threshold 0.825
  ```

### C. Oracle Update Feeder (`update_oracle_prices.js`)
Configures demo price values for testnet sandbox operations.
- **Execution**:
  ```bash
  node scripts/update_oracle_prices.js --network testnet
  ```

### D. TTL Storage Extender (`extend_contract_ttl.js`)
Iterates through active reserve configuration mappings and contract instances to extend their ledger Time-to-Live (TTL).
- **Execution**:
  ```bash
  node scripts/extend_contract_ttl.js --network testnet
  ```
