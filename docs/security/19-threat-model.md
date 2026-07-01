# 19 - Threat Model & Incident Response Playbook

This document details the threat landscape modeling using the STRIDE framework, trust boundaries, key management, and incident response procedures for UdonFi V2.

MVP scope is contract-first: React Frontend, Freighter Wallet, Soroban RPC, UdonFi Soroban Smart Contracts, Stellar Testnet, and Stellar Expert transaction links.

---

## 1. Assets to Protect

- **User Funds**: Underlying tokens deposited as collateral or supplied liquidity in contract pools.
- **Contract State**: Storage records for positions, configurations, and interest indexes.
- **Oracle Prices**: Price feed valuations used by the risk engine.
- **Governance Authority**: Administrative capabilities (contract upgrades, risk parameter updates).
- **Admin/Guardian Keys**: Cryptographic key pairs for the governance multisig and emergency pause roles.
- **Frontend Integrity**: Web interface code, wallet connection, RPC configuration, and transaction link rendering.

---

## 2. Trust Boundaries

```text
  +------------------+      +------------------+      +-------------------+
  |   User Browser   | <--> | Freighter Wallet | ---> |   Soroban RPC     |
  |  React Frontend  |      | User Signature   |      | Testnet Endpoint  |
  +--------+---------+      +------------------+      +---------+---------+
           |                                                |
           | Stellar Expert links                           v
           v                                      +-------------------+
  +------------------+                            | UdonFi Soroban    |
  | Stellar Expert   |                            | Smart Contracts   |
  +------------------+                            +-------------------+
```

- **Boundary 1 (User to Web UI)**: Web UI runs in the user's browser, communicating with Freighter Wallet.
- **Boundary 2 (Web UI to Soroban RPC)**: Frontend reads contract state and submits signed transactions through Soroban RPC.
- **Boundary 3 (Smart Contracts to Oracles/Price Inputs)**: MVP uses configured price inputs or available oracle components; production oracle aggregation is not complete.

---

## 3. STRIDE Threat Analysis Matrix

| Threat Category | Threat Scenario | Mitigation Strategy |
|---|---|---|
| **Spoofing** | Attacker signs transactions pretending to be a borrower. | Enforce cryptographic signature verification in Soroban SDK via Freighter. |
| **Tampering** | Attacker manipulates on-chain price feeds. | Multi-feed Oracle Aggregator with price deviation checks and stale price protection. |
| **Repudiation** | User denies performing a liquidation or borrow. | Event logging with transaction hash mappings and unique sequence IDs. |
| **Information Disclosure** | Front-running pending liquidations or borrows in Stellar transaction pools. | Flash-loan checks and 2-step liquidation flows. Secure preparation signatures. |
| **Denial of Service** | Evicting ledger entries by letting block TTL expire. | Automated `extend_ttl` executions on all user write transactions. |
| **Elevation of Privilege** | Malicious proposal upgrades contracts without timelocks. | Governance timelocks (48 hours) and multisig admin controls. |

---

## 4. Key Management Policy

### A. Emergency Guardian Multisig
- **Configuration**: 3-of-5 G-address multisig.
- **Access Limits**: Authorized to call `toggle_pause` and `emergency_reduce_caps`. Cannot upgrade contract WASM hashes or withdraw pool assets.
- **Rotation**: Keys must be rotated annually or immediately upon suspected compromise.

### B. Governance Admin keys
- **Configuration**: Managed exclusively by the Governance Contract. Upgrades must pass a 48-hour timelocked on-chain proposal.
- **Compromise Response**: If governance keys are compromised:
  - The Guardian triggers a global pause to lock deposits and borrows.
  - Users can still repay and withdraw their assets directly from the contracts.
  - A recovery transaction is prepared to replace the compromised governance address.

---

## 5. Incident Response Playbook

```text
  [1. Detection] ---> [2. Triage & Verify] ---> [3. Pause Operations]
                                                         |
  [6. Postmortem] <--- [5. Upgrade & Resume] <--- [4. Public Alert]
```

### 1. Detection
- MVP detection is manual: developers and demo operators review Stellar Expert transactions, contract events, and direct Soroban RPC state.

### 2. Triage & Verify
- The engineering team reviews transaction traces and verify the vulnerability.

### 3. Pause Operations
- If verified, the Guardian invokes `toggle_pause` to disable deposits and borrows for the affected reserve.
- Pauses must be logged with matching transaction hashes in public registries.

### 4. Public Alert
- Publish a security advisory detailing the pause status and safety of user funds.

### 5. Upgrade & Resume
- Develop and test a fix in a private branch.
- Deploy the fix on-chain via the standard governance upgrade process.
- Resume operations after verifying the fix.

### 6. Postmortem
- Publish a postmortem report detailing the root cause, exploit vectors, and steps taken to prevent recurrence.
