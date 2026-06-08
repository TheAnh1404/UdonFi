# 🍜 UdonFi — High-Performance & Premium Web3 Lending Protocol on Stellar Soroban

[![Stellar Soroban](https://img.shields.io/badge/Stellar-Soroban-black?style=for-the-badge&logo=stellar&logoColor=white&color=080C1C)](https://soroban.stellar.org/)
[![Rust Smart Contracts](https://img.shields.io/badge/Rust-Contracts-orange?style=for-the-badge&logo=rust&logoColor=white&color=DE7F3E)](https://www.rust-lang.org/)
[![Vite React TS](https://img.shields.io/badge/Vite_React_TS-Frontend-blue?style=for-the-badge&logo=vite&logoColor=white&color=00F2FE)](https://vitejs.dev/)
[![Node.js Indexer](https://img.shields.io/badge/Node.js-Indexer-green?style=for-the-badge&logo=nodedotjs&logoColor=white&color=21A366)](https://nodejs.org/)
[![Firebase Status](https://img.shields.io/badge/Firebase-Realtime-yellow?style=for-the-badge&logo=firebase&logoColor=white&color=FFCA28)](https://firebase.google.com/)

---

## 🌟 Project Summary & System Architecture Overview

**UdonFi** is a pioneering, next-generation decentralized collateralized lending protocol built specifically for the **Stellar Soroban Smart Contracts** ecosystem. It resolves two critical challenges in Web3 lending: capital efficiency and the hardware/VM resource constraints of the host blockchain. To achieve this, UdonFi combines standard DeFi mathematical and risk management frameworks (such as the Kinked APY Curve, LTV, Liquidation Threshold, and Health Factor) with advanced engineering techniques optimized for the Soroban VM's storage ledger and CPU limits (including u128 Bitmap state-packing, a decentralized 2-Step Liquidation flow, and automated TTL storage extension).

The protocol is paired with a premium client front-end utilizing a stunning **Glassmorphism & Cyberpunk Neon** aesthetic, providing a smooth, intuitive, and state-of-the-art Web3 user experience.

```text
                                UDONFI SYSTEM WORKFLOW
                                      
      ┌─────────────────────────────────────────────────────────────────────────────────┐
      │                                 Stellar Network                                 │
      │                                                                                 │
      │   ┌────────────────────┐       On-Chain Events  ┌───────────────────────────┐   │
      │   │  Smart Contracts   │ ─────────────────────> │     Indexer Bot (Node)    │   │
      │   │      (Rust)        │                        │                           │   │
      │   └────────┬───────────┘                        └─────────────┬─────────────┘   │
      └────────────┼──────────────────────────────────────────────────┼─────────────────┘
                   │                                                  │
            RPC Query/Write                                    Broadcast State
                   │                                                  │
                   │                                     ┌────────────┴─────────────┐
                   │                                     │                          │
                   │                                     ▼                          ▼
                   │                           ┌──────────────────┐       ┌──────────────────┐
                   │                           │  Firestore Live  │       │  Socket.io Push  │
                   │                           │     Database     │       │    (Realtime)    │
                   │                           └────────┬─────────┘       └────────┬─────────┘
                   ▼                                    │                          │
      ┌─────────────────────────────────────────────────┼──────────────────────────┼────┐
      │                                                 │                          │    │
      │   ┌─────────────────────────────────────────────▼──────────────────────────▼┐   │
      │   │                          UdonFi User Interface                          │   │
      │   │                     (Vite + React + TypeScript Client)                  │   │
      │   └─────────────────────────────────────────────────────────────────────────┘   │
      │                                                                                 │
      └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📐 1. Core Financial Metrics & Mathematical Models

UdonFi enforces strict decentralized financial mathematics to guarantee capital safety and automated liquidity risk governance:

### A. Risk Management (LTV & Liquidation Threshold)
*   **Maximum Loan-to-Value ($LTV_{max} = 70\%$):** The maximum percentage of debt that can be borrowed against the total value of supplied collateral. Borrow requests are rejected at the protocol simulation phase if the resulting debt exceeds $70\%$ of the collateral value.
*   **Liquidation Threshold ($LT = 82.5\%$):** The maximum allowable debt-to-collateral ratio. If this threshold is breached, the position becomes eligible for liquidation.
*   **Health Factor ($HF$):** A metric representing the safety of a borrower's position, calculated as:
    $$HF = \frac{\sum (\text{Collateral Value}_i \times LT_i)}{\sum \text{Borrow Value}_j}$$
    *   **$HF > 1.5$ (Safe Status — Neon Green):** Excellent collateralization. The position is well-shielded against short-term asset price volatility.
    *   **$1.0 \le HF \le 1.5$ (High Risk Status — Cyber Yellow):** Warning. The user should deposit more collateral or repay debt to avoid liquidation.
    *   **$HF < 1.0$ (Liquidation Status — Warning Red):** The position is undercollateralized. The vault is locked and becomes eligible for public liquidation.

---

### B. Kinked Interest Rate Curve Algorithm
To optimize liquidity pool utilization and protect depositors during periods of high borrowing demand, UdonFi uses a variable interest rate model based on the pool's Utilization Rate ($U$):
$$U = \frac{\text{Total Borrowed}}{\text{Total Supplied}}$$

The **Borrow APY** ($R_t$) calculation is split into two phases relative to the optimal utilization threshold $U_{optimal}$ (set at $80\%$):

1.  **Phase 1: Capital Abundance ($U \le 80\%$):**
    $$R_t = R_{base} + \left( \frac{U}{U_{optimal}} \right) \times R_{slope1}$$
    *Borrow APY increases gradually (e.g., from 1% to 5%) to encourage borrowing and leverage.*

2.  **Phase 2: Liquidity Scarcity ($U > 80\%$):**
    $$R_t = R_{base} + R_{slope1} + \left( \frac{U - U_{optimal}}{100\% - U_{optimal}} \right) \times R_{slope2}$$
    *Borrow APY rises exponentially (up to 90%) to penalize over-borrowing, forcing borrowers to repay their loans and incentivizing depositors to supply more capital to restore pool liquidity.*

**Supply APY** is calculated based on the interest paid by borrowers, scaled by the utilization rate and adjusted for the reserve fee (Reserve Factor = 10%):
$$\text{Supply APY} = R_t \times U \times (1 - \text{Reserve Factor})$$

```text
  Borrow APY (%)
   ▲
90 │                                                     /
   │                                                    /
   │                                                   / [Slope 2: Liquidity Scarcity]
   │                                                  /
   │                                                 /
 5 │                                  .-------------'
   │                      .----------'  [Kink at 80%]
 1 │          .----------' [Slope 1]
   └──────────┴───────────────────────┴──────────────────┴───────► Utilization Rate (U)
             0%                      80%                100%
```

---

## 🛠️ 2. Soroban-Specific Technical Optimizations

The Stellar Soroban blockchain enforces unique resource constraints regarding ledger storage and CPU usage. UdonFi implements several innovative architectures to optimize performance under these constraints:

### A. u128 State Bitmap Matrix (Ledger Storage Optimization)
Instead of storing a user's collateral and debt asset lists in dynamic arrays (Vectors) or maps (Maps)—which consumes substantial storage capacity and gas fees for read/write operations—UdonFi packs the entire account configuration into a **single `u128` integer**:
*   Each asset in the protocol is allocated **2 bits**:
    *   **Bit $2i$ (Collateral Flag):** Indicates whether asset $i$ is enabled as collateral (e.g., XLM Collateral is Bit 0).
    *   **Bit $2i + 1$ (Borrow Flag):** Indicates whether asset $i$ is actively borrowed (e.g., XLM Borrow is Bit 1).
*   State checks and updates are performed using highly efficient bitwise operations:
    *   *Enable collateral*: `bitmap |= (1 << 2i)`
    *   *Check borrowed state*: `(bitmap >> (2i + 1)) & 1 == 1`
*   **Result:** This layout reduces ledger storage footprint and yields up to a **95% reduction in Soroban storage fees**.

---

### B. 2-Step Liquidation Protocol (Bypassing CPU Limits)
Soroban enforces a strict CPU execution limit of **100 million instructions** per transaction. A traditional single-transaction liquidation (fetching oracle prices, compounding interest rates, evaluating Health Factor, executing debt repayments, and transferring collateral) typically consumes **100M - 120M instructions**, causing transactions to instantly fail.

UdonFi solves this via a decentralized **2-Step Liquidation mechanism**:

```text
                       SAFE 2-STEP LIQUIDATION FLOW
                       
       ┌────────────────────────┐                   ┌────────────────────────┐
       │  prepare_liquidation() │ ── Session ID ──> │ execute_liquidation()  │
       │  (~60M CPU Instructions)│                   │ (~30M CPU Instructions)│
       └───────────┬────────────┘                   └───────────┬────────────┘
                    │                                            │
         - Evaluate Health Factor                     - Liquidator pays debt
         - Lock Collateral                            - Release collateral
         - Generate & Store Session ID                - Transfer 5% liquidation bonus
```
By splitting the intensive operation into two distinct, cryptographically linked transactions, each execution step stays well below the 100M instruction limit. This guarantees that liquidations process smoothly without hitting VM limits.

---

### C. Automated TTL Extension (Ledger Eviction Protection)
To prevent ledger bloat, Soroban requires all stored data entries to maintain a Time-To-Live (TTL) counter tracked in ledger blocks. UdonFi's data naturally decays over time.
*   If the TTL drops to 0, account balances and states are **evicted** from the active ledger.
*   UdonFi integrates an automated **TTL extension (`extend_ttl`)** mechanism. Whenever a user interacts with the protocol (Supply, Borrow, Repay, or Withdraw), the contract automatically extends the storage entry's TTL to a maximum of **6,000 ledgers**, ensuring persistent storage state at minimal expense.

---

## 📂 3. Repository Directory Structure

The project repository is structured as a Monorepo:

```text
UdonFi/
├── contracts/                  # Smart Contracts Source Code (Rust)
│   ├── lending_pool/           # Core router contract managing deposits, borrows, and dynamic APY
│   ├── liquidation/            # Contract managing the 2-step liquidation process
│   ├── reserve/                # Contract managing configurations for asset reserves
│   ├── price_oracle/           # Mock price oracle for XLM/USDC rates
│   ├── a_token/                # Yield-bearing token representing deposited assets
│   ├── debt_token/             # Debt-tracking token representing borrowed assets
│   ├── common/                 # Shared structures, macros, and bitwise math library
│   └── deploy.ps1              # Automation script for deployment to Soroban Testnet
│
├── indexer_bot/                # Node.js event indexer bot for Soroban events
│   ├── index.js                # Event polling loop, XDR parsing, and Socket.io emitter
│   ├── firebase.js             # Firestore Sync and Firebase Admin configuration
│   └── package.json            # Project dependencies
│
└── frontend/                   # Premium Web3 client UI (React + TS + Vite)
    ├── src/
    │   ├── types/              # Type-safe Web3 declarations
    │   ├── components/         # Premium styled UI components
    │   │   ├── Header.tsx      # Navigation, TVL, and non-blocking notification drawer
    │   │   ├── SorobanBitmap.tsx # 128-bit LED matrix for packing visualization
    │   │   ├── SorobanKinked.tsx # Interactive SVG dynamic APY chart
    │   │   ├── SimulatorPage.tsx # In-memory local blockchain simulation dashboard
    │   │   └── ConsoleLogger.tsx # Real-time RPC transaction feed
    │   ├── index.css           # Custom CSS Tokens (Glassmorphism & Neon Glow theme)
    │   └── App.tsx             # Global state, contract integration, and financial math
    └── vite.config.ts          # Vite compilation configuration
```

For quick reference to key source files, refer to:
*   Core Lending Pool: [lending_pool](file:///d:/TheAnhProject/UdonFi/contracts/lending_pool)
*   Liquidation Router: [liquidation](file:///d:/TheAnhProject/UdonFi/contracts/liquidation)
*   Asset Configuration: [reserve](file:///d:/TheAnhProject/UdonFi/contracts/reserve)
*   Price Feed Oracle: [price_oracle](file:///d:/TheAnhProject/UdonFi/contracts/price_oracle)
*   Yield Token: [a_token](file:///d:/TheAnhProject/UdonFi/contracts/a_token)
*   Debt Token: [debt_token](file:///d:/TheAnhProject/UdonFi/contracts/debt_token)
*   Shared Utilities & Math: [common](file:///d:/TheAnhProject/UdonFi/contracts/common)
*   Smart Contract Deploy Script: [deploy.ps1](file:///d:/TheAnhProject/UdonFi/contracts/deploy.ps1)
*   Indexer Bot Loop: [index.js](file:///d:/TheAnhProject/UdonFi/indexer_bot/index.js)
*   Indexer Firebase Handler: [firebase.js](file:///d:/TheAnhProject/UdonFi/indexer_bot/firebase.js)
*   Navigation & Stats: [Header.tsx](file:///d:/TheAnhProject/UdonFi/frontend/src/components/Header.tsx)
*   Bitmap Matrix LED Grid: [SorobanBitmap.tsx](file:///d:/TheAnhProject/UdonFi/frontend/src/components/SorobanBitmap.tsx)
*   Interactive SVG APY Chart: [SorobanKinked.tsx](file:///d:/TheAnhProject/UdonFi/frontend/src/components/SorobanKinked.tsx)
*   Client Blockchain Simulator: [SimulatorPage.tsx](file:///d:/TheAnhProject/UdonFi/frontend/src/components/SimulatorPage.tsx)
*   Interactive Transaction Logger: [ConsoleLogger.tsx](file:///d:/TheAnhProject/UdonFi/frontend/src/components/ConsoleLogger.tsx)
*   Design Design Tokens: [index.css](file:///d:/TheAnhProject/UdonFi/frontend/src/index.css)
*   State Coordinator & Flow: [App.tsx](file:///d:/TheAnhProject/UdonFi/frontend/src/App.tsx)
*   Vite configuration: [vite.config.ts](file:///d:/TheAnhProject/UdonFi/frontend/vite.config.ts)

---

## 🚀 4. Installation & Local Setup Guide

UdonFi can be run in two modes: a quick **Offline Sandbox** mode (requiring no external setup) or a **Full Testnet Integration** mode.

### Option A: Quick Start with Offline Simulator (Recommended for Demo)
The frontend application features a fully integrated **in-memory blockchain simulator** running directly inside your browser. This allows you to demo all DeFi features instantly without setting up local nodes or wallets:

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies and spin up the development server:**
    ```bash
    npm install
    npm run dev
    ```
3.  Open `http://localhost:5173` in your browser and click on the **"Simulator"** tab in the header to begin testing!

---

### Option B: Run Realtime Indexer Bot (Cloud Synced)
To sync state in real-time from the Stellar Testnet to a shared database:

1.  **Configure Firebase Key**: Place your Firebase credentials file at `indexer_bot/serviceAccountKey.json`.
2.  **Navigate to the indexer bot directory:**
    ```bash
    cd indexer_bot
    ```
3.  **Launch the event scanner:**
    ```bash
    npm install
    npm start
    ```
    The indexer bot will open a Socket.io server on port `3001` to broadcast live transaction events directly to the frontend!

---

### Option C: Compile & Deploy Smart Contracts (Rust)
To modify or redeploy UdonFi's smart contracts to the Stellar Testnet:

1.  **Compile all Soroban contracts to WASM:**
    ```bash
    cd contracts
    cargo build --target wasm32v1-none --release
    ```
2.  **Run unit tests for math and liquidation logic:**
    ```bash
    cargo test
    ```
3.  **Automated Deployment (Requires Stellar CLI):**
    ```powershell
    ./deploy.ps1
    ```

---

## 🎨 5. Premium Interface & UX Features

UdonFi sets a new standard for Web3 lending user experiences, showcasing rich visualizations of complex blockchain operations:

*   **🍜 Steaming Udon Bowl**: A purely CSS-animated neon Udon bowl with changing gradients on the top-left, representing liquid liquidity flows.
*   **📊 Dynamic SVG APY Chart**: An interactive SVG chart displaying pool Utilization ($U$) as a neon green dot that glides along the kinked curve in real-time as users deposit or borrow.
*   **🟩 128-bit Bitmap LED Grid**: An interactive matrix showing the bit-packing of the ledger. Hover over or click on any LED to see the bitwise evaluation logic and simulate state transitions.
*   **🔔 Non-blocking Header Notification Drawer**: Rather than interrupting actions with intrusive page redirects or modal blockages, all transaction confirmations, pending states, and error traces are delivered cleanly through a header notification drawer.
*   **🕹️ Time-Travel Simulator**: Accelerate blockchain time forward in the simulator to watch compound interest accumulate block-by-block and manually trigger liquidations on bad debt.

---

## 🧪 6. End-to-End DeFi Testing Walkthrough (Supply → Withdraw → Borrow → Repay)

This section guides you through the full lifecycle of a DeFi transaction sequence on UdonFi, including the **Auto-Reset** and **Full Redeploy** mechanisms.

---

### 📋 6.1 Prerequisites

Before starting, please ensure the following setup is complete:

| # | Requirement | Steps |
|---|-------------|-------|
| 1 | **Freighter Wallet Installed** (Chrome Extension) | Install from [freighter.app](https://www.freighter.app/) -> Set network to **Testnet** |
| 2 | **Account Funded & Active on Testnet** | Use [Friendbot](https://friendbot.stellar.org/?addr=YOUR_ADDRESS) or run script: `node indexer_bot/fund_user.js` |
| 3 | **USDC Trustline Registered** | On UdonFi UI -> Credit Markets -> Click **"Register USDC Trustline"** |
| 4 | **Frontend Running** | `cd frontend && npm install && npm run dev` -> Access `http://localhost:5173` |
| 5 | **Indexer Bot Running (Optional)** | `cd indexer_bot && npm install && npm start` -> Running at `http://localhost:3001` |
| 6 | **Contracts Deployed on Testnet** | See section 6.5 below if redeployment is required |

---

### 💰 6.2 Funding Your Wallet

**Step 1: Obtain XLM from Friendbot**

Open your terminal and run:
```bash
cd indexer_bot
node fund_user.js
```
Or access the Friendbot endpoint directly using your wallet address:
```
https://friendbot.stellar.org/?addr=YOUR_FREIGHTER_ADDRESS
```
> ⚠️ **Note:** Each Friendbot request yields 10,000 Testnet XLM. You can query it multiple times if needed.

**Step 2: Obtain custom USDC tokens**

USDC on UdonFi uses a custom token contract deployed at:
```
CAO2VFOWACEHKUJXGFDX5MOYFDGL2OANBOB3AK33CUR6R3A2Y5IC65XQ
```
Use the script [initialize_reserves.js](file:///d:/TheAnhProject/UdonFi/contracts/initialize_reserves.js) to mint USDC to your wallet address.

---

### 🔄 6.3 Sequential Testing Walkthrough

> **Recommended sequence:** `SUPPLY` → `WITHDRAW` → `BORROW` → `REPAY`

#### 🟢 Step 1: SUPPLY (Deposit)

1. Go to the **"Credit Markets"** tab on the dashboard.
2. Connect your Freighter wallet (click the "Connect Freighter Wallet" button).
3. Select the **"Deposit"** tab on the right interaction panel.
4. Choose an asset: **XLM** or **USDC**.
5. Enter amount (e.g., `100 XLM`).
6. Click **"SUPPLY TO LIQUIDITY POOL"**.
7. Approve and sign the transaction in the Freighter popup.

**Expected Results:**
- ✅ Log output: `Congratulations! SUPPLY transaction confirmed successfully`
- ✅ Transaction hash is logged and recorded in user history.
- ✅ The "Total Collateral Supplied" metric increases accordingly.
- ✅ Bitmap LED for Bit 0 (XLM Collateral Flag) glows neon green.

#### 🔵 Step 2: WITHDRAW

> **Prerequisite:** Active supply balance.

1. Select the **"Withdraw"** tab on the panel.
2. Select the asset (e.g., **XLM**).
3. Enter withdrawal amount (cannot exceed your supply balance).
4. Click **"WITHDRAW TO WALLET"**.
5. Sign the transaction with Freighter.

**Expected Results:**
- ✅ Log output: `Congratulations! WITHDRAW transaction confirmed successfully`
- ✅ Wallet balance increases, total collateral supplied decreases.
- ✅ If fully withdrawn, the corresponding Collateral LED flag turns off.

> **⚠️ Critical Note:** If you have active loans, withdrawing collateral decreases your Health Factor. If the resulting HF drops below 1.0, the transaction will automatically revert on the Soroban VM.

#### 🟣 Step 3: BORROW

> **Prerequisite:** Active collateral supplied with its collateral flag enabled.

1. Select the **"Borrow"** tab on the panel.
2. Select the asset you want to borrow (e.g., **USDC**).
3. Enter borrow amount (must satisfy the Max LTV threshold of $\le 70\%$).
4. Review the **simulated Health Factor** on the panel before submitting.
5. Click **"BORROW FROM LIQUIDITY POOL"**.
6. Sign the transaction via Freighter.

**Expected Results:**
- ✅ Log output: `Congratulations! BORROW transaction confirmed successfully`
- ✅ Wallet balance increases, "Total Borrow Balance" increases.
- ✅ Health Factor Gauge shifts from ∞ to a concrete numerical ratio.
- ✅ Bitmap LED for Bit 3 (USDC Borrow Flag) glows neon purple.

#### 🔴 Step 4: REPAY

> **Prerequisite:** Active debt balance.

1. Select the **"Repay"** tab on the panel.
2. Select the borrowed asset (e.g., **USDC**).
3. Enter repayment amount (click **MAX** to clear entire debt).
4. Click **"REPAY LIQUIDITY POOL"**.
5. Sign the transaction via Freighter.

**Expected Results:**
- ✅ Log output: `Congratulations! REPAY transaction confirmed successfully`
- ✅ The "Total Borrow Balance" decreases.
- ✅ Health Factor ratio increases (safer position).
- ✅ If fully repaid, the Borrow LED flag switches off and Health Factor resets to ∞.

---

### ⚡ 6.4 Auto-Reset Protocol Mechanism

UdonFi features an **Auto-Reset Protocol** mechanism that refreshes the testing suite after every successful transaction, enabling rapid, frictionless sandbox testing without manual cleanups.

**How it works:**
1. Once any contract interaction (Supply, Withdraw, Borrow, Repay, or Liquidation) succeeds on-chain,
2. The system waits for **6 seconds** before triggering the redeployment script.
3. A fresh protocol iteration is deployed with clean ledger states.
4. Prior transactions and logs remain indexed and recorded in your **Firestore history**.

**Toggling Auto-Reset:**
- A dedicated **"Auto Reset"** toggle switch is available in the header.
- **ON:** Automatically redeploys and cleans state 6 seconds after a transaction success.
- **OFF:** Retains active protocol state, permitting sequence flows.

> 💡 **Recommended Testing Scenarios:**
> 
> | Scenario | Auto-Reset |
> |----------|------------|
> | Test individual functions in isolation (SUPPLY -> Reset -> BORROW -> Reset...) | **ON** |
> | Test continuous sequences (SUPPLY -> BORROW -> REPAY -> WITHDRAW) | **OFF** |
> | Live client demonstration | **ON** |

---

### 🔧 6.5 Complete Protocol Redeployment & Reset

When a full system reset is needed (due to corrupted states, expired contract TTLs, or updating contract logic):

**Step 1: Compile smart contracts**
```bash
cd contracts
cargo build --target wasm32v1-none --release
```

**Step 2: Run redeployment script**
```bash
node contracts/redeploy_entire_protocol.js
```

The script will automatically:
1. Deploy 7 fresh smart contracts (Mock Price Oracle, Lending Pool, Liquidation manager, 2 aTokens, 2 debtTokens).
2. Initialize all contracts with standard configurations.
3. Add XLM and USDC reserves to the Lending Pool.
4. Seed the Price Oracle ($0.15 for XLM, $1.00 for USDC).
5. Output the new **Contract IDs**.

**Step 3: Update Contract IDs in the frontend**

Copy the new **Lending Pool ID** from the deployment output and replace the contract address in [App.tsx](file:///d:/TheAnhProject/UdonFi/frontend/src/App.tsx):
```typescript
const POOL_CONTRACT_ID = 'NEW_POOL_CONTRACT_ID_HERE';  // Line 30
```

**Step 4: Update Contract IDs in the indexer bot**

Update the relevant contract ID in [index.js](file:///d:/TheAnhProject/UdonFi/indexer_bot/index.js) so the event indexer tracks the new deployed contract.

**Step 5: Restart the client and indexer bot**
```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Indexer Bot (Optional)
cd indexer_bot && npm start
```

---

### 🔑 6.6 Protocol Contract Registry

| Contract | Role | Contract ID |
|----------|------|-------------|
| **Lending Pool Router** | Core routing contract managing Supply, Withdraw, Borrow, and Repay | `CBP6X4XEFDSPJV7DCEQ7M4OEA2PZMXMHWMC3SE26FHOVC2AQQLZMWJY6` |
| **XLM SAC (Native)** | Native Stellar Asset Contract wrapper for XLM | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| **USDC Custom Token** | Custom USDC token wrapper for UdonFi Testnet | `CAO2VFOWACEHKUJXGFDX5MOYFDGL2OANBOB3AK33CUR6R3A2Y5IC65XQ` |

> ⚠️ **Note:** Contract IDs change upon running `redeploy_entire_protocol.js`. Ensure they are updated in the frontend and indexer configuration.

---

### ❓ 6.7 Troubleshooting FAQ

| Issue | Root Cause | Resolution |
|-------|------------|------------|
| `Account not activated` | Wallet lacks Testnet XLM balance | Run `node indexer_bot/fund_user.js` or use Friendbot |
| `Transaction simulation failed` | Contract not initialized or ledger entries expired (TTL) | Run `node contracts/redeploy_entire_protocol.js` |
| `Health factor below threshold` | Withdrawal or borrow amount exceeds collateral capacity | Decrease interaction amount or supply additional collateral |
| `failed host function` (USDC) | Missing trustline for custom USDC token | Click **"Register USDC Trustline"** in the UI |
| Wallet does not prompt signature | Freighter has not authorized local domain | Open Freighter -> Settings -> Security -> Add `localhost` to allowed list |
| `unexpected end of file` during deployment | Stellar Testnet RPC congestion or timeout | The script automatically retries 3 times with an inclusion fee of 0.1 XLM |
| Auto-Reset does not trigger | Auto Reset switch is disabled | Toggle the **"Auto Reset"** switch to **ON** in the header |

---

*Meticulously designed. Engineered for the future of Web3. Welcome to UdonFi.*
